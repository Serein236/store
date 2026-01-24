async function checkLogin() {
            try {
                const response = await fetch('/api/current-user');
                const data = await response.json();
                if (!data.loggedIn) {
                    window.location.href = 'login.html';
                } else {
                    document.getElementById('currentUser').textContent = `欢迎, ${data.username}`;
                    loadProducts();
                    loadInRecords();
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    document.getElementById('recordedDate').value = `${year}-${month}-${day}`;
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
                    option.textContent = `${product.name} (库存: ${product.stock})`;
                    select.appendChild(option);
                });
            } catch (error) {
                console.error('加载商品失败:', error);
            }
        }

        async function loadInRecords() {
            try {
                const response = await fetch('/api/in-records');
                const records = await response.json();
                renderInRecords(records);
            } catch (error) {
                console.error('加载入库记录失败:', error);
            }
        }

        function renderInRecords(records) {
            const tbody = document.getElementById('inRecordsTable');
            tbody.innerHTML = '';
            records.forEach(record => {
                const row = document.createElement('tr');
                const typeText = record.type === 'purchase' ? '采购入库' : '退货入库';
                const createdAt = new Date(record.created_at).toLocaleString('zh-CN');
                row.innerHTML = `
                    <td>${record.id}</td>
                    <td>${record.product_name}</td>
                    <td><span class="badge ${record.type === 'purchase' ? 'bg-primary' : 'bg-info'}">${typeText}</span></td>
                    <td><span class="badge bg-success">${record.quantity}</span></td>
                    <td>${record.source || '-'}</td>
                    <td>${record.recorded_date}</td>
                    <td>${record.remark || '-'}</td>
                    <td><small class="text-muted">${createdAt}</small></td>
                `;
                tbody.appendChild(row);
            });
        }

        document.getElementById('inForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            const inData = {
                product_id: document.getElementById('productId').value,
                type: document.getElementById('type').value,
                quantity: parseInt(document.getElementById('quantity').value),
                remark: document.getElementById('remark').value,
                source: document.getElementById('source').value,
                recorded_date: document.getElementById('recordedDate').value
            };
            try {
                const response = await fetch('/api/in', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(inData)
                });
                const data = await response.json();
                if (data.success) {
                    alert('入库成功');
                    document.getElementById('inForm').reset();
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    document.getElementById('recordedDate').value = `${year}-${month}-${day}`;
                    loadProducts();
                    loadInRecords();
                } else {
                    alert('入库失败: ' + data.message);
                }
            } catch (error) {
                console.error('入库失败:', error);
                alert('入库失败');
            }
        });

        async function logout() {
            try {
                await fetch('/api/logout');
                window.location.href = 'login.html';
            } catch (error) {
                console.error('退出登录失败:', error);
            }
        }

        document.addEventListener('DOMContentLoaded', checkLogin);