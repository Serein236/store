// models/OutRecordModel.js
const dbUtils = require('../utils/dbUtils');

const OutRecordModel = {
    async create(recordData) {
        const { product_id, stock_method_name, batch_number, quantity, unit_price, total_amount, destination, remark, recorded_date, created_by } = recordData;
        const result = await dbUtils.insert(
            'INSERT INTO out_records (product_id, stock_method_name, batch_number, quantity, unit_price, total_amount, destination, remark, recorded_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [product_id, stock_method_name, batch_number, quantity, unit_price, total_amount, destination, remark, recorded_date, created_by]
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
                   DATE_FORMAT(o.created_at, '%Y-%m-%d') as created_at,
                   p.name as product_name 
            FROM out_records o 
            JOIN products p ON o.product_id = p.id 
            ${whereCondition}
            ORDER BY o.recorded_date DESC, o.created_at DESC
        `, params);
    },

    async findByProductId(productId, month = null) {
        let whereCondition = 'WHERE o.product_id = ?';
        const params = [productId];
        
        if (month) {
            whereCondition += ' AND DATE_FORMAT(o.recorded_date, "%Y-%m") = ?';
            params.push(month);
        }
        
        return await dbUtils.query(
            `SELECT o.*, 
                   DATE_FORMAT(o.recorded_date, '%Y-%m-%d') as display_date, 
                   DATE_FORMAT(o.created_at, '%Y-%m-%d') as created_at,
                   b.production_date,
                   b.expiration_date
             FROM out_records o 
             LEFT JOIN batch_stock b ON o.product_id = b.product_id AND o.batch_number = b.batch_number
             ${whereCondition} 
             ORDER BY o.recorded_date DESC`,
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
    },

    async findById(id) {
        return await dbUtils.queryOne(
            'SELECT * FROM out_records WHERE id = ?',
            [id]
        );
    },

    async delete(id) {
        return await dbUtils.delete(
            'DELETE FROM out_records WHERE id = ?',
            [id]
        );
    },

    async update(id, data) {
        const { product_id, stock_method_name, batch_number, quantity, unit_price, total_amount, destination, remark, recorded_date } = data;
        
        const updateFields = [];
        const updateValues = [];
        
        if (product_id !== undefined) {
            updateFields.push('product_id = ?');
            updateValues.push(product_id);
        }
        if (stock_method_name !== undefined) {
            updateFields.push('stock_method_name = ?');
            updateValues.push(stock_method_name);
        }
        if (batch_number !== undefined) {
            updateFields.push('batch_number = ?');
            updateValues.push(batch_number);
        }
        if (quantity !== undefined) {
            updateFields.push('quantity = ?');
            updateValues.push(quantity);
        }
        if (unit_price !== undefined) {
            updateFields.push('unit_price = ?');
            updateValues.push(unit_price);
        }
        if (total_amount !== undefined) {
            updateFields.push('total_amount = ?');
            updateValues.push(total_amount);
        }
        if (destination !== undefined) {
            updateFields.push('destination = ?');
            updateValues.push(destination);
        }
        if (remark !== undefined) {
            updateFields.push('remark = ?');
            updateValues.push(remark);
        }
        if (recorded_date !== undefined) {
            updateFields.push('recorded_date = ?');
            updateValues.push(recorded_date);
        }
        
        if (updateFields.length === 0) {
            return;
        }
        
        updateValues.push(id);
        
        return await dbUtils.update(
            `UPDATE out_records SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );
    }
};

module.exports = OutRecordModel;