async function checkLogin() {
            try {
                const response = await fetch('/api/current-user');
                const data = await response.json();

                if (!data.loggedIn) {
                    window.location.href = 'login.html';
                } else {
                    document.getElementById('currentUser').textContent = `欢迎, ${data.username}`;
                    loadProducts();
                    loadOutRecords();

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

        async function loadOutRecords() {
            try {
                const response = await fetch('/api/out-records');
                const records = await response.json();
                renderOutRecords(records);
            } catch (error) {
                console.error('加载出库记录失败:', error);
            }
        }

        function renderOutRecords(records) {
            const tbody = document.getElementById('outRecordsTable');
            tbody.innerHTML = '';

            records.forEach(record => {
                const row = document.createElement('tr');
                const typeText = record.type === 'sale' ? '销售出库' : '其他';
                const createdAt = new Date(record.created_at).toLocaleString('zh-CN');

                row.innerHTML = `
                    <td>${record.id}</td>
                    <td>${record.product_name}</td>
                    <td><span class="badge bg-warning">${typeText}</span></td>
                    <td><span class="badge bg-danger">${record.quantity}</span></td>
                    <td>${record.destination || '-'}</td>
                    <td>${record.recorded_date}</td>
                    <td>${record.remark || '-'}</td>
                    <td><small class="text-muted">${createdAt}</small></td>
                `;
                tbody.appendChild(row);
            });
        }

        document.getElementById('outForm').addEventListener('submit', async function (e) {
            e.preventDefault();

            const outData = {
                product_id: document.getElementById('productId').value,
                type: document.getElementById('type').value,
                quantity: parseInt(document.getElementById('quantity').value),
                remark: document.getElementById('remark').value,
                destination: document.getElementById('destination').value,
                recorded_date: document.getElementById('recordedDate').value
            };

            try {
                const response = await fetch('/api/out', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(outData)
                });

                const data = await response.json();

                if (data.success) {
                    alert('出库成功');
                    document.getElementById('outForm').reset();
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    document.getElementById('recordedDate').value = `${year}-${month}-${day}`;

                    loadProducts();
                    loadOutRecords();
                } else {
                    alert('出库失败: ' + data.message);
                }
            } catch (error) {
                console.error('出库失败:', error);
                alert('出库失败');
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