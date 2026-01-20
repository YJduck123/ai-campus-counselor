/**
 * 聊天服务 - 集成 RAG 检索和 Multi-Agent 路由
 */

const axios = require('axios');
const { processRouting, AgentType } = require('./agentRouter');
const { performRAG } = require('./ragService');
const { runMultiAgent } = require('./multiAgentOrchestrator');
const { hasRealApiKey } = require('./llmClient');

/**
 * 通过 Firecrawl 搜索校园信息（作为 RAG 的补充）
 */
async function searchCampusInfo(query) {
    if (!process.env.FIRECRAWL_API_KEY || process.env.FIRECRAWL_API_KEY.includes('your_')) {
        return "";
    }

    try {
        const response = await axios.post('https://api.firecrawl.dev/v0/search', {
            query: query,
            limit: 3,
            scrapeOptions: { formats: ["markdown"] }
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        if (response.data && response.data.data) {
            return response.data.data.map(item => item.markdown).join('\n\n');
        }
        return "";
    } catch (error) {
        console.error('Firecrawl search error:', error.message);
        return "";
    }
}

/**
 * 处理聊天请求（流式）- 集成 Multi-Agent 和 RAG
 */
async function handleChatStream(req, res) {
    const { message, history } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        console.log('Received message (Stream):', message);

        const traceEnabled = process.env.AGENT_TRACE === '1';
        const emit = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

        // Heuristic routing used only to decide optional extra retrieval (Firecrawl)
        const heuristicRouting = processRouting(message, history);

        // Optional tool: Firecrawl background search (only for campus knowledge questions)
        let firecrawlContext = "";
        if (heuristicRouting.agent === AgentType.KNOWLEDGE && process.env.FIRECRAWL_API_KEY) {
            firecrawlContext = await searchCampusInfo(message);
            if (traceEnabled && firecrawlContext) {
                emit({ type: 'trace', step: 'firecrawl', content: `Firecrawl ok, chars=${firecrawlContext.length}` });
            }
        }

        // Mock mode (no real key) - keep previous behavior to allow demo UI
        if (!hasRealApiKey()) {
            const routing = heuristicRouting;
            console.log(`[Router] Agent: ${routing.agent}, NeedsRAG: ${routing.needsRAG}, Confidence: ${routing.confidence}`);

            emit({ type: 'routing', agent: routing.agent, confidence: routing.confidence });

            let ragSources = [];
            if (routing.needsRAG) {
                const ragResult = await performRAG(message);
                if (ragResult.usedRAG) ragSources = ragResult.sources || [];
            }

            const mockText = getMockResponse(routing.agent, message);
            for (const ch of mockText) emit({ type: 'text', content: ch });
            if (ragSources.length > 0) emit({ type: 'sources', sources: ragSources });
            emit({ type: 'done' });
            res.end();
            return;
        }

        // Multi-Agent orchestration: Planner -> RAG -> Draft -> Verify -> Finalize
        const result = await runMultiAgent(message, history, {
            extraContext: firecrawlContext,
            trace: traceEnabled ? ({ step, content }) => emit({ type: 'trace', step, content }) : null
        });

        console.log(`[MultiAgent] Agent: ${result.routing.agent}, NeedsRAG: ${result.routing.needsRAG}, Confidence: ${result.routing.confidence}`);

        emit({
            type: 'routing',
            agent: result.routing.agent,
            confidence: result.routing.confidence
        });

        if (result.sources && result.sources.length > 0) {
            emit({ type: 'sources', sources: result.sources });
        }

        const finalText = result.finalText || '';
        const chunkSize = 12;
        for (let i = 0; i < finalText.length; i += chunkSize) {
            emit({ type: 'text', content: finalText.slice(i, i + chunkSize) });
        }

        emit({ type: 'done' });
        res.end();

    } catch (error) {
        console.error('Error processing request:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', content: 'Internal Server Error' })}\n\n`);
        res.end();
    }
}

/**
 * 获取模拟响应（用于未配置 API Key 时的演示）
 */
function getMockResponse(agentType, message) {
    const responses = {
        [AgentType.KNOWLEDGE]: `📚 【知识库检索结果】

根据校园知识库的信息，我来回答您的问题：

这是一个模拟响应。在实际使用中，系统会：
1. 从向量数据库检索相关知识
2. 结合 RAG 技术增强回答准确性
3. 提供来源引用

请配置 GLM_API_KEY 以获得完整体验！`,

        [AgentType.TUTOR]: `🎓 【AI 导师模式已激活】

您好！我是您的 AI 导师小云。

这是模拟响应。在实际使用中，我会：
1. 根据您选择的场景进入角色
2. 提出专业的面试/考核问题
3. 给出详细的【评测建议】

请配置 GLM_API_KEY 开始真正的陪练体验！`,

        [AgentType.GENERAL]: `👋 你好呀！我是小云~

这是模拟响应。请配置 GLM_API_KEY 以获得完整的 AI 对话体验！

配置完成后，我可以：
- 💬 和你聊天解闷
- 📖 解答校园问题（使用 RAG 知识库）
- 🎯 进行面试陪练（Multi-Agent 模式）`
    };

    return responses[agentType] || responses[AgentType.GENERAL];
}

module.exports = {
    handleChatStream,
    searchCampusInfo
};
