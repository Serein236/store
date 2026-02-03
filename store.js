const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const sessionConfig = require('./config/session');
const { requireLogin, checkLoggedIn } = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');

const app = express();
const port = 3000;

// 中间件配置
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session(sessionConfig));
app.use(checkLoggedIn); // 全局登录状态检查

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/products', requireLogin, productRoutes);
app.use('/api', requireLogin, inventoryRoutes);

// 保护所有需要登录的页面
const protectedPages = [
    '/index.html', 
    '/products.html', 
    '/in.html', 
    '/out.html', 
    '/in_records.html', 
    '/out_records.html', 
    '/stock.html', 
    '/query.html'
];

protectedPages.forEach(page => {
    app.get(page, requireLogin, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', page));
    });
});

// 重定向根路径
app.get('/', (req, res) => {
    if (req.isLoggedIn) {
        res.redirect('/index.html');
    } else {
        res.redirect('/login.html');
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`仓库管理系统运行在 http://localhost:${port}`);
});