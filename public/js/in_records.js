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
                <td>
                    <button class="btn btn-sm btn-warning btn-action" onclick="editInRecord(${record.id})">
                        <i class="bi bi-pencil-square me-1"></i>修改
                    </button>
                    <button class="btn btn-sm btn-danger btn-action" onclick="cancelInRecord(${record.id})">
                        <i class="bi bi-x-circle me-1"></i>撤销
                    </button>
                </td>
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
window.addEventListener('DOMContentLoaded', function() {
    initInRecordsPage();
    
    // 添加修改模态框的事件监听
    document.getElementById('edit_quantity').addEventListener('input', calculateEditTotal);
    document.getElementById('edit_unit_price').addEventListener('input', calculateEditTotal);
    document.getElementById('saveEditBtn').addEventListener('click', saveEditInRecord);
});

// 撤销入库记录
async function cancelInRecord(id) {
    if (!confirm('确定要撤销这条入库记录吗？此操作将恢复库存，请谨慎操作！')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/in-records/${id}/cancel`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('撤销入库成功！');
            // 重新加载入库记录
            await loadInRecords();
        } else {
            alert('撤销入库失败: ' + data.message);
        }
    } catch (error) {
        console.error('撤销入库失败:', error);
        alert('撤销入库失败，请稍后重试');
    }
}

// 修改入库记录
async function editInRecord(id) {
    try {
        const response = await fetch(`/api/in-records`);
        if (!response.ok) {
            throw new Error('获取入库记录失败');
        }
        
        const inRecords = await response.json();
        const record = inRecords.find(r => r.id === id);
        
        if (!record) {
            alert('找不到该入库记录');
            return;
        }
        
        // 填充表单数据
        document.getElementById('edit_record_id').value = record.id;
        document.getElementById('edit_product_name').value = record.product_name;
        document.getElementById('edit_batch_number').value = record.batch_number || '';
        document.getElementById('edit_production_date').value = record.production_date || '';
        document.getElementById('edit_expiration_date').value = record.expiration_date || '';
        document.getElementById('edit_quantity').value = record.quantity;
        document.getElementById('edit_unit_price').value = record.unit_price;
        document.getElementById('edit_total_amount').value = record.total_amount;
        document.getElementById('edit_source').value = record.source || '';
        document.getElementById('edit_recorded_date').value = record.display_date || '';
        document.getElementById('edit_remark').value = record.remark || '';
        
        // 加载入库方式
        await loadEditStockMethods(record.stock_method_name);
        
        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('editInRecordModal'));
        modal.show();
        
    } catch (error) {
        console.error('加载入库记录失败:', error);
        alert('加载入库记录失败，请稍后重试');
    }
}

// 加载修改模态框中的入库方式
async function loadEditStockMethods(selectedMethod) {
    try {
        const response = await fetch('/api/stock-methods?type=in');
        const methods = await response.json();
        const select = document.getElementById('edit_stock_method_name');
        select.innerHTML = '<option value="">请选择入库方式</option>';
        methods.forEach(method => {
            const option = document.createElement('option');
            option.value = method;
            option.textContent = method;
            if (method === selectedMethod) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    } catch (error) {
        console.error('加载入库方式失败:', error);
    }
}

// 计算修改模态框中的总金额
function calculateEditTotal() {
    const quantity = parseFloat(document.getElementById('edit_quantity').value) || 0;
    const unitPrice = parseFloat(document.getElementById('edit_unit_price').value) || 0;
    const totalAmount = quantity * unitPrice;
    document.getElementById('edit_total_amount').value = totalAmount.toFixed(2);
}

// 保存修改
async function saveEditInRecord() {
    const id = document.getElementById('edit_record_id').value;
    const updateData = {
        stock_method_name: document.getElementById('edit_stock_method_name').value,
        batch_number: document.getElementById('edit_batch_number').value,
        production_date: document.getElementById('edit_production_date').value,
        expiration_date: document.getElementById('edit_expiration_date').value,
        quantity: parseInt(document.getElementById('edit_quantity').value),
        unit_price: parseFloat(document.getElementById('edit_unit_price').value),
        total_amount: parseFloat(document.getElementById('edit_total_amount').value),
        source: document.getElementById('edit_source').value,
        recorded_date: document.getElementById('edit_recorded_date').value,
        remark: document.getElementById('edit_remark').value
    };
    
    try {
        const response = await fetch(`/api/in-records/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('修改入库成功！');
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('editInRecordModal'));
            modal.hide();
            // 重新加载入库记录
            await loadInRecords();
        } else {
            alert('修改入库失败: ' + data.message);
        }
    } catch (error) {
        console.error('修改入库失败:', error);
        alert('修改入库失败，请稍后重试');
    }
}