/**
 * RAG 检索服务 - 检索增强生成
 * 负责从知识库检索相关信息并格式化为上下文
 */

const vectorStore = require('./vectorStore');

/**
 * 检索相关知识并格式化为上下文
 * @param {string} query - 用户查询
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} - 检索结果
 */
async function retrieveContext(query, options = {}) {
    const {
        topK = 3,
        includeScore = false,
        minScore = 0.4
    } = options;

    try {
        // 检查向量存储是否就绪
        if (!vectorStore.isReady()) {
            console.warn('Vector store not ready, skipping RAG retrieval');
            return {
                success: false,
                context: '',
                sources: [],
                message: 'Knowledge base not initialized'
            };
        }

        // 使用混合检索
        const results = await vectorStore.hybridSearch(query, topK);

        if (results.length === 0) {
            return {
                success: true,
                context: '',
                sources: [],
                message: 'No relevant documents found'
            };
        }

        // 格式化检索结果为上下文
        const contextParts = results.map((doc, index) => {
            const scoreInfo = includeScore ? ` (相关度: ${(doc.finalScore * 100).toFixed(1)}%)` : '';
            return `【参考资料 ${index + 1}】${doc.category}${scoreInfo}\n问：${doc.question}\n答：${doc.answer}`;
        });

        const context = contextParts.join('\n\n---\n\n');

        // 返回结构化结果
        return {
            success: true,
            context,
            sources: results.map(doc => ({
                id: doc.id,
                category: doc.category,
                question: doc.question,
                score: doc.finalScore
            })),
            message: `Found ${results.length} relevant documents`
        };
    } catch (error) {
        console.error('RAG retrieval error:', error);
        return {
            success: false,
            context: '',
            sources: [],
            message: error.message
        };
    }
}

/**
 * 构建增强后的提示词
 * @param {string} userQuery - 用户原始问题
 * @param {string} context - 检索到的上下文
 * @returns {string} - 增强后的提示词
 */
function buildAugmentedPrompt(userQuery, context) {
    if (!context || context.trim() === '') {
        return userQuery;
    }

    return `以下是从校园知识库中检索到的相关参考信息：

${context}

---

请基于以上参考信息，准确回答用户的问题。如果参考信息不足以回答问题，可以结合你的知识进行补充，但要明确告知用户哪些是来自知识库的准确信息，哪些是补充说明。

用户问题：${userQuery}`;
}

/**
 * 判断查询是否需要 RAG 检索
 * @param {string} query - 用户查询
 * @returns {boolean} - 是否需要检索
 */
function needsRetrieval(query) {
    // 校园相关关键词
    const campusKeywords = [
        '图书馆', '食堂', '宿舍', '教室', '体育馆', '校医院',
        '奖学金', '助学金', '贷款', '补助',
        '选课', '退课', '成绩', '绩点', '挂科', '补考', '重修',
        '报到', '入学', '毕业', '转专业', '休学', '退学',
        '校园卡', '充值', '挂失',
        '快递', 'WiFi', '网络', '打印',
        '医保', '报销', '就诊',
        '怎么', '如何', '在哪', '什么时候', '流程', '申请', '办理', '规定'
    ];

    const queryLower = query.toLowerCase();
    return campusKeywords.some(keyword => queryLower.includes(keyword));
}

/**
 * 完整的 RAG 检索流程
 * @param {string} query - 用户查询
 * @returns {Promise<Object>} - 包含增强提示和源信息
 */
async function performRAG(query) {
    // 判断是否需要检索
    const shouldRetrieve = needsRetrieval(query);

    if (!shouldRetrieve) {
        return {
            augmentedPrompt: query,
            usedRAG: false,
            sources: []
        };
    }

    // 执行检索
    const retrievalResult = await retrieveContext(query, {
        topK: 3,
        includeScore: true
    });

    // 构建增强提示
    const augmentedPrompt = buildAugmentedPrompt(query, retrievalResult.context);

    return {
        augmentedPrompt,
        usedRAG: retrievalResult.success && retrievalResult.sources.length > 0,
        sources: retrievalResult.sources,
        context: retrievalResult.context
    };
}

module.exports = {
    retrieveContext,
    buildAugmentedPrompt,
    needsRetrieval,
    performRAG
};
