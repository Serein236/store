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

    /**
     * 核心日志方法
     * @param {string} level - 日志级别 (INFO|WARN|ERROR)
     * @param {string} action - 操作名称
     * @param {object} details - 操作详情
     * @param {string} details.operator - 操作人用户名
     * @param {number} details.operatorId - 操作人ID
     * @param {string} details.target - 操作对象
     * @param {string} details.description - 操作描述
     * @param {object} details.extra - 额外信息
     */
    log(level, action, details = {}) {
        const timestamp = this.formatTimestamp();
        const logFileName = path.join(LOGS_DIR, this.getLogFileName());
        
        const { operator, operatorId = null, target = '', description = '', extra = null } = details;
        
        // 操作人必须明确传入，未传入则标记为system（系统操作）
        const op = operator || 'system';
        
        // 格式化日志行: [时间] [级别] [操作人|ID] [操作] [目标] [描述]
        let logMessage = `[${timestamp}] [${level}] [${op}|${operatorId || '-'}] ${action}`;
        
        if (target) {
            logMessage += ` | 对象: ${target}`;
        }
        if (description) {
            logMessage += ` | ${description}`;
        }
        
        logMessage += '\n';
        
        // 如有额外数据，另起一行显示
        if (extra && Object.keys(extra).length > 0) {
            logMessage += `    详情: ${JSON.stringify(extra)}\n`;
        }
        
        fs.appendFileSync(logFileName, logMessage, 'utf8');
    }

    /**
     * 信息级别日志
     */
    info(action, details = {}) {
        this.log('INFO', action, details);
    }

    /**
     * 错误级别日志
     */
    error(action, details = {}) {
        this.log('ERROR', action, details);
    }

    /**
     * 警告级别日志
     */
    warn(action, details = {}) {
        this.log('WARN', action, details);
    }

    // ============================================
    // 用户相关操作日志
    // ============================================
    
    login(username, userId) {
        this.info('用户登录', {
            operator: username,
            operatorId: userId,
            description: '用户成功登录系统'
        });
    }

    logout(username, userId) {
        this.info('用户登出', {
            operator: username,
            operatorId: userId,
            description: '用户退出系统'
        });
    }

    userCreated(username, userId, createdBy, createdById) {
        this.info('创建用户', {
            operator: createdBy,
            operatorId: createdById,
            target: username,
            description: `创建新用户: ${username}`,
            extra: { newUserId: userId }
        });
    }

    userUpdated(targetUsername, targetUserId, updatedBy, updatedById, changes) {
        this.info('更新用户', {
            operator: updatedBy,
            operatorId: updatedById,
            target: targetUsername,
            description: `修改用户信息`,
            extra: { targetUserId, changes }
        });
    }

    userPasswordChanged(targetUsername, targetUserId, updatedBy, updatedById) {
        this.info('修改密码', {
            operator: updatedBy,
            operatorId: updatedById,
            target: targetUsername,
            description: '修改用户密码',
            extra: { targetUserId }
        });
    }

    userDeleted(targetUsername, targetUserId, deletedBy, deletedById) {
        this.info('删除用户', {
            operator: deletedBy,
            operatorId: deletedById,
            target: targetUsername,
            description: '删除用户账号',
            extra: { targetUserId }
        });
    }

    userStatusChanged(targetUsername, targetUserId, newStatus, updatedBy, updatedById) {
        this.info('切换用户状态', {
            operator: updatedBy,
            operatorId: updatedById,
            target: targetUsername,
            description: newStatus ? '启用用户' : '禁用用户',
            extra: { targetUserId, isActive: newStatus }
        });
    }

    // ============================================
    // 商品相关操作日志
    // ============================================

    productCreated(productId, productName, productCode, createdBy, createdById, details) {
        this.info('创建商品', {
            operator: createdBy,
            operatorId: createdById,
            target: productName,
            description: `新增商品 [${productCode}]`,
            extra: { productId, ...details }
        });
    }

    productUpdated(productId, productName, productCode, updatedBy, updatedById, changes) {
        this.info('更新商品', {
            operator: updatedBy,
            operatorId: updatedById,
            target: productName,
            description: `修改商品信息 [${productCode}]`,
            extra: { productId, changes }
        });
    }

    productDeleted(productId, productName, productCode, deletedBy, deletedById) {
        this.info('删除商品', {
            operator: deletedBy,
            operatorId: deletedById,
            target: productName,
            description: `删除商品 [${productCode}]`,
            extra: { productId }
        });
    }

    // ============================================
    // 入库操作日志
    // ============================================

    inStock(productId, productName, batchNumber, quantity, unitPrice, totalAmount, method, source, operator, operatorId) {
        this.info('入库操作', {
            operator,
            operatorId,
            target: productName,
            description: `${method}: 入库 ${quantity} ${batchNumber ? `批次[${batchNumber}]` : ''}`,
            extra: { 
                productId, 
                batchNumber, 
                quantity, 
                unitPrice, 
                totalAmount, 
                method, 
                source 
            }
        });
    }

    // ============================================
    // 出库操作日志
    // ============================================

    outStock(productId, productName, batchNumber, quantity, unitPrice, totalAmount, method, destination, operator, operatorId) {
        this.info('出库操作', {
            operator,
            operatorId,
            target: productName,
            description: `${method}: 出库 ${quantity} ${batchNumber ? `批次[${batchNumber}]` : ''}`,
            extra: { 
                productId, 
                batchNumber, 
                quantity, 
                unitPrice, 
                totalAmount, 
                method, 
                destination 
            }
        });
    }

    // ============================================
    // 查询操作日志
    // ============================================

    query(queryType, queryParams, operator, operatorId, resultCount) {
        this.info(queryType, {
            operator,
            operatorId,
            description: `查询操作，返回 ${resultCount} 条结果`,
            extra: { queryParams, resultCount }
        });
    }

    /**
     * 获取出入库方式
     */
    getStockMethods(type, methods, operator, operatorId) {
        this.info('获取出入库方式', {
            operator,
            operatorId,
            description: `获取${type === 'in' ? '入库' : '出库'}方式列表`,
            extra: { type, methods: methods.map(m => m.method_name || m) }
        });
    }

    /**
     * 获取商品批次
     */
    getProductBatches(productId, batches, operator, operatorId) {
        this.info('获取商品批次', {
            operator,
            operatorId,
            description: `查询商品批次库存`,
            extra: { productId, batchCount: batches.length, batches: batches.map(b => ({ batch: b.batch_number, stock: b.current_stock })) }
        });
    }

    // ============================================
    // 备份相关日志
    // ============================================

    backupCreated(fileName, fileSize, backupType, createdBy, createdById) {
        this.info('创建备份', {
            operator: createdBy,
            operatorId: createdById,
            target: fileName,
            description: `创建${backupType === 'auto' ? '自动' : backupType === 'pre_delete' ? '清理前' : '手动'}备份`,
            extra: { fileSize, backupType }
        });
    }

    backupRestored(fileName, restoredBy, restoredById) {
        this.info('恢复备份', {
            operator: restoredBy,
            operatorId: restoredById,
            target: fileName,
            description: '从备份文件恢复数据'
        });
    }

    backupDeleted(fileName, deletedBy, deletedById) {
        this.info('删除备份', {
            operator: deletedBy,
            operatorId: deletedById,
            target: fileName,
            description: '删除备份文件'
        });
    }

    dataCleaned(backupFile, cleanedBy, cleanedById) {
        this.info('清理数据', {
            operator: cleanedBy,
            operatorId: cleanedById,
            target: backupFile,
            description: '清理系统数据（已自动备份）'
        });
    }

    // ============================================
    // 设置相关日志
    // ============================================

    settingsUpdated(settingKey, oldValue, newValue, updatedBy, updatedById) {
        this.info('更新设置', {
            operator: updatedBy,
            operatorId: updatedById,
            target: settingKey,
            description: '修改系统设置',
            extra: { oldValue, newValue }
        });
    }

    passwordChanged(username, userId, isSelf = true) {
        this.info('修改密码', {
            operator: username,
            operatorId: userId,
            description: isSelf ? '修改自己的密码' : '管理员修改密码'
        });
    }

    // 兼容旧方法的包装
    productOperation(operation, productId, productName, userName) {
        this.info(operation, {
            operator: userName,
            target: productName,
            description: operation,
            extra: { productId }
        });
    }
}

module.exports = new Logger();