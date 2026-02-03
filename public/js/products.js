async function checkLogin() {
            try {
                const response = await fetch('/api/auth/current-user');
                const data = await response.json();

                if (!data.loggedIn) {
                    window.location.href = 'login.html';
                } else {
                    document.getElementById('currentUser').textContent = `欢迎, ${data.username}`;
                }
            } catch (error) {
                console.error('检查登录状态失败:', error);
                window.location.href = 'login.html';
            }
        }

        document.getElementById('addProductForm').addEventListener('submit', async function (e) {
            e.preventDefault();

            const productData = {
                name: document.getElementById('productName').value,
                spec: document.getElementById('productSpec').value,
                unit: document.getElementById('unit').value,
                packing_spec: document.getElementById('packingSpec').value,
                retail_price: document.getElementById('retailPrice').value || null,
                barcode: document.getElementById('barcode').value || null,
                manufacturer: document.getElementById('manufacturer').value || null,
                warning_quantity: document.getElementById('warningQuantity').value || 10,
                danger_quantity: document.getElementById('dangerQuantity').value || 5
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
                    // 重新生成商品编码
                    document.getElementById('productCode').value = Math.floor(100000 + Math.random() * 900000).toString();
                } else {
                    alert('添加失败: ' + data.message);
                }
            } catch (error) {
                console.error('添加商品失败:', error);
                alert('添加商品失败');
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