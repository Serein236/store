// models/OutRecordModel.js
const dbUtils = require('../utils/dbUtils');

const OutRecordModel = {
    async create(recordData) {
        const { product_id, type, quantity, remark, destination, recorded_date } = recordData;
        const result = await dbUtils.insert(
            'INSERT INTO out_records (product_id, type, quantity, remark, destination, recorded_date) VALUES (?, ?, ?, ?, ?, ?)',
            [product_id, type, quantity, remark, destination, recorded_date]
        );
        return { id: result.insertId, ...recordData };
    },

    async findAll() {
        return await dbUtils.query(`
            SELECT o.*, 
                   DATE_FORMAT(o.recorded_date, '%Y-%m-%d') as display_date,
                   p.name as product_name 
            FROM out_records o 
            JOIN products p ON o.product_id = p.id 
            ORDER BY o.recorded_date DESC, o.created_at DESC
        `);
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
    }
};

module.exports = OutRecordModel;