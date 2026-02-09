// 格式化时间戳为日期
function formatDate(timestamp) {
    if (!timestamp) return '-';
    // 如果已经是日期格式（不含时间），直接返回
    if (timestamp.length === 10 && timestamp.includes('-')) {
        return timestamp;
    }
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
}

// 数字转中文大写金额
function numToChinese(num) {
    const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
    const units = ['', '拾', '佰', '仟'];
    const bigUnits = ['', '万', '亿'];
    
    if (num === 0) return '零元整';
    
    let integerPart = Math.floor(num);
    let decimalPart = Math.round((num - integerPart) * 100);
    
    let result = '';
    let unitIndex = 0;
    let bigUnitIndex = 0;
    
    while (integerPart > 0) {
        let section = integerPart % 10000;
        if (section > 0) {
            let sectionResult = '';
            let sectionUnitIndex = 0;
            while (section > 0) {
                let digit = section % 10;
                if (digit > 0) {
                    sectionResult = digits[digit] + units[sectionUnitIndex] + sectionResult;
                } else {
                    if (sectionResult && !sectionResult.startsWith('零')) {
                        sectionResult = '零' + sectionResult;
                    }
                }
                section = Math.floor(section / 10);
                sectionUnitIndex++;
            }
            result = sectionResult + bigUnits[bigUnitIndex] + result;
        }
        integerPart = Math.floor(integerPart / 10000);
        bigUnitIndex++;
    }
    
    result += '元';
    
    if (decimalPart === 0) {
        result += '整';
    } else {
        let jiao = Math.floor(decimalPart / 10);
        let fen = decimalPart % 10;
        if (jiao > 0) {
            result += digits[jiao] + '角';
        }
        if (fen > 0) {
            result += digits[fen] + '分';
        }
    }
    
    return result;
}

