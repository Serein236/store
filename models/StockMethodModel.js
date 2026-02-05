// models/StockMethodModel.js
const dbUtils = require('../utils/dbUtils');

const StockMethodModel = {
    async findByType(type) {
        return await dbUtils.query(
            'SELECT method_name FROM stock_methods WHERE type = ? ORDER BY id ASC',
            [type]
        );
    },

    async findAll() {
        return await dbUtils.query('SELECT * FROM stock_methods ORDER BY type ASC, method_name ASC');
    }
};

module.exports = StockMethodModel;