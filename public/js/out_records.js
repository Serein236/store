// 加载出库记录
async function loadOutRecords() {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const emptyStateDiv = document.getElementById('emptyState');
    const recordsBody = document.getElementById('outRecordsBody');
    const recordCountDiv = document.getElementById('recordCount');
    
    // 显示加载状态
    loadingDiv.classList.remove('d-none');
    errorDiv.classList.add('d-none');
    emptyStateDiv.classList.add('d-none');
    
    try {
        // 请求所有出库记录
        const response = await fetch('/api/out-records');
        if (!response.ok) {
            throw new Error('加载出库记录失败');
        }
        
        const outRecords = await response.json();
        
        // 隐藏加载状态
        loadingDiv.classList.add('d-none');
        
        // 显示记录数量
        recordCountDiv.textContent = `共 ${outRecords.length} 条记录`;
        
        // 清空表格
        recordsBody.innerHTML = '';
        
        if (outRecords.length === 0) {
            // 显示空状态
            emptyStateDiv.classList.remove('d-none');
            return;
        }
        
        // 渲染出库记录
        outRecords.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.id}</td>
                <td>${record.product_name}</td>
                <td>${record.stock_method_name || '-'}</td>
                <td>${record.quantity}</td>
                <td>¥${parseFloat(record.unit_price).toFixed(2)}</td>
                <td>¥${parseFloat(record.total_amount).toFixed(2)}</td>
                <td>${record.destination || '-'}</td>
                <td>${record.display_date || '-'}</td>
                <td>${record.remark || '-'}</td>
                <td>${record.display_date || '-'}</td>
            `;
            recordsBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('加载出库记录失败:', error);
        loadingDiv.classList.add('d-none');
        errorDiv.classList.remove('d-none');
        errorDiv.textContent = `加载失败: ${error.message}`;
    }
}

// 初始化页面
async function initOutRecordsPage() {
    // 初始化公共部分
    await recordsCommon.initPage();
    
    // 加载出库记录
    await loadOutRecords();
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', initOutRecordsPage);