// controllers/authController.js
const bcrypt = require('bcryptjs');
const UserModel = require('../models/UserModel');
const logger = require('../utils/logger');

const authController = {
    async login(req, res) {
        const { username, password } = req.body;
        
        try {
            const user = await UserModel.findByUsername(username);
            
            if (!user) {
                logger.warn('登录失败：用户不存在', { username, timestamp: new Date().toISOString() });
                return res.json({ 
                    success: false, 
                    message: '用户不存在' 
                });
            }
            
            const isValid = await bcrypt.compare(password, user.password);
            
            if (isValid) {
                req.session.userId = user.id;
                req.session.username = user.username;
                logger.login(user.username, user.id);
                res.json({ success: true });
            } else {
                logger.warn('登录失败：密码错误', { username, timestamp: new Date().toISOString() });
                res.json({ 
                    success: false, 
                    message: '密码错误' 
                });
            }
        } catch (error) {
            console.error('登录错误:', error);
            logger.error('登录失败', { username, error: error.message });
            res.status(500).json({ 
                success: false, 
                message: '服务器错误' 
            });
        }
    },

    logout(req, res) {
        const username = req.session.username;
        const userId = req.session.userId;
        req.session.destroy();
        logger.logout(username, userId);
        res.json({ success: true });
    },

    getCurrentUser(req, res) {
        res.json({ 
            loggedIn: !!req.session.userId, 
            username: req.session.username 
        });
    }
};

module.exports = authController;