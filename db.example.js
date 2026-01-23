const mysql = require('mysql2');

// 数据库连接配置
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'your_database_password', // 请修改为你的数据库密码
    database: 'store',
    charset: 'utf8mb4'
});

db.connect(err => {
    if (err) {
        console.error('数据库连接失败:', err);
        return;
    }
    console.log('数据库连接成功');
});

module.exports = db;
