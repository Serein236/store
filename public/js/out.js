async function checkLogin() {
            try {
                const response = await fetch('/api/auth/current-user');
                const data = await response.json();

                if (!data.loggedIn) {
                    window.location.href = 'login.html';
                } else {
                    document.getElementById('currentUser').textContent = `欢迎, ${data.username}`;
                    await loadProducts();
                    await loadStockMethods('out');

                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    document.getElementById('recordedDate').value = `${year}-${month}-${day}`;
                    // 添加计算总金额的事件监听
                    document.getElementById('quantity').addEventListener('input', calculateTotal);
                    document.getElementById('unit_price').addEventListener('input', calculateTotal);
                    // 初始化商品信息显示
                    showProductInfo();
                }
            } catch (error) {
                console.error('检查登录状态失败:', error);
                window.location.href = 'login.html';
            }
        }

        async function loadStockMethods(type) {
            try {
                const response = await fetch(`/api/stock-methods?type=${type}`);
                const methods = await response.json();
                const select = document.getElementById('stock_method_name');
                select.innerHTML = '<option value="">请选择出入库方式</option>';
                methods.forEach(method => {
                    const option = document.createElement('option');
                    option.value = method;
                    option.textContent = method;
                    select.appendChild(option);
                });
            } catch (error) {
                console.error('加载出入库方式失败:', error);
            }
        }

        let products = [];

        async function loadProducts() {
            try {
                const response = await fetch('/api/products');
                products = await response.json();

                const select = document.getElementById('productId');
                select.innerHTML = '<option value="">请选择商品</option>';

                products.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.textContent = `${product.product_code} - ${product.name} (库存: ${product.stock || 0})`;
                    select.appendChild(option);
                });
                // 添加商品选择事件监听
                select.addEventListener('change', async function() {
                    showProductInfo();
                    await loadProductBatches(this.value);
                });
            } catch (error) {
                console.error('加载商品失败:', error);
            }
        }

        async function loadProductBatches(productId) {
            try {
                const select = document.getElementById('batch_number');
                select.innerHTML = '<option value="">请选择产品批号</option>';

                if (!productId) {
                    return;
                }

                const response = await fetch(`/api/product-batches/${productId}`);
                const batches = await response.json();

                batches.forEach(batch => {
                    const option = document.createElement('option');
                    option.value = batch.batch_number;
                    option.textContent = `${batch.batch_number} (库存: ${batch.current_stock})`;
                    select.appendChild(option);
                });
            } catch (error) {
                console.error('加载商品批次失败:', error);
            }
        }

        function showProductInfo() {
            const productId = document.getElementById('productId').value;
            const productInfoDiv = document.getElementById('productInfo');
            
            if (!productId) {
                productInfoDiv.innerHTML = `
                    <div class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">加载中...</span>
                        </div>
                        <p class="mt-2">请选择商品以查看详细信息</p>
                    </div>
                `;
                return;
            }
            
            const product = products.find(p => p.id == productId);
            if (product) {
                let stockBadgeClass = 'bg-success';
                if (product.stock <= 0) {
                    stockBadgeClass = 'bg-danger';
                } else if (product.danger_quantity && product.stock <= product.danger_quantity) {
                    stockBadgeClass = 'bg-danger';
                } else if (product.warning_quantity && product.stock <= product.warning_quantity) {
                    stockBadgeClass = 'bg-warning';
                }

                productInfoDiv.innerHTML = `
                    <div class="row g-3">
                        <div class="col-md-6">
                            <p><strong>商品ID:</strong> ${product.id || '-'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>商品编码:</strong> ${product.product_code || '-'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>商品名称:</strong> ${product.name || '-'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>规格:</strong> ${product.spec || '-'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>单位:</strong> ${product.unit || '-'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>装箱规格:</strong> ${product.packing_spec || '-'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>零售价:</strong> ${product.retail_price ? '¥' + parseFloat(product.retail_price).toFixed(2) : '-'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>条形码:</strong> ${product.barcode || '-'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>生产厂家:</strong> ${product.manufacturer || '-'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>警告库存:</strong> ${product.warning_quantity || '-'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>危险库存:</strong> ${product.danger_quantity || '-'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>当前库存:</strong> <span class="badge ${stockBadgeClass}">${product.stock || 0}</span></p>
                        </div>
                    </div>
                `;
            } else {
                productInfoDiv.innerHTML = `
                    <div class="text-center py-4">
                        <i class="bi bi-exclamation-triangle text-warning fs-3"></i>
                        <p class="mt-2">商品信息加载失败</p>
                    </div>
                `;
            }
        }

        function calculateTotal() {
            const quantity = parseFloat(document.getElementById('quantity').value) || 0;
            const unitPrice = parseFloat(document.getElementById('unit_price').value) || 0;
            const totalAmount = quantity * unitPrice;
            document.getElementById('total_amount').value = totalAmount.toFixed(2);
        }

        document.getElementById('outForm').addEventListener('submit', async function (e) {
            e.preventDefault();

            const outData = {
                product_id: document.getElementById('productId').value,
                stock_method_name: document.getElementById('stock_method_name').value,
                batch_number: document.getElementById('batch_number').value,
                quantity: parseInt(document.getElementById('quantity').value),
                unit_price: parseFloat(document.getElementById('unit_price').value),
                total_amount: parseFloat(document.getElementById('total_amount').value),
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
                await fetch('/api/auth/logout');
                window.location.href = 'login.html';
            } catch (error) {
                console.error('退出登录失败:', error);
            }
        }

        document.addEventListener('DOMContentLoaded', checkLogin);