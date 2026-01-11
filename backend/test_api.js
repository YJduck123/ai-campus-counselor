const axios = require('axios');
require('dotenv').config({ path: '../.env' }); // Adjusting path to find .env

async function testGLM() {
    const apiKey = 'c3b2b55270ec468ab9e9ee63d871cad4.SQNcJlfNcTjYR2hc'; // Direct test
    console.log('Testing GLM API with Key...');

    try {
        const response = await axios.post('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            model: "glm-4",
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: "你好，请简单介绍一下你自己。" }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log('--- Success ---');
        console.log('AI Response:', response.data.choices[0].message.content);
        return true;
    } catch (error) {
        console.error('--- Failure ---');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error Message:', error.message);
        }
        return false;
    }
}

testGLM();
