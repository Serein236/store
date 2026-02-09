async function checkLogin() {
            try {
                const response = await fetch('/api/auth/current-user');
                const data = await response.json();
                if (!data.loggedIn) {
                    window.location.href = 'login.html';
                } else {
                    document.getElementById('currentUser').textContent = `欢迎, ${data.username}`;
                    await loadProducts();
                    await loadStockMethods('in');
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    document.getElementById('recordedDate').value = `${year}-${month}-${day}`;
                    document.getElementById('production_date').value = `${year}-${month}-${day}`;
                    // 设置过期日期为当前日期加1年
                    const expireYear = year + 1;
                    document.getElementById('expiration_date').value = `${expireYear}-${month}-${day}`;
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
                select.addEventListener('change', showProductInfo);
            } catch (error) {
                console.error('加载商品失败:', error);
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
                            <p><strong>当前库存:</strong> <span class="badge ${product.stock < 10 ? 'bg-danger' : 'bg-success'}">${product.stock || 0}</span></p>
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

        document.getElementById('inForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            const inData = {
                product_id: document.getElementById('productId').value,
                stock_method_name: document.getElementById('stock_method_name').value,
                batch_number: document.getElementById('batch_number').value,
                production_date: document.getElementById('production_date').value,
                expiration_date: document.getElementById('expiration_date').value,
                quantity: parseInt(document.getElementById('quantity').value),
                unit_price: parseFloat(document.getElementById('unit_price').value),
                total_amount: parseFloat(document.getElementById('total_amount').value),
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
                    document.getElementById('production_date').value = `${year}-${month}-${day}`;
                    // 设置过期日期为当前日期加1年
                    const expireYear = year + 1;
                    document.getElementById('expiration_date').value = `${expireYear}-${month}-${day}`;
                    loadProducts();
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
                await fetch('/api/auth/logout');
                window.location.href = 'login.html';
            } catch (error) {
                console.error('退出登录失败:', error);
            }
        }

        // 供应商名称自动完成功能
        function setupSupplierAutocomplete() {
            const sourceInput = document.getElementById('source');
            const suggestionsContainer = document.getElementById('supplierSuggestions');
            let debounceTimer;

            sourceInput.addEventListener('input', function() {
                clearTimeout(debounceTimer);
                const query = this.value.trim();

                if (query.length >= 2) {
                    debounceTimer = setTimeout(async () => {
                        try {
                            const response = await fetch(`/api/suppliers?query=${encodeURIComponent(query)}`);
                            const suppliers = await response.json();
                            showSupplierSuggestions(suppliers);
                        } catch (error) {
                            console.error('获取供应商列表失败:', error);
                            hideSupplierSuggestions();
                        }
                    }, 300);
                } else {
                    hideSupplierSuggestions();
                }
            });

            function showSupplierSuggestions(suppliers) {
                suggestionsContainer.innerHTML = '';
                if (suppliers.length > 0) {
                    suppliers.forEach(supplier => {
                        const suggestionItem = document.createElement('div');
                        suggestionItem.className = 'p-2 hover:bg-light cursor-pointer';
                        suggestionItem.textContent = supplier;
                        suggestionItem.addEventListener('click', () => {
                            sourceInput.value = supplier;
                            hideSupplierSuggestions();
                        });
                        suggestionsContainer.appendChild(suggestionItem);
                    });
                    suggestionsContainer.classList.remove('d-none');
                } else {
                    hideSupplierSuggestions();
                }
            }

            function hideSupplierSuggestions() {
                suggestionsContainer.classList.add('d-none');
            }

            // 点击页面其他地方关闭建议列表
            document.addEventListener('click', function(event) {
                if (!sourceInput.contains(event.target) && !suggestionsContainer.contains(event.target)) {
                    hideSupplierSuggestions();
                }
            });
        }

        document.addEventListener('DOMContentLoaded', function() {
            checkLogin();
            setupSupplierAutocomplete();
        });