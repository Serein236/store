// ========== 检查登录状态 ==========
async function checkLogin() {
    try {
        const response = await fetch('/api/current-user');
        const data = await response.json();
        
        if (!data.loggedIn) {
            window.location.href = 'login.html';
        } else {
            document.getElementById('currentUser').textContent = `欢迎,  $ {data.username}`;
            loadProducts(); // 加载商品下拉列表
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
        window.location.href = 'login.html';
    }
}

// ========== 加载商品列表（用于下拉框） ==========
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        
        const select = document.getElementById('productId');
        select.innerHTML = '<option value="">请选择商品</option>';
        
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = ` $ {product.name} (当前库存:  $ {product.stock})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('加载商品失败:', error);
    }
}

// ========== 执行库存查询 ==========
async function queryStock() {
    const productId = document.getElementById('productId').value;
    const month = document.getElementById('queryMonth').value;
    
    if (!productId) {
        alert('请选择商品');
        return;
    }
    
    try {
        let url = `/api/query/ $ {productId}`;
        if (month) {
            url += `?month= $ {month}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP错误:  $ {response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            renderQueryResult(data);
            document.getElementById('queryResult').style.display = 'block';
        } else {
            alert('查询失败: ' + (data.message || '未知错误'));
        }
    } catch (error) {
        console.error('查询失败:', error);
        alert('查询失败: ' + error.message);
    }
}

// ========== 渲染查询结果 ==========
function renderQueryResult(data) {
    const product = data.product;
    
    // --- 商品基本信息 ---
    document.getElementById('productInfo').innerHTML = `
        <div class="col-md-3">
            <p><strong>商品名称:</strong>  $ {product.name}</p>
        </div>
        <div class="col-md-2">
            <p><strong>规格:</strong>  $ {product.spec || '-'}</p>
        </div>
        <div class="col-md-2">
            <p><strong>单位:</strong>  $ {product.unit || '-'}</p>
        </div>
        <div class="col-md-2">
            <p><strong>装箱规格:</strong>  $ {product.packing_spec || '-'}</p>
        </div>
        <div class="col-md-1">
            <p><strong>零售价:</strong>  $ {product.retail_price ? '¥' + product.retail_price.toFixed(2) : '-'}</p>
        </div>
        <div class="col-md-2">
            <p><strong>当前库存:</strong> <span class=" $ {product.stock < 10 ? 'text-danger fw-bold' : ''}"> $ {product.stock}</span></p>
        </div>
    `;
    
    // --- 按月统计 ---
    const monthlyStatsTable = document.getElementById('monthlyStatsTable');
    monthlyStatsTable.innerHTML = '';
    
    if (data.monthlyStats && data.monthlyStats.length > 0) {
        data.monthlyStats.forEach(stat => {
            const netChange = stat.in_quantity - stat.out_quantity;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td> $ {stat.month}</td>
                <td> $ {stat.in_quantity}</td>
                <td> $ {stat.out_quantity}</td>
                <td class=" $ {netChange > 0 ? 'text-success' : netChange < 0 ? 'text-danger' : ''}">
                     $ {netChange > 0 ? '+' : ''} $ {netChange}
                </td>
            `;
            monthlyStatsTable.appendChild(row);
        });
    } else {
        monthlyStatsTable.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">暂无统计数据</td>
            </tr>
        `;
    }
    
    // --- 入库明细 ---
    const inDetailsTable = document.getElementById('inDetailsTable');
    inDetailsTable.innerHTML = '';
    
    if (data.inRecords && data.inRecords.length > 0) {
        data.inRecords.forEach(record => {
            const typeText = record.type === 'purchase' ? '采购入库' : '退货入库';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td> $ {record.recorded_date}</td>
                <td> $ {typeText}</td>
                <td> $ {record.quantity}</td>
                <td> $ {record.source || '-'}</td>
                <td> $ {record.remark || '-'}</td>
            `;
            inDetailsTable.appendChild(row);
        });
    } else {
        inDetailsTable.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">暂无入库记录</td>
            </tr>
        `;
    }
    
    // --- 出库明细 ---
    const outDetailsTable = document.getElementById('outDetailsTable');
    outDetailsTable.innerHTML = '';
    
    if (data.outRecords && data.outRecords.length > 0) {
        data.outRecords.forEach(record => {
            const typeText = record.type === 'sale' ? '销售出库' : '其他';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td> $ {record.recorded_date}</td>
                <td> $ {typeText}</td>
                <td> $ {record.quantity}</td>
                <td> $ {record.destination || '-'}</td>
                <td> $ {record.remark || '-'}</td>
            `;
            outDetailsTable.appendChild(row);
        });
    } else {
        outDetailsTable.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">暂无出库记录</td>
            </tr>
        `;
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

// ========== 页面初始化 ==========
document.addEventListener('DOMContentLoaded', checkLogin);