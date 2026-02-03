// models/InRecordModel.js
const dbUtils = require('../utils/dbUtils');

const InRecordModel = {
    async create(recordData) {
        const { product_id, type, quantity, remark, source, recorded_date } = recordData;
        const result = await dbUtils.insert(
            'INSERT INTO in_records (product_id, type, quantity, remark, source, recorded_date) VALUES (?, ?, ?, ?, ?, ?)',
            [product_id, type, quantity, remark, source, recorded_date]
        );
        return { id: result.insertId, ...recordData };
    },

    async findAll() {
        return await dbUtils.query(`
            SELECT i.*, 
                   DATE_FORMAT(i.recorded_date, '%Y-%m-%d') as display_date,
                   p.name as product_name 
            FROM in_records i 
            JOIN products p ON i.product_id = p.id 
            ORDER BY i.recorded_date DESC, i.created_at DESC
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
             FROM in_records ${whereCondition} ORDER BY recorded_date DESC`,
            params
        );
    }
};

module.exports = InRecordModel;