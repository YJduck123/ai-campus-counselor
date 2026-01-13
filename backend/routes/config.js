const express = require('express');
const router = express.Router();
const { getXmovConfig } = require('../services/configService');

// GET /api/config/xmov - 获取数字人配置
router.get('/xmov', (req, res) => {
    res.json(getXmovConfig());
});

module.exports = router;
