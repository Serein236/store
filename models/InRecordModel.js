// models/InRecordModel.js
const dbUtils = require('../utils/dbUtils');

const InRecordModel = {
    async create(recordData) {
        const { product_id, stock_method_name, batch_number, production_date, expiration_date, quantity, unit_price, total_amount, source, remark, recorded_date, created_by } = recordData;
        const result = await dbUtils.insert(
            'INSERT INTO in_records (product_id, stock_method_name, batch_number, production_date, expiration_date, quantity, unit_price, total_amount, source, remark, recorded_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [product_id, stock_method_name, batch_number, production_date, expiration_date, quantity, unit_price, total_amount, source, remark, recorded_date, created_by]
        );
        return { id: result.insertId, ...recordData };
    },

    async findAll(month = null, productId = null) {
        let whereCondition = '';
        const params = [];
        
        if (productId) {
            whereCondition += 'WHERE i.product_id = ?';
            params.push(productId);
        }
        
        if (month) {
            if (whereCondition) {
                whereCondition += ' AND ';
            } else {
                whereCondition += 'WHERE ';
            }
            whereCondition += 'DATE_FORMAT(i.recorded_date, "%Y-%m") = ?';
            params.push(month);
        }
        
        return await dbUtils.query(`
            SELECT i.*, 
                   DATE_FORMAT(i.recorded_date, '%Y-%m-%d') as display_date,
                   DATE_FORMAT(i.created_at, '%Y-%m-%d') as created_at,
                   p.name as product_name 
            FROM in_records i 
            JOIN products p ON i.product_id = p.id 
            ${whereCondition}
            ORDER BY i.recorded_date DESC, i.created_at DESC
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
            `SELECT *, DATE_FORMAT(recorded_date, '%Y-%m-%d') as display_date, DATE_FORMAT(created_at, '%Y-%m-%d') as created_at 
             FROM in_records ${whereCondition} ORDER BY recorded_date DESC`,
            params
        );
    },

    async getMonthlyStats(productId, month) {
        return await dbUtils.queryOne(
            `SELECT SUM(quantity) as total_in 
             FROM in_records 
             WHERE product_id = ? AND DATE_FORMAT(recorded_date, "%Y-%m") = ?`,
            [productId, month]
        );
    },

    async findById(id) {
        return await dbUtils.queryOne(
            'SELECT * FROM in_records WHERE id = ?',
            [id]
        );
    },

    async delete(id) {
        return await dbUtils.delete(
            'DELETE FROM in_records WHERE id = ?',
            [id]
        );
    },

    async update(id, data) {
        const { product_id, stock_method_name, batch_number, production_date, expiration_date, quantity, unit_price, total_amount, source, remark, recorded_date } = data;
        
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
        if (production_date !== undefined) {
            updateFields.push('production_date = ?');
            updateValues.push(production_date);
        }
        if (expiration_date !== undefined) {
            updateFields.push('expiration_date = ?');
            updateValues.push(expiration_date);
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
        if (source !== undefined) {
            updateFields.push('source = ?');
            updateValues.push(source);
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
            `UPDATE in_records SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );
    }
};

module.exports = InRecordModel;