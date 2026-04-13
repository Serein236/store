const UserModel = require('../models/UserModel');

function requireLogin(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login.html');
    }
}

function checkLoggedIn(req, res, next) {
    req.isLoggedIn = !!req.session.userId;
    next();
}

async function requireAdmin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: '未登录' });
    }

    const isAdmin = await UserModel.isAdmin(req.session.userId);
    if (!isAdmin) {
        return res.status(403).json({ success: false, message: '权限不足，需要管理员权限' });
    }

    next();
}

module.exports = {
    requireLogin,
    checkLoggedIn,
    requireAdmin
};