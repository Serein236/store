// controllers/authController.js
const bcrypt = require('bcryptjs');
const UserModel = require('../models/UserModel');

const authController = {
    async login(req, res) {
        const { username, password } = req.body;
        
        try {
            const user = await UserModel.findByUsername(username);
            
            if (!user) {
                return res.json({ 
                    success: false, 
                    message: '用户不存在' 
                });
            }
            
            const isValid = await bcrypt.compare(password, user.password);
            
            if (isValid) {
                req.session.userId = user.id;
                req.session.username = user.username;
                res.json({ success: true });
            } else {
                res.json({ 
                    success: false, 
                    message: '密码错误' 
                });
            }
        } catch (error) {
            console.error('登录错误:', error);
            res.status(500).json({ 
                success: false, 
                message: '服务器错误' 
            });
        }
    },

    logout(req, res) {
        req.session.destroy();
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