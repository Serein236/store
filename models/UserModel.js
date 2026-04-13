// models/UserModel.js
const dbUtils = require('../utils/dbUtils');

const UserModel = {
    async findByUsername(username) {
        return await dbUtils.queryOne('SELECT * FROM users WHERE username = ?', [username]);
    },

    async findById(id) {
        return await dbUtils.queryOne('SELECT * FROM users WHERE id = ?', [id]);
    },

    async findAll() {
        return await dbUtils.query(
            'SELECT id, username, display_name, role, is_active, created_at FROM users ORDER BY created_at DESC'
        );
    },

    async create(userData) {
        const { username, password, role = 'user', display_name } = userData;
        // 如果没有提供 display_name，使用 username 作为默认值
        const finalDisplayName = display_name || username;
        const result = await dbUtils.insert(
            'INSERT INTO users (username, display_name, password, role, is_active, created_at) VALUES (?, ?, ?, ?, true, NOW())',
            [username, finalDisplayName, password, role]
        );
        return result;
    },

    async update(id, userData) {
        const { username, role, is_active, display_name } = userData;
        const fields = [];
        const values = [];

        if (username !== undefined) {
            fields.push('username = ?');
            values.push(username);
        }
        if (role !== undefined) {
            fields.push('role = ?');
            values.push(role);
        }
        if (is_active !== undefined) {
            fields.push('is_active = ?');
            values.push(is_active);
        }

        if (fields.length === 0) return null;

        values.push(id);
        const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
        return await dbUtils.update(sql, values);
    },

    async updatePassword(id, hashedPassword) {
        return await dbUtils.update(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, id]
        );
    },

    async delete(id) {
        return await dbUtils.update('DELETE FROM users WHERE id = ?', [id]);
    },

    async isAdmin(id) {
        const user = await this.findById(id);
        return user && user.role === 'admin';
    }
};

module.exports = UserModel;