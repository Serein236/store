// models/ProductModel.js
const dbUtils = require('../utils/dbUtils');

const ProductModel = {
    async findAll() {
        return await dbUtils.query('SELECT * FROM products ORDER BY id DESC');
    },

    async findById(id) {
        return await dbUtils.queryOne('SELECT * FROM products WHERE id = ?', [id]);
    },

    async create(productData) {
        const { name, spec, unit, packing_spec, retail_price } = productData;
        const result = await dbUtils.insert(
            'INSERT INTO products (name, spec, unit, packing_spec, retail_price) VALUES (?, ?, ?, ?, ?)',
            [name, spec, unit, packing_spec, retail_price]
        );
        return { id: result.insertId, ...productData };
    },

    async update(id, productData) {
        const { name, spec, unit, packing_spec, retail_price } = productData;
        await dbUtils.update(
            'UPDATE products SET name = ?, spec = ?, unit = ?, packing_spec = ?, retail_price = ? WHERE id = ?',
            [name, spec, unit, packing_spec, retail_price, id]
        );
        return { id, ...productData };
    },

    async delete(id) {
        await dbUtils.delete('DELETE FROM products WHERE id = ?', [id]);
        return true;
    },

    async updateStock(productId, quantity) {
        await dbUtils.update(
            'UPDATE products SET stock = stock + ? WHERE id = ?',
            [quantity, productId]
        );
        return true;
    }
};

module.exports = ProductModel;