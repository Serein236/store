async function createDefaultAdmin() {
            try {
                const response = await fetch('/api/auth/current-user');
                console.log('数据库连接正常');
            } catch (error) {
                console.log('首次运行可能需要初始化数据库');
            }
        }

        document.getElementById('loginForm').addEventListener('submit', async function (e) {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (data.success) {
                    window.location.href = 'index.html';
                } else {
                    const errorDiv = document.getElementById('errorMessage');
                    errorDiv.textContent = data.message || '登录失败';
                    errorDiv.classList.remove('d-none');
                }
            } catch (error) {
                const errorDiv = document.getElementById('errorMessage');
                errorDiv.textContent = '网络错误，请检查服务器是否运行';
                errorDiv.classList.remove('d-none');
            }
        });

        document.addEventListener('DOMContentLoaded', createDefaultAdmin);