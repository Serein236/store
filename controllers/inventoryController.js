// controllers/inventoryController.js
const InventoryService = require('../services/InventoryService');
const { formatDateForMySQL } = require('../utils/dataUtils');
const InRecordModel = require('../models/InRecordModel');
const OutRecordModel = require('../models/OutRecordModel');
const StockMethodModel = require('../models/StockMethodModel');
const dbUtils = require('../utils/dbUtils');
const logger = require('../utils/logger');

const inventoryController = {
    async inStock(req, res) {
        const { product_id, stock_method_name, batch_number, production_date, expiration_date, quantity, unit_price, total_amount, source, remark, recorded_date } = req.body;
        const created_by = req.session.userId; // 从会话中获取当前用户ID
        const username = req.session.username;
        
        try {
            const formattedDate = formatDateForMySQL(recorded_date);
            const formattedProductionDate = formatDateForMySQL(production_date);
            const formattedExpirationDate = formatDateForMySQL(expiration_date);
            
            // 获取商品名称用于日志记录
            const product = await dbUtils.queryOne('SELECT name FROM products WHERE id = ?', [product_id]);
            const productName = product ? product.name : '未知商品';
            
            await InventoryService.inStock({
                product_id, stock_method_name, batch_number, production_date: formattedProductionDate, expiration_date: formattedExpirationDate, quantity, unit_price, total_amount, source, remark, recorded_date: formattedDate, created_by
            });
            
            logger.inStock(product_id, productName, batch_number, quantity, unit_price, total_amount, stock_method_name, source, username, req.session.userId);
            res.json({ success: true });
        } catch (error) {
            console.error('入库错误:', error);
            logger.error('入库失败', { operator: username, operatorId: req.session.userId, product_id, stock_method_name, batch_number, quantity, error: error.message });
            res.status(500).json({ 
                success: false, 
                message: error.message || '入库失败' 
            });
        }
    },

    async outStock(req, res) {
        const { product_id, stock_method_name, batch_number, quantity, unit_price, total_amount, destination, remark, recorded_date } = req.body;
        const created_by = req.session.userId; // 从会话中获取当前用户ID
        const username = req.session.username;
        
        try {
            const formattedDate = formatDateForMySQL(recorded_date);
            
            // 获取商品名称用于日志记录
            const product = await dbUtils.queryOne('SELECT name FROM products WHERE id = ?', [product_id]);
            const productName = product ? product.name : '未知商品';
            
            await InventoryService.outStock({
                product_id, stock_method_name, batch_number, quantity, unit_price, total_amount, destination, remark, recorded_date: formattedDate, created_by
            });
            
            logger.outStock(product_id, productName, batch_number, quantity, unit_price, total_amount, stock_method_name, destination, username, req.session.userId);
            res.json({ success: true });
        } catch (error) {
            console.error('出库错误:', error);
            logger.error('出库失败', { operator: username, operatorId: req.session.userId, product_id, stock_method_name, batch_number, quantity, error: error.message });
            const message = error.message === '库存不足' || error.message === '批次库存不足' || error.message === '总库存不足' ? error.message : '出库失败';
            res.status(500).json({ 
                success: false, 
                message 
            });
        }
    },

    async getInRecords(req, res) {
        const username = req.session.username;
        const userId = req.session.userId;
        
        try {
            const { month, product_id } = req.query;
            const inRecords = await InRecordModel.findAll(month, product_id);
            const formattedRows = inRecords.map(row => ({
                ...row,
                recorded_date: row.display_date
            }));
            logger.query('查看入库记录', { month, product_id }, username, userId, formattedRows.length);
            res.json(formattedRows);
        } catch (error) {
            console.error('获取入库记录错误:', error);
            logger.error('获取入库记录失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ error: '获取入库记录失败' });
        }
    },

    async getOutRecords(req, res) {
        const username = req.session.username;
        const userId = req.session.userId;
        
        try {
            const { month, product_id } = req.query;
            const outRecords = await OutRecordModel.findAll(month, product_id);
            const formattedRows = outRecords.map(row => ({
                ...row,
                recorded_date: row.display_date
            }));
            logger.query('查看出库记录', { month, product_id }, username, userId, formattedRows.length);
            res.json(formattedRows);
        } catch (error) {
            console.error('获取出库记录错误:', error);
            logger.error('获取出库记录失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ error: '获取出库记录失败' });
        }
    },

    async getStock(req, res) {
        const username = req.session.username;
        const userId = req.session.userId;
        
        try {
            const stock = await InventoryService.getStockReport();
            logger.query('查看库存报表', {}, username, userId, stock.length);
            res.json(stock);
        } catch (error) {
            console.error('获取库存错误:', error);
            logger.error('获取库存失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ error: '获取库存失败' });
        }
    },

    async queryProductDetail(req, res) {
        const { productId } = req.params;
        const { month } = req.query;
        const username = req.session.username;
        const userId = req.session.userId;
        
        try {
            const result = await InventoryService.getProductDetail(productId, month);
            
            // 获取商品名称用于日志记录
            const product = await dbUtils.queryOne('SELECT name FROM products WHERE id = ?', [productId]);
            const productName = product ? product.name : '未知商品';
            
            logger.query('查询商品明细', { productId, productName, month }, username, userId, result.records?.length || 0);
            
            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('查询错误:', error);
            logger.error('查询失败', { operator: username, operatorId: userId, productId, month, error: error.message });
            const message = error.message === '商品不存在' ? '商品不存在' : '查询失败';
            res.status(500).json({ 
                success: false, 
                message 
            });
        }
    },

    async getStockMethods(req, res) {
        const { type } = req.query;
        const username = req.session.username;
        const userId = req.session.userId;
        
        try {
            const methods = await StockMethodModel.findByType(type);
            logger.getStockMethods(type, methods, username, userId);
            res.json(methods.map(method => method.method_name));
        } catch (error) {
            console.error('获取出入库方式错误:', error);
            logger.error('获取出入库方式失败', { operator: username, operatorId: userId, type, error: error.message });
            res.status(500).json({ error: '获取出入库方式失败' });
        }
    },

    async getProductBatches(req, res) {
        const { productId } = req.params;
        const username = req.session?.username;
        const userId = req.session?.userId;
        
        try {
            const batches = await dbUtils.query(
                'SELECT batch_number, batch_current_stock as current_stock FROM batch_stock WHERE product_id = ? ORDER BY batch_number ASC',
                [productId]
            );
            logger.getProductBatches(productId, batches, username, userId);
            res.json(batches);
        } catch (error) {
            console.error('获取商品批次错误:', error);
            logger.error('获取商品批次失败', { operator: username, operatorId: userId, productId, error: error.message });
            res.status(500).json({ error: '获取商品批次失败' });
        }
    },

    async getOutRecordById(req, res) {
        const { id } = req.params;
        const username = req.session?.username || '未登录用户';
        
        try {
            console.log('获取出库记录详情，ID:', id);
            
            // 首先获取出库记录和商品信息
            const record = await dbUtils.queryOne(
                `SELECT 
                    o.id,
                    o.product_id,
                    p.name as product_name,
                    p.product_code,
                    p.spec,
                    p.unit,
                    p.manufacturer,
                    p.retail_price,
                    o.stock_method_name,
                    o.batch_number,
                    o.quantity,
                    o.unit_price,
                    o.total_amount,
                    o.destination,
                    o.remark,
                    DATE_FORMAT(o.recorded_date, '%Y-%m-%d') as display_date,
                    DATE_FORMAT(o.created_at, '%Y-%m-%d') as created_at
                FROM 
                    out_records o
                LEFT JOIN 
                    products p ON o.product_id = p.id
                WHERE 
                    o.id = ?`,
                [id]
            );
            
            console.log('查询结果:', record);
            
            if (record && record.batch_number) {
                console.log('查询批次信息，产品ID:', record.product_id, '批次号:', record.batch_number);
                // 然后获取该批次的入库记录（包含生产日期和保质期）
                const batchRecord = await dbUtils.queryOne(
                    `SELECT 
                        DATE_FORMAT(production_date, '%Y-%m-%d') as production_date,
                        DATE_FORMAT(expiration_date, '%Y-%m-%d') as expiration_date
                    FROM 
                        in_records
                    WHERE 
                        product_id = ? AND batch_number = ?
                    LIMIT 1`,
                    [record.product_id, record.batch_number]
                );
                
                console.log('批次查询结果:', batchRecord);
                
                if (batchRecord) {
                    record.production_date = batchRecord.production_date;
                    record.expiration_date = batchRecord.expiration_date;
                }
            }
            
            logger.query('查看出库单详情', { recordId: id }, username, req.session?.userId, 1);
            res.json(record);
        } catch (error) {
            console.error('获取出库记录错误:', error);
            logger.error('获取出库记录失败', { operator: username, operatorId: req.session?.userId, id, error: error.message });
            res.status(500).json({ error: '获取出库记录失败' });
        }
    },

    async getSuppliers(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        const { query } = req.query;
        
        try {
            let suppliers = [];
            if (query && query.length >= 2) {
                suppliers = await dbUtils.query(
                    'SELECT DISTINCT source FROM in_records WHERE source LIKE ? AND source IS NOT NULL AND source != "" ORDER BY source ASC',
                    [`${query}%`]
                );
            } else {
                suppliers = await dbUtils.query(
                    'SELECT DISTINCT source FROM in_records WHERE source IS NOT NULL AND source != "" ORDER BY source ASC LIMIT 10'
                );
            }
            
            logger.query('获取供应商列表', { query }, username, userId, suppliers.length);
            res.json(suppliers.map(item => item.source));
        } catch (error) {
            console.error('获取供应商列表错误:', error);
            logger.error('获取供应商列表失败', { operator: username, operatorId: userId, query, error: error.message });
            res.status(500).json({ error: '获取供应商列表失败' });
        }
    },

    async getCustomers(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        const { query } = req.query;
        
        try {
            let customers = [];
            if (query && query.length >= 2) {
                customers = await dbUtils.query(
                    'SELECT DISTINCT destination FROM out_records WHERE destination LIKE ? AND destination IS NOT NULL AND destination != "" ORDER BY destination ASC',
                    [`${query}%`]
                );
            } else {
                customers = await dbUtils.query(
                    'SELECT DISTINCT destination FROM out_records WHERE destination IS NOT NULL AND destination != "" ORDER BY destination ASC LIMIT 10'
                );
            }
            
            logger.query('获取客户列表', { query }, username, userId, customers.length);
            res.json(customers.map(item => item.destination));
        } catch (error) {
            console.error('获取客户列表错误:', error);
            logger.error('获取客户列表失败', { operator: username, operatorId: userId, query, error: error.message });
            res.status(500).json({ error: '获取客户列表失败' });
        }
    },

    async getProductBatches(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        const { productId } = req.params;
        const { query } = req.query;
        
        try {
            if (productId) {
                // 获取指定商品的批次
                const batches = await dbUtils.query(
                    'SELECT batch_number, batch_current_stock as current_stock FROM batch_stock WHERE product_id = ? ORDER BY batch_number ASC',
                    [productId]
                );
                logger.getProductBatches(productId, batches, username, userId);
                res.json(batches);
            } else {
                // 获取所有批次（支持查询）
                let batches = [];
                if (query && query.length >= 2) {
                    batches = await dbUtils.query(
                        'SELECT DISTINCT batch_number FROM in_records WHERE batch_number LIKE ? AND batch_number IS NOT NULL AND batch_number != "" ORDER BY batch_number ASC',
                        [query + '%']
                    );
                } else {
                    batches = await dbUtils.query(
                        'SELECT DISTINCT batch_number FROM in_records WHERE batch_number IS NOT NULL AND batch_number != "" ORDER BY batch_number ASC LIMIT 10'
                    );
                }
                
                logger.query('获取产品批号列表', { query }, username, userId, batches.length);
                res.json(batches.map(item => ({ batch_number: item.batch_number })));
            }
        } catch (error) {
            console.error('获取产品批号列表错误:', error);
            logger.error('获取产品批号列表失败', { operator: username, operatorId: userId, productId, query, error: error.message });
            res.status(500).json({ error: '获取产品批号列表失败' });
        }
    },

    async cancelInStock(req, res) {
        const { id } = req.params;
        const username = req.session?.username;
        const userId = req.session?.userId;
        
        try {
            await InventoryService.cancelInStock(id);
            
            logger.info('撤销入库', { operator: username, operatorId: userId, target: `记录ID:${id}`, description: '撤销入库记录' });
            res.json({ success: true });
        } catch (error) {
            console.error('撤销入库错误:', error);
            logger.error('撤销入库失败', { operator: username, operatorId: userId, inRecordId: id, error: error.message });
            res.status(500).json({ success: false, message: error.message || '撤销入库失败' });
        }
    },

    async updateInStock(req, res) {
        const { id } = req.params;
        const updateData = req.body;
        const username = req.session?.username;
        const userId = req.session?.userId;
        
        try {
            const formattedDate = updateData.recorded_date ? formatDateForMySQL(updateData.recorded_date) : undefined;
            const formattedProductionDate = updateData.production_date ? formatDateForMySQL(updateData.production_date) : undefined;
            const formattedExpirationDate = updateData.expiration_date ? formatDateForMySQL(updateData.expiration_date) : undefined;
            
            const data = {
                ...updateData,
                recorded_date: formattedDate,
                production_date: formattedProductionDate,
                expiration_date: formattedExpirationDate
            };
            
            const result = await InventoryService.updateInStock(id, data);
            
            // 记录修改前后的值
            const changes = {};
            if (result.originalRecord) {
                if (result.originalRecord.quantity !== updateData.quantity) {
                    changes.quantity = { from: result.originalRecord.quantity, to: updateData.quantity };
                }
                if (result.originalRecord.unit_price !== updateData.unit_price) {
                    changes.unit_price = { from: result.originalRecord.unit_price, to: updateData.unit_price };
                }
                if (result.originalRecord.batch_number !== updateData.batch_number) {
                    changes.batch_number = { from: result.originalRecord.batch_number, to: updateData.batch_number };
                }
                if (result.originalRecord.source !== updateData.source) {
                    changes.source = { from: result.originalRecord.source, to: updateData.source };
                }
            }
            
            logger.info('修改入库', { 
                operator: username, 
                operatorId: userId, 
                target: `记录ID:${id}`, 
                description: '修改入库记录', 
                extra: { 
                    productId: updateData.product_id, 
                    changes,
                    quantityChanged: result.quantityChanged,
                    quantityDiff: result.quantityDiff
                } 
            });
            res.json({ success: true });
        } catch (error) {
            console.error('修改入库错误:', error);
            logger.error('修改入库失败', { operator: username, operatorId: userId, inRecordId: id, error: error.message });
            res.status(500).json({ success: false, message: error.message || '修改入库失败' });
        }
    },

    async cancelOutStock(req, res) {
        const { id } = req.params;
        const username = req.session?.username;
        const userId = req.session?.userId;
        
        try {
            await InventoryService.cancelOutStock(id);
            
            logger.info('撤销出库', { operator: username, operatorId: userId, target: `记录ID:${id}`, description: '撤销出库记录' });
            res.json({ success: true });
        } catch (error) {
            console.error('撤销出库错误:', error);
            logger.error('撤销出库失败', { operator: username, operatorId: userId, outRecordId: id, error: error.message });
            res.status(500).json({ success: false, message: error.message || '撤销出库失败' });
        }
    },

    async updateOutStock(req, res) {
        const { id } = req.params;
        const updateData = req.body;
        const username = req.session?.username;
        const userId = req.session?.userId;
        
        try {
            const formattedDate = updateData.recorded_date ? formatDateForMySQL(updateData.recorded_date) : undefined;
            
            const data = {
                ...updateData,
                recorded_date: formattedDate
            };
            
            const result = await InventoryService.updateOutStock(id, data);
            
            // 记录修改前后的值
            const changes = {};
            if (result.originalRecord) {
                if (result.originalRecord.quantity !== updateData.quantity) {
                    changes.quantity = { from: result.originalRecord.quantity, to: updateData.quantity };
                }
                if (result.originalRecord.unit_price !== updateData.unit_price) {
                    changes.unit_price = { from: result.originalRecord.unit_price, to: updateData.unit_price };
                }
                if (result.originalRecord.batch_number !== updateData.batch_number) {
                    changes.batch_number = { from: result.originalRecord.batch_number, to: updateData.batch_number };
                }
                if (result.originalRecord.destination !== updateData.destination) {
                    changes.destination = { from: result.originalRecord.destination, to: updateData.destination };
                }
            }
            
            logger.info('修改出库', { 
                operator: username, 
                operatorId: userId, 
                target: `记录ID:${id}`, 
                description: '修改出库记录', 
                extra: { 
                    productId: updateData.product_id, 
                    changes,
                    quantityChanged: result.quantityChanged,
                    quantityDiff: result.quantityDiff
                } 
            });
            res.json({ success: true });
        } catch (error) {
            console.error('修改出库错误:', error);
            logger.error('修改出库失败', { operator: username, operatorId: userId, outRecordId: id, error: error.message });
            res.status(500).json({ success: false, message: error.message || '修改出库失败' });
        }
    },

    // 获取设置
    async getSettings(req, res) {
        try {
            // 从数据库或配置文件获取设置
            const settings = await InventoryService.getSettings();
            res.json(settings);
        } catch (error) {
            console.error('获取设置错误:', error);
            res.status(500).json({ success: false, message: '获取设置失败' });
        }
    },

    // 保存设置
    async saveSettings(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            const settings = req.body;
            await InventoryService.saveSettings(settings);
            logger.settingsUpdated('export', null, settings, username, userId);
            res.json({ success: true });
        } catch (error) {
            console.error('保存设置错误:', error);
            logger.error('保存设置失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '保存设置失败' });
        }
    },

    // 创建备份
    async createBackup(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            // 手动备份，类型为'manual'
            const result = await InventoryService.createBackup(username, 'manual');
            // 记录备份创建成功日志
            logger.backupCreated(result.fileName, result.fileSize, 'manual', username, userId);
            res.json(result);
        } catch (error) {
            console.error('创建备份错误:', error);
            logger.error('创建备份失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: error.message || '创建备份失败' });
        }
    },

    // 获取备份列表
    async getBackupList(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            const backups = await InventoryService.getBackupList();
            res.json(backups);
        } catch (error) {
            console.error('获取备份列表错误:', error);
            logger.error('获取备份列表失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '获取备份列表失败' });
        }
    },

    // 下载备份
    async downloadBackup(req, res) {
        const { id } = req.params;
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            const backup = await InventoryService.getBackupById(id);
            if (!backup) {
                return res.status(404).json({ success: false, message: '备份文件不存在' });
            }
            logger.info('下载备份', { operator: username, operatorId: userId, target: backup.file_name, description: '下载备份文件' });
            res.download(backup.file_path, backup.file_name);
        } catch (error) {
            console.error('下载备份错误:', error);
            logger.error('下载备份失败', { operator: username, operatorId: userId, backupId: id, error: error.message });
            res.status(500).json({ success: false, message: '下载备份失败' });
        }
    },

    // 删除备份
    async deleteBackup(req, res) {
        const { id } = req.params;
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            const backup = await InventoryService.getBackupById(id);
            await InventoryService.deleteBackup(id);
            logger.backupDeleted(backup?.file_name || `ID:${id}`, username, userId);
            res.json({ success: true });
        } catch (error) {
            console.error('删除备份错误:', error);
            logger.error('删除备份失败', { operator: username, operatorId: userId, backupId: id, error: error.message });
            res.status(500).json({ success: false, message: error.message || '删除备份失败' });
        }
    },

    // 恢复备份
    async restoreBackup(req, res) {
        const { id } = req.params;
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            const backup = await InventoryService.getBackupById(id);
            await InventoryService.restoreBackup(id);
            logger.backupRestored(backup?.file_name || `ID:${id}`, username, userId);
            res.json({ success: true, message: '数据恢复成功' });
        } catch (error) {
            console.error('恢复备份错误:', error);
            logger.error('恢复备份失败', { operator: username, operatorId: userId, backupId: id, error: error.message });
            res.status(500).json({ success: false, message: error.message || '恢复备份失败' });
        }
    },

    // 保存自动备份配置
    async saveAutoBackupConfig(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            const config = req.body;
            await InventoryService.saveAutoBackupConfig(config);
            logger.settingsUpdated('autoBackup', null, config, username, userId);
            res.json({ success: true });
        } catch (error) {
            console.error('保存自动备份配置错误:', error);
            logger.error('保存自动备份配置失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '保存自动备份配置失败' });
        }
    },

    // 修改密码
    async changePassword(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        if (!username || !userId) {
            return res.status(401).json({ success: false, message: '未登录' });
        }

        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: '当前密码和新密码不能为空' });
        }

        try {
            const result = await InventoryService.changePassword(userId, currentPassword, newPassword);
            if (result.success) {
                logger.passwordChanged(username, userId, true);
                res.json({ success: true, message: '密码修改成功' });
            } else {
                res.status(400).json({ success: false, message: result.message });
            }
        } catch (error) {
            console.error('修改密码错误:', error);
            logger.error('修改密码失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '修改密码失败' });
        }
    },

    // 清理数据（清理前会自动备份）
    async cleanupData(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            // 先创建删除前备份（pre_delete类型，不受自动备份上限限制）
            console.log('清理数据前自动创建备份...');
            const backupResult = await InventoryService.createBackup(username, 'pre_delete');
            console.log('删除前备份创建成功:', backupResult.fileName);

            // 执行数据清理
            const result = await InventoryService.clearAllData();

            logger.dataCleaned(backupResult.fileName, username, userId);

            res.json({
                success: true,
                message: '数据清理成功，已自动备份',
                backupFile: backupResult.fileName
            });
        } catch (error) {
            console.error('清理数据错误:', error);
            logger.error('清理数据失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '数据清理失败: ' + error.message });
        }
    },

    // 获取所有出入库方式（管理员）
    async getAllStockMethods(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            const methods = await StockMethodModel.findAll();
            res.json({ success: true, methods });
        } catch (error) {
            console.error('获取出入库方式列表错误:', error);
            logger.error('获取出入库方式列表失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '获取出入库方式列表失败' });
        }
    },

    // 创建出入库方式（管理员）
    async createStockMethod(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        const { type, method_name } = req.body;

        if (!type || !method_name) {
            return res.status(400).json({ success: false, message: '类型和方式名称不能为空' });
        }

        if (!['in', 'out'].includes(type)) {
            return res.status(400).json({ success: false, message: '类型必须是 in 或 out' });
        }

        try {
            // 检查是否已存在
            const existing = await StockMethodModel.findByMethodName(method_name);
            if (existing) {
                return res.status(400).json({ success: false, message: '该方式名称已存在' });
            }

            const result = await StockMethodModel.create({ type, method_name });
            logger.info('创建出入库方式', {
                operator: username,
                operatorId: userId,
                target: method_name,
                description: `创建${type === 'in' ? '入库' : '出库'}方式`,
                extra: { id: result.id, type, method_name }
            });
            res.json({ success: true, message: '创建成功', method: result });
        } catch (error) {
            console.error('创建出入库方式错误:', error);
            logger.error('创建出入库方式失败', { operator: username, operatorId: userId, type, method_name, error: error.message });
            res.status(500).json({ success: false, message: error.message || '创建出入库方式失败' });
        }
    },

    // 更新出入库方式（管理员）
    async updateStockMethod(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        const { id } = req.params;
        const { type, method_name } = req.body;

        if (!type || !method_name) {
            return res.status(400).json({ success: false, message: '类型和方式名称不能为空' });
        }

        try {
            const result = await StockMethodModel.update(id, { type, method_name });
            logger.info('更新出入库方式', {
                operator: username,
                operatorId: userId,
                target: method_name,
                description: `修改${type === 'in' ? '入库' : '出库'}方式`,
                extra: { id: parseInt(id), type, method_name, oldMethodName: result.oldMethodName }
            });
            res.json({ success: true, message: '更新成功', method: { id: parseInt(id), type, method_name } });
        } catch (error) {
            console.error('更新出入库方式错误:', error);
            logger.error('更新出入库方式失败', { operator: username, operatorId: userId, id, type, method_name, error: error.message });
            res.status(500).json({ success: false, message: error.message || '更新出入库方式失败' });
        }
    },

    // 删除出入库方式（管理员）
    async deleteStockMethod(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        const { id } = req.params;

        try {
            const method = await StockMethodModel.delete(id);
            logger.info('删除出入库方式', {
                operator: username,
                operatorId: userId,
                target: method.method_name,
                description: `删除${method.type === 'in' ? '入库' : '出库'}方式`,
                extra: { id: parseInt(id), type: method.type, method_name: method.method_name }
            });
            res.json({ success: true, message: '删除成功' });
        } catch (error) {
            console.error('删除出入库方式错误:', error);
            logger.error('删除出入库方式失败', { operator: username, operatorId: userId, id, error: error.message });
            res.status(500).json({ success: false, message: error.message || '删除出入库方式失败' });
        }
    }
};

module.exports = inventoryController;