// 加载出库记录
async function loadOutRecords() {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const emptyStateDiv = document.getElementById('emptyState');
    const recordsBody = document.getElementById('outRecordsBody');
    const recordCountDiv = document.getElementById('recordCount');
    
    // 显示加载状态
    loadingDiv.classList.remove('d-none');
    errorDiv.classList.add('d-none');
    emptyStateDiv.classList.add('d-none');
    
    try {
        // 请求所有出库记录
        const response = await fetch('/api/out-records');
        if (!response.ok) {
            throw new Error('加载出库记录失败');
        }
        
        const outRecords = await response.json();
        
        // 隐藏加载状态
        loadingDiv.classList.add('d-none');
        
        // 显示记录数量
        recordCountDiv.textContent = `共 ${outRecords.length} 条记录`;
        
        // 清空表格
        recordsBody.innerHTML = '';
        
        if (outRecords.length === 0) {
            // 显示空状态
            emptyStateDiv.classList.remove('d-none');
            return;
        }
        
        // 渲染出库记录
        outRecords.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="checkbox" class="record-checkbox" data-id="${record.id}"></td>
                <td>${record.id}</td>
                <td>${record.product_name}</td>
                <td>${record.stock_method_name || '-'}</td>
                <td>${record.batch_number || '-'}</td>
                <td>${record.quantity}</td>
                <td>¥${parseFloat(record.unit_price).toFixed(2)}</td>
                <td>¥${parseFloat(record.total_amount).toFixed(2)}</td>
                <td>${record.destination || '-'}</td>
                <td>${record.display_date || '-'}</td>
                <td>${record.remark || '-'}</td>
                <td>${formatDate(record.created_at)}</td>
                <td>
                    <button class="btn btn-sm btn-info btn-action" onclick="viewOutOrder(${record.id})">
                        <i class="bi bi-eye me-1"></i>查看
                    </button>
                    <button class="btn btn-sm btn-success btn-action" onclick="exportOutOrder(${record.id})">
                        <i class="bi bi-download me-1"></i>导出
                    </button>
                </td>
            `;
            recordsBody.appendChild(row);
        });
        
        // 添加全选功能
        document.getElementById('selectAll').addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.record-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
        
    } catch (error) {
        console.error('加载出库记录失败:', error);
        loadingDiv.classList.add('d-none');
        errorDiv.classList.remove('d-none');
        errorDiv.textContent = `加载失败: ${error.message}`;
    }
}

// 初始化页面
async function initOutRecordsPage() {
    // 初始化公共部分
    await recordsCommon.initPage();
    
    // 加载出库记录
    await loadOutRecords();
}

// 生成出库单单号
function generateOrderNumber(record) {
    const date = record.display_date || new Date().toISOString().split('T')[0];
    const dateStr = date.replace(/-/g, '');
    const quantity = record.quantity || 1;
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${dateStr}-${quantity}-${randomNum}`;
}

// 查看出库单
async function viewOutOrder(recordId) {
    try {
        const response = await fetch(`/api/out-records/${recordId}?t=${Date.now()}`);
        if (!response.ok) {
            throw new Error('获取出库记录失败');
        }
        const record = await response.json();
        console.log('后端返回的出库记录数据:', record);
        
        // 生成出库单单号
        const orderNumber = generateOrderNumber(record);
        
        // 确保所有字段都有值
        const productCode = record.product_code !== undefined ? record.product_code : '-';
        const spec = record.spec !== undefined ? record.spec : '-';
        const unit = record.unit !== undefined ? record.unit : '-';
        const manufacturer = record.manufacturer !== undefined ? record.manufacturer : '-';
        const retailPrice = record.retail_price !== undefined ? '¥' + parseFloat(record.retail_price).toFixed(2) : '-';
        const productionDate = record.production_date !== undefined ? record.production_date : '-';
        const expirationDate = record.expiration_date !== undefined ? record.expiration_date : '-';
        
        console.log('处理后的数据:', {
            productCode,
            spec,
            unit,
            manufacturer,
            retailPrice,
            productionDate,
            expirationDate
        });
        
        // 生成出库单HTML
        let orderHtml = `
            <div class="container">
                <div class="row mb-4">
                    <div class="col text-center">
                        <h2>武没市明睿康星物料技有限公司销售出库单</h2>
                        <div class="row mt-3">
                            <div class="col text-end">
                                <p>单号：${orderNumber}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row mb-4">
                    <div class="col">
                        <p><strong>开单日期：</strong> ${record.display_date || '-'}</p>
                        <p><strong>收货人：</strong> ${record.remark || '-'}</p>
                    </div>
                    <div class="col">
                        <p><strong>客户名称：</strong> ${record.destination || '-'}</p>
                        <p><strong>收货地址：</strong> -</p>
                    </div>
                    <div class="col">
                        <p><strong>生产厂家：</strong> ${manufacturer}</p>
                        <p><strong>收货联系电话：</strong> -</p>
                    </div>
                </div>
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>序号</th>
                            <th>产品编码</th>
                            <th>品名</th>
                            <th>产品规格</th>
                            <th>单位</th>
                            <th>数量</th>
                            <th>单价</th>
                            <th>金额/元</th>
                            <th>产品批号</th>
                            <th>生产日期</th>
                            <th>有效期</th>
                            <th>零售价</th>
                            <th>备注</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>1</td>
                            <td>${productCode}</td>
                            <td>${record.product_name}</td>
                            <td>${spec}</td>
                            <td>${unit}</td>
                            <td>${record.quantity}</td>
                            <td>${parseFloat(record.unit_price).toFixed(2)}</td>
                            <td>${parseFloat(record.total_amount).toFixed(2)}</td>
                            <td>${record.batch_number || '-'}</td>
                            <td>${productionDate}</td>
                            <td>${expirationDate}</td>
                            <td>${retailPrice}</td>
                            <td>${record.remark || '-'}</td>
                        </tr>
                    </tbody>
                </table>
                <div class="row mt-4">
                    <div class="col">
                        <p><strong>合计金额人民币（小写）：</strong> ${parseFloat(record.total_amount).toFixed(2)}</p>
                        <p><strong>合计金额人民币（大写）：</strong> ${numToChinese(parseFloat(record.total_amount))}</p>
                    </div>
                </div>
                <div class="row mt-4">
                    <div class="col">
                        <p><strong>制单人：</strong> -</p>
                        <p><strong>审核人：</strong> -</p>
                    </div>
                    <div class="col">
                        <p><strong>销售负责人：</strong> -</p>
                        <p><strong>客户收货人：</strong> -</p>
                    </div>
                </div>
                <div class="row mt-4 text-muted">
                    <div class="col">
                        <p>（一式四联：白色存根联 黄色回单联 红色客户联为财务对账联）</p>
                        <p>注意事项：客户签收表示购销双方权利义务已确认，货品如有差错，请三天内来电说明（与销售负责人联系），每次发货同行的厂检请保存好</p>
                    </div>
                </div>
            </div>
        `;
        
        // 直接在页面中显示出库单内容（用于调试）
        console.log('生成的HTML:', orderHtml.substring(0, 500) + '...');
        
        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'modal fade show';
        modal.style.display = 'block';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.zIndex = '1050';
        
        // 创建模态框内容
        const modalDialog = document.createElement('div');
        modalDialog.className = 'modal-dialog modal-xl';
        modalDialog.style.margin = '1.75rem auto';
        modalDialog.style.maxWidth = '90%';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        modalHeader.innerHTML = `
            <h5 class="modal-title">出库单详情</h5>
            <button type="button" class="btn-close" aria-label="Close"></button>
        `;
        
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        modalBody.innerHTML = orderHtml;
        
        const modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        modalFooter.innerHTML = `
            <button type="button" class="btn btn-secondary">关闭</button>
            <button type="button" class="btn btn-success"><i class="bi bi-download me-1"></i>导出</button>
        `;
        
        // 组装模态框
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modalContent.appendChild(modalFooter);
        modalDialog.appendChild(modalContent);
        modal.appendChild(modalDialog);
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden'; // 防止背景滚动
        
        // 添加关闭事件
        modalHeader.querySelector('.btn-close').addEventListener('click', function() {
            modal.remove();
            document.body.style.overflow = '';
        });
        
        modalFooter.querySelector('.btn-secondary').addEventListener('click', function() {
            modal.remove();
            document.body.style.overflow = '';
        });
        
        modalFooter.querySelector('.btn-success').addEventListener('click', function() {
            showExportModal(record.id);
        });
        
        // 点击模态框背景关闭
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
                document.body.style.overflow = '';
            }
        });
        
    } catch (error) {
        console.error('查看出库单失败:', error);
        alert('查看出库单失败: ' + error.message);
    }
}

