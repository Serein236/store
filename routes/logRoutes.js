const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { requireLogin } = require('../middleware/auth');

// 所有日志路由都需要登录
router.use(requireLogin);

// 获取日志列表（支持筛选）
router.get('/', logController.getLogs);

// 获取原始日志内容
router.get('/raw', logController.getRawLogs);

// 获取可用的日志日期列表
router.get('/dates', logController.getLogDates);

module.exports = router;
