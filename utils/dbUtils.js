const { promisePool } = require('../config/database');

const dbUtils = {
    /**
     * 执行查询
     * @param {string} sql SQL语句
     * @param {Array} params 参数数组
     * @returns {Promise<Array>} 查询结果
     */
    async query(sql, params = []) {
        try {
            const [rows] = await promisePool.query(sql, params);
            return rows;
        } catch (error) {
            console.error('数据库查询错误:', error);
            throw error;
        }
    },

    /**
     * 执行单行查询
     * @param {string} sql SQL语句
     * @param {Array} params 参数数组
     * @returns {Promise<Object|null>} 单行结果
     */
    async queryOne(sql, params = []) {
        try {
            const [rows] = await promisePool.query(sql, params);
            return rows[0] || null;
        } catch (error) {
            console.error('数据库查询错误:', error);
            throw error;
        }
    },

    /**
     * 执行插入操作
     * @param {string} sql SQL语句
     * @param {Array} params 参数数组
     * @returns {Promise<Object>} 插入结果
     */
    async insert(sql, params = []) {
        try {
            const [result] = await promisePool.query(sql, params);
            return result;
        } catch (error) {
            console.error('数据库插入错误:', error);
            throw error;
        }
    },

    /**
     * 执行更新操作
     * @param {string} sql SQL语句
     * @param {Array} params 参数数组
     * @returns {Promise<Object>} 更新结果
     */
    async update(sql, params = []) {
        try {
            const [result] = await promisePool.query(sql, params);
            return result;
        } catch (error) {
            console.error('数据库更新错误:', error);
            throw error;
        }
    },

    /**
     * 执行删除操作
     * @param {string} sql SQL语句
     * @param {Array} params 参数数组
     * @returns {Promise<Object>} 删除结果
     */
    async delete(sql, params = []) {
        try {
            const [result] = await promisePool.query(sql, params);
            return result;
        } catch (error) {
            console.error('数据库删除错误:', error);
            throw error;
        }
    },

    /**
     * 开始事务
     * @returns {Promise<void>}
     */
    async beginTransaction() {
        return await promisePool.beginTransaction();
    },

    /**
     * 提交事务
     * @returns {Promise<void>}
     */
    async commit() {
        return await promisePool.commit();
    },

    /**
     * 回滚事务
     * @returns {Promise<void>}
     */
    async rollback() {
        return await promisePool.rollback();
    },

    /**
     * 安全执行事务
     * @param {Function} transactionFn 事务函数
     * @returns {Promise<any>} 事务结果
     */
    async executeTransaction(transactionFn) {
        const connection = await promisePool.getConnection();
        try {
            await connection.beginTransaction();
            const result = await transactionFn(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};

module.exports = dbUtils;