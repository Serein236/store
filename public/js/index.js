// ========== 登录状态检查 ==========
async function checkLogin() {
    try {
        const response = await fetch('/api/current-user');
        const data = await response.json();
        
        if (!data.loggedIn) {
            window.location.href = 'login.html';
        } else {
            document.getElementById('currentUser').textContent = `欢迎,  $ {data.username}`;
            loadDashboardData();
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
        window.location.href = 'login.html';
    }
}

// ========== 加载首页仪表盘数据 ==========
async function loadDashboardData() {
    try {
        // 获取商品总数和总库存
        const productsRes = await fetch('/api/products');
        const products = await productsRes.json();
        document.getElementById('totalProducts').textContent = products.length;
        
        const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
        document.getElementById('totalStock').textContent = totalStock;
        
        // 获取今日入库量
        const today = new Date().toISOString().split('T')[0]; // 格式: YYYY-MM-DD
        const inRes = await fetch('/api/in-records');
        const inRecords = await inRes.json();
        const todayIn = inRecords.filter(record => record.recorded_date === today)
            .reduce((sum, record) => sum + record.quantity, 0);
        document.getElementById('todayIn').textContent = todayIn;
        
        // 获取今日出库量
        const outRes = await fetch('/api/out-records');
        const outRecords = await outRes.json();
        const todayOut = outRecords.filter(record => record.recorded_date === today)
            .reduce((sum, record) => sum + record.quantity, 0);
        document.getElementById('todayOut').textContent = todayOut;
    } catch (error) {
        console.error('加载仪表盘数据失败:', error);
    }
}

// ========== 退出登录 ==========
async function logout() {
    try {
        await fetch('/api/logout');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('退出登录失败:', error);
    }
}

// ========== 页面加载完成后执行 ==========
document.addEventListener('DOMContentLoaded', checkLogin);