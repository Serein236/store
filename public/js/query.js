async function checkLogin() {
            try {
                const response = await fetch('/api/auth/current-user');
                const data = await response.json();

                if (!data.loggedIn) {
                    window.location.href = 'login.html';
                } else {
                    document.getElementById('currentUser').textContent = `欢迎, ${data.username}`;
                    loadProducts();
                }
            } catch (error) {
                console.error('检查登录状态失败:', error);
                window.location.href = 'login.html';
            }
        }

        async function loadProducts() {
            try {
                const response = await fetch('/api/products');
                const products = await response.json();

                const select = document.getElementById('productId');
                select.innerHTML = '<option value="">请选择商品</option>';

                products.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.textContent = `${product.name} (当前库存: ${product.stock})`;
                    select.appendChild(option);
                });
            } catch (error) {
                console.error('加载商品失败:', error);
            }
        }

        async function queryStock() {
            const productId = document.getElementById('productId').value;
            const month = document.getElementById('queryMonth').value;

            if (!productId) {
                alert('请选择商品');
                return;
            }

            try {
                let url = `/api/query/${productId}`;
                if (month) {
                    url += `?month=${month}`;
                }

                console.log('请求URL:', url);

                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP错误: ${response.status}`);
                }

                const data = await response.json();
                console.log('查询结果:', data);

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

        function renderQueryResult(data) {
            const product = data.product;

            document.getElementById('productInfo').innerHTML = `
                <div class="col-md-3">
                    <p><strong>商品名称:</strong> ${product.name}</p>
                </div>
                <div class="col-md-2">
                    <p><strong>规格:</strong> ${product.spec || '-'}</p>
                </div>
                <div class="col-md-2">
                    <p><strong>单位:</strong> ${product.unit || '-'}</p>
                </div>
                <div class="col-md-2">
                    <p><strong>装箱规格:</strong> ${product.packing_spec || '-'}</p>
                </div>
                <div class="col-md-1">
                    <p><strong>零售价:</strong> ${product.retail_price ? '¥' + parseFloat(product.retail_price).toFixed(2) : '-'}</p>
                </div>
                <div class="col-md-2">
                    <p><strong>当前库存:</strong> <span class="badge ${product.stock < 10 ? 'bg-danger' : 'bg-success'}">${product.stock}</span></p>
                </div>
            `;

            const monthlyStatsTable = document.getElementById('monthlyStatsTable');
            monthlyStatsTable.innerHTML = '';

            if (data.monthlyStats && data.monthlyStats.length > 0) {
                data.monthlyStats.forEach(stat => {
                    const netChange = stat.in_quantity - stat.out_quantity;
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${stat.month}</td>
                        <td><span class="badge bg-info">${stat.in_quantity}</span></td>
                        <td><span class="badge bg-warning">${stat.out_quantity}</span></td>
                        <td class="fw-bold ${netChange > 0 ? 'text-success' : netChange < 0 ? 'text-danger' : ''}">
                            ${netChange > 0 ? '+' : ''}${netChange}
                        </td>
                    `;
                    monthlyStatsTable.appendChild(row);
                });
            } else {
                monthlyStatsTable.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center text-muted">
                            <i class="bi bi-calendar-x me-2"></i>暂无统计数据
                        </td>
                    </tr>
                `;
            }

            const inDetailsTable = document.getElementById('inDetailsTable');
            inDetailsTable.innerHTML = '';

            if (data.inRecords && data.inRecords.length > 0) {
                data.inRecords.forEach(record => {
                    const typeText = record.type === 'purchase' ? '采购入库' : '退货入库';
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${record.recorded_date}</td>
                        <td><span class="badge ${record.type === 'purchase' ? 'bg-primary' : 'bg-info'}">${typeText}</span></td>
                        <td><span class="badge bg-success">${record.quantity}</span></td>
                        <td>${record.source || '-'}</td>
                        <td>${record.remark || '-'}</td>
                    `;
                    inDetailsTable.appendChild(row);
                });
            } else {
                inDetailsTable.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-muted">
                            <i class="bi bi-arrow-down-circle me-2"></i>暂无入库记录
                        </td>
                    </tr>
                `;
            }

            const outDetailsTable = document.getElementById('outDetailsTable');
            outDetailsTable.innerHTML = '';

            if (data.outRecords && data.outRecords.length > 0) {
                data.outRecords.forEach(record => {
                    const typeText = record.type === 'sale' ? '销售出库' : '其他';
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${record.recorded_date}</td>
                        <td><span class="badge bg-warning">${typeText}</span></td>
                        <td><span class="badge bg-danger">${record.quantity}</span></td>
                        <td>${record.destination || '-'}</td>
                        <td>${record.remark || '-'}</td>
                    `;
                    outDetailsTable.appendChild(row);
                });
            } else {
                outDetailsTable.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-muted">
                            <i class="bi bi-arrow-up-circle me-2"></i>暂无出库记录
                        </td>
                    </tr>
                `;
            }
        }

        async function logout() {
            try {
                await fetch('/api/auth/logout');
                window.location.href = 'login.html';
            } catch (error) {
                console.error('退出登录失败:', error);
            }
        }

        document.addEventListener('DOMContentLoaded', checkLogin);