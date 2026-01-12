const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// System Prompt
const SYSTEM_PROMPT = `
你叫“小云”，是大学里的AI校园向导，也是一位热心、幽默且知识渊博的学长。
你现在拥有两个模式，根据用户的输入自动切换：

### 模式 1：校园咨询 (默认)
- 目标：解答校园生活、学习、办事流程中的问题。
- 回复风格：亲切自然，使用 Emoji，结构清晰。

### 模式 2：AI 导师陪练与评测模式 (当用户提到“开始面试”、“练习”、“考考我”时)
- **核心目标**：作为一名专业的“AI 导师”，根据用户指定的场景进行 1 对 1 的模拟练习和专业评测。
- **支持场景**：学生会招新、企业求职面试、英语口语对练、学科知识点考核等。
- **流程规范**：
    1. **初始化**：询问用户想要练习的具体场景（如果用户还没说）。
    2. **角色扮演**：一旦确定场景，立即进入角色（如：资深HR、外籍教师、学科教授）。
    3. **提问与反馈环**：
       - 一次只提一个问题。
       - 用户回答后，必须先给出【评测建议】（指出回答质量、语法错误或知识漏洞）。
       - 然后抛出下一个更具挑战性的问题。
    4. **总结**：结束后给出【综合素质评估报告】。
- **回复风格**：专业、严谨且具有引导性。
`;

// API: Chat (Streaming)
app.post('/api/chat', async (req, res) => {
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

        // 1. Search for context (Firecrawl)
        let context = "";
        if (process.env.FIRECRAWL_API_KEY && !process.env.FIRECRAWL_API_KEY.includes('your_')) {
            context = await searchCampusInfo(message);
        }

        // 2. Prepare GLM Stream
        const fullPrompt = context 
            ? `以下是搜索到的参考背景信息：\n${context}\n\n请结合以上信息回答用户的问题：${message}`
            : message;
        
        // 3. Prepare messages array with history
        const apiMessages = [
            { role: "system", content: SYSTEM_PROMPT }
        ];

        // Add history if exists
        if (history && Array.isArray(history)) {
            history.forEach(h => {
                if (h.role && h.content) {
                    apiMessages.push({ role: h.role, content: h.content });
                }
            });
        }

        // Add current user prompt
        apiMessages.push({ role: "user", content: fullPrompt });

        // Accumulate full text for digital human generation later
        let fullResponseText = "";

        if (!process.env.GLM_API_KEY || process.env.GLM_API_KEY.includes('your_')) {
            // Simulation for no API Key
            const mockText = "正在模拟流式输出... 请配置真实的 GLM_API_KEY 以获得最佳体验。";
            let i = 0;
            const interval = setInterval(() => {
                if (i < mockText.length) {
                    const char = mockText[i++];
                    res.write(`data: ${JSON.stringify({ type: 'text', content: char })}\n\n`);
                    fullResponseText += char;
                } else {
                    clearInterval(interval);
                    finishStream(res, fullResponseText);
                }
            }, 50);
            return;
        }

        const response = await axios.post('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            model: "glm-4",
            stream: true, // Enable Streaming
            messages: apiMessages
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.GLM_API_KEY}`,
                'Content-Type': 'application/json'
            },
            responseType: 'stream' // Important for axios
        });

        // Handle the stream from GLM
        response.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
                if (line.includes('[DONE]')) return; // Stream finished
                if (line.startsWith('data: ')) {
                    try {
                        const json = JSON.parse(line.substring(6));
                        const content = json.choices[0].delta.content;
                        if (content) {
                            // Send chunk to frontend
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
            await finishStream(res, fullResponseText);
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
});

// Helper to finish stream
async function finishStream(res, fullText) {
    // Send Done event
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
}

// Function to search campus info via Firecrawl
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
            }
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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
