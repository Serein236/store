// services/InventoryService.js
const ProductModel = require('../models/ProductModel');
const InRecordModel = require('../models/InRecordModel');
const OutRecordModel = require('../models/OutRecordModel');
const dbUtils = require('../utils/dbUtils');

const InventoryService = {
    async inStock(data) {
        return await dbUtils.executeTransaction(async (connection) => {
            // 添加入库记录
            const record = await InRecordModel.create(data);
            
            // 更新库存
            await ProductModel.updateStock(data.product_id, data.quantity);
            
            return record;
        });
    },

    async outStock(data) {
        return await dbUtils.executeTransaction(async (connection) => {
            // 检查库存
            const product = await ProductModel.findById(data.product_id);
            if (!product || product.stock < data.quantity) {
                throw new Error('库存不足');
            }
            
            // 添加出库记录
            const record = await OutRecordModel.create(data);
            
            // 更新库存（减少库存）
            await ProductModel.updateStock(data.product_id, -data.quantity);
            
            return record;
        });
    },

    async getStockReport() {
        const [rows] = await dbUtils.promisePool.query(`
            SELECT p.*, 
                   IFNULL(SUM(i.quantity), 0) as total_in,
                   IFNULL(SUM(o.quantity), 0) as total_out
            FROM products p
            LEFT JOIN in_records i ON p.id = i.product_id
            LEFT JOIN out_records o ON p.id = o.product_id
            GROUP BY p.id
            ORDER BY p.id DESC
        `);
        return rows;
    },

    async getProductDetail(productId, month = null) {
        const product = await ProductModel.findById(productId);
        if (!product) {
            throw new Error('商品不存在');
        }

        const inRecords = await InRecordModel.findByProductId(productId, month);
        const outRecords = await OutRecordModel.findByProductId(productId, month);
        
        const [monthlyStats] = await dbUtils.promisePool.query(`
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