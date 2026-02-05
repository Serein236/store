const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '../logs');

class Logger {
    constructor() {
        this.ensureLogsDir();
    }

    ensureLogsDir() {
        if (!fs.existsSync(LOGS_DIR)) {
            fs.mkdirSync(LOGS_DIR, { recursive: true });
        }
    }

    getLogFileName() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}.log`;
    }

    formatTimestamp() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    log(level, message, data = null) {
        const timestamp = this.formatTimestamp();
        const logFileName = path.join(LOGS_DIR, this.getLogFileName());
        
        let logMessage = `[${timestamp}] [${level}] ${message}`;
        if (data) {
            logMessage += `\n${JSON.stringify(data, null, 2)}`;
        }
        logMessage += '\n';

        fs.appendFileSync(logFileName, logMessage, 'utf8');
    }

    info(message, data = null) {
        this.log('INFO', message, data);
    }

    error(message, data = null) {
        this.log('ERROR', message, data);
    }

    warn(message, data = null) {
        this.log('WARN', message, data);
    }

    login(username, userId = null) {
        this.info('用户登录', { username, userId, timestamp: new Date().toISOString() });
    }

    logout(username, userId = null) {
        this.info('用户登出', { username, userId, timestamp: new Date().toISOString() });
    }

    inStock(productId, productName, quantity, batchNumber, userName) {
        this.info('入库操作', {
            productId,
            productName,
            quantity,
            batchNumber,
            userName,
            timestamp: new Date().toISOString()
        });
    }

    outStock(productId, productName, quantity, batchNumber, userName) {
        this.info('出库操作', {
            productId,
            productName,
            quantity,
            batchNumber,
            userName,
            timestamp: new Date().toISOString()
        });
    }

    query(productId, productName, userName) {
        this.info('查询操作', {
            productId,
            productName,
            userName,
            timestamp: new Date().toISOString()
        });
    }

    productOperation(operation, productId, productName, userName) {
        this.info('商品操作', {
            operation,
            productId,
            productName,
            userName,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = new Logger();