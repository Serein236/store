// models/OutRecordModel.js
const dbUtils = require('../utils/dbUtils');

const OutRecordModel = {
    async create(recordData) {
        const { product_id, stock_method_name, quantity, unit_price, total_amount, destination, remark, recorded_date, created_by } = recordData;
        const result = await dbUtils.insert(
            'INSERT INTO out_records (product_id, stock_method_name, quantity, unit_price, total_amount, destination, remark, recorded_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [product_id, stock_method_name, quantity, unit_price, total_amount, destination, remark, recorded_date, created_by]
        );
        return { id: result.insertId, ...recordData };
    },

    async findAll(month = null, productId = null) {
        let whereCondition = '';
        const params = [];
        
        if (productId) {
            whereCondition += 'WHERE o.product_id = ?';
            params.push(productId);
        }
        
        if (month) {
            if (whereCondition) {
                whereCondition += ' AND ';
            } else {
                whereCondition += 'WHERE ';
            }
            whereCondition += 'DATE_FORMAT(o.recorded_date, "%Y-%m") = ?';
            params.push(month);
        }
        
        return await dbUtils.query(`
            SELECT o.*, 
                   DATE_FORMAT(o.recorded_date, '%Y-%m-%d') as display_date,
                   p.name as product_name 
            FROM out_records o 
            JOIN products p ON o.product_id = p.id 
            ${whereCondition}
            ORDER BY o.recorded_date DESC, o.created_at DESC
        `, params);
    },

    async findByProductId(productId, month = null) {
        let whereCondition = 'WHERE product_id = ?';
        const params = [productId];
        
        if (month) {
            whereCondition += ' AND DATE_FORMAT(recorded_date, "%Y-%m") = ?';
            params.push(month);
        }
        
        return await dbUtils.query(
            `SELECT *, DATE_FORMAT(recorded_date, '%Y-%m-%d') as display_date 
             FROM out_records ${whereCondition} ORDER BY recorded_date DESC`,
            params
        );
    },

    async getMonthlyStats(productId, month) {
        return await dbUtils.queryOne(
            `SELECT SUM(quantity) as total_out 
             FROM out_records 
             WHERE product_id = ? AND DATE_FORMAT(recorded_date, "%Y-%m") = ?`,
            [productId, month]
        );
    }
};

module.exports = OutRecordModel;