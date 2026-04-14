async function checkDefaultAdmin() {
            try {
                const response = await fetch('/api/auth/check-default-admin');
                const data = await response.json();
                // 如果不是默认密码，隐藏默认账号提示
                if (!data.isDefault) {
                    const hintElement = document.querySelector('.text-muted');
                    if (hintElement) {
                        hintElement.style.display = 'none';
                    }
                }
            } catch (error) {
                console.log('检查默认管理员状态失败');
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

        document.addEventListener('DOMContentLoaded', checkDefaultAdmin);