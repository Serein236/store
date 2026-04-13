// services/InventoryService.js
const ProductModel = require('../models/ProductModel');
const InRecordModel = require('../models/InRecordModel');
const OutRecordModel = require('../models/OutRecordModel');
const StockModel = require('../models/StockModel');
const dbUtils = require('../utils/dbUtils');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const bcrypt = require('bcryptjs');

// 导入数据库配置获取连接信息
let dbConfigObj = null;
try {
    const dbModule = require('../config/databases');
    dbConfigObj = dbModule.dbConfig || null;
} catch (e) {
    console.error('加载数据库配置失败:', e);
}

const InventoryService = {
    async inStock(data) {
        return await dbUtils.executeTransaction(async (connection) => {
            // 添加入库记录
            const record = await InRecordModel.create(data);
            
            // 检查批次库存是否存在
            const existingBatch = await dbUtils.queryOne(
                'SELECT * FROM batch_stock WHERE product_id = ? AND batch_number = ?',
                [data.product_id, data.batch_number]
            );
            
            if (existingBatch) {
                // 更新批次库存
                await dbUtils.update(
                    'UPDATE batch_stock SET batch_in_quantity = batch_in_quantity + ?, batch_current_stock = batch_current_stock + ? WHERE id = ?',
                    [data.quantity, data.quantity, existingBatch.id]
                );
            } else {
                // 创建新批次库存
                await dbUtils.insert(
                    'INSERT INTO batch_stock (product_id, batch_number, production_date, expiration_date, batch_in_quantity, batch_out_quantity, batch_current_stock, batch_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [data.product_id, data.batch_number, data.production_date, data.expiration_date, data.quantity, 0, data.quantity, 'normal']
                );
            }
            
            // 更新总库存
            await StockModel.updateStock(data.product_id, data.quantity, 0);
            
            return record;
        });
    },

    async outStock(data) {
        return await dbUtils.executeTransaction(async (connection) => {
            // 检查批次库存
            const batchStock = await dbUtils.queryOne(
                'SELECT * FROM batch_stock WHERE product_id = ? AND batch_number = ?',
                [data.product_id, data.batch_number]
            );
            
            if (!batchStock || batchStock.batch_current_stock < data.quantity) {
                throw new Error('批次库存不足');
            }
            
            // 检查总库存
            const stock = await StockModel.findByProductId(data.product_id);
            if (!stock || stock.current_stock < data.quantity) {
                throw new Error('总库存不足');
            }
            
            // 添加出库记录
            const record = await OutRecordModel.create(data);
            
            // 更新批次库存
            await dbUtils.update(
                'UPDATE batch_stock SET batch_out_quantity = batch_out_quantity + ?, batch_current_stock = batch_current_stock - ? WHERE id = ?',
                [data.quantity, data.quantity, batchStock.id]
            );
            
            // 更新总库存（减少库存）
            await StockModel.updateStock(data.product_id, 0, data.quantity);
            
            return record;
        });
    },

    async getStockReport() {
        return await StockModel.getBatchStockReport();
    },

    async getProductDetail(productId, month = null) {
        const product = await ProductModel.findById(productId);
        console.log('ProductModel.findById返回结果:', product);
        if (!product) {
            throw new Error('商品不存在');
        }

        const inRecords = await InRecordModel.findByProductId(productId, month);
        const outRecords = await OutRecordModel.findByProductId(productId, month);
        console.log('OutRecordModel.findByProductId返回结果:', outRecords);
        
        const monthlyStats = await dbUtils.query(`
            SELECT 
                DATE_FORMAT(recorded_date, '%Y-%m') as month,
                SUM(CASE WHEN table_type = 'in' THEN quantity ELSE 0 END) as in_quantity,
                SUM(CASE WHEN table_type = 'out' THEN quantity ELSE 0 END) as out_quantity
            FROM (
                SELECT 'in' as table_type, product_id, quantity, recorded_date FROM in_records
                UNION ALL
                SELECT 'out' as table_type, product_id, quantity, recorded_date FROM out_records
            ) as records
            WHERE product_id = ?
            GROUP BY DATE_FORMAT(recorded_date, '%Y-%m')
            ORDER BY month DESC
        `, [productId]);

        // 查询批次库存信息
        const batchStock = await dbUtils.query(`
            SELECT 
                batch_number, 
                production_date, 
                expiration_date, 
                batch_current_stock as current_stock
            FROM batch_stock 
            WHERE product_id = ? 
            ORDER BY batch_current_stock DESC
        `, [productId]);

        return {
            product,
            inRecords: inRecords.map(record => ({
                ...record,
                recorded_date: record.display_date
            })),
            outRecords: outRecords.map(record => ({
                ...record,
                recorded_date: record.display_date,
                production_date: record.production_date,
                expiration_date: record.expiration_date
            })),
            monthlyStats,
            batchStock
        };
    },

    async cancelInStock(inRecordId) {
        return await dbUtils.executeTransaction(async (connection) => {
            // 获取入库记录
            const inRecord = await InRecordModel.findById(inRecordId);
            if (!inRecord) {
                throw new Error('入库记录不存在');
            }

            // 检查批次库存是否足够
            const batchStock = await dbUtils.queryOne(
                'SELECT * FROM batch_stock WHERE product_id = ? AND batch_number = ?',
                [inRecord.product_id, inRecord.batch_number]
            );

            if (!batchStock || batchStock.batch_current_stock < inRecord.quantity) {
                throw new Error('批次库存不足，无法撤销');
            }

            // 检查总库存是否足够
            const stock = await StockModel.findByProductId(inRecord.product_id);
            if (!stock || stock.current_stock < inRecord.quantity) {
                throw new Error('总库存不足，无法撤销');
            }

            // 更新批次库存
            await dbUtils.update(
                'UPDATE batch_stock SET batch_in_quantity = batch_in_quantity - ?, batch_current_stock = batch_current_stock - ? WHERE id = ?',
                [inRecord.quantity, inRecord.quantity, batchStock.id]
            );

            // 更新总库存（减少库存）
            await StockModel.updateStock(inRecord.product_id, 0, inRecord.quantity);

            // 删除入库记录
            await InRecordModel.delete(inRecordId);

            return { success: true };
        });
    },

    async updateInStock(inRecordId, data) {
        return await dbUtils.executeTransaction(async (connection) => {
            // 获取原始入库记录
            const originalRecord = await InRecordModel.findById(inRecordId);
            if (!originalRecord) {
                throw new Error('入库记录不存在');
            }

            // 计算数量差异
            const quantityDiff = data.quantity - originalRecord.quantity;

            if (quantityDiff !== 0) {
                // 检查批次库存是否足够（如果减少库存）
                if (quantityDiff < 0) {
                    const batchStock = await dbUtils.queryOne(
                        'SELECT * FROM batch_stock WHERE product_id = ? AND batch_number = ?',
                        [originalRecord.product_id, originalRecord.batch_number]
                    );

                    if (!batchStock || batchStock.batch_current_stock < Math.abs(quantityDiff)) {
                        throw new Error('批次库存不足，无法修改');
                    }

                    // 检查总库存是否足够
                    const stock = await StockModel.findByProductId(originalRecord.product_id);
                    if (!stock || stock.current_stock < Math.abs(quantityDiff)) {
                        throw new Error('总库存不足，无法修改');
                    }
                }

                // 更新批次库存
                const batchStock = await dbUtils.queryOne(
                    'SELECT * FROM batch_stock WHERE product_id = ? AND batch_number = ?',
                    [originalRecord.product_id, originalRecord.batch_number]
                );

                if (batchStock) {
                    await dbUtils.update(
                        'UPDATE batch_stock SET batch_in_quantity = batch_in_quantity + ?, batch_current_stock = batch_current_stock + ? WHERE id = ?',
                        [quantityDiff, quantityDiff, batchStock.id]
                    );
                }

                // 更新总库存
                if (quantityDiff > 0) {
                    await StockModel.updateStock(originalRecord.product_id, quantityDiff, 0);
                } else {
                    await StockModel.updateStock(originalRecord.product_id, 0, Math.abs(quantityDiff));
                }
            }

            // 更新入库记录
            await InRecordModel.update(inRecordId, data);

            return { success: true };
        });
    },

    async cancelOutStock(outRecordId) {
        return await dbUtils.executeTransaction(async (connection) => {
            // 获取出库记录
            const outRecord = await OutRecordModel.findById(outRecordId);
            if (!outRecord) {
                throw new Error('出库记录不存在');
            }

            // 检查批次库存
            const batchStock = await dbUtils.queryOne(
                'SELECT * FROM batch_stock WHERE product_id = ? AND batch_number = ?',
                [outRecord.product_id, outRecord.batch_number]
            );

            if (!batchStock) {
                throw new Error('批次库存不存在');
            }

            // 更新批次库存
            await dbUtils.update(
                'UPDATE batch_stock SET batch_out_quantity = batch_out_quantity - ?, batch_current_stock = batch_current_stock + ? WHERE id = ?',
                [outRecord.quantity, outRecord.quantity, batchStock.id]
            );

            // 更新总库存（增加库存）
            await StockModel.updateStock(outRecord.product_id, outRecord.quantity, 0);

            // 删除出库记录
            await OutRecordModel.delete(outRecordId);

            return { success: true };
        });
    },

    async updateOutStock(outRecordId, data) {
        return await dbUtils.executeTransaction(async (connection) => {
            // 获取原始出库记录
            const originalRecord = await OutRecordModel.findById(outRecordId);
            if (!originalRecord) {
                throw new Error('出库记录不存在');
            }

            // 计算数量差异
            const quantityDiff = data.quantity - originalRecord.quantity;

            if (quantityDiff !== 0) {
                // 检查批次库存是否足够（如果增加出库）
                if (quantityDiff > 0) {
                    const batchStock = await dbUtils.queryOne(
                        'SELECT * FROM batch_stock WHERE product_id = ? AND batch_number = ?',
                        [originalRecord.product_id, originalRecord.batch_number]
                    );

                    if (!batchStock || batchStock.batch_current_stock < quantityDiff) {
                        throw new Error('批次库存不足，无法修改');
                    }

                    // 检查总库存是否足够
                    const stock = await StockModel.findByProductId(originalRecord.product_id);
                    if (!stock || stock.current_stock < quantityDiff) {
                        throw new Error('总库存不足，无法修改');
                    }
                }

                // 更新批次库存
                const batchStock = await dbUtils.queryOne(
                    'SELECT * FROM batch_stock WHERE product_id = ? AND batch_number = ?',
                    [originalRecord.product_id, originalRecord.batch_number]
                );

                if (batchStock) {
                    await dbUtils.update(
                        'UPDATE batch_stock SET batch_out_quantity = batch_out_quantity + ?, batch_current_stock = batch_current_stock - ? WHERE id = ?',
                        [quantityDiff, quantityDiff, batchStock.id]
                    );
                }

                // 更新总库存
                if (quantityDiff > 0) {
                    await StockModel.updateStock(originalRecord.product_id, 0, quantityDiff);
                } else {
                    await StockModel.updateStock(originalRecord.product_id, Math.abs(quantityDiff), 0);
                }
            }

            // 更新出库记录
            await OutRecordModel.update(outRecordId, data);

            return { success: true };
        });
    },

    // 获取设置
    async getSettings() {
        try {
            const settings = await dbUtils.queryOne('SELECT * FROM system_settings ORDER BY id DESC LIMIT 1');
            if (settings) {
                return JSON.parse(settings.settings_json);
            }
            return null;
        } catch (error) {
            console.error('获取设置失败:', error);
            return null;
        }
    },

    // 保存设置
    async saveSettings(settings) {
        try {
            const settingsJson = JSON.stringify(settings);
            const existing = await dbUtils.queryOne('SELECT id FROM system_settings LIMIT 1');

            if (existing) {
                await dbUtils.update(
                    'UPDATE system_settings SET settings_json = ?, updated_at = NOW() WHERE id = ?',
                    [settingsJson, existing.id]
                );
            } else {
                await dbUtils.insert(
                    'INSERT INTO system_settings (settings_json, created_at, updated_at) VALUES (?, NOW(), NOW())',
                    [settingsJson]
                );
            }
            return { success: true };
        } catch (error) {
            console.error('保存设置失败:', error);
            throw error;
        }
    },

    // 创建备份
    async createBackup(createdBy) {
        const backupDir = path.join(process.cwd(), 'backup');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `warehouse_backup_${timestamp}.sql`;
        const filePath = path.join(backupDir, fileName);

        // 确保备份目录存在
        if (!fsSync.existsSync(backupDir)) {
            fsSync.mkdirSync(backupDir, { recursive: true });
        }

        // 从数据库配置文件获取连接信息（优先）或使用默认值
        let dbHost = 'localhost';
        let dbUser = 'root';
        let dbPassword = '';
        let dbName = 'warehouse';

        // 尝试从配置文件读取
        if (dbConfigObj) {
            dbHost = dbConfigObj.host || dbHost;
            dbUser = dbConfigObj.user || dbUser;
            dbPassword = dbConfigObj.password || dbPassword;
            dbName = dbConfigObj.database || dbName;
        }

        // 执行 mysqldump
        const passwordPart = dbPassword ? `-p"${dbPassword}"` : '';
        const command = `mysqldump -h ${dbHost} -u ${dbUser} ${passwordPart} ${dbName} > "${filePath}"`;

        try {
            await execPromise(command);

            // 获取文件大小
            const stats = fsSync.statSync(filePath);
            const fileSize = (stats.size / 1024 / 1024).toFixed(2); // MB

            // 保存备份记录到数据库
            await dbUtils.insert(
                'INSERT INTO backups (file_name, file_path, file_size, created_by, created_at) VALUES (?, ?, ?, ?, NOW())',
                [fileName, filePath, fileSize, createdBy]
            );

            return { success: true, fileName, fileSize };
        } catch (error) {
            // 如果失败，删除已创建的文件
            if (fsSync.existsSync(filePath)) {
                fsSync.unlinkSync(filePath);
            }
            throw new Error(`备份失败: ${error.message}`);
        }
    },

    // 获取备份列表
    async getBackupList() {
        try {
            // 先同步文件夹中的备份文件
            await this.syncBackupsFromFolder();

            const backups = await dbUtils.query(
                'SELECT id, file_name, file_size, created_by, created_at FROM backups ORDER BY created_at DESC'
            );
            return backups || [];
        } catch (error) {
            console.error('获取备份列表失败:', error);
            return [];
        }
    },

    // 扫描备份文件夹，同步文件到数据库
    async syncBackupsFromFolder() {
        try {
            const backupDir = path.join(process.cwd(), 'backup');

            // 检查备份目录是否存在
            if (!fsSync.existsSync(backupDir)) {
                return;
            }

            // 读取所有 .sql 文件
            const files = fsSync.readdirSync(backupDir).filter(f => f.endsWith('.sql'));

            // 获取数据库中已有的文件名
            const existingBackups = await dbUtils.query('SELECT file_name FROM backups');
            const existingFileNames = new Set(existingBackups.map(b => b.file_name));

            // 找出文件夹中有但数据库中没有的文件
            for (const fileName of files) {
                if (!existingFileNames.has(fileName)) {
                    const filePath = path.join(backupDir, fileName);
                    const stats = fsSync.statSync(filePath);
                    const fileSize = (stats.size / 1024 / 1024).toFixed(2); // MB

                    // 从文件名尝试解析时间戳
                    let createdAt = new Date(stats.mtime); // 使用文件修改时间作为默认
                    const match = fileName.match(/warehouse_backup_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
                    if (match) {
                        const timestamp = match[1].replace(/-/g, ':').replace('T', ' ');
                        createdAt = new Date(timestamp);
                    }

                    // 插入数据库记录
                    await dbUtils.insert(
                        'INSERT INTO backups (file_name, file_path, file_size, created_by, created_at) VALUES (?, ?, ?, ?, ?)',
                        [fileName, filePath, fileSize, 'system', createdAt]
                    );

                    console.log(`同步备份文件到数据库: ${fileName}`);
                }
            }

            // 清理数据库中有但文件夹中不存在的记录（可选）
            for (const backup of existingBackups) {
                const filePath = path.join(backupDir, backup.file_name);
                if (!fsSync.existsSync(filePath)) {
                    await dbUtils.update('DELETE FROM backups WHERE file_name = ?', [backup.file_name]);
                    console.log(`清理已删除的备份记录: ${backup.file_name}`);
                }
            }
        } catch (error) {
            console.error('同步备份文件夹失败:', error);
        }
    },

    // 根据ID获取备份
    async getBackupById(id) {
        return await dbUtils.queryOne('SELECT * FROM backups WHERE id = ?', [id]);
    },

    // 删除备份
    async deleteBackup(id) {
        const backup = await this.getBackupById(id);
        if (!backup) {
            throw new Error('备份不存在');
        }

        // 删除文件
        if (fsSync.existsSync(backup.file_path)) {
            fsSync.unlinkSync(backup.file_path);
        }

        // 删除数据库记录
        await dbUtils.update('DELETE FROM backups WHERE id = ?', [id]);
        return { success: true };
    },

    // 恢复备份
    async restoreBackup(id) {
        const backup = await this.getBackupById(id);
        if (!backup) {
            throw new Error('备份不存在');
        }

        if (!fsSync.existsSync(backup.file_path)) {
            throw new Error('备份文件不存在');
        }

        // 从数据库配置文件获取连接信息
        let dbHost = 'localhost';
        let dbUser = 'root';
        let dbPassword = '';
        let dbName = 'warehouse';

        if (dbConfigObj) {
            dbHost = dbConfigObj.host || dbHost;
            dbUser = dbConfigObj.user || dbUser;
            dbPassword = dbConfigObj.password || dbPassword;
            dbName = dbConfigObj.database || dbName;
        }

        // 执行恢复
        const passwordPart = dbPassword ? `-p"${dbPassword}"` : '';
        const command = `mysql -h ${dbHost} -u ${dbUser} ${passwordPart} ${dbName} < "${backup.file_path}"`;

        await execPromise(command);
        return { success: true };
    },

    // 保存自动备份配置
    async saveAutoBackupConfig(config) {
        const settings = await this.getSettings() || {};
        settings.autoBackup = config;
        return await this.saveSettings(settings);
    },

    // 修改密码
    async changePassword(userId, currentPassword, newPassword) {
        // 获取用户当前密码
        const user = await dbUtils.queryOne('SELECT password FROM users WHERE id = ?', [userId]);
        if (!user) {
            return { success: false, message: '用户不存在' };
        }

        // 验证当前密码
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return { success: false, message: '当前密码不正确' };
        }

        // 加密新密码
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 更新密码
        await dbUtils.update(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );

        return { success: true };
    }
};

module.exports = InventoryService;