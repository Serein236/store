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

        let isSubmitting = false;

        document.getElementById('outForm').addEventListener('submit', async function (e) {
            e.preventDefault();

            // 防止重复提交
            if (isSubmitting) {
                return;
            }
            isSubmitting = true;

            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>提交中...';
            }

            // 获取并验证必填字段
            const productId = document.getElementById('productId').value;
            const stockMethodName = document.getElementById('stock_method_name').value;
            const batchNumber = document.getElementById('batch_number').value;
            const quantity = parseInt(document.getElementById('quantity').value);
            const unitPrice = parseFloat(document.getElementById('unit_price').value);
            const totalAmount = parseFloat(document.getElementById('total_amount').value);
            const recordedDate = document.getElementById('recordedDate').value;

            // 验证必填字段
            if (!productId) {
                alert('请选择商品');
                document.getElementById('productId').focus();
                isSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>提交出库';
                return;
            }
            if (!stockMethodName) {
                alert('请选择出库方式');
                document.getElementById('stock_method_name').focus();
                isSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>提交出库';
                return;
            }
            if (!batchNumber) {
                alert('请选择产品批号');
                document.getElementById('batch_number').focus();
                isSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>提交出库';
                return;
            }
            if (!quantity || quantity <= 0) {
                alert('请输入有效的出库数量');
                document.getElementById('quantity').focus();
                isSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>提交出库';
                return;
            }
            if (isNaN(unitPrice) || unitPrice < 0) {
                alert('请输入有效的出库单价');
                document.getElementById('unit_price').focus();
                isSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>提交出库';
                return;
            }
            if (!recordedDate) {
                alert('请选择出库日期');
                document.getElementById('recordedDate').focus();
                isSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>提交出库';
                return;
            }

            const outData = {
                product_id: productId,
                stock_method_name: stockMethodName,
                batch_number: batchNumber,
                quantity: quantity,
                unit_price: unitPrice,
                total_amount: totalAmount,
                remark: document.getElementById('remark').value,
                destination: document.getElementById('destination').value,
                recorded_date: recordedDate
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
            } finally {
                isSubmitting = false;
                const submitBtn = this.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>提交出库';
                }
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

        // 客户名称自动完成功能
        function setupCustomerAutocomplete() {
            const destinationInput = document.getElementById('destination');
            const suggestionsContainer = document.getElementById('customerSuggestions');
            let debounceTimer;
            let selectedIndex = -1;
            let currentCustomers = [];

            destinationInput.addEventListener('input', function() {
                clearTimeout(debounceTimer);
                selectedIndex = -1;
                const query = this.value.trim();

                if (query.length >= 2) {
                    debounceTimer = setTimeout(async () => {
                        try {
                            const response = await fetch(`/api/customers?query=${encodeURIComponent(query)}`);
                            currentCustomers = await response.json();
                            showCustomerSuggestions(currentCustomers);
                        } catch (error) {
                            console.error('获取客户列表失败:', error);
                            hideCustomerSuggestions();
                        }
                    }, 300);
                } else {
                    hideCustomerSuggestions();
                }
            });

            // 键盘导航
            destinationInput.addEventListener('keydown', function(e) {
                const items = suggestionsContainer.querySelectorAll('.suggestion-item');

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (items.length > 0) {
                        selectedIndex = (selectedIndex + 1) % items.length;
                        updateSelection(items);
                    }
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (items.length > 0) {
                        selectedIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
                        updateSelection(items);
                    }
                } else if (e.key === 'Enter') {
                    if (selectedIndex >= 0 && items[selectedIndex]) {
                        e.preventDefault();
                        items[selectedIndex].click();
                    }
                } else if (e.key === 'Escape') {
                    hideCustomerSuggestions();
                }
            });

            function updateSelection(items) {
                items.forEach((item, index) => {
                    if (index === selectedIndex) {
                        item.classList.add('active');
                        item.style.backgroundColor = '#e9ecef';
                    } else {
                        item.classList.remove('active');
                        item.style.backgroundColor = '';
                    }
                });
            }

            function showCustomerSuggestions(customers) {
                suggestionsContainer.innerHTML = '';
                selectedIndex = -1;
                if (customers.length > 0) {
                    customers.forEach((customer, index) => {
                        const suggestionItem = document.createElement('div');
                        suggestionItem.className = 'suggestion-item p-2 cursor-pointer';
                        suggestionItem.style.borderBottom = '1px solid #f0f0f0';
                        suggestionItem.style.transition = 'background-color 0.15s';
                        suggestionItem.textContent = customer;
                        suggestionItem.dataset.index = index;

                        suggestionItem.addEventListener('mouseenter', () => {
                            selectedIndex = index;
                            updateSelection(suggestionsContainer.querySelectorAll('.suggestion-item'));
                        });

                        suggestionItem.addEventListener('click', () => {
                            destinationInput.value = customer;
                            hideCustomerSuggestions();
                        });

                        suggestionsContainer.appendChild(suggestionItem);
                    });
                    suggestionsContainer.classList.remove('d-none');
                } else {
                    hideCustomerSuggestions();
                }
            }

            function hideCustomerSuggestions() {
                suggestionsContainer.classList.add('d-none');
                selectedIndex = -1;
                currentCustomers = [];
            }

            // 点击页面其他地方关闭建议列表
            document.addEventListener('click', function(event) {
                if (!destinationInput.contains(event.target) && !suggestionsContainer.contains(event.target)) {
                    hideCustomerSuggestions();
                }
            });
        }

        document.addEventListener('DOMContentLoaded', function() {
            checkLogin();
            setupCustomerAutocomplete();
        });