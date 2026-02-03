// models/UserModel.js
const dbUtils = require('../utils/dbUtils');

const UserModel = {
    async findByUsername(username) {
        return await dbUtils.queryOne('SELECT * FROM users WHERE username = ?', [username]);
    },

    async findById(id) {
        return await dbUtils.queryOne('SELECT * FROM users WHERE id = ?', [id]);
    }
};

module.exports = UserModel;