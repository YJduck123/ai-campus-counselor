/**
 * API 服务 - 处理与后端的通信
 */

const API_BASE = '/api';

/**
 * 发送聊天消息（流式）
 * @param {string} message - 用户消息
 * @param {Array} history - 历史消息
 * @returns {Promise<Response>} - fetch 响应
 */
export async function sendChatMessage(message, history = []) {
    return fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, history })
    });
}

/**
 * 获取 Xmov 数字人配置
 * @returns {Promise<{appId: string, appSecret: string}>}
 */
export async function getXmovConfig() {
    const response = await fetch(`${API_BASE}/config/xmov`);
    if (!response.ok) {
        throw new Error('Failed to fetch Xmov config');
    }
    return response.json();
}

export default {
    sendChatMessage,
    getXmovConfig
};
