const express = require('express');
const router = express.Router();
const { handleChatStream } = require('../services/chatService');

// POST /api/chat - 流式聊天接口
router.post('/', handleChatStream);

module.exports = router;
