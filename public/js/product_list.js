let products = [];
        let editModal = null;
        let detailModal = null;

        async function checkLogin() {
            try {
                const response = await fetch('/api/auth/current-user');
                const data = await response.json();

                if (!data.loggedIn) {
                    window.location.href = 'login.html';
                } else {
                    document.getElementById('currentUser').textContent = `欢迎, ${data.username}`;
                    loadProducts();
                    editModal = new bootstrap.Modal(document.getElementById('editModal'));
                    detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
                }
            } catch (error) {
                console.error('检查登录状态失败:', error);
                window.location.href = 'login.html';
            }
        }

        async function loadProducts() {
            try {
                const response = await fetch('/api/products');
                products = await response.json();
                renderProducts();
            } catch (error) {
                console.error('加载商品失败:', error);
            }
        }

        function renderProducts() {
            const tbody = document.getElementById('productsTable');
            tbody.innerHTML = '';

            products.forEach(product => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${product.id}</td>
                    <td>${product.product_code}</td>
                    <td>${product.name}</td>
                    <td>${product.spec || '-'}</td>
                    <td>${product.packing_spec || '-'}</td>
                    <td>${product.unit || '-'}</td>
                    <td>${product.retail_price ? '¥' + product.retail_price : '-'}</td>
                    <td>${product.manufacturer || '-'}</td>
                    <td><span class="badge ${(product.stock || 0) < 10 ? 'bg-danger' : 'bg-success'}">${product.stock || 0}</span></td>
                    <td>
                        <button class="btn btn-sm btn-info btn-action" onclick="viewProductDetails(${product.id})">
                            <i class="bi bi-eye"></i> 详情
                        </button>
                        <button class="btn btn-sm btn-primary btn-action" onclick="editProduct(${product.id})">
                            <i class="bi bi-pencil"></i> 编辑
                        </button>
                        <button class="btn btn-sm btn-danger btn-action" onclick="deleteProduct(${product.id})">
                            <i class="bi bi-trash"></i> 删除
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

        function editProduct(id) {
            const product = products.find(p => p.id === id);
            if (!product) return;

            document.getElementById('editProductId').value = product.id;
            document.getElementById('editProductCode').value = product.product_code || '';
            document.getElementById('editProductName').value = product.name;
            document.getElementById('editProductSpec').value = product.spec || '';
            document.getElementById('editPackingSpec').value = product.packing_spec || '';
            document.getElementById('editUnit').value = product.unit || '';
            document.getElementById('editRetailPrice').value = product.retail_price || '';
            document.getElementById('editBarcode').value = product.barcode || '';
            document.getElementById('editManufacturer').value = product.manufacturer || '';
            document.getElementById('editWarningQuantity').value = product.warning_quantity || 10;
            document.getElementById('editDangerQuantity').value = product.danger_quantity || 5;

            editModal.show();
        }

        function viewProductDetails(id) {
            const product = products.find(p => p.id === id);
            if (!product) return;

            document.getElementById('detailProductCode').textContent = product.product_code || '-';
            document.getElementById('detailProductName').textContent = product.name || '-';
            document.getElementById('detailProductSpec').textContent = product.spec || '-';
            document.getElementById('detailPackingSpec').textContent = product.packing_spec || '-';
            document.getElementById('detailUnit').textContent = product.unit || '-';
            document.getElementById('detailRetailPrice').textContent = product.retail_price ? '¥' + product.retail_price : '-';
            document.getElementById('detailBarcode').textContent = product.barcode || '-';
            document.getElementById('detailManufacturer').textContent = product.manufacturer || '-';
            document.getElementById('detailWarningQuantity').textContent = product.warning_quantity || 10;
            document.getElementById('detailDangerQuantity').textContent = product.danger_quantity || 5;

            detailModal.show();
        }

        async function updateProduct() {
            const id = document.getElementById('editProductId').value;
            const productData = {
                name: document.getElementById('editProductName').value,
                spec: document.getElementById('editProductSpec').value,
                packing_spec: document.getElementById('editPackingSpec').value,
                unit: document.getElementById('editUnit').value,
                retail_price: document.getElementById('editRetailPrice').value || null,
                barcode: document.getElementById('editBarcode').value || null,
                manufacturer: document.getElementById('editManufacturer').value || null,
                warning_quantity: document.getElementById('editWarningQuantity').value || 10,
                danger_quantity: document.getElementById('editDangerQuantity').value || 5
            };

            try {
                const response = await fetch(`/api/products/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(productData)
                });

                const data = await response.json();

                if (data.success) {
                    editModal.hide();
                    alert('商品更新成功');
                    loadProducts();
                } else {
                    alert('更新失败: ' + data.message);
                }
            } catch (error) {
                console.error('更新商品失败:', error);
                alert('更新商品失败');
            }
        }

        async function deleteProduct(id) {
            if (!confirm('确定要删除这个商品吗？')) return;

            try {
                const response = await fetch(`/api/products/${id}`, {
                    method: 'DELETE'
                });

                const data = await response.json();

                if (data.success) {
                    alert('商品删除成功');
                    loadProducts();
                } else {
                    alert('删除失败: ' + data.message);
                }
            } catch (error) {
                console.error('删除商品失败:', error);
                alert('删除商品失败');
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