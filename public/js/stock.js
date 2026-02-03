async function checkLogin() {
            try {
                const response = await fetch('/api/auth/current-user');
                const data = await response.json();

                if (!data.loggedIn) {
                    window.location.href = 'login.html';
                } else {
                    document.getElementById('currentUser').textContent = `欢迎, ${data.username}`;
                    loadStock();
                }
            } catch (error) {
                console.error('检查登录状态失败:', error);
                window.location.href = 'login.html';
            }
        }

        async function loadStock() {
            try {
                const loadingRow = document.getElementById('loadingRow');
                if (loadingRow) {
                    loadingRow.style.display = '';
                }

                const noDataMessage = document.getElementById('noDataMessage');
                if (noDataMessage) {
                    noDataMessage.style.display = 'none';
                }

                const response = await fetch('/api/stock');

                if (!response.ok) {
                    throw new Error(`HTTP错误: ${response.status}`);
                }

                const stockData = await response.json();
                console.log('库存数据:', stockData);

                if (loadingRow) {
                    loadingRow.style.display = 'none';
                }

                if (stockData.error) {
                    alert('加载库存失败: ' + stockData.error);
                    return;
                }

                if (stockData.length === 0) {
                    if (noDataMessage) {
                        noDataMessage.style.display = 'block';
                    }
                }

                renderStock(stockData);
            } catch (error) {
                console.error('加载库存失败:', error);

                const loadingRow = document.getElementById('loadingRow');
                if (loadingRow) {
                    loadingRow.style.display = 'none';
                }

                const tbody = document.getElementById('stockTable');
                if (tbody) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="9" class="text-center text-danger">
                                <i class="bi bi-exclamation-triangle me-2"></i>加载失败: ${error.message}
                            </td>
                        </tr>
                    `;
                }
            }
        }

        function refreshStock() {
            loadStock();
        }

        function renderStock(stockData) {
            const tbody = document.getElementById('stockTable');
            if (!tbody) return;

            tbody.innerHTML = '';

            let totalValue = 0;

            if (!stockData || stockData.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td colspan="9" class="text-center text-muted">
                        <i class="bi bi-inbox me-2"></i>暂无库存数据
                    </td>
                `;
                tbody.appendChild(row);

                const totalValueElement = document.getElementById('totalValue');
                if (totalValueElement) {
                    totalValueElement.textContent = '¥0.00';
                }
                return;
            }

            stockData.forEach(item => {
                const totalIn = item.total_in || 0;
                const totalOut = item.total_out || 0;
                const currentStock = item.stock || 0;
                const retailPrice = item.retail_price || 0;
                const stockValue = retailPrice * currentStock;
                totalValue += stockValue;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.id || '-'}</td>
                    <td>${item.name || '-'}</td>
                    <td>${item.spec || '-'}</td>
                    <td>${item.unit || '-'}</td>
                    <td><span class="badge bg-info">${totalIn}</span></td>
                    <td><span class="badge bg-warning">${totalOut}</span></td>
                    <td>
                        <span class="badge ${currentStock < 10 ? 'bg-danger' : 'bg-success'}">
                            ${currentStock}
                        </span>
                    </td>
                    <td>${retailPrice ? '¥' + parseFloat(retailPrice).toFixed(2) : '-'}</td>
                    <td class="fw-bold">${stockValue ? '¥' + stockValue.toFixed(2) : '-'}</td>
                `;
                tbody.appendChild(row);
            });

            const totalValueElement = document.getElementById('totalValue');
            if (totalValueElement) {
                totalValueElement.textContent = '¥' + totalValue.toFixed(2);
            }
        }

        function exportToExcel() {
            const table = document.getElementById('stockTable');
            if (!table) {
                alert('表格不存在');
                return;
            }

            const rows = table.getElementsByTagName('tr');

            if (rows.length === 0 || (rows.length === 1 && rows[0].cells.length === 1)) {
                alert('没有数据可以导出');
                return;
            }

            let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
            csvContent += "商品ID,商品名称,规格,单位,总入库,总出库,现有库存,零售价,库存价值\n";

            for (let i = 0; i < rows.length; i++) {
                const cells = rows[i].getElementsByTagName('td');
                if (cells.length === 0) continue;

                const row = [];
                for (let j = 0; j < cells.length; j++) {
                    let cellText = cells[j].textContent.trim();
                    cellText = cellText.replace('¥', '');
                    cellText = cellText.replace(/,/g, '，');
                    row.push(`"${cellText}"`);
                }

                csvContent += row.join(',') + "\n";
            }

            const totalValueElement = document.getElementById('totalValue');
            if (totalValueElement) {
                const totalValue = totalValueElement.textContent.replace('¥', '');
                csvContent += `,,,,,,,总计,${totalValue}\n`;
            }

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            link.setAttribute("download", `库存报表_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
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