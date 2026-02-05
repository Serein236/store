// 格式化时间戳为日期
function formatDate(timestamp) {
    if (!timestamp) return '-';
    // 如果已经是日期格式（不含时间），直接返回
    if (timestamp.length === 10 && timestamp.includes('-')) {
        return timestamp;
    }
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
}

// 加载入库记录
async function loadInRecords() {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const emptyStateDiv = document.getElementById('emptyState');
    const recordsBody = document.getElementById('inRecordsBody');
    const recordCountDiv = document.getElementById('recordCount');
    
    // 显示加载状态
    loadingDiv.classList.remove('d-none');
    errorDiv.classList.add('d-none');
    emptyStateDiv.classList.add('d-none');
    
    try {
        // 请求所有入库记录
        const response = await fetch('/api/in-records');
        if (!response.ok) {
            throw new Error('加载入库记录失败');
        }
        
        const inRecords = await response.json();
        
        // 隐藏加载状态
        loadingDiv.classList.add('d-none');
        
        // 显示记录数量
        recordCountDiv.textContent = `共 ${inRecords.length} 条记录`;
        
        // 清空表格
        recordsBody.innerHTML = '';
        
        if (inRecords.length === 0) {
            // 显示空状态
            emptyStateDiv.classList.remove('d-none');
            return;
        }
        
        // 渲染入库记录
        inRecords.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.id}</td>
                <td>${record.product_name}</td>
                <td>${record.stock_method_name || '-'}</td>
                <td>${record.batch_number || '-'}</td>
                <td>${formatDate(record.production_date)}</td>
                <td>${formatDate(record.expiration_date)}</td>
                <td>${record.quantity}</td>
                <td>¥${parseFloat(record.unit_price).toFixed(2)}</td>
                <td>¥${parseFloat(record.total_amount).toFixed(2)}</td>
                <td>${record.source || '-'}</td>
                <td>${record.display_date || '-'}</td>
                <td>${record.remark || '-'}</td>
                <td>${formatDate(record.created_at)}</td>
            `;
            recordsBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('加载入库记录失败:', error);
        loadingDiv.classList.add('d-none');
        errorDiv.classList.remove('d-none');
        errorDiv.textContent = `加载失败: ${error.message}`;
    }
}

// 初始化页面
async function initInRecordsPage() {
    // 初始化公共部分
    await recordsCommon.initPage();
    
    // 加载入库记录
    await loadInRecords();
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', initInRecordsPage);