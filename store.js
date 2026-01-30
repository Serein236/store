const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');

const app = express();
const port = 3000;

// 中间件配置
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
    secret: 'store-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24小时
}));



// 登录验证中间件
function requireLogin(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login.html');
    }
}

// API路由
// 登录
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const [rows] = await db.promise().query('SELECT * FROM users WHERE username = ?', [username]);
        
        if (rows.length === 0) {
            return res.json({ success: false, message: '用户不存在' });
        }
        
        const user = rows[0];
        const isValid = await bcrypt.compare(password, user.password);
        
        if (isValid) {
            req.session.userId = user.id;
            req.session.username = user.username;
            res.json({ success: true });
        } else {
            res.json({ success: false, message: '密码错误' });
        }
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 退出登录
app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// 获取当前用户
app.get('/api/current-user', (req, res) => {
    res.json({ 
        loggedIn: !!req.session.userId, 
        username: req.session.username 
    });
});

// 商品相关API
// 获取所有商品
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM products ORDER BY id DESC');
        res.json(rows);
    } catch (error) {
        console.error('获取商品错误:', error);
        res.status(500).json({ error: '获取商品失败' });
    }
});

// 添加商品
app.post('/api/products', async (req, res) => {
    const { name, spec, unit, packing_spec, retail_price } = req.body;
    
    try {
        const [result] = await db.promise().query(
            'INSERT INTO products (name, spec, unit, packing_spec, retail_price) VALUES (?, ?, ?, ?, ?)',
            [name, spec, unit, packing_spec, retail_price]
        );
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('添加商品错误:', error);
        res.status(500).json({ success: false, message: '添加商品失败' });
    }
});

// 更新商品
app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { name, spec, unit, packing_spec, retail_price } = req.body;
    
    try {
        await db.promise().query(
            'UPDATE products SET name = ?, spec = ?, unit = ?, packing_spec = ?, retail_price = ? WHERE id = ?',
            [name, spec, unit, packing_spec, retail_price, id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('更新商品错误:', error);
        res.status(500).json({ success: false, message: '更新商品失败' });
    }
});

// 删除商品
app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        await db.promise().query('DELETE FROM products WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('删除商品错误:', error);
        res.status(500).json({ success: false, message: '删除商品失败' });
    }
});

// 入库操作 - 修复时区问题
app.post('/api/in', async (req, res) => {
    const { product_id, type, quantity, remark, source, recorded_date } = req.body;
    
    try {
        // 修复时区问题：确保存储正确的日期
        const dateObj = new Date(recorded_date);
        // 添加8小时（中国时区UTC+8），确保日期正确
        const adjustedDate = new Date(dateObj.getTime() + (8 * 60 * 60 * 1000));
        const formattedDate = adjustedDate.toISOString().split('T')[0];
        
        // 开始事务
        await db.promise().beginTransaction();
        
        // 添加入库记录
        await db.promise().query(
            'INSERT INTO in_records (product_id, type, quantity, remark, source, recorded_date) VALUES (?, ?, ?, ?, ?, ?)',
            [product_id, type, quantity, remark, source, formattedDate]
        );
        
        // 更新商品库存
        await db.promise().query(
            'UPDATE products SET stock = stock + ? WHERE id = ?',
            [quantity, product_id]
        );
        
        await db.promise().commit();
        res.json({ success: true });
    } catch (error) {
        await db.promise().rollback();
        console.error('入库错误:', error);
        res.status(500).json({ success: false, message: '入库失败' });
    }
});

// 出库操作 - 修复时区问题
app.post('/api/out', async (req, res) => {
    const { product_id, type, quantity, remark, destination, recorded_date } = req.body;
    
    try {
        // 修复时区问题
        const dateObj = new Date(recorded_date);
        const adjustedDate = new Date(dateObj.getTime() + (8 * 60 * 60 * 1000));
        const formattedDate = adjustedDate.toISOString().split('T')[0];
        
        // 检查库存是否足够
        const [rows] = await db.promise().query('SELECT stock FROM products WHERE id = ?', [product_id]);
        
        if (rows.length === 0 || rows[0].stock < quantity) {
            return res.json({ success: false, message: '库存不足' });
        }
        
        // 开始事务
        await db.promise().beginTransaction();
        
        // 添加出库记录
        await db.promise().query(
            'INSERT INTO out_records (product_id, type, quantity, remark, destination, recorded_date) VALUES (?, ?, ?, ?, ?, ?)',
            [product_id, type, quantity, remark, destination, formattedDate]
        );
        
        // 更新商品库存
        await db.promise().query(
            'UPDATE products SET stock = stock - ? WHERE id = ?',
            [quantity, product_id]
        );
        
        await db.promise().commit();
        res.json({ success: true });
    } catch (error) {
        await db.promise().rollback();
        console.error('出库错误:', error);
        res.status(500).json({ success: false, message: '出库失败' });
    }
});

