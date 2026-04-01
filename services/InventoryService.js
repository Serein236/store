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
    }
};

module.exports = InventoryService;