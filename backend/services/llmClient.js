/**
 * GLM client helpers (non-streaming)
 */

const axios = require('axios');

function hasRealApiKey() {
  const apiKey = process.env.GLM_API_KEY;
  return Boolean(apiKey && !apiKey.includes('your_'));
}

function getApiKey() {
  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey || apiKey.includes('your_')) return null;
  return apiKey;
}

async function chatCompletion(messages, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      ok: false,
      content:
        '【模拟模式】未配置 GLM_API_KEY，无法进行多 Agent 编排调用。请在 backend/.env 中配置真实 Key 后重试。'
    };
  }

  const {
    model = 'glm-4',
    temperature = 0.2,
    maxTokens = 1200,
    timeoutMs = 30000
  } = options;

  const response = await axios.post(
    'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    {
      model,
      stream: false,
      temperature,
      max_tokens: maxTokens,
      messages
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: timeoutMs
    }
  );

  const content = response?.data?.choices?.[0]?.message?.content;
  if (!content) {
    return { ok: false, content: '', raw: response.data };
  }

  return { ok: true, content, raw: response.data };
}

function extractFirstJsonObject(text) {
  if (!text) return null;

  // Remove ```json fences if present
  const cleaned = String(text)
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const start = cleaned.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth === 0) {
      const jsonText = cleaned.slice(start, i + 1);
      try {
        return JSON.parse(jsonText);
      } catch (_) {
        return null;
      }
    }
  }

  return null;
}

module.exports = {
  hasRealApiKey,
  chatCompletion,
  extractFirstJsonObject
};