// 获取入库记录 - 使用DATE_FORMAT确保日期正确
app.get('/api/in-records', async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT i.*, 
                   DATE_FORMAT(i.recorded_date, '%Y-%m-%d') as display_date,
                   p.name as product_name 
            FROM in_records i 
            JOIN products p ON i.product_id = p.id 
            ORDER BY i.recorded_date DESC, i.created_at DESC
        `);
        
        // 重命名display_date为recorded_date，方便前端使用
        const formattedRows = rows.map(row => ({
            ...row,
            recorded_date: row.display_date
        }));
        
        res.json(formattedRows);
    } catch (error) {
        console.error('获取入库记录错误:', error);
        res.status(500).json({ error: '获取入库记录失败' });
    }
});

// 获取出库记录 - 使用DATE_FORMAT确保日期正确
app.get('/api/out-records', async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT o.*, 
                   DATE_FORMAT(o.recorded_date, '%Y-%m-%d') as display_date,
                   p.name as product_name 
            FROM out_records o 
            JOIN products p ON o.product_id = p.id 
            ORDER BY o.recorded_date DESC, o.created_at DESC
        `);
        
        const formattedRows = rows.map(row => ({
            ...row,
            recorded_date: row.display_date
        }));
        
        res.json(formattedRows);
    } catch (error) {
        console.error('获取出库记录错误:', error);
        res.status(500).json({ error: '获取出库记录失败' });
    }
});

// 获取库存信息
app.get('/api/stock', async (req, res) => {
    try {
        const [products] = await db.promise().query(`
            SELECT p.*, 
                   IFNULL(SUM(i.quantity), 0) as total_in,
                   IFNULL(SUM(o.quantity), 0) as total_out
            FROM products p
            LEFT JOIN in_records i ON p.id = i.product_id
            LEFT JOIN out_records o ON p.id = o.product_id
            GROUP BY p.id
            ORDER BY p.id DESC
        `);
        res.json(products);
    } catch (error) {
        console.error('获取库存错误:', error);
        res.status(500).json({ error: '获取库存失败' });
    }
});

// 查询特定商品库存详情
app.get('/api/query/:productId', async (req, res) => {
    const { productId } = req.params;
    const { month } = req.query;
    
    try {
        // 获取商品基本信息
        const [product] = await db.promise().query('SELECT * FROM products WHERE id = ?', [productId]);
        
        if (product.length === 0) {
            return res.json({ success: false, message: '商品不存在' });
        }
        
        // 确保retail_price和stock是数字类型
        const formattedProduct = {
            ...product[0],
            retail_price: parseFloat(product[0].retail_price) || 0,
            stock: parseInt(product[0].stock) || 0
        };
        
        // 构建查询条件
        let whereCondition = 'WHERE product_id = ?';
        const params = [productId];
        
        if (month) {
            whereCondition += ' AND DATE_FORMAT(recorded_date, "%Y-%m") = ?';
            params.push(month);
        }
        
        // 获取入库记录 - 使用DATE_FORMAT格式化日期
        const [inRecords] = await db.promise().query(
            `SELECT *, DATE_FORMAT(recorded_date, '%Y-%m-%d') as display_date 
             FROM in_records ${whereCondition} ORDER BY recorded_date DESC`,
            params
        );
        
        // 获取出库记录
        const [outRecords] = await db.promise().query(
            `SELECT *, DATE_FORMAT(recorded_date, '%Y-%m-%d') as display_date 
             FROM out_records ${whereCondition} ORDER BY recorded_date DESC`,
            params
        );
        
        // 按月统计 - 使用DATE_FORMAT确保正确的月份格式
        const [monthlyStats] = await db.promise().query(`
            SELECT 
                DATE_FORMAT(recorded_date, '%Y-%m') as month,
                SUM(CASE WHEN type IN ('purchase', 'return') THEN quantity ELSE 0 END) as in_quantity,
                SUM(CASE WHEN type = 'sale' THEN quantity ELSE 0 END) as out_quantity
            FROM (
                SELECT product_id, type, quantity, recorded_date FROM in_records
                UNION ALL
                SELECT product_id, type, quantity, recorded_date FROM out_records
            ) as records
            WHERE product_id = ?
            GROUP BY DATE_FORMAT(recorded_date, '%Y-%m')
            ORDER BY month DESC
        `, [productId]);
        
        res.json({
            success: true,
            product: formattedProduct,
            inRecords: inRecords.map(record => ({
                ...record,
                recorded_date: record.display_date
            })),
            outRecords: outRecords.map(record => ({
                ...record,
                recorded_date: record.display_date
            })),
            monthlyStats
        });
    } catch (error) {
        console.error('查询错误:', error);
        res.status(500).json({ success: false, message: '查询失败' });
    }
});

// 保护所有需要登录的页面
app.get(['/index.html', '/products.html', '/in.html', '/out.html', '/stock.html', '/query.html'], 
    requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', req.path));
});

app.get('/', (req, res) => {
    res.redirect('/index.html');
});

// 启动服务器
app.listen(port, () => {
    console.log(`仓库管理系统运行在 http://localhost:${port}`);
});