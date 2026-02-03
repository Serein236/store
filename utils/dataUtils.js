function formatDateForMySQL(dateString) {
    if (!dateString) return null;
    
    const dateObj = new Date(dateString);
    // 添加8小时（中国时区UTC+8）
    const adjustedDate = new Date(dateObj.getTime() + (8 * 60 * 60 * 1000));
    return adjustedDate.toISOString().split('T')[0];
}

function parseFloatSafe(value) {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
}

function parseIntSafe(value) {
    const num = parseInt(value);
    return isNaN(num) ? 0 : num;
}

module.exports = {
    formatDateForMySQL,
    parseFloatSafe,
    parseIntSafe
};