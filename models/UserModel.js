// models/UserModel.js
const dbUtils = require('../utils/dbUtils');

const UserModel = {
    async findByUsername(username) {
        return await dbUtils.queryOne('SELECT * FROM users WHERE username = ?', [username]);
    }
};

module.exports = UserModel;