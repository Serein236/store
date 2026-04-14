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
    },

    async findById(id) {
        return await dbUtils.queryOne('SELECT * FROM stock_methods WHERE id = ?', [id]);
    },

    async findByMethodName(methodName) {
        return await dbUtils.queryOne('SELECT * FROM stock_methods WHERE method_name = ?', [methodName]);
    },

    async create(data) {
        const { type, method_name } = data;
        const result = await dbUtils.insert(
            'INSERT INTO stock_methods (type, method_name) VALUES (?, ?)',
            [type, method_name]
        );
        return { id: result.insertId, ...data };
    },

    async update(id, data) {
        const { type, method_name } = data;
        const oldMethod = await this.findById(id);
        if (!oldMethod) {
            throw new Error('出入库方式不存在');
        }
        
        // 检查新名称是否与其他记录冲突
        if (method_name !== oldMethod.method_name) {
            const existing = await this.findByMethodName(method_name);
            if (existing && existing.id !== parseInt(id)) {
                throw new Error('该方式名称已存在');
            }
        }

        await dbUtils.update(
            'UPDATE stock_methods SET type = ?, method_name = ? WHERE id = ?',
            [type, method_name, id]
        );
        return { id: parseInt(id), type, method_name, oldMethodName: oldMethod.method_name };
    },

    async delete(id) {
        const method = await this.findById(id);
        if (!method) {
            throw new Error('出入库方式不存在');
        }

        // 检查是否有关联的出入库记录
        const inRecords = await dbUtils.query(
            'SELECT COUNT(*) as count FROM in_records WHERE stock_method_name = ?',
            [method.method_name]
        );
        const outRecords = await dbUtils.query(
            'SELECT COUNT(*) as count FROM out_records WHERE stock_method_name = ?',
            [method.method_name]
        );

        if (inRecords[0].count > 0 || outRecords[0].count > 0) {
            throw new Error('该出入库方式已被使用，无法删除');
        }

        await dbUtils.delete('DELETE FROM stock_methods WHERE id = ?', [id]);
        return method;
    }
};

module.exports = StockMethodModel;