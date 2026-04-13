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

            // 检查用户是否被禁用
            if (user.is_active === false || user.is_active === 0) {
                logger.warn('登录失败：用户已被禁用', { username, timestamp: new Date().toISOString() });
                return res.json({
                    success: false,
                    message: '账号已被禁用，请联系管理员'
                });
            }

            const isValid = await bcrypt.compare(password, user.password);

            if (isValid) {
                req.session.userId = user.id;
                req.session.username = user.username;
                logger.login(user.username, user.id);
                res.json({ success: true, role: user.role });
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
    },

    // 检查当前用户是否为管理员
    async checkAdmin(req, res) {
        try {
            if (!req.session.userId) {
                return res.json({ isAdmin: false });
            }
            const isAdmin = await UserModel.isAdmin(req.session.userId);
            res.json({ isAdmin });
        } catch (error) {
            console.error('检查管理员权限错误:', error);
            res.json({ isAdmin: false });
        }
    },

    // 获取用户列表
    async getUserList(req, res) {
        try {
            const users = await UserModel.findAll();
            res.json({ success: true, users });
        } catch (error) {
            console.error('获取用户列表错误:', error);
            res.status(500).json({ success: false, message: '获取用户列表失败' });
        }
    },

    // 创建用户
    async createUser(req, res) {
        const { username, password, role = 'user' } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: '密码至少需要6位' });
        }

        try {
            // 检查用户名是否已存在
            const existingUser = await UserModel.findByUsername(username);
            if (existingUser) {
                return res.status(400).json({ success: false, message: '用户名已存在' });
            }

            // 加密密码
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            await UserModel.create({ username, password: hashedPassword, role });

            logger.info('创建用户成功', { username, role, createdBy: req.session.username });
            res.json({ success: true, message: '用户创建成功' });
        } catch (error) {
            console.error('创建用户错误:', error);
            res.status(500).json({ success: false, message: '创建用户失败' });
        }
    },

    // 更新用户
    async updateUser(req, res) {
        const { id } = req.params;
        const { username, role, password } = req.body;

        try {
            // 检查用户是否存在
            const user = await UserModel.findById(id);
            if (!user) {
                return res.status(404).json({ success: false, message: '用户不存在' });
            }

            // 如果提供了密码，执行密码修改
            if (password) {
                if (password.length < 6) {
                    return res.status(400).json({ success: false, message: '密码至少需要6位' });
                }

                // 加密密码
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);

                await UserModel.updatePassword(id, hashedPassword);

                logger.info('修改用户密码成功', { userId: id, username: user.username, updatedBy: req.session.username });
                return res.json({ success: true, message: '密码修改成功' });
            }

            // 否则执行用户信息更新（用户名和角色）
            // 不能修改自己的角色
            if (parseInt(id) === req.session.userId && role !== undefined) {
                return res.status(400).json({ success: false, message: '不能修改自己的角色' });
            }

            // 如果要修改用户名，检查是否与其他用户冲突
            if (username && username !== user.username) {
                const existingUser = await UserModel.findByUsername(username);
                if (existingUser && existingUser.id !== parseInt(id)) {
                    return res.status(400).json({ success: false, message: '用户名已存在' });
                }
            }

            await UserModel.update(id, { username, role });

            logger.info('更新用户成功', { userId: id, username, role, updatedBy: req.session.username });
            res.json({ success: true, message: '用户更新成功' });
        } catch (error) {
            console.error('更新用户错误:', error);
            res.status(500).json({ success: false, message: '更新用户失败' });
        }
    },

    // 删除用户
    async deleteUser(req, res) {
        const { id } = req.params;

        try {
            // 不能删除自己
            if (parseInt(id) === req.session.userId) {
                return res.status(400).json({ success: false, message: '不能删除当前登录的用户' });
            }

            // 检查用户是否存在
            const user = await UserModel.findById(id);
            if (!user) {
                return res.status(404).json({ success: false, message: '用户不存在' });
            }

            // 不能删除最后一个管理员
            if (user.role === 'admin') {
                const allUsers = await UserModel.findAll();
                const adminCount = allUsers.filter(u => u.role === 'admin' && u.is_active).length;
                if (adminCount <= 1) {
                    return res.status(400).json({ success: false, message: '不能删除最后一个管理员' });
                }
            }

            await UserModel.delete(id);

            logger.info('删除用户成功', { userId: id, deletedBy: req.session.username });
            res.json({ success: true, message: '用户删除成功' });
        } catch (error) {
            console.error('删除用户错误:', error);
            res.status(500).json({ success: false, message: '删除用户失败' });
        }
    },

    // 切换用户状态（启用/禁用）
    async toggleUserStatus(req, res) {
        const { id } = req.params;

        try {
            // 不能禁用自己
            if (parseInt(id) === req.session.userId) {
                return res.status(400).json({ success: false, message: '不能禁用当前登录的用户' });
            }

            // 检查用户是否存在
            const user = await UserModel.findById(id);
            if (!user) {
                return res.status(404).json({ success: false, message: '用户不存在' });
            }

            // 如果要禁用管理员，检查是否还有其它管理员
            if (user.is_active && user.role === 'admin') {
                const allUsers = await UserModel.findAll();
                const activeAdminCount = allUsers.filter(u => u.role === 'admin' && u.is_active).length;
                if (activeAdminCount <= 1) {
                    return res.status(400).json({ success: false, message: '不能禁用最后一个管理员' });
                }
            }

            const newStatus = !user.is_active;
            await UserModel.update(id, { is_active: newStatus });

            const statusText = newStatus ? '启用' : '禁用';
            logger.info(`${statusText}用户成功`, { userId: id, updatedBy: req.session.username });
            res.json({ success: true, message: `用户已${statusText}`, isActive: newStatus });
        } catch (error) {
            console.error('切换用户状态错误:', error);
            res.status(500).json({ success: false, message: '操作失败' });
        }
    }
};

module.exports = authController;