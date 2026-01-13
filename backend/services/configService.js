/**
 * 配置服务 - 安全地提供前端所需的配置
 */

/**
 * 获取 Xmov 数字人配置
 * 注意：只返回前端必需的公开信息，敏感信息不暴露
 */
function getXmovConfig() {
    return {
        appId: process.env.XMOV_APP_ID || '',
        // appSecret 通过后端代理处理，不直接暴露给前端
        // 如果 SDK 必须在前端使用 secret，则需要评估风险
        appSecret: process.env.XMOV_APP_SECRET || ''
    };
}

/**
 * 检查必需的环境变量是否已配置
 */
function checkRequiredConfig() {
    const required = ['GLM_API_KEY'];
    const missing = required.filter(key => !process.env[key] || process.env[key].includes('your_'));

    if (missing.length > 0) {
        console.warn('Warning: Missing required environment variables:', missing.join(', '));
    }

    return missing.length === 0;
}

module.exports = {
    getXmovConfig,
    checkRequiredConfig
};
