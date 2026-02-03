// models/StockModel.js
const dbUtils = require('../utils/dbUtils');

const StockModel = {
    async findAll() {
        return await dbUtils.query(`
            SELECT 
                p.id, p.name, p.spec, p.unit, p.retail_price,
                s.total_in_quantity, s.total_out_quantity, s.current_stock,
                s.warning_quantity, s.danger_quantity, s.stock_status
            FROM 
                stock_inventory s
            JOIN 
                products p ON s.product_id = p.id
            ORDER BY 
                s.stock_status ASC, p.name ASC
        `);
    },

    async findByProductId(productId) {
        return await dbUtils.queryOne(
            `SELECT * FROM stock_inventory WHERE product_id = ?`,
            [productId]
        );
    },

    async updateStock(productId, inQuantity = 0, outQuantity = 0) {
        // 更新库存数量
        await dbUtils.update(
            `UPDATE stock_inventory 
             SET 
                 total_in_quantity = total_in_quantity + ?, 
                 total_out_quantity = total_out_quantity + ?, 
                 current_stock = current_stock + ? - ?, 
                 stock_status = CASE 
                     WHEN current_stock + ? - ? <= 0 THEN 'out_of_stock'
                     WHEN current_stock + ? - ? <= danger_quantity THEN 'danger'
                     WHEN current_stock + ? - ? <= warning_quantity THEN 'warning'
                     ELSE 'normal'
                 END
             WHERE 
                 product_id = ?`,
            [inQuantity, outQuantity, inQuantity, outQuantity, inQuantity, outQuantity, inQuantity, outQuantity, inQuantity, outQuantity, productId]
        );
        return true;
    },

    async updateStockStatus(productId) {
        // 更新库存状态
        await dbUtils.update(
            `UPDATE stock_inventory 
             SET 
                 stock_status = CASE 
                     WHEN current_stock <= 0 THEN 'out_of_stock'
                     WHEN current_stock <= danger_quantity THEN 'danger'
                     WHEN current_stock <= warning_quantity THEN 'warning'
                     ELSE 'normal'
                 END
             WHERE 
                 product_id = ?`,
            [productId]
        );
        return true;
    },

    async getLowStockProducts() {
        return await dbUtils.query(`
            SELECT 
                p.id, p.name, p.spec, p.unit, p.retail_price,
                s.current_stock, s.warning_quantity, s.danger_quantity, s.stock_status
            FROM 
                stock_inventory s
            JOIN 
                products p ON s.product_id = p.id
            WHERE 
                s.stock_status IN ('danger', 'out_of_stock')
            ORDER BY 
                s.stock_status ASC, s.current_stock ASC
        `);
    }
};

module.exports = StockModel;
