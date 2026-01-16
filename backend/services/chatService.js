/**
 * 聊天服务 - 集成 RAG 检索和 Multi-Agent 路由
 */

const axios = require('axios');
const { processRouting, AgentType } = require('./agentRouter');
const { performRAG } = require('./ragService');

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

        // ========== 1. Multi-Agent 路由 ==========
        const routing = processRouting(message, history);
        console.log(`[Router] Agent: ${routing.agent}, NeedsRAG: ${routing.needsRAG}, Confidence: ${routing.confidence}`);

        // 发送路由信息到前端（可选，用于调试）
        res.write(`data: ${JSON.stringify({
            type: 'routing',
            agent: routing.agent,
            confidence: routing.confidence
        })}\n\n`);

        // ========== 2. RAG 检索（如果需要）==========
        let ragContext = "";
        let ragSources = [];

        if (routing.needsRAG) {
            console.log('[RAG] Performing knowledge retrieval...');
            const ragResult = await performRAG(message);

            if (ragResult.usedRAG) {
                ragContext = ragResult.context;
                ragSources = ragResult.sources;
                console.log(`[RAG] Retrieved ${ragSources.length} relevant documents`);
            }
        }

        // ========== 3. Firecrawl 补充搜索（可选）==========
        let firecrawlContext = "";
        if (routing.agent === AgentType.KNOWLEDGE && process.env.FIRECRAWL_API_KEY) {
            firecrawlContext = await searchCampusInfo(message);
        }

        // ========== 4. 构建最终 Prompt ==========
        let finalUserPrompt = message;

        // 如果有 RAG 上下文，构建增强提示
        if (ragContext) {
            finalUserPrompt = `以下是从校园知识库中检索到的相关参考信息：

${ragContext}

---

请基于以上参考信息，准确回答用户的问题。如果参考信息不足以回答问题，可以结合你的知识进行补充，但要明确告知用户哪些是来自知识库的准确信息，哪些是补充说明。

用户问题：${message}`;
        }

        // 如果还有 Firecrawl 的补充信息
        if (firecrawlContext && !ragContext) {
            finalUserPrompt = `以下是搜索到的参考背景信息：
${firecrawlContext}

请结合以上信息回答用户的问题：${message}`;
        }

        // ========== 5. 构建消息数组 ==========
        const apiMessages = [
            { role: "system", content: routing.systemPrompt }
        ];

        // 添加历史记录（限制最近10条）
        if (history && Array.isArray(history)) {
            const limitedHistory = history.slice(-10);
            limitedHistory.forEach(h => {
                if (h.role && h.content && ['user', 'assistant'].includes(h.role)) {
                    apiMessages.push({
                        role: h.role,
                        content: String(h.content).slice(0, 4000)
                    });
                }
            });
        }

        // 添加当前用户消息
        apiMessages.push({ role: "user", content: finalUserPrompt });

        // ========== 6. 调用 GLM-4 ==========
        let fullResponseText = "";

        if (!process.env.GLM_API_KEY || process.env.GLM_API_KEY.includes('your_')) {
            // 模拟模式
            const mockText = getMockResponse(routing.agent, message);
            let i = 0;
            const interval = setInterval(() => {
                if (i < mockText.length) {
                    const char = mockText[i++];
                    res.write(`data: ${JSON.stringify({ type: 'text', content: char })}\n\n`);
                    fullResponseText += char;
                } else {
                    clearInterval(interval);
                    // 发送来源信息
                    if (ragSources.length > 0) {
                        res.write(`data: ${JSON.stringify({ type: 'sources', sources: ragSources })}\n\n`);
                    }
                    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
                    res.end();
                }
            }, 30);
            return;
        }

        // 调用真实 API
        const response = await axios.post('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            model: "glm-4",
            stream: true,
            messages: apiMessages
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.GLM_API_KEY}`,
                'Content-Type': 'application/json'
            },
            responseType: 'stream'
        });

        // 处理流式响应
        response.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
                if (line.includes('[DONE]')) return;
                if (line.startsWith('data: ')) {
                    try {
                        const json = JSON.parse(line.substring(6));
                        const content = json.choices[0].delta.content;
                        if (content) {
                            res.write(`data: ${JSON.stringify({ type: 'text', content: content })}\n\n`);
                            fullResponseText += content;
                        }
                    } catch (e) {
                        console.error('Error parsing stream chunk', e);
                    }
                }
            }
        });

        response.data.on('end', async () => {
            // 发送来源信息（如果有 RAG 检索结果）
            if (ragSources.length > 0) {
                res.write(`data: ${JSON.stringify({ type: 'sources', sources: ragSources })}\n\n`);
            }
            res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
            res.end();
        });

        response.data.on('error', (err) => {
            console.error('Stream error:', err);
            res.write(`data: ${JSON.stringify({ type: 'error', content: 'Stream Error' })}\n\n`);
            res.end();
        });

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
