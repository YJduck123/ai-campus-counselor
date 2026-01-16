/**
 * 向量存储服务 - 内存向量数据库
 * 支持文档存储、相似度计算和 Top-K 检索
 */

const fs = require('fs');
const path = require('path');
const { getEmbedding, getEmbeddings } = require('./embeddingService');

// 内存存储
let documents = [];
let isInitialized = false;
let initializationPromise = null;

/**
 * 计算两个向量的余弦相似度
 * @param {number[]} a - 向量 A
 * @param {number[]} b - 向量 B
 * @returns {number} - 相似度 (0-1)
 */
function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) {
        return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * 从知识库 JSON 文件加载并索引文档
 */
async function initializeFromKnowledge() {
    // 防止重复初始化
    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = (async () => {
        try {
            const knowledgePath = path.join(__dirname, '../knowledge/campus_knowledge.json');

            if (!fs.existsSync(knowledgePath)) {
                console.warn('Knowledge file not found:', knowledgePath);
                isInitialized = true;
                return { success: false, message: 'Knowledge file not found' };
            }

            const knowledgeData = JSON.parse(fs.readFileSync(knowledgePath, 'utf-8'));
            const docsToIndex = [];

            // 解析知识库结构
            for (const category of knowledgeData.categories || []) {
                for (const item of category.items || []) {
                    // 将问题和答案组合成文档
                    const docText = `${item.question}\n${item.answer}`;
                    docsToIndex.push({
                        id: item.id,
                        category: category.name,
                        question: item.question,
                        answer: item.answer,
                        keywords: item.keywords || [],
                        text: docText
                    });
                }
            }

            console.log(`Loading ${docsToIndex.length} documents from knowledge base...`);

            // 批量获取 embeddings
            const texts = docsToIndex.map(doc => doc.text);
            const embeddings = await getEmbeddings(texts);

            // 存储文档和向量
            documents = docsToIndex.map((doc, index) => ({
                ...doc,
                vector: embeddings[index]
            }));

            isInitialized = true;
            console.log(`Vector store initialized with ${documents.length} documents`);

            return { success: true, count: documents.length };
        } catch (error) {
            console.error('Failed to initialize vector store:', error);
            isInitialized = true; // 即使失败也标记为已初始化，避免阻塞
            return { success: false, error: error.message };
        }
    })();

    return initializationPromise;
}

/**
 * 添加单个文档到存储
 * @param {Object} doc - 文档对象 { id, text, metadata }
 */
async function addDocument(doc) {
    const vector = await getEmbedding(doc.text);
    documents.push({
        ...doc,
        vector
    });
}

/**
 * 批量添加文档
 * @param {Object[]} docs - 文档数组
 */
async function addDocuments(docs) {
    const texts = docs.map(d => d.text);
    const embeddings = await getEmbeddings(texts);

    docs.forEach((doc, index) => {
        documents.push({
            ...doc,
            vector: embeddings[index]
        });
    });
}

/**
 * 搜索最相似的文档
 * @param {string} query - 查询文本
 * @param {number} topK - 返回数量
 * @param {number} threshold - 相似度阈值
 * @returns {Promise<Object[]>} - 匹配的文档
 */
async function search(query, topK = 3, threshold = 0.5) {
    if (documents.length === 0) {
        console.warn('Vector store is empty');
        return [];
    }

    // 获取查询向量
    const queryVector = await getEmbedding(query);

    // 计算相似度并排序
    const results = documents
        .map(doc => ({
            id: doc.id,
            category: doc.category,
            question: doc.question,
            answer: doc.answer,
            keywords: doc.keywords,
            score: cosineSimilarity(queryVector, doc.vector)
        }))
        .filter(doc => doc.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    return results;
}

/**
 * 基于关键词的快速匹配（作为向量检索的补充）
 * @param {string} query - 查询文本
 * @param {number} topK - 返回数量
 * @returns {Object[]} - 匹配的文档
 */
function keywordSearch(query, topK = 3) {
    const queryLower = query.toLowerCase();

    const results = documents
        .map(doc => {
            // 计算关键词匹配得分
            let keywordScore = 0;
            for (const keyword of doc.keywords || []) {
                if (queryLower.includes(keyword.toLowerCase())) {
                    keywordScore += 1;
                }
            }

            // 问题匹配加分
            if (doc.question && queryLower.includes(doc.question.substring(0, 10).toLowerCase())) {
                keywordScore += 0.5;
            }

            return {
                id: doc.id,
                category: doc.category,
                question: doc.question,
                answer: doc.answer,
                keywords: doc.keywords,
                score: keywordScore
            };
        })
        .filter(doc => doc.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    return results;
}

/**
 * 混合检索：结合向量检索和关键词检索
 * @param {string} query - 查询文本
 * @param {number} topK - 返回数量
 * @returns {Promise<Object[]>} - 合并去重后的结果
 */
async function hybridSearch(query, topK = 3) {
    // 并行执行两种检索
    const [vectorResults, keywordResults] = await Promise.all([
        search(query, topK, 0.4),
        Promise.resolve(keywordSearch(query, topK))
    ]);

    // 合并结果，去重
    const resultMap = new Map();

    // 向量结果权重 0.7
    for (const doc of vectorResults) {
        resultMap.set(doc.id, {
            ...doc,
            finalScore: doc.score * 0.7
        });
    }

    // 关键词结果权重 0.3
    for (const doc of keywordResults) {
        if (resultMap.has(doc.id)) {
            resultMap.get(doc.id).finalScore += doc.score * 0.3;
        } else {
            resultMap.set(doc.id, {
                ...doc,
                finalScore: doc.score * 0.3
            });
        }
    }

    // 按最终得分排序
    return Array.from(resultMap.values())
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, topK);
}

/**
 * 获取存储状态
 */
function getStats() {
    return {
        documentCount: documents.length,
        isInitialized,
        categories: [...new Set(documents.map(d => d.category))]
    };
}

/**
 * 清空存储
 */
function clear() {
    documents = [];
    isInitialized = false;
    initializationPromise = null;
}

/**
 * 检查是否已初始化
 */
function isReady() {
    return isInitialized;
}

module.exports = {
    initializeFromKnowledge,
    addDocument,
    addDocuments,
    search,
    keywordSearch,
    hybridSearch,
    getStats,
    clear,
    isReady,
    cosineSimilarity
};
