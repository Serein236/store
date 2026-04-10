// 从设置中获取公司名称
function getCompanyName() {
    const settings = localStorage.getItem('warehouse_settings');
    if (settings) {
        const parsed = JSON.parse(settings);
        if (parsed.company && parsed.company.name) {
            return parsed.company.name;
        }
    }
    return '公司名称未设置，请到设置中设置！';
}

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
        
        let outRecords = await response.json();
        
        // 获取月份筛选条件
        const filterMonth = document.getElementById('filterMonth')?.value;
        
        // 按月份筛选
        if (filterMonth) {
            outRecords = outRecords.filter(record => {
                if (!record.recorded_date) return false;
                const recordMonth = record.recorded_date.substring(0, 7); // 获取YYYY-MM格式
                return recordMonth === filterMonth;
            });
        }
        
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
                    <button class="btn btn-sm btn-warning btn-action" onclick="editOutRecord(${record.id})">
                        <i class="bi bi-pencil-square me-1"></i>修改
                    </button>
                    <button class="btn btn-sm btn-danger btn-action" onclick="cancelOutRecord(${record.id})">
                        <i class="bi bi-x-circle me-1"></i>撤销
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

// 清除月份筛选
function clearMonthFilter() {
    const filterMonth = document.getElementById('filterMonth');
    if (filterMonth) {
        filterMonth.value = '';
    }
    loadOutRecords();
}

