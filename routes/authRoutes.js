const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAdmin } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/current-user', authController.getCurrentUser);

// 用户管理API（仅管理员）
router.get('/users', requireAdmin, authController.getUserList);
router.post('/users', requireAdmin, authController.createUser);
router.put('/users/:id', requireAdmin, authController.updateUser);
router.delete('/users/:id', requireAdmin, authController.deleteUser);
router.post('/users/:id/toggle', requireAdmin, authController.toggleUserStatus);
router.get('/check-admin', authController.checkAdmin);

module.exports = router;