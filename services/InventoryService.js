// services/InventoryService.js
const ProductModel = require('../models/ProductModel');
const InRecordModel = require('../models/InRecordModel');
const OutRecordModel = require('../models/OutRecordModel');
const StockModel = require('../models/StockModel');
const dbUtils = require('../utils/dbUtils');

const InventoryService = {
    async inStock(data) {
        return await dbUtils.executeTransaction(async (connection) => {
            // 添加入库记录
            const record = await InRecordModel.create(data);
            
            // 更新库存
            await StockModel.updateStock(data.product_id, data.quantity, 0);
            
            return record;
        });
    },

    async outStock(data) {
        return await dbUtils.executeTransaction(async (connection) => {
            // 检查库存
            const stock = await StockModel.findByProductId(data.product_id);
            if (!stock || stock.current_stock < data.quantity) {
                throw new Error('库存不足');
            }
            
            // 添加出库记录
            const record = await OutRecordModel.create(data);
            
            // 更新库存（减少库存）
            await StockModel.updateStock(data.product_id, 0, data.quantity);
            
            return record;
        });
    },

    async getStockReport() {
        return await StockModel.findAll();
    },

    async getProductDetail(productId, month = null) {
        const product = await ProductModel.findById(productId);
        console.log('ProductModel.findById返回结果:', product);
        if (!product) {
            throw new Error('商品不存在');
        }

        const inRecords = await InRecordModel.findByProductId(productId, month);
        const outRecords = await OutRecordModel.findByProductId(productId, month);
        
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

        return {
            product,
            inRecords: inRecords.map(record => ({
                ...record,
                recorded_date: record.display_date
            })),
            outRecords: outRecords.map(record => ({
                ...record,
                recorded_date: record.display_date
            })),
            monthlyStats
        };
    }
};

module.exports = InventoryService;