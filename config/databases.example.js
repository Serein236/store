// config/database.example.js
const mysql = require('mysql2');

// 创建数据库连接池（更高效）
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'your_database_password', // 请修改为你的数据库密码
    database: 'store',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 创建promise版本的连接池
const promisePool = pool.promise();

// 测试连接
pool.getConnection((err, connection) => {
    if (err) {
        console.error('数据库连接失败:', err);
        return;
    }
    console.log('数据库连接成功');
    connection.release();
});

module.exports = { pool, promisePool };