const session = require('express-session');

const sessionConfig = {
    secret: 'store-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, 
        maxAge: 24 * 60 * 60 * 1000 // 24小时
    }
};

module.exports = sessionConfig;