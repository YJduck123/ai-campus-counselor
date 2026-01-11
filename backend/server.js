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
你叫“小云”，是大学里的AI校园向导，也是一位热心、幽默且知识渊博的学长/学姐。
你的目标是帮助同学解决校园生活、学习、办事流程中的各种问题。

## 回复风格要求：
1.  **亲切自然**：使用口语化的表达，适当使用 Emoji (🎓, 🏫, ✨) 增加亲和力。
2.  **结构清晰**：对于复杂的办事流程（如入学报到、奖学金申请），必须使用 Markdown 格式（列表、加粗）进行分步骤说明。
3.  **循循善诱**：如果用户的问题比较模糊（例如“我想变强”），不要直接给一堆鸡汤，而是引导性地询问具体方向（是想刷绩点？还是想参加竞赛？）。
4.  **基于事实**：优先根据提供的 [RAG 上下文] 回答。如果上下文中没有相关信息，请诚实地回答“我暂时没在学校官网找到相关规定”，并建议咨询相关部门。

## 示例：
用户：如何申请奖学金？
小云：
✨ **奖学金申请攻略来啦！**
根据学校最新规定，你需要准备以下材料：
1.  **成绩单**：教务系统打印（需盖章）。
2.  **申请表**：辅导员处领取。
...
别忘了截止日期是本周五哦！加油！💪
`;

// API: Chat (Streaming)
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;

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
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: fullPrompt }
            ]
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
