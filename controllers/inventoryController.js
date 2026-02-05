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
            
            logger.inStock(product_id, productName, quantity, batch_number, username);
            res.json({ success: true });
        } catch (error) {
            console.error('入库错误:', error);
            logger.error('入库失败', { product_id, stock_method_name, batch_number, quantity, error: error.message });
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
            
            logger.outStock(product_id, productName, quantity, batch_number, username);
            res.json({ success: true });
        } catch (error) {
            console.error('出库错误:', error);
            logger.error('出库失败', { product_id, stock_method_name, batch_number, quantity, error: error.message });
            const message = error.message === '库存不足' || error.message === '批次库存不足' || error.message === '总库存不足' ? error.message : '出库失败';
            res.status(500).json({ 
                success: false, 
                message 
            });
        }
    },

    async getInRecords(req, res) {
        const username = req.session.username;
        
        try {
            const { month, product_id } = req.query;
            const inRecords = await InRecordModel.findAll(month, product_id);
            const formattedRows = inRecords.map(row => ({
                ...row,
                recorded_date: row.display_date
            }));
            logger.info('查看入库记录', { username, month, product_id, recordCount: formattedRows.length, timestamp: new Date().toISOString() });
            res.json(formattedRows);
        } catch (error) {
            console.error('获取入库记录错误:', error);
            logger.error('获取入库记录失败', { error: error.message });
            res.status(500).json({ error: '获取入库记录失败' });
        }
    },

    async getOutRecords(req, res) {
        const username = req.session.username;
        
        try {
            const { month, product_id } = req.query;
            const outRecords = await OutRecordModel.findAll(month, product_id);
            const formattedRows = outRecords.map(row => ({
                ...row,
                recorded_date: row.display_date
            }));
            logger.info('查看出库记录', { username, month, product_id, recordCount: formattedRows.length, timestamp: new Date().toISOString() });
            res.json(formattedRows);
        } catch (error) {
            console.error('获取出库记录错误:', error);
            logger.error('获取出库记录失败', { error: error.message });
            res.status(500).json({ error: '获取出库记录失败' });
        }
    },

    async getStock(req, res) {
        const username = req.session.username;
        
        try {
            const stock = await InventoryService.getStockReport();
            logger.info('查看库存', { username, stockCount: stock.length, timestamp: new Date().toISOString() });
            res.json(stock);
        } catch (error) {
            console.error('获取库存错误:', error);
            logger.error('获取库存失败', { error: error.message });
            res.status(500).json({ error: '获取库存失败' });
        }
    },

    async queryProductDetail(req, res) {
        const { productId } = req.params;
        const { month } = req.query;
        const username = req.session.username;
        
        try {
            const result = await InventoryService.getProductDetail(productId, month);
            
            // 获取商品名称用于日志记录
            const product = await dbUtils.queryOne('SELECT name FROM products WHERE id = ?', [productId]);
            const productName = product ? product.name : '未知商品';
            
            logger.query(productId, productName, username);
            
            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('查询错误:', error);
            logger.error('查询失败', { productId, month, error: error.message });
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
        
        try {
            const methods = await StockMethodModel.findByType(type);
            logger.info('获取出入库方式', { username, type, methodCount: methods.length, timestamp: new Date().toISOString() });
            res.json(methods.map(method => method.method_name));
        } catch (error) {
            console.error('获取出入库方式错误:', error);
            logger.error('获取出入库方式失败', { type, error: error.message });
            res.status(500).json({ error: '获取出入库方式失败' });
        }
    },

    async getProductBatches(req, res) {
        const { productId } = req.params;
        const username = req.session.username;
        
        try {
            const batches = await dbUtils.query(
                'SELECT batch_number, batch_current_stock as current_stock FROM batch_stock WHERE product_id = ? AND batch_current_stock > 0 ORDER BY batch_number ASC',
                [productId]
            );
            logger.info('获取商品批次', { username, productId, batchCount: batches.length, timestamp: new Date().toISOString() });
            res.json(batches);
        } catch (error) {
            console.error('获取商品批次错误:', error);
            logger.error('获取商品批次失败', { productId, error: error.message });
            res.status(500).json({ error: '获取商品批次失败' });
        }
    },

    async getOutRecordById(req, res) {
        const { id } = req.params;
        const username = req.session.username;
        
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
            
            logger.info('查看出库单详情', { username, recordId: id, timestamp: new Date().toISOString() });
            res.json(record);
        } catch (error) {
            console.error('获取出库记录错误:', error);
            logger.error('获取出库记录失败', { id, error: error.message });
            res.status(500).json({ error: '获取出库记录失败' });
        }
    }
};

module.exports = inventoryController;