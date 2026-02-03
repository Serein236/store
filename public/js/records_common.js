// 检查登录状态
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/current-user');
        const data = await response.json();
        if (!data.loggedIn) {
            window.location.href = 'login.html';
        } else {
            const currentUserElement = document.getElementById('currentUser');
            if (currentUserElement) {
                currentUserElement.textContent = `欢迎, ${data.username}`;
            }
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
        window.location.href = 'login.html';
    }
}

// 退出登录
function logout() {
    fetch('/api/auth/logout', {
        method: 'POST'
    })
    .then(response => {
        if (response.ok) {
            window.location.href = 'login.html';
        }
    })
    .catch(error => {
        console.error('退出登录失败:', error);
    });
}

// 暴露logout函数给全局
window.logout = logout;

// 生成月份选项
function generateMonthOptions() {
    const monthSelect = document.getElementById('monthFilter');
    if (!monthSelect) return;
    
    // 清空现有选项（保留第一个"全部月份"选项）
    while (monthSelect.options.length > 1) {
        monthSelect.remove(1);
    }
    
    // 生成最近12个月的选项
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const monthText = `${year}-${month}`;
        
        const option = document.createElement('option');
        option.value = monthText;
        option.textContent = monthText;
        monthSelect.appendChild(option);
    }
}

// 加载商品列表
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        if (!response.ok) {
            throw new Error('加载商品列表失败');
        }
        const products = await response.json();
        
        const productSelect = document.getElementById('productFilter');
        if (productSelect) {
            // 清空现有选项（保留第一个"全部商品"选项）
            while (productSelect.options.length > 1) {
                productSelect.remove(1);
            }
            
            // 添加商品选项
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} (${product.spec})`;
                productSelect.appendChild(option);
            });
        }
        
        return products;
    } catch (error) {
        console.error('加载商品列表失败:', error);
        return [];
    }
}

// 初始化页面
async function initPage() {
    await checkAuth();
    generateMonthOptions();
}

// 导出公共函数
window.recordsCommon = {
    checkAuth,
    generateMonthOptions,
    loadProducts,
    initPage
};