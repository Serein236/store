// controllers/inventoryController.js
const InventoryService = require('../services/InventoryService');
const { formatDateForMySQL } = require('../utils/dataUtils');
const InRecordModel = require('../models/InRecordModel');
const OutRecordModel = require('../models/OutRecordModel');

const inventoryController = {
    async inStock(req, res) {
        const { product_id, type, quantity, remark, source, recorded_date } = req.body;
        
        try {
            const formattedDate = formatDateForMySQL(recorded_date);
            await InventoryService.inStock({
                product_id, type, quantity, remark, source, recorded_date: formattedDate
            });
            res.json({ success: true });
        } catch (error) {
            console.error('入库错误:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message || '入库失败' 
            });
        }
    },

    async outStock(req, res) {
        const { product_id, type, quantity, remark, destination, recorded_date } = req.body;
        
        try {
            const formattedDate = formatDateForMySQL(recorded_date);
            await InventoryService.outStock({
                product_id, type, quantity, remark, destination, recorded_date: formattedDate
            });
            res.json({ success: true });
        } catch (error) {
            console.error('出库错误:', error);
            const message = error.message === '库存不足' ? '库存不足' : '出库失败';
            res.status(500).json({ 
                success: false, 
                message 
            });
        }
    },

    async getInRecords(req, res) {
        try {
            const inRecords = await InRecordModel.findAll();
            const formattedRows = inRecords.map(row => ({
                ...row,
                recorded_date: row.display_date
            }));
            res.json(formattedRows);
        } catch (error) {
            console.error('获取入库记录错误:', error);
            res.status(500).json({ error: '获取入库记录失败' });
        }
    },

    async getOutRecords(req, res) {
        try {
            const outRecords = await OutRecordModel.findAll();
            const formattedRows = outRecords.map(row => ({
                ...row,
                recorded_date: row.display_date
            }));
            res.json(formattedRows);
        } catch (error) {
            console.error('获取出库记录错误:', error);
            res.status(500).json({ error: '获取出库记录失败' });
        }
    },

    async getStock(req, res) {
        try {
            const stock = await InventoryService.getStockReport();
            res.json(stock);
        } catch (error) {
            console.error('获取库存错误:', error);
            res.status(500).json({ error: '获取库存失败' });
        }
    },

    async queryProductDetail(req, res) {
        const { productId } = req.params;
        const { month } = req.query;
        
        try {
            const result = await InventoryService.getProductDetail(productId, month);
            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('查询错误:', error);
            const message = error.message === '商品不存在' ? '商品不存在' : '查询失败';
            res.status(500).json({ 
                success: false, 
                message 
            });
        }
    }
};

module.exports = inventoryController;