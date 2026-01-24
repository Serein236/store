let products = [];
        let editModal = null;

        async function checkLogin() {
            try {
                const response = await fetch('/api/current-user');
                const data = await response.json();

                if (!data.loggedIn) {
                    window.location.href = 'login.html';
                } else {
                    document.getElementById('currentUser').textContent = `欢迎, ${data.username}`;
                    loadProducts();
                    editModal = new bootstrap.Modal(document.getElementById('editModal'));
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
                    <td>${product.name}</td>
                    <td>${product.spec || '-'}</td>
                    <td>${product.packing_spec || '-'}</td>
                    <td>${product.unit || '-'}</td>
                    <td>${product.retail_price ? '¥' + product.retail_price : '-'}</td>
                    <td><span class="badge ${product.stock < 10 ? 'bg-danger' : 'bg-success'}">${product.stock}</span></td>
                    <td>
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

        document.getElementById('addProductForm').addEventListener('submit', async function (e) {
            e.preventDefault();

            const productData = {
                name: document.getElementById('productName').value,
                spec: document.getElementById('productSpec').value,
                unit: document.getElementById('unit').value,
                packing_spec: document.getElementById('packingSpec').value,
                retail_price: document.getElementById('retailPrice').value || null
            };

            try {
                const response = await fetch('/api/products', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(productData)
                });

                const data = await response.json();

                if (data.success) {
                    alert('商品添加成功');
                    document.getElementById('addProductForm').reset();
                    loadProducts();
                } else {
                    alert('添加失败: ' + data.message);
                }
            } catch (error) {
                console.error('添加商品失败:', error);
                alert('添加商品失败');
            }
        });

        function editProduct(id) {
            const product = products.find(p => p.id === id);
            if (!product) return;

            document.getElementById('editProductId').value = product.id;
            document.getElementById('editProductName').value = product.name;
            document.getElementById('editProductSpec').value = product.spec || '';
            document.getElementById('editPackingSpec').value = product.packing_spec || '';
            document.getElementById('editUnit').value = product.unit || '';
            document.getElementById('editRetailPrice').value = product.retail_price || '';

            editModal.show();
        }

        async function updateProduct() {
            const id = document.getElementById('editProductId').value;
            const productData = {
                name: document.getElementById('editProductName').value,
                spec: document.getElementById('editProductSpec').value,
                packing_spec: document.getElementById('editPackingSpec').value,
                unit: document.getElementById('editUnit').value,
                retail_price: document.getElementById('editRetailPrice').value || null
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
                await fetch('/api/logout');
                window.location.href = 'login.html';
            } catch (error) {
                console.error('退出登录失败:', error);
            }
        }

        document.addEventListener('DOMContentLoaded', checkLogin);