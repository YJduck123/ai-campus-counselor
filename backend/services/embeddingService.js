/**
 * Embedding 服务 - 调用智谱 embedding-2 API 将文本转换为向量
 */

const axios = require('axios');

// 缓存已计算的 embedding，避免重复请求
const embeddingCache = new Map();

/**
 * 获取单个文本的 embedding 向量
 * @param {string} text - 输入文本
 * @returns {Promise<number[]>} - 1024维向量
 */
async function getEmbedding(text) {
    if (!text || typeof text !== 'string') {
        throw new Error('Invalid input: text must be a non-empty string');
    }

    // 检查缓存
    const cacheKey = text.trim().substring(0, 500); // 限制缓存key长度
    if (embeddingCache.has(cacheKey)) {
        return embeddingCache.get(cacheKey);
    }

    const apiKey = process.env.GLM_API_KEY;
    if (!apiKey || apiKey.includes('your_')) {
        console.warn('GLM_API_KEY not configured, using fallback embedding');
        return generateFallbackEmbedding(text);
    }

    try {
        const response = await axios.post(
            'https://open.bigmodel.cn/api/paas/v4/embeddings',
            {
                model: 'embedding-2',
                input: text.trim().substring(0, 2000) // 限制输入长度
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        if (response.data && response.data.data && response.data.data[0]) {
            const embedding = response.data.data[0].embedding;
            // 存入缓存
            embeddingCache.set(cacheKey, embedding);
            return embedding;
        }

        throw new Error('Invalid response from embedding API');
    } catch (error) {
        console.error('Embedding API error:', error.message);
        // 失败时使用降级方案
        return generateFallbackEmbedding(text);
    }
}

/**
 * 批量获取多个文本的 embedding
 * @param {string[]} texts - 文本数组
 * @returns {Promise<number[][]>} - 向量数组
 */
async function getEmbeddings(texts) {
    if (!Array.isArray(texts) || texts.length === 0) {
        return [];
    }

    // 并行处理，但限制并发数
    const batchSize = 5;
    const results = [];

    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(text => getEmbedding(text))
        );
        results.push(...batchResults);

        // 添加小延迟避免触发限流
        if (i + batchSize < texts.length) {
            await sleep(100);
        }
    }

    return results;
}

/**
 * 降级方案：基于字符的简单向量化
 * 当 API 不可用时使用
 * @param {string} text - 输入文本
 * @returns {number[]} - 模拟的向量
 */
function generateFallbackEmbedding(text) {
    const dimension = 1024;
    const embedding = new Array(dimension).fill(0);

    // 基于字符编码生成伪向量
    const chars = text.split('');
    for (let i = 0; i < chars.length; i++) {
        const charCode = chars[i].charCodeAt(0);
        const index = (charCode + i) % dimension;
        embedding[index] += 1 / (i + 1);
    }

    // 归一化
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0)) || 1;
    return embedding.map(val => val / norm);
}

/**
 * 清除 embedding 缓存
 */
function clearCache() {
    embeddingCache.clear();
}

/**
 * 获取缓存统计
 */
function getCacheStats() {
    return {
        size: embeddingCache.size,
        keys: Array.from(embeddingCache.keys()).map(k => k.substring(0, 50) + '...')
    };
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    getEmbedding,
    getEmbeddings,
    generateFallbackEmbedding,
    clearCache,
    getCacheStats
};