// 显示导出模态框
function showExportModal(recordId) {
    // 创建导出模态框
    const modal = document.createElement('div');
    modal.className = 'modal fade show';
    modal.style.display = 'block';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">导出出库单</h5>
                    <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                </div>
                <div class="modal-body">
                    <form id="exportForm">
                        <div class="mb-3">
                            <label for="consignee" class="form-label">收货人</label>
                            <input type="text" class="form-control" id="consignee" placeholder="请输入收货人姓名">
                        </div>
                        <div class="mb-3">
                            <label for="consigneeAddress" class="form-label">收货地址</label>
                            <input type="text" class="form-control" id="consigneeAddress" placeholder="请输入收货地址">
                        </div>
                        <div class="mb-3">
                            <label for="consigneePhone" class="form-label">收货联系电话</label>
                            <input type="text" class="form-control" id="consigneePhone" placeholder="请输入收货联系电话">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">取消</button>
                    <button type="button" class="btn btn-success" onclick="exportOutOrder(${recordId})"><i class="bi bi-download me-1"></i>导出</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // 添加关闭模态框的点击事件
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 导出出库单
async function exportOutOrder(recordId) {
    try {
        // 获取收件信息
        const consigneeElement = document.getElementById('consignee');
        const consigneeAddressElement = document.getElementById('consigneeAddress');
        const consigneePhoneElement = document.getElementById('consigneePhone');
        
        const consignee = consigneeElement ? consigneeElement.value || '-' : '-';
        const consigneeAddress = consigneeAddressElement ? consigneeAddressElement.value || '-' : '-';
        const consigneePhone = consigneePhoneElement ? consigneePhoneElement.value || '-' : '-';
        
        // 关闭导出模态框
        const exportModals = document.querySelectorAll('.modal.show');
        exportModals.forEach(modal => {
            modal.remove();
        });
        
        const response = await fetch(`/api/out-records/${recordId}?t=${Date.now()}`);
        if (!response.ok) {
            throw new Error('获取出库记录失败');
        }
        const record = await response.json();
        
        // 生成出库单单号
        const orderNumber = generateOrderNumber(record);
        
        // 确保所有字段都有值
        const productCode = record.product_code || '-';
        const spec = record.spec || '-';
        const unit = record.unit || '-';
        const manufacturer = record.manufacturer || '-';
        const retailPrice = record.retail_price ? parseFloat(record.retail_price).toFixed(2) : '-';
        const productionDate = record.production_date || '-';
        const expirationDate = record.expiration_date || '-';
        
        // 格式化日期为 YYYY/MM/DD 格式
        function formatDate(dateStr) {
            if (!dateStr || dateStr === '-') return '-';
            const date = new Date(dateStr);
            return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
        }
        
        // 格式化数据
        const formattedDate = record.display_date ? formatDate(record.display_date) : '-';
        const formattedProductionDate = productionDate !== '-' ? formatDate(productionDate) : '-';
        const formattedExpirationDate = expirationDate !== '-' ? formatDate(expirationDate) : '-';
        const formattedRetailPrice = retailPrice !== '-' ? parseFloat(retailPrice).toFixed(2) : '-';
        
        // 生成CSV内容（按照第一个图片的格式）
        let csvContent = `data:text/csv;charset=utf-8,\uFEFF,,武没市明睿康星物料技有限公司销售出库单,,,,,,\n\n,,,,单号：${orderNumber},转入单号：,,\n开单日期：,${formattedDate},客户名称：,${record.destination || '-'},生产厂家：,${manufacturer},,,\n收货人：,${consignee},收货地址：,${consigneeAddress},收货联系电话：,${consigneePhone},,,\n\n序号,产品编码,品牌,品名,产品规格,单位,数量,单价,金额/元,产品批号,生产日期,有效期,零售价,备注\n1,${productCode},,${record.product_name},${spec},${unit},${record.quantity},${parseFloat(record.unit_price).toFixed(2)},${parseFloat(record.total_amount).toFixed(2)},${record.batch_number || '-'},${formattedProductionDate},${formattedExpirationDate},${formattedRetailPrice},${record.remark || '-'}\n\n合计金额人民币（小写）：,,,,,,,,${parseFloat(record.total_amount).toFixed(2)},共 1 件,,\n合计金额人民币（大写）：,,,,,,,,${numToChinese(parseFloat(record.total_amount))},,,\n\n制单人：,,审核人：,,销售负责人：,,客户收货人：,,\n\n（一式四联：白色存根联 黄色回单联 红色客户联为财务对账联）,,,,,,\n注意事项：客户签收表示购销双方权利义务已确认，货品如有差错，请三天内来电说明（与销售负责人联系），每次发货同行的厂检请保存好,,,,,,`;
        
        try {
            // 首先检查XLSX API是否可用
            console.log('检查XLSX API:');
            console.log('XLSX:', typeof XLSX);
            console.log('XLSX.utils:', typeof XLSX?.utils);
            console.log('XLSX.utils.book_new:', typeof XLSX?.utils?.book_new);
            console.log('XLSX.writeFile:', typeof XLSX?.writeFile);
            
            if (XLSX && XLSX.utils && XLSX.utils.book_new && XLSX.writeFile) {
                // 创建工作簿
                const wb = XLSX.utils.book_new();
                
                // 创建工作表数据
                const wsData = [];
                
                // 添加标题行
                wsData.push(['', '', '', '', '武没市明睿康星物料技有限公司销售出库单']);
                wsData.push([]);
                wsData.push([`单号：${orderNumber}`, '', '', '', '', '', '', '', '', '', '', `转入单号：`]);
                wsData.push(['开单日期：', formattedDate, '', '客户名称：', record.destination || '-', '', '', '', '生产厂家：', manufacturer]);
                wsData.push(['收货人：', consignee, '', '收货地址：', consigneeAddress, '', '', '', '收货联系电话：', consigneePhone]);
                wsData.push([]);
                
                // 添加表头
                wsData.push(['序号', '产品编码', '品名', '产品规格', '单位', '数量', '单价', '金额/元', '产品批号', '生产日期', '有效期', '零售价', '备注']);
                
                // 添加数据行
                wsData.push(['1', productCode, record.product_name, spec, unit, record.quantity, parseFloat(record.unit_price).toFixed(2), parseFloat(record.total_amount).toFixed(2), record.batch_number || '-', formattedProductionDate, formattedExpirationDate, formattedRetailPrice, record.remark || '-']);
                wsData.push([]);
                
                // 添加合计行
                wsData.push(['合计金额人民币（小写）：', '', '', '', '', '', '', '', parseFloat(record.total_amount).toFixed(2), '', '', '', '共 1 件']);
                wsData.push(['合计金额人民币（大写）：', '', '', '', '', '', '', '', numToChinese(parseFloat(record.total_amount))]);
                wsData.push([]);
                
                // 添加制单人等信息
                wsData.push(['制单人：', '-', '', '审核人：', '-', '', '销售负责人：', '-', '', '客户收货人：', '-']);
                wsData.push([]);
                
                // 添加备注信息
                wsData.push(['（一式四联：白色存根联 黄色回单联 红色客户联为财务对账联）']);
                wsData.push(['注意事项：客户签收表示购销双方权利义务已确认，货品如有差错，请三天内来电说明（与销售负责人联系），每次发货同行的厂检请保存好']);
                
                // 创建工作表
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                
                // 设置列宽
                ws['!cols'] = [
                    {wch: 8},  // 序号
                    {wch: 12}, // 产品编码
                    {wch: 16}, // 品名
                    {wch: 12}, // 产品规格
                    {wch: 8},  // 单位
                    {wch: 8},  // 数量
                    {wch: 8},  // 单价
                    {wch: 10}, // 金额/元
                    {wch: 12}, // 产品批号
                    {wch: 12}, // 生产日期
                    {wch: 12}, // 有效期
                    {wch: 10}, // 零售价
                    {wch: 16}  // 备注
                ];
                
                // 设置标题行样式
                if (ws['E1']) {
                    ws['E1'].s = {
                        font: {
                            name: '黑体',
                            sz: 24,
                            bold: true,
                            color: {
                                rgb: '000000'
                            }
                        },
                        alignment: {
                            horizontal: 'center',
                            vertical: 'center'
                        },
                        fill: {
                            type: 'pattern',
                            patternType: 'solid',
                            fgColor: {
                                rgb: 'F2F2F2'
                            }
                        }
                    };
                }
                
                // 设置表头样式
                const headers = ['A4', 'B4', 'C4', 'D4', 'E4', 'F4', 'G4', 'H4', 'I4', 'J4', 'K4', 'L4', 'M4'];
                headers.forEach(cell => {
                    if (ws[cell]) {
                        ws[cell].s = {
                            font: {
                                name: '宋体',
                                sz: 12,
                                bold: true,
                                color: {
                                    rgb: '000000'
                                }
                            },
                            alignment: {
                                horizontal: 'center',
                                vertical: 'center'
                            },
                            fill: {
                                type: 'pattern',
                                patternType: 'solid',
                                fgColor: {
                                    rgb: 'E6E6E6'
                                }
                            },
                            border: {
                                top: {style: 'thin', color: {rgb: '000000'}},
                                bottom: {style: 'thin', color: {rgb: '000000'}},
                                left: {style: 'thin', color: {rgb: '000000'}},
                                right: {style: 'thin', color: {rgb: '000000'}}
                            }
                        };
                    }
                });
                
                // 动态设置数据行样式
                const startDataRow = 5; // 数据行开始行号
                const endDataRow = startDataRow + 1 - 1; // 数据行结束行号（单个记录）
                
                for (let row = startDataRow; row <= endDataRow; row++) {
                    const cells = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].map(col => col + row);
                    cells.forEach(cell => {
                        if (ws[cell]) {
                            ws[cell].s = {
                                font: {
                                    name: '宋体',
                                    sz: 11,
                                    color: {
                                        rgb: '000000'
                                    }
                                },
                                alignment: {
                                    horizontal: 'center',
                                    vertical: 'center'
                                },
                                border: {
                                    top: {style: 'thin', color: {rgb: '000000'}},
                                    bottom: {style: 'thin', color: {rgb: '000000'}},
                                    left: {style: 'thin', color: {rgb: '000000'}},
                                    right: {style: 'thin', color: {rgb: '000000'}}
                                }
                            };
                        }
                    });
                }
                
                // 动态设置合计行样式
                const totalRow1 = endDataRow + 2; // 合计行1（小写金额）
                const totalRow2 = totalRow1 + 1; // 合计行2（大写金额）
                
                const totalCells = [
                    'A' + totalRow1, // 合计金额人民币（小写）
                    'H' + totalRow1, // 小写金额值
                    'M' + totalRow1, // 共X件
                    'A' + totalRow2  // 合计金额人民币（大写）
                ];
                
                totalCells.forEach(cell => {
                    if (ws[cell]) {
                        ws[cell].s = {
                            font: {
                                name: '宋体',
                                sz: 12,
                                bold: true,
                                color: {
                                    rgb: '000000'
                                }
                            },
                            alignment: {
                                horizontal: 'left',
                                vertical: 'center'
                            }
                        };
                    }
                });
                
                // 将工作表添加到工作簿
                XLSX.utils.book_append_sheet(wb, ws, '销售出库单');
                
                // 使用SheetJS导出Excel文件
                try {
                    // 直接使用XLSX.writeFile方法
                    XLSX.writeFile(wb, `销售出库单_${orderNumber}.xlsx`);
                } catch (writeError) {
                    console.error('Excel导出失败，使用CSV导出:', writeError);
                    // 如果Excel导出失败，使用CSV导出作为备用
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement('a');
                    link.setAttribute('href', encodedUri);
                    link.setAttribute('download', `销售出库单_${orderNumber}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            } else {
                // 如果Excel导出API不可用，使用CSV导出作为备用
                console.warn('Excel导出API不可用，使用CSV导出');
                
                // 创建CSV下载链接
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement('a');
                link.setAttribute('href', encodedUri);
                link.setAttribute('download', `出库单_${orderNumber}.csv`);
                document.body.appendChild(link);
                
                // 触发下载
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Excel导出失败，使用CSV导出:', error);
            
            // 失败时使用CSV导出
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `出库单_${orderNumber}.csv`);
            document.body.appendChild(link);
            
            // 触发下载
            link.click();
            document.body.removeChild(link);
        }
        
    } catch (error) {
        console.error('导出出库单失败:', error);
        alert('导出出库单失败: ' + error.message);
    }
}

// 获取选中的记录ID列表
function getSelectedRecordIds() {
    const checkboxes = document.querySelectorAll('.record-checkbox:checked');
    return Array.from(checkboxes).map(checkbox => checkbox.dataset.id);
}

// 批量查看出库单
async function batchViewOutOrder() {
    const selectedIds = getSelectedRecordIds();
    if (selectedIds.length === 0) {
        alert('请先选择至少一条出库记录');
        return;
    }
    
    try {
        // 获取所有选中记录的详细信息
        const records = [];
        for (const id of selectedIds) {
            const response = await fetch(`/api/out-records/${id}?t=${Date.now()}`);
            if (!response.ok) {
                throw new Error(`获取出库记录 ${id} 失败`);
            }
            const record = await response.json();
            records.push(record);
        }
        
        // 生成出库单单号
        const firstRecord = records[0];
        const orderNumber = generateOrderNumber(firstRecord);
        
        // 计算总金额
        const totalAmount = records.reduce((sum, record) => sum + parseFloat(record.total_amount || 0), 0);
        
        // 生成出库单HTML
        let orderHtml = `
            <div class="container">
                <div class="row mb-4">
                    <div class="col text-center">
                        <h2>武没市明睿康星物料技有限公司销售出库单</h2>
                        <div class="row mt-3">
                            <div class="col text-end">
                                <p>单号：${orderNumber}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row mb-4">
                    <div class="col">
                        <p><strong>开单日期：</strong> ${firstRecord.display_date || '-'}</p>
                        <p><strong>收货人：</strong> ${firstRecord.remark || '-'}</p>
                    </div>
                    <div class="col">
                        <p><strong>客户名称：</strong> ${firstRecord.destination || '-'}</p>
                        <p><strong>收货地址：</strong> -</p>
                    </div>
                    <div class="col">
                        <p><strong>生产厂家：</strong> -</p>
                        <p><strong>收货联系电话：</strong> -</p>
                    </div>
                </div>
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>序号</th>
                            <th>产品编码</th>
                            <th>品名</th>
                            <th>产品规格</th>
                            <th>单位</th>
                            <th>数量</th>
                            <th>单价</th>
                            <th>金额/元</th>
                            <th>产品批号</th>
                            <th>生产日期</th>
                            <th>有效期</th>
                            <th>零售价</th>
                            <th>备注</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.map((record, index) => {
                            const productCode = record.product_code !== undefined ? record.product_code : '-';
                            const spec = record.spec !== undefined ? record.spec : '-';
                            const unit = record.unit !== undefined ? record.unit : '-';
                            const productionDate = record.production_date !== undefined ? record.production_date : '-';
                            const expirationDate = record.expiration_date !== undefined ? record.expiration_date : '-';
                            const retailPrice = record.retail_price !== undefined ? '¥' + parseFloat(record.retail_price).toFixed(2) : '-';
                            
                            return `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${productCode}</td>
                                    <td>${record.product_name}</td>
                                    <td>${spec}</td>
                                    <td>${unit}</td>
                                    <td>${record.quantity}</td>
                                    <td>${parseFloat(record.unit_price).toFixed(2)}</td>
                                    <td>${parseFloat(record.total_amount).toFixed(2)}</td>
                                    <td>${record.batch_number || '-'}</td>
                                    <td>${productionDate}</td>
                                    <td>${expirationDate}</td>
                                    <td>${retailPrice}</td>
                                    <td>${record.remark || '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                <div class="row mt-4">
                    <div class="col">
                        <p><strong>合计金额人民币（小写）：</strong> ${totalAmount.toFixed(2)}</p>
                        <p><strong>合计金额人民币（大写）：</strong> ${numToChinese(totalAmount)}</p>
                    </div>
                </div>
                <div class="row mt-4">
                    <div class="col">
                        <p><strong>制单人：</strong> -</p>
                        <p><strong>审核人：</strong> -</p>
                    </div>
                    <div class="col">
                        <p><strong>销售负责人：</strong> -</p>
                        <p><strong>客户收货人：</strong> -</p>
                    </div>
                </div>
                <div class="row mt-4 text-muted">
                    <div class="col">
                        <p>（一式四联：白色存根联 黄色回单联 红色客户联为财务对账联）</p>
                        <p>注意事项：客户签收表示购销双方权利义务已确认，货品如有差错，请三天内来电说明（与销售负责人联系），每次发货同行的厂检请保存好</p>
                    </div>
                </div>
            </div>
        `;
        
        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'modal fade show';
        modal.style.display = 'block';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.zIndex = '1050';
        
        // 创建模态框内容
        const modalDialog = document.createElement('div');
        modalDialog.className = 'modal-dialog modal-xl';
        modalDialog.style.margin = '1.75rem auto';
        modalDialog.style.maxWidth = '90%';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        modalHeader.innerHTML = `
            <h5 class="modal-title">批量出库单详情</h5>
            <button type="button" class="btn-close" aria-label="Close"></button>
        `;
        
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        modalBody.innerHTML = orderHtml;
        
        const modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        modalFooter.innerHTML = `
            <button type="button" class="btn btn-secondary">关闭</button>
            <button type="button" class="btn btn-success"><i class="bi bi-download me-1"></i>导出</button>
        `;
        
        // 组装模态框
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modalContent.appendChild(modalFooter);
        modalDialog.appendChild(modalContent);
        modal.appendChild(modalDialog);
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden'; // 防止背景滚动
        
        // 添加关闭事件
        modalHeader.querySelector('.btn-close').addEventListener('click', function() {
            modal.remove();
            document.body.style.overflow = '';
        });
        
        modalFooter.querySelector('.btn-secondary').addEventListener('click', function() {
            modal.remove();
            document.body.style.overflow = '';
        });
        
        modalFooter.querySelector('.btn-success').addEventListener('click', function() {
            batchExportOutOrder();
        });
        
        // 点击模态框背景关闭
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
                document.body.style.overflow = '';
            }
        });
        
    } catch (error) {
        console.error('批量查看出库单失败:', error);
        alert('批量查看出库单失败: ' + error.message);
    }
}

// 批量导出出库单
async function batchExportOutOrder() {
    const selectedIds = getSelectedRecordIds();
    if (selectedIds.length === 0) {
        alert('请先选择至少一条出库记录');
        return;
    }
    
    // 显示导出模态框，收集收件信息
    const modal = document.createElement('div');
    modal.className = 'modal fade show';
    modal.style.display = 'block';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">导出批量出库单</h5>
                    <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                </div>
                <div class="modal-body">
                    <form id="batchExportForm">
                        <div class="mb-3">
                            <label for="batchConsignee" class="form-label">收货人</label>
                            <input type="text" class="form-control" id="batchConsignee" placeholder="请输入收货人姓名">
                        </div>
                        <div class="mb-3">
                            <label for="batchConsigneeAddress" class="form-label">收货地址</label>
                            <input type="text" class="form-control" id="batchConsigneeAddress" placeholder="请输入收货地址">
                        </div>
                        <div class="mb-3">
                            <label for="batchConsigneePhone" class="form-label">收货联系电话</label>
                            <input type="text" class="form-control" id="batchConsigneePhone" placeholder="请输入收货联系电话">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">取消</button>
                    <button type="button" class="btn btn-success" onclick="confirmBatchExport()">
                        <i class="bi bi-download me-1"></i>导出
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // 添加关闭模态框的点击事件
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 确认批量导出
async function confirmBatchExport() {
    const selectedIds = getSelectedRecordIds();
    if (selectedIds.length === 0) {
        alert('请先选择至少一条出库记录');
        return;
    }
    
    try {
        // 获取收件信息
        const consignee = document.getElementById('batchConsignee').value || '-';
        const consigneeAddress = document.getElementById('batchConsigneeAddress').value || '-';
        const consigneePhone = document.getElementById('batchConsigneePhone').value || '-';
        
        // 关闭导出模态框
        const exportModals = document.querySelectorAll('.modal.show');
        exportModals.forEach(modal => {
            modal.remove();
        });
        
        // 获取所有选中记录的详细信息
        const records = [];
        for (const id of selectedIds) {
            const response = await fetch(`/api/out-records/${id}?t=${Date.now()}`);
            if (!response.ok) {
                throw new Error(`获取出库记录 ${id} 失败`);
            }
            const record = await response.json();
            records.push(record);
        }
        
        // 生成出库单单号
        const firstRecord = records[0];
        const orderNumber = generateOrderNumber(firstRecord);
        
        // 计算总金额
        const totalAmount = records.reduce((sum, record) => sum + parseFloat(record.total_amount || 0), 0);
        
        // 格式化日期
        function formatDate(dateStr) {
            if (!dateStr || dateStr === '-') return '-';
            const date = new Date(dateStr);
            return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
        }
        
        // 生成CSV内容
        let csvContent = `data:text/csv;charset=utf-8,\uFEFF,,武没市明睿康星物料技有限公司销售出库单,,,,,,\n\n,,,,单号：${orderNumber},转入单号：,,\n开单日期：,${firstRecord.display_date ? formatDate(firstRecord.display_date) : '-'},客户名称：,${firstRecord.destination || '-'},生产厂家：,-,,\n收货人：,${consignee},收货地址：,${consigneeAddress},收货联系电话：,${consigneePhone},,,\n\n序号,产品编码,品牌,品名,产品规格,单位,数量,单价,金额/元,产品批号,生产日期,有效期,零售价,备注\n`;
        
        records.forEach((record, index) => {
            const productCode = record.product_code || '-';
            const spec = record.spec || '-';
            const unit = record.unit || '-';
            const productionDate = record.production_date ? formatDate(record.production_date) : '-';
            const expirationDate = record.expiration_date ? formatDate(record.expiration_date) : '-';
            const retailPrice = record.retail_price ? parseFloat(record.retail_price).toFixed(2) : '-';
            
            csvContent += `${index + 1},${productCode},,${record.product_name},${spec},${unit},${record.quantity},${parseFloat(record.unit_price).toFixed(2)},${parseFloat(record.total_amount).toFixed(2)},${record.batch_number || '-'},${productionDate},${expirationDate},${retailPrice},${record.remark || '-'}\n`;
        });
        
        csvContent += `\n合计金额人民币（小写）：,,,,,,,,${totalAmount.toFixed(2)},共 ${records.length} 件,,\n合计金额人民币（大写）：,,,,,,,,${numToChinese(totalAmount)},,,\n\n制单人：,,审核人：,,销售负责人：,,客户收货人：,,\n\n（一式四联：白色存根联 黄色回单联 红色客户联为财务对账联）,,,,,,\n注意事项：客户签收表示购销双方权利义务已确认，货品如有差错，请三天内来电说明（与销售负责人联系），每次发货同行的厂检请保存好,,,,,,`;
        
        try {
            // 首先检查XLSX API是否可用
            if (XLSX && XLSX.utils && XLSX.utils.book_new && XLSX.writeFile) {
                // 创建工作簿
                const wb = XLSX.utils.book_new();
                
                // 创建工作表数据
                const wsData = [];
                
                // 添加标题行
                wsData.push(['', '', '', '', '武没市明睿康星物料技有限公司销售出库单']);
                wsData.push([]);
                wsData.push([`单号：${orderNumber}`, '', '', '', '', '', '', '', '', '', '', `转入单号：`]);
                wsData.push(['开单日期：', firstRecord.display_date ? formatDate(firstRecord.display_date) : '-', '', '客户名称：', firstRecord.destination || '-', '', '', '', '生产厂家：', '-']);
                wsData.push(['收货人：', consignee, '', '收货地址：', consigneeAddress, '', '', '', '收货联系电话：', consigneePhone]);
                wsData.push([]);
                
                // 添加表头
                wsData.push(['序号', '产品编码', '品名', '产品规格', '单位', '数量', '单价', '金额/元', '产品批号', '生产日期', '有效期', '零售价', '备注']);
                
                // 添加数据行
                records.forEach((record, index) => {
                    const productCode = record.product_code || '-';
                    const spec = record.spec || '-';
                    const unit = record.unit || '-';
                    const productionDate = record.production_date ? formatDate(record.production_date) : '-';
                    const expirationDate = record.expiration_date ? formatDate(record.expiration_date) : '-';
                    const retailPrice = record.retail_price ? parseFloat(record.retail_price).toFixed(2) : '-';
                    
                    wsData.push([
                        index + 1,
                        productCode,
                        record.product_name,
                        spec,
                        unit,
                        record.quantity,
                        parseFloat(record.unit_price).toFixed(2),
                        parseFloat(record.total_amount).toFixed(2),
                        record.batch_number || '-',
                        productionDate,
                        expirationDate,
                        retailPrice,
                        record.remark || '-'
                    ]);
                });
                
                wsData.push([]);
                
                // 添加合计行
                wsData.push(['合计金额人民币（小写）：', '', '', '', '', '', '', '', totalAmount.toFixed(2), '', '', '', `共 ${records.length} 件`]);
                wsData.push(['合计金额人民币（大写）：', '', '', '', '', '', '', '', numToChinese(totalAmount)]);
                wsData.push([]);
                
                // 添加制单人等信息
                wsData.push(['制单人：', '-', '', '审核人：', '-', '', '销售负责人：', '-', '', '客户收货人：', '-']);
                wsData.push([]);
                
                // 添加备注信息
                wsData.push(['（一式四联：白色存根联 黄色回单联 红色客户联为财务对账联）']);
                wsData.push(['注意事项：客户签收表示购销双方权利义务已确认，货品如有差错，请三天内来电说明（与销售负责人联系），每次发货同行的厂检请保存好']);
                
                // 创建工作表
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                
                // 设置列宽
                ws['!cols'] = [
                    {wch: 8},  // 序号
                    {wch: 12}, // 产品编码
                    {wch: 16}, // 品名
                    {wch: 12}, // 产品规格
                    {wch: 8},  // 单位
                    {wch: 8},  // 数量
                    {wch: 8},  // 单价
                    {wch: 10}, // 金额/元
                    {wch: 12}, // 产品批号
                    {wch: 12}, // 生产日期
                    {wch: 12}, // 有效期
                    {wch: 10}, // 零售价
                    {wch: 16}  // 备注
                ];
                
                // 设置标题行样式
                if (ws['E1']) {
                    ws['E1'].s = {
                        font: {
                            name: '黑体',
                            sz: 24,
                            bold: true,
                            color: {
                                rgb: '000000'
                            }
                        },
                        alignment: {
                            horizontal: 'center',
                            vertical: 'center'
                        },
                        fill: {
                            type: 'pattern',
                            patternType: 'solid',
                            fgColor: {
                                rgb: 'F2F2F2'
                            }
                        }
                    };
                }
                
                // 设置表头样式
                const headers = ['A4', 'B4', 'C4', 'D4', 'E4', 'F4', 'G4', 'H4', 'I4', 'J4', 'K4', 'L4', 'M4'];
                headers.forEach(cell => {
                    if (ws[cell]) {
                        ws[cell].s = {
                            font: {
                                name: '宋体',
                                sz: 12,
                                bold: true,
                                color: {
                                    rgb: '000000'
                                }
                            },
                            alignment: {
                                horizontal: 'center',
                                vertical: 'center'
                            },
                            fill: {
                                type: 'pattern',
                                patternType: 'solid',
                                fgColor: {
                                    rgb: 'E6E6E6'
                                }
                            },
                            border: {
                                top: {style: 'thin', color: {rgb: '000000'}},
                                bottom: {style: 'thin', color: {rgb: '000000'}},
                                left: {style: 'thin', color: {rgb: '000000'}},
                                right: {style: 'thin', color: {rgb: '000000'}}
                            }
                        };
                    }
                });
                
                // 设置数据行样式
                for (let i = 5; i < 5 + records.length; i++) {
                    const dataRow = [`A${i}`, `B${i}`, `C${i}`, `D${i}`, `E${i}`, `F${i}`, `G${i}`, `H${i}`, `I${i}`, `J${i}`, `K${i}`, `L${i}`, `M${i}`];
                    dataRow.forEach(cell => {
                        if (ws[cell]) {
                            ws[cell].s = {
                                font: {
                                    name: '宋体',
                                    sz: 11,
                                    color: {
                                        rgb: '000000'
                                    }
                                },
                                alignment: {
                                    horizontal: 'center',
                                    vertical: 'center'
                                },
                                border: {
                                    top: {style: 'thin', color: {rgb: '000000'}},
                                    bottom: {style: 'thin', color: {rgb: '000000'}},
                                    left: {style: 'thin', color: {rgb: '000000'}},
                                    right: {style: 'thin', color: {rgb: '000000'}}
                                }
                            };
                        }
                    });
                }
                
                // 设置合计行样式
                const totalRow = 5 + records.length; // 5是表头行位置，加上记录数量
                const totalCells = [`A${totalRow}`, `I${totalRow}`, `M${totalRow}`, `A${totalRow + 1}`];
                totalCells.forEach(cell => {
                    if (ws[cell]) {
                        ws[cell].s = {
                            font: {
                                name: '宋体',
                                sz: 12,
                                bold: true,
                                color: {
                                    rgb: '000000'
                                }
                            },
                            alignment: {
                                horizontal: 'left',
                                vertical: 'center'
                            }
                        };
                    }
                });
                
                // 将工作表添加到工作簿
                XLSX.utils.book_append_sheet(wb, ws, '销售出库单');
                
                // 使用SheetJS导出Excel文件
                try {
                    // 直接使用XLSX.writeFile方法
                    XLSX.writeFile(wb, `销售出库单_${orderNumber}.xlsx`);
                } catch (writeError) {
                    console.error('Excel导出失败，使用CSV导出:', writeError);
                    // 如果Excel导出失败，使用CSV导出作为备用
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement('a');
                    link.setAttribute('href', encodedUri);
                    link.setAttribute('download', `销售出库单_${orderNumber}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            } else {
                // 如果Excel导出API不可用，使用CSV导出作为备用
                console.warn('Excel导出API不可用，使用CSV导出');
                
                // 生成CSV内容
                let csvContent = `data:text/csv;charset=utf-8,﻿,,武没市明睿康星物料技有限公司销售出库单,,,,,,

,,,,单号：${orderNumber},转入单号：,,
开单日期：,${firstRecord.display_date || '-'},客户名称：,${firstRecord.destination || '-'},生产厂家：,-,,,
收货人：,${consignee},收货地址：,${consigneeAddress},收货联系电话：,${consigneePhone},,,

序号,产品编码,品牌,品名,产品规格,单位,数量,单价,金额/元,产品批号,生产日期,有效期,零售价,备注
`;
                
                // 添加数据行
                records.forEach((record, index) => {
                    const productCode = record.product_code || '-';
                    const spec = record.spec || '-';
                    const unit = record.unit || '-';
                    const productionDate = record.production_date ? formatDate(record.production_date) : '-';
                    const expirationDate = record.expiration_date ? formatDate(record.expiration_date) : '-';
                    const retailPrice = record.retail_price ? parseFloat(record.retail_price).toFixed(2) : '-';
                    
                    csvContent += `${index + 1},${productCode},,${record.product_name},${spec},${unit},${record.quantity},${parseFloat(record.unit_price).toFixed(2)},${parseFloat(record.total_amount).toFixed(2)},${record.batch_number || '-'},${productionDate},${expirationDate},${retailPrice},${record.remark || '-'}\n`;
                });
                
                // 添加合计行
                csvContent += `\n合计金额人民币（小写）：,,,,,,,,${totalAmount.toFixed(2)},共 ${records.length} 件,,\n合计金额人民币（大写）：,,,,,,,,${numToChinese(totalAmount)},,,\n\n制单人：,,审核人：,,销售负责人：,,客户收货人：,,\n\n（一式四联：白色存根联 黄色回单联 红色客户联为财务对账联）,,,,,,\n注意事项：客户签收表示购销双方权利义务已确认，货品如有差错，请三天内来电说明（与销售负责人联系），每次发货同行的厂检请保存好,,,,,,`;
                
                // 创建CSV下载链接
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement('a');
                link.setAttribute('href', encodedUri);
                link.setAttribute('download', `出库单_${orderNumber}.csv`);
                document.body.appendChild(link);
                
                // 触发下载
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Excel导出失败，使用CSV导出:', error);
            
            // 生成CSV内容
            let csvContent = `data:text/csv;charset=utf-8,﻿,,武没市明睿康星物料技有限公司销售出库单,,,,,,

,,,,单号：${orderNumber},转入单号：,,
开单日期：,${firstRecord.display_date || '-'},客户名称：,${firstRecord.destination || '-'},生产厂家：,-,,,
收货人：,${consignee},收货地址：,${consigneeAddress},收货联系电话：,${consigneePhone},,,

序号,产品编码,品牌,品名,产品规格,单位,数量,单价,金额/元,产品批号,生产日期,有效期,零售价,备注
`;
            
            // 添加数据行
            records.forEach((record, index) => {
                const productCode = record.product_code || '-';
                const spec = record.spec || '-';
                const unit = record.unit || '-';
                const productionDate = record.production_date ? formatDate(record.production_date) : '-';
                const expirationDate = record.expiration_date ? formatDate(record.expiration_date) : '-';
                const retailPrice = record.retail_price ? parseFloat(record.retail_price).toFixed(2) : '-';
                
                csvContent += `${index + 1},${productCode},,${record.product_name},${spec},${unit},${record.quantity},${parseFloat(record.unit_price).toFixed(2)},${parseFloat(record.total_amount).toFixed(2)},${record.batch_number || '-'},${productionDate},${expirationDate},${retailPrice},${record.remark || '-'}\n`;
            });
            
            // 添加合计行
            csvContent += `\n合计金额人民币（小写）：,,,,,,,,${totalAmount.toFixed(2)},共 ${records.length} 件,,\n合计金额人民币（大写）：,,,,,,,,${numToChinese(totalAmount)},,,\n\n制单人：,,审核人：,,销售负责人：,,客户收货人：,,\n\n（一式四联：白色存根联 黄色回单联 红色客户联为财务对账联）,,,,,,\n注意事项：客户签收表示购销双方权利义务已确认，货品如有差错，请三天内来电说明（与销售负责人联系），每次发货同行的厂检请保存好,,,,,,`;
            
            // 失败时使用CSV导出
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `出库单_${orderNumber}.csv`);
            document.body.appendChild(link);
            
            // 触发下载
            link.click();
            document.body.removeChild(link);
        }
        
    } catch (error) {
        console.error('批量导出出库单失败:', error);
        alert('批量导出出库单失败: ' + error.message);
    }
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', initOutRecordsPage);