// 初始化页面
async function initOutRecordsPage() {
    // 初始化公共部分
    await recordsCommon.initPage();
    
    // 处理URL参数中的月份筛选
    const urlParams = new URLSearchParams(window.location.search);
    const monthParam = urlParams.get('month');
    const filterMonth = document.getElementById('filterMonth');
    if (monthParam && filterMonth) {
        filterMonth.value = monthParam;
        // 清除URL参数
        window.history.replaceState({}, '', window.location.pathname);
    }

    // 绑定月份筛选事件
    if (filterMonth) {
        filterMonth.addEventListener('change', loadOutRecords);
    }

    // 绑定清除按钮事件
    const clearMonthBtn = document.getElementById('clearMonthBtn');
    if (clearMonthBtn) {
        clearMonthBtn.addEventListener('click', clearMonthFilter);
    }

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
                        <h2>${getCompanyName()}销售出库单</h2>
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
        let csvContent = `data:text/csv;charset=utf-8,\uFEFF,,${getCompanyName()}销售出库单,,,,,,\n\n,,,,单号：${orderNumber},转入单号：,,\n开单日期：,${formattedDate},客户名称：,${record.destination || '-'},生产厂家：,${manufacturer},,,\n收货人：,${consignee},收货地址：,${consigneeAddress},收货联系电话：,${consigneePhone},,,\n\n序号,产品编码,品牌,品名,产品规格,单位,数量,单价,金额/元,产品批号,生产日期,有效期,零售价,备注\n1,${productCode},,${record.product_name},${spec},${unit},${record.quantity},${parseFloat(record.unit_price).toFixed(2)},${parseFloat(record.total_amount).toFixed(2)},${record.batch_number || '-'},${formattedProductionDate},${formattedExpirationDate},${formattedRetailPrice},${record.remark || '-'}\n\n合计金额人民币（小写）：,,,,,,,,${parseFloat(record.total_amount).toFixed(2)},共 1 件,,\n合计金额人民币（大写）：,,,,,,,,${numToChinese(parseFloat(record.total_amount))},,,\n\n制单人：,,审核人：,,销售负责人：,,客户收货人：,,\n\n（一式四联：白色存根联 黄色回单联 红色客户联为财务对账联）,,,,,,\n注意事项：客户签收表示购销双方权利义务已确认，货品如有差错，请三天内来电说明（与销售负责人联系），每次发货同行的厂检请保存好,,,,,,`;
        
        try {
            // 使用ExcelJS导出
            if (typeof ExcelJS !== 'undefined') {
                // 创建工作簿
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('销售出库单');
                
                // 设置列宽
                worksheet.columns = [
                    { width: 8 },   // A: 序号
                    { width: 12 },  // B: 产品编码
                    { width: 16 },  // C: 品名
                    { width: 12 },  // D: 产品规格
                    { width: 8 },   // E: 单位
                    { width: 8 },   // F: 数量
                    { width: 8 },   // G: 单价
                    { width: 10 },  // H: 金额/元
                    { width: 12 },  // I: 产品批号
                    { width: 12 },  // J: 生产日期
                    { width: 12 },  // K: 有效期
                    { width: 10 },  // L: 零售价
                    { width: 16 }   // M: 备注
                ];
                
                // 添加标题行（第1行）
                const titleRow = worksheet.addRow([`${getCompanyName()}销售出库单`]);
                worksheet.mergeCells('A1:M1');
                const titleCell = worksheet.getCell('A1');
                titleCell.font = { name: '黑体', size: 20, bold: true };
                titleCell.alignment = { horizontal: 'center', vertical: 'center' };
                titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                worksheet.getRow(1).height = 35;
                
                // 空行（第2行）
                worksheet.addRow([]);
                
                // 单号行（第3行）
                worksheet.addRow([`单号：${orderNumber}`, '', '', '', '', '', '', '', '', '', '', '转入单号：', '']);
                worksheet.mergeCells('A3:D3');
                worksheet.mergeCells('L3:M3');
                
                // 开单日期行（第4行）
                worksheet.addRow(['开单日期：', formattedDate, '', '客户名称：', record.destination || '-', '', '', '', '生产厂家：', manufacturer, '', '', '']);
                worksheet.mergeCells('A4:B4');
                worksheet.mergeCells('E4:H4');
                worksheet.mergeCells('J4:M4');
                
                // 收货人行（第5行）
                worksheet.addRow(['收货人：', consignee, '', '收货地址：', consigneeAddress, '', '', '', '收货联系电话：', consigneePhone, '', '', '']);
                worksheet.mergeCells('A5:B5');
                worksheet.mergeCells('E5:H5');
                worksheet.mergeCells('J5:M5');
                
                // 空行（第6行）
                worksheet.addRow([]);
                
                // 表头行（第7行）
                const headerRow = worksheet.addRow(['序号', '产品编码', '品名', '产品规格', '单位', '数量', '单价', '金额/元', '产品批号', '生产日期', '有效期', '零售价', '备注']);
                headerRow.eachCell((cell) => {
                    cell.font = { name: '宋体', size: 11, bold: true };
                    cell.alignment = { horizontal: 'center', vertical: 'center' };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6E6' } };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FF000000' } },
                        bottom: { style: 'thin', color: { argb: 'FF000000' } },
                        left: { style: 'thin', color: { argb: 'FF000000' } },
                        right: { style: 'thin', color: { argb: 'FF000000' } }
                    };
                });
                
                // 数据行（第8行）
                const dataRow = worksheet.addRow([
                    1, productCode, record.product_name, spec, unit, record.quantity, 
                    parseFloat(record.unit_price).toFixed(2), parseFloat(record.total_amount).toFixed(2), 
                    record.batch_number || '-', formattedProductionDate, formattedExpirationDate, 
                    formattedRetailPrice, record.remark || '-'
                ]);
                dataRow.eachCell((cell) => {
                    cell.font = { name: '宋体', size: 10 };
                    cell.alignment = { horizontal: 'center', vertical: 'center' };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FF000000' } },
                        bottom: { style: 'thin', color: { argb: 'FF000000' } },
                        left: { style: 'thin', color: { argb: 'FF000000' } },
                        right: { style: 'thin', color: { argb: 'FF000000' } }
                    };
                });
                
                // 空行（第9行）
                worksheet.addRow([]);
                
                // 合计行（第10行）
                const totalRow1 = worksheet.addRow(['合计金额人民币（小写）：', '', '', '', '', '', '', '', parseFloat(record.total_amount).toFixed(2), '', '', '共 1 件', '']);
                worksheet.mergeCells('A10:H10');
                worksheet.mergeCells('J10:K10');
                totalRow1.getCell('A').font = { name: '宋体', size: 11, bold: true };
                totalRow1.getCell('I').font = { name: '宋体', size: 11, bold: true };
                totalRow1.getCell('I').alignment = { horizontal: 'center' };
                
                // 大写金额行（第11行）
                const totalRow2 = worksheet.addRow(['合计金额人民币（大写）：', '', '', '', '', '', '', '', numToChinese(parseFloat(record.total_amount)), '', '', '', '']);
                worksheet.mergeCells('A11:H11');
                worksheet.mergeCells('I11:M11');
                totalRow2.getCell('A').font = { name: '宋体', size: 11, bold: true };
                totalRow2.getCell('I').font = { name: '宋体', size: 11, bold: true };
                
                // 空行（第12行）
                worksheet.addRow([]);
                
                // 制单人信息行（第13行）
                worksheet.addRow(['制单人：', '-', '', '审核人：', '-', '', '销售负责人：', '-', '', '客户收货人：', '-', '', '']);
                worksheet.mergeCells('A13:B13');
                worksheet.mergeCells('D13:E13');
                worksheet.mergeCells('G13:H13');
                worksheet.mergeCells('J13:K13');
                
                // 空行（第14行）
                worksheet.addRow([]);
                
                // 备注行（第15行）
                const noteRow = worksheet.addRow(['（一式四联：白色存根联 黄色回单联 红色客户联为财务对账联）', '', '', '', '', '', '', '', '', '', '', '', '']);
                worksheet.mergeCells('A15:M15');
                noteRow.getCell('A').alignment = { horizontal: 'left' };
                
                // 注意事项行（第16行）
                const tipRow = worksheet.addRow(['注意事项：客户签收表示购销双方权利义务已确认，货品如有差错，请三天内来电说明（与销售负责人联系），每次发货同行的厂检请保存好', '', '', '', '', '', '', '', '', '', '', '', '']);
                worksheet.mergeCells('A16:M16');
                tipRow.getCell('A').alignment = { horizontal: 'left', wrapText: true };
                worksheet.getRow(16).height = 30;
                
                // 设置行高
                worksheet.getRow(1).height = 35;
                worksheet.getRow(7).height = 25;
                
                // 导出Excel文件
                const buffer = await workbook.xlsx.writeBuffer();
                const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `销售出库单_${orderNumber}.xlsx`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            } else {
                // 如果ExcelJS不可用，使用CSV导出作为备用
                console.warn('ExcelJS不可用，使用CSV导出');
                
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
                        <h2>${getCompanyName()}销售出库单</h2>
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
        let csvContent = `data:text/csv;charset=utf-8,\uFEFF,,${getCompanyName()}销售出库单,,,,,,\n\n,,,,单号：${orderNumber},转入单号：,,\n开单日期：,${firstRecord.display_date ? formatDate(firstRecord.display_date) : '-'},客户名称：,${firstRecord.destination || '-'},生产厂家：,-,,\n收货人：,${consignee},收货地址：,${consigneeAddress},收货联系电话：,${consigneePhone},,,\n\n序号,产品编码,品牌,品名,产品规格,单位,数量,单价,金额/元,产品批号,生产日期,有效期,零售价,备注\n`;
        
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
            // 使用ExcelJS导出
            if (typeof ExcelJS !== 'undefined') {
                // 创建工作簿
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('销售出库单');
                
                // 设置列宽
                worksheet.columns = [
                    { width: 8 },   // A: 序号
                    { width: 12 },  // B: 产品编码
                    { width: 16 },  // C: 品名
                    { width: 12 },  // D: 产品规格
                    { width: 8 },   // E: 单位
                    { width: 8 },   // F: 数量
                    { width: 8 },   // G: 单价
                    { width: 10 },  // H: 金额/元
                    { width: 12 },  // I: 产品批号
                    { width: 12 },  // J: 生产日期
                    { width: 12 },  // K: 有效期
                    { width: 10 },  // L: 零售价
                    { width: 16 }   // M: 备注
                ];
                
                // 添加标题行（第1行）
                const titleRow = worksheet.addRow([`${getCompanyName()}销售出库单`]);
                worksheet.mergeCells('A1:M1');
                const titleCell = worksheet.getCell('A1');
                titleCell.font = { name: '黑体', size: 20, bold: true };
                titleCell.alignment = { horizontal: 'center', vertical: 'center' };
                titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                worksheet.getRow(1).height = 35;
                
                // 空行（第2行）
                worksheet.addRow([]);
                
                // 单号行（第3行）
                worksheet.addRow([`单号：${orderNumber}`, '', '', '', '', '', '', '', '', '', '', '转入单号：', '']);
                worksheet.mergeCells('A3:D3');
                worksheet.mergeCells('L3:M3');
                
                // 开单日期行（第4行）
                worksheet.addRow(['开单日期：', firstRecord.display_date ? formatDate(firstRecord.display_date) : '-', '', '客户名称：', firstRecord.destination || '-', '', '', '', '生产厂家：', '-', '', '', '']);
                worksheet.mergeCells('A4:B4');
                worksheet.mergeCells('E4:H4');
                worksheet.mergeCells('J4:M4');
                
                // 收货人行（第5行）
                worksheet.addRow(['收货人：', consignee, '', '收货地址：', consigneeAddress, '', '', '', '收货联系电话：', consigneePhone, '', '', '']);
                worksheet.mergeCells('A5:B5');
                worksheet.mergeCells('E5:H5');
                worksheet.mergeCells('J5:M5');
                
                // 空行（第6行）
                worksheet.addRow([]);
                
                // 表头行（第7行）
                const headerRow = worksheet.addRow(['序号', '产品编码', '品名', '产品规格', '单位', '数量', '单价', '金额/元', '产品批号', '生产日期', '有效期', '零售价', '备注']);
                headerRow.eachCell((cell) => {
                    cell.font = { name: '宋体', size: 11, bold: true };
                    cell.alignment = { horizontal: 'center', vertical: 'center' };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6E6' } };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FF000000' } },
                        bottom: { style: 'thin', color: { argb: 'FF000000' } },
                        left: { style: 'thin', color: { argb: 'FF000000' } },
                        right: { style: 'thin', color: { argb: 'FF000000' } }
                    };
                });
                
                // 数据行（从第8行开始）
                records.forEach((record, index) => {
                    const productCode = record.product_code || '-';
                    const spec = record.spec || '-';
                    const unit = record.unit || '-';
                    const productionDate = record.production_date ? formatDate(record.production_date) : '-';
                    const expirationDate = record.expiration_date ? formatDate(record.expiration_date) : '-';
                    const retailPrice = record.retail_price ? parseFloat(record.retail_price).toFixed(2) : '-';
                    
                    const dataRow = worksheet.addRow([
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
                    dataRow.eachCell((cell) => {
                        cell.font = { name: '宋体', size: 10 };
                        cell.alignment = { horizontal: 'center', vertical: 'center' };
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FF000000' } },
                            bottom: { style: 'thin', color: { argb: 'FF000000' } },
                            left: { style: 'thin', color: { argb: 'FF000000' } },
                            right: { style: 'thin', color: { argb: 'FF000000' } }
                        };
                    });
                });
                
                // 空行
                worksheet.addRow([]);
                
                // 合计行
                const dataEndRow = 7 + records.length;
                const totalRow1 = worksheet.addRow(['合计金额人民币（小写）：', '', '', '', '', '', '', '', totalAmount.toFixed(2), '', '', `共 ${records.length} 件`, '']);
                worksheet.mergeCells(`A${dataEndRow + 1}:H${dataEndRow + 1}`);
                worksheet.mergeCells(`J${dataEndRow + 1}:K${dataEndRow + 1}`);
                totalRow1.getCell('A').font = { name: '宋体', size: 11, bold: true };
                totalRow1.getCell('I').font = { name: '宋体', size: 11, bold: true };
                totalRow1.getCell('I').alignment = { horizontal: 'center' };
                
                // 大写金额行
                const totalRow2 = worksheet.addRow(['合计金额人民币（大写）：', '', '', '', '', '', '', '', numToChinese(totalAmount), '', '', '', '']);
                worksheet.mergeCells(`A${dataEndRow + 2}:H${dataEndRow + 2}`);
                worksheet.mergeCells(`I${dataEndRow + 2}:M${dataEndRow + 2}`);
                totalRow2.getCell('A').font = { name: '宋体', size: 11, bold: true };
                totalRow2.getCell('I').font = { name: '宋体', size: 11, bold: true };
                
                // 空行
                worksheet.addRow([]);
                
                // 制单人信息行
                const signRow = worksheet.addRow(['制单人：', '-', '', '审核人：', '-', '', '销售负责人：', '-', '', '客户收货人：', '-', '', '']);
                worksheet.mergeCells(`A${dataEndRow + 4}:B${dataEndRow + 4}`);
                worksheet.mergeCells(`D${dataEndRow + 4}:E${dataEndRow + 4}`);
                worksheet.mergeCells(`G${dataEndRow + 4}:H${dataEndRow + 4}`);
                worksheet.mergeCells(`J${dataEndRow + 4}:K${dataEndRow + 4}`);
                
                // 空行
                worksheet.addRow([]);
                
                // 备注行
                const noteRow = worksheet.addRow(['（一式四联：白色存根联 黄色回单联 红色客户联为财务对账联）', '', '', '', '', '', '', '', '', '', '', '', '']);
                worksheet.mergeCells(`A${dataEndRow + 6}:M${dataEndRow + 6}`);
                noteRow.getCell('A').alignment = { horizontal: 'left' };
                
                // 注意事项行
                const tipRow = worksheet.addRow(['注意事项：客户签收表示购销双方权利义务已确认，货品如有差错，请三天内来电说明（与销售负责人联系），每次发货同行的厂检请保存好', '', '', '', '', '', '', '', '', '', '', '', '']);
                worksheet.mergeCells(`A${dataEndRow + 7}:M${dataEndRow + 7}`);
                tipRow.getCell('A').alignment = { horizontal: 'left', wrapText: true };
                worksheet.getRow(dataEndRow + 7).height = 30;
                
                // 设置行高
                worksheet.getRow(1).height = 35;
                worksheet.getRow(7).height = 25;
                
                // 导出Excel文件
                const buffer = await workbook.xlsx.writeBuffer();
                const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `销售出库单_${orderNumber}.xlsx`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            } else {
                // 如果Excel导出API不可用，使用CSV导出作为备用
                console.warn('Excel导出API不可用，使用CSV导出');
                
                // 生成CSV内容
                let csvContent = `data:text/csv;charset=utf-8,﻿,,${getCompanyName()}销售出库单,,,,,,

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
            let csvContent = `data:text/csv;charset=utf-8,﻿,,${getCompanyName()}销售出库单,,,,,,

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
// 撤销出库记录
async function cancelOutRecord(id) {
    if (!confirm('确定要撤销这条出库记录吗？此操作将恢复库存，请谨慎操作！')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/out-records/${id}/cancel`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('撤销出库成功！');
            // 重新加载出库记录
            await loadOutRecords();
        } else {
            alert('撤销出库失败: ' + data.message);
        }
    } catch (error) {
        console.error('撤销出库失败:', error);
        alert('撤销出库失败，请稍后重试');
    }
}

// 修改出库记录
async function editOutRecord(id) {
    try {
        const response = await fetch(`/api/out-records`);
        if (!response.ok) {
            throw new Error('获取出库记录失败');
        }
        
        const outRecords = await response.json();
        const record = outRecords.find(r => r.id === id);
        
        if (!record) {
            alert('找不到该出库记录');
            return;
        }
        
        // 填充表单数据
        document.getElementById('edit_out_record_id').value = record.id;
        document.getElementById('edit_out_product_name').value = record.product_name;
        document.getElementById('edit_out_batch_number').value = record.batch_number || '';
        document.getElementById('edit_out_quantity').value = record.quantity;
        document.getElementById('edit_out_unit_price').value = record.unit_price;
        document.getElementById('edit_out_total_amount').value = record.total_amount;
        document.getElementById('edit_out_destination').value = record.destination || '';
        document.getElementById('edit_out_recorded_date').value = record.display_date || '';
        document.getElementById('edit_out_remark').value = record.remark || '';
        
        // 加载出库方式
        await loadEditOutStockMethods(record.stock_method_name);
        
        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('editOutRecordModal'));
        modal.show();
        
    } catch (error) {
        console.error('加载出库记录失败:', error);
        alert('加载出库记录失败，请稍后重试');
    }
}

// 加载修改模态框中的出库方式
async function loadEditOutStockMethods(selectedMethod) {
    try {
        const response = await fetch('/api/stock-methods?type=out');
        const methods = await response.json();
        const select = document.getElementById('edit_out_stock_method_name');
        select.innerHTML = '<option value="">请选择出库方式</option>';
        methods.forEach(method => {
            const option = document.createElement('option');
            option.value = method;
            option.textContent = method;
            if (method === selectedMethod) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    } catch (error) {
        console.error('加载出库方式失败:', error);
    }
}

// 计算修改模态框中的总金额
function calculateEditOutTotal() {
    const quantity = parseFloat(document.getElementById('edit_out_quantity').value) || 0;
    const unitPrice = parseFloat(document.getElementById('edit_out_unit_price').value) || 0;
    const totalAmount = quantity * unitPrice;
    document.getElementById('edit_out_total_amount').value = totalAmount.toFixed(2);
}

// 保存修改
async function saveEditOutRecord() {
    const id = document.getElementById('edit_out_record_id').value;
    const updateData = {
        stock_method_name: document.getElementById('edit_out_stock_method_name').value,
        quantity: parseInt(document.getElementById('edit_out_quantity').value),
        unit_price: parseFloat(document.getElementById('edit_out_unit_price').value),
        total_amount: parseFloat(document.getElementById('edit_out_total_amount').value),
        destination: document.getElementById('edit_out_destination').value,
        recorded_date: document.getElementById('edit_out_recorded_date').value,
        remark: document.getElementById('edit_out_remark').value
    };
    
    try {
        const response = await fetch(`/api/out-records/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('修改出库成功！');
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('editOutRecordModal'));
            modal.hide();
            // 重新加载出库记录
            await loadOutRecords();
        } else {
            alert('修改出库失败: ' + data.message);
        }
    } catch (error) {
        console.error('修改出库失败:', error);
        alert('修改出库失败，请稍后重试');
    }
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', function() {
    initOutRecordsPage();
    
    // 添加修改模态框的事件监听
    document.getElementById('edit_out_quantity').addEventListener('input', calculateEditOutTotal);
    document.getElementById('edit_out_unit_price').addEventListener('input', calculateEditOutTotal);
    document.getElementById('saveEditOutBtn').addEventListener('click', saveEditOutRecord);
});