// 设置管理
const SETTINGS_KEY = 'warehouse_settings';

// 默认设置
const defaultSettings = {
    company: {
        name: '',
        address: '',
        phone: ''
    },
    system: {
        pageSize: 20,
        dateFormat: 'YYYY-MM-DD',
        autoRefresh: false
    },
    export: {
        defaultFormat: 'excel',
        template: 'standard',
        includeLogo: false
    },
    security: {
        sessionTimeout: 30,
        requirePasswordChange: false,
        loginNotification: false
    }
};

// 检查登录状态
async function checkLogin() {
    try {
        const response = await fetch('/api/auth/current-user');
        const data = await response.json();

        if (!data.loggedIn) {
            window.location.href = 'login.html';
        } else {
            const currentUserEl = document.getElementById('currentUser');
            if (currentUserEl) {
                currentUserEl.textContent = `欢迎, ${data.username}`;
            }
            loadSettings();
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
        window.location.href = 'login.html';
    }
}

// 加载设置
function loadSettings() {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    const settings = savedSettings ? JSON.parse(savedSettings) : defaultSettings;

    // 填充公司信息
    if (settings.company) {
        document.getElementById('companyName').value = settings.company.name || '';
        document.getElementById('companyAddress').value = settings.company.address || '';
        document.getElementById('companyPhone').value = settings.company.phone || '';
    }

    // 填充系统参数
    if (settings.system) {
        document.getElementById('pageSize').value = settings.system.pageSize || 20;
        document.getElementById('dateFormat').value = settings.system.dateFormat || 'YYYY-MM-DD';
        document.getElementById('autoRefresh').checked = settings.system.autoRefresh || false;
    }

    // 填充导出设置
    if (settings.export) {
        document.getElementById('defaultExportFormat').value = settings.export.defaultFormat || 'excel';
        document.getElementById('exportTemplate').value = settings.export.template || 'standard';
        document.getElementById('includeLogo').checked = settings.export.includeLogo || false;
    }

    // 填充安全设置
    if (settings.security) {
        document.getElementById('sessionTimeout').value = settings.security.sessionTimeout || 30;
        document.getElementById('requirePasswordChange').checked = settings.security.requirePasswordChange || false;
        document.getElementById('loginNotification').checked = settings.security.loginNotification || false;
    }

    // 填充自动备份设置
    if (settings.autoBackup) {
        document.getElementById('autoBackupEnabled').checked = settings.autoBackup.enabled || false;
        document.getElementById('autoBackupFrequency').value = settings.autoBackup.frequency || 'daily';
        document.getElementById('backupRetention').value = settings.autoBackup.retention || 10;
    }
}

// 保存设置到本地存储
function saveSettingsToStorage(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// 获取当前设置
function getCurrentSettings() {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
}

// 保存公司信息
function saveCompanySettings() {
    const settings = getCurrentSettings();

    settings.company = {
        name: document.getElementById('companyName').value.trim(),
        address: document.getElementById('companyAddress').value.trim(),
        phone: document.getElementById('companyPhone').value.trim()
    };

    saveSettingsToStorage(settings);

    // 同步到后端
    syncSettingsToServer(settings);

    alert('公司信息保存成功！');
}

// 保存系统参数
function saveSystemSettings() {
    const settings = getCurrentSettings();

    settings.system = {
        pageSize: parseInt(document.getElementById('pageSize').value),
        dateFormat: document.getElementById('dateFormat').value,
        autoRefresh: document.getElementById('autoRefresh').checked
    };

    saveSettingsToStorage(settings);
    syncSettingsToServer(settings);

    alert('系统参数保存成功！');
}

// 保存导出设置
function saveExportSettings() {
    const settings = getCurrentSettings();

    settings.export = {
        defaultFormat: document.getElementById('defaultExportFormat').value,
        template: document.getElementById('exportTemplate').value,
        includeLogo: document.getElementById('includeLogo').checked
    };

    saveSettingsToStorage(settings);
    syncSettingsToServer(settings);

    alert('导出设置保存成功！');
}

// 保存安全设置
function saveSecuritySettings() {
    const settings = getCurrentSettings();

    settings.security = {
        sessionTimeout: parseInt(document.getElementById('sessionTimeout').value),
        requirePasswordChange: document.getElementById('requirePasswordChange').checked,
        loginNotification: document.getElementById('loginNotification').checked
    };

    saveSettingsToStorage(settings);
    syncSettingsToServer(settings);

    alert('安全设置保存成功！');
}

// 同步设置到服务器
async function syncSettingsToServer(settings) {
    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (!response.ok) {
            console.warn('设置同步到服务器失败');
        }
    } catch (error) {
        console.error('同步设置失败:', error);
    }
}

// 从服务器加载设置
async function loadSettingsFromServer() {
    try {
        const response = await fetch('/api/settings');
        if (response.ok) {
            const serverSettings = await response.json();
            if (serverSettings) {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(serverSettings));
                loadSettings();
            }
        }
    } catch (error) {
        console.error('从服务器加载设置失败:', error);
    }
}

// 数据备份
async function backupData() {
    try {
        const confirmBackup = confirm('确定要备份所有数据吗？这可能需要一些时间。');
        if (!confirmBackup) return;

        const response = await fetch('/api/backup', {
            method: 'POST'
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `warehouse_backup_${new Date().toISOString().split('T')[0]}.sql`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            alert('数据备份成功！');
        } else {
            alert('数据备份失败，请稍后重试');
        }
    } catch (error) {
        console.error('数据备份失败:', error);
        alert('数据备份失败: ' + error.message);
    }
}

// 数据清理（清理前会自动创建备份）
async function cleanupData() {
    const confirmCleanup = confirm('警告：这将永久删除所有入库记录、出库记录和库存数据！\n\n确定要继续吗？');
    if (!confirmCleanup) return;

    const doubleConfirm = confirm('再次确认：数据删除后无法恢复，但已自动创建备份。是否继续？');
    if (!doubleConfirm) return;

    try {
        const response = await fetch('/api/cleanup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert(`数据清理完成！\n已自动创建备份: ${result.backupFile}`);
            loadBackupList(); // 刷新备份列表
        } else {
            alert('数据清理失败: ' + (result.message || '请稍后重试'));
        }
    } catch (error) {
        console.error('数据清理失败:', error);
        alert('数据清理失败: ' + error.message);
    }
}

// 退出登录
async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = 'login.html';
    } catch (error) {
        console.error('退出登录失败:', error);
    }
}

// 检查是否为管理员
async function checkIsAdmin() {
    try {
        const response = await fetch('/api/auth/check-admin');
        const data = await response.json();
        if (data.isAdmin) {
            // 显示用户管理选项卡
            document.getElementById('userManagementTab').classList.remove('d-none');
            // 加载用户列表
            loadUserList();
            // 显示出入库方式管理选项卡
            document.getElementById('stockMethodTab').classList.remove('d-none');
        }
    } catch (error) {
        console.error('检查管理员权限失败:', error);
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    checkLogin();
    loadBackupList();
    checkIsAdmin();
});

// 获取设置（供其他页面使用）
window.getWarehouseSettings = function() {
    return getCurrentSettings();
};

// 修改密码
async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('请填写所有密码字段');
        return;
    }

    if (newPassword.length < 6) {
        alert('新密码至少需要6位');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('两次输入的新密码不一致');
        return;
    }

    try {
        const response = await fetch('/api/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await response.json();

        if (data.success) {
            alert('密码修改成功！');
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            alert(data.message || '密码修改失败');
        }
    } catch (error) {
        console.error('修改密码失败:', error);
        alert('修改密码失败: ' + error.message);
    }
}

// 加载备份列表
async function loadBackupList() {
    try {
        const response = await fetch('/api/backups');
        const backups = await response.json();

        const tbody = document.getElementById('backupListBody');
        const emptyDiv = document.getElementById('backupListEmpty');

        if (!backups || backups.length === 0) {
            tbody.innerHTML = '';
            emptyDiv.classList.remove('d-none');
            return;
        }

        emptyDiv.classList.add('d-none');

        tbody.innerHTML = backups.map(backup => {
            // 根据备份类型显示不同的标签
            let typeBadge = '';
            switch(backup.backup_type) {
                case 'auto':
                    typeBadge = '<span class="badge bg-info">自动</span>';
                    break;
                case 'pre_delete':
                    typeBadge = '<span class="badge bg-warning">删除前</span>';
                    break;
                case 'manual':
                default:
                    typeBadge = '<span class="badge bg-secondary">手动</span>';
                    break;
            }
            return `
            <tr>
                <td>${backup.file_name} ${typeBadge}</td>
                <td>${backup.file_size} MB</td>
                <td>${backup.created_by || '-'}</td>
                <td>${new Date(backup.created_at).toLocaleString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="downloadBackup(${backup.id})">
                        <i class="bi bi-download"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning me-1" onclick="restoreBackup(${backup.id})">
                        <i class="bi bi-arrow-counterclockwise"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteBackup(${backup.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `}).join('');
    } catch (error) {
        console.error('加载备份列表失败:', error);
    }
}

// 下载备份
function downloadBackup(id) {
    window.open(`/api/backups/${id}/download`, '_blank');
}

// 恢复备份
async function restoreBackup(id) {
    if (!confirm('确定要恢复此备份吗？当前数据将被覆盖，请谨慎操作！')) {
        return;
    }

    try {
        const response = await fetch(`/api/backups/${id}/restore`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            alert('数据恢复成功！');
        } else {
            alert(data.message || '恢复失败');
        }
    } catch (error) {
        console.error('恢复备份失败:', error);
        alert('恢复备份失败: ' + error.message);
    }
}

// 删除备份
async function deleteBackup(id) {
    if (!confirm('确定要删除此备份吗？删除后无法恢复。')) {
        return;
    }

    try {
        const response = await fetch(`/api/backups/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            alert('备份已删除');
            loadBackupList();
        } else {
            alert(data.message || '删除失败');
        }
    } catch (error) {
        console.error('删除备份失败:', error);
        alert('删除备份失败: ' + error.message);
    }
}

// 保存自动备份配置
async function saveAutoBackupConfig() {
    const config = {
        enabled: document.getElementById('autoBackupEnabled').checked,
        frequency: document.getElementById('autoBackupFrequency').value,
        retention: parseInt(document.getElementById('backupRetention').value, 10)
    };

    try {
        const response = await fetch('/api/auto-backup-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        const data = await response.json();

        if (data.success) {
            // 保存到本地存储
            const settings = getCurrentSettings();
            settings.autoBackup = config;
            saveSettingsToStorage(settings);
            alert('自动备份配置已保存');
        } else {
            alert(data.message || '保存失败');
        }
    } catch (error) {
        console.error('保存自动备份配置失败:', error);
        alert('保存失败: ' + error.message);
    }
}

// 更新数据备份函数
async function backupData() {
    const btn = document.querySelector('[onclick="backupData()"]');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-hourglass me-2"></i>备份中...';
    }

    try {
        const response = await fetch('/api/backup', {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            alert(`数据备份成功！\n文件名: ${data.fileName}\n大小: ${data.fileSize} MB`);
            loadBackupList();
        } else {
            alert(data.message || '备份失败');
        }
    } catch (error) {
        console.error('数据备份失败:', error);
        alert('数据备份失败: ' + error.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-plus-circle me-2"></i>立即备份';
        }
    }
}

// ==================== 用户管理功能 ====================

// 加载用户列表
async function loadUserList() {
    try {
        const response = await fetch('/api/auth/users');
        const data = await response.json();

        const tbody = document.getElementById('userListBody');
        const emptyDiv = document.getElementById('userListEmpty');

        if (!data.success || !data.users || data.users.length === 0) {
            tbody.innerHTML = '';
            emptyDiv.classList.remove('d-none');
            return;
        }

        emptyDiv.classList.add('d-none');

        tbody.innerHTML = data.users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>
                    <span class="badge ${user.role === 'admin' ? 'bg-danger' : 'bg-secondary'}">
                        ${user.role === 'admin' ? '管理员' : '普通用户'}
                    </span>
                </td>
                <td>
                    <span class="badge ${user.is_active ? 'bg-success' : 'bg-warning text-dark'}">
                        ${user.is_active ? '启用' : '禁用'}
                    </span>
                </td>
                <td>${new Date(user.created_at).toLocaleString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="showEditUserModal(${user.id}, '${user.username}', '${user.role}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm ${user.is_active ? 'btn-outline-warning' : 'btn-outline-success'} me-1" onclick="toggleUserStatus(${user.id}, ${user.is_active})">
                        <i class="bi bi-${user.is_active ? 'pause' : 'play'}-circle"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${user.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('加载用户列表失败:', error);
    }
}

// 显示新增用户模态框
function showAddUserModal() {
    document.getElementById('userId').value = '';
    document.getElementById('userModalTitle').textContent = '新增用户';
    document.getElementById('newUsername').value = '';
    document.getElementById('newUserPassword').value = '';
    document.getElementById('userRole').value = 'user';

    // 显示新增模式字段，隐藏编辑模式字段
    document.getElementById('usernameField').style.display = 'block';
    document.getElementById('usernameReadonlyField').style.display = 'none';
    document.getElementById('passwordField').style.display = 'block';
    document.getElementById('newPasswordField').style.display = 'none';
    document.getElementById('confirmPasswordField').style.display = 'none';
    document.getElementById('roleField').style.display = 'block';
    document.getElementById('roleReadonlyField').style.display = 'none';

    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    modal.show();
}

// 显示编辑用户模态框
function showEditUserModal(id, username, role) {
    document.getElementById('userId').value = id;
    document.getElementById('userModalTitle').textContent = '修改密码';
    document.getElementById('readonlyUsername').value = username;
    document.getElementById('readonlyRole').value = role === 'admin' ? '管理员' : '普通用户';
    document.getElementById('editUserPassword').value = '';
    document.getElementById('confirmUserPassword').value = '';

    // 隐藏新增模式字段，显示编辑模式字段
    document.getElementById('usernameField').style.display = 'none';
    document.getElementById('usernameReadonlyField').style.display = 'block';
    document.getElementById('passwordField').style.display = 'none';
    document.getElementById('newPasswordField').style.display = 'block';
    document.getElementById('confirmPasswordField').style.display = 'block';
    document.getElementById('roleField').style.display = 'none';
    document.getElementById('roleReadonlyField').style.display = 'block';

    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    modal.show();
}

// 保存用户（新增或编辑）
async function saveUser() {
    const id = document.getElementById('userId').value;
    const isEdit = !!id;

    if (!isEdit) {
        // 新增用户模式
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newUserPassword').value;
        const role = document.getElementById('userRole').value;

        if (!username) {
            alert('请输入用户名');
            return;
        }

        if (!password) {
            alert('请输入密码');
            return;
        }

        if (password.length < 6) {
            alert('密码至少需要6位');
            return;
        }

        try {
            const response = await fetch('/api/auth/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, role })
            });

            const data = await response.json();

            if (data.success) {
                alert(data.message);
                bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
                loadUserList();
            } else {
                alert(data.message || '操作失败');
            }
        } catch (error) {
            console.error('保存用户失败:', error);
            alert('保存用户失败: ' + error.message);
        }
    } else {
        // 编辑用户模式（修改密码）
        const newPassword = document.getElementById('editUserPassword').value;
        const confirmPassword = document.getElementById('confirmUserPassword').value;

        if (!newPassword) {
            alert('请输入新密码');
            return;
        }

        if (newPassword.length < 6) {
            alert('密码至少需要6位');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('两次输入的密码不一致');
            return;
        }

        try {
            const response = await fetch(`/api/auth/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword })
            });

            const data = await response.json();

            if (data.success) {
                alert(data.message);
                bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
                loadUserList();
            } else {
                alert(data.message || '操作失败');
            }
        } catch (error) {
            console.error('修改密码失败:', error);
            alert('修改密码失败: ' + error.message);
        }
    }
}

// 删除用户
async function deleteUser(id) {
    if (!confirm('确定要删除此用户吗？此操作不可恢复！')) {
        return;
    }

    try {
        const response = await fetch(`/api/auth/users/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            loadUserList();
        } else {
            alert(data.message || '删除失败');
        }
    } catch (error) {
        console.error('删除用户失败:', error);
        alert('删除用户失败: ' + error.message);
    }
}

// 切换用户状态（启用/禁用）
async function toggleUserStatus(id, currentStatus) {
    const action = currentStatus ? '禁用' : '启用';
    if (!confirm(`确定要${action}此用户吗？`)) {
        return;
    }

    try {
        const response = await fetch(`/api/auth/users/${id}/toggle`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            loadUserList();
        } else {
            alert(data.message || '操作失败');
        }
    } catch (error) {
        console.error('切换用户状态失败:', error);
        alert('操作失败: ' + error.message);
    }
}

// ==================== 日志查看功能 ====================

let currentLogPage = 1;
let currentLogs = [];

// 防抖函数，避免频繁请求
let logLoadTimeout;
function debounceLoadLogs() {
    clearTimeout(logLoadTimeout);
    logLoadTimeout = setTimeout(() => {
        currentLogPage = 1; // 重置到第一页
        loadLogs();
    }, 300);
}

// 加载日志
async function loadLogs() {
    const dateFilter = document.getElementById('logDateFilter').value;
    const levelFilter = document.getElementById('logLevelFilter').value;
    const actionFilter = document.getElementById('logActionFilter').value;
    const operatorFilter = document.getElementById('logOperatorFilter').value;
    const operatorIdFilter = document.getElementById('logOperatorIdFilter').value;
    const targetFilter = document.getElementById('logTargetFilter').value;
    const keywordFilter = document.getElementById('logKeywordFilter').value;
    const startTime = document.getElementById('logStartTime').value;
    const endTime = document.getElementById('logEndTime').value;

    try {
        const params = new URLSearchParams({
            date: dateFilter,
            level: levelFilter,
            page: currentLogPage,
            pageSize: 50
        });

        if (actionFilter !== 'all') {
            params.append('action', actionFilter);
        }

        if (operatorFilter) {
            params.append('operator', operatorFilter);
        }

        if (operatorIdFilter) {
            params.append('operatorId', operatorIdFilter);
        }

        if (targetFilter) {
            params.append('target', targetFilter);
        }

        if (keywordFilter) {
            params.append('keyword', keywordFilter);
        }

        if (startTime) {
            params.append('startTime', startTime);
        }

        if (endTime) {
            params.append('endTime', endTime);
        }

        const response = await fetch(`/api/logs?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
            currentLogs = data.logs;
            displayLogs(data.logs, data.pagination);
            updateLogPagination(data.pagination);
            updateLogStats(data.stats);
        }
    } catch (error) {
        console.error('加载日志失败:', error);
    }
}

// 更新统计信息
function updateLogStats(stats) {
    if (!stats) return;
    
    document.getElementById('logStatTotal').textContent = stats.filtered || 0;
    document.getElementById('logStatInfo').textContent = stats.byLevel?.INFO || 0;
    document.getElementById('logStatWarn').textContent = stats.byLevel?.WARN || 0;
    document.getElementById('logStatError').textContent = stats.byLevel?.ERROR || 0;
    document.getElementById('logCountBadge').textContent = `${stats.filtered || 0}条`;
}

// 显示日志列表
function displayLogs(logs, pagination) {
    const tbody = document.getElementById('logListBody');
    const emptyDiv = document.getElementById('logListEmpty');

    if (!logs || logs.length === 0) {
        tbody.innerHTML = '';
        emptyDiv.classList.remove('d-none');
        return;
    }

    emptyDiv.classList.add('d-none');

    // 级别样式映射
    const levelBadgeClass = {
        'INFO': 'bg-info',
        'WARN': 'bg-warning text-dark',
        'ERROR': 'bg-danger'
    };

    // 操作类型图标映射
    const actionIconMap = {
        '用户登录': 'bi-box-arrow-in-right',
        '用户登出': 'bi-box-arrow-right',
        '创建用户': 'bi-person-plus',
        '更新用户': 'bi-person-gear',
        '删除用户': 'bi-person-x',
        '切换用户状态': 'bi-person-check',
        '修改密码': 'bi-key',
        '创建商品': 'bi-plus-circle',
        '更新商品': 'bi-pencil-square',
        '删除商品': 'bi-trash',
        '入库操作': 'bi-arrow-down-circle text-success',
        '出库操作': 'bi-arrow-up-circle text-danger',
        '撤销入库': 'bi-arrow-counterclockwise',
        '撤销出库': 'bi-arrow-counterclockwise',
        '修改入库': 'bi-pencil',
        '修改出库': 'bi-pencil',
        '查看入库记录': 'bi-list',
        '查看出库记录': 'bi-list',
        '查看库存报表': 'bi-table',
        '查询商品明细': 'bi-search',
        '获取出入库方式': 'bi-arrow-left-right',
        '获取商品批次': 'bi-boxes',
        '获取供应商列表': 'bi-truck',
        '获取客户列表': 'bi-people',
        '创建备份': 'bi-save',
        '恢复备份': 'bi-arrow-counterclockwise',
        '删除备份': 'bi-trash',
        '清理数据': 'bi-exclamation-triangle',
        '更新设置': 'bi-gear'
    };

    tbody.innerHTML = logs.map((log, index) => {
        const icon = actionIconMap[log.action] || 'bi-circle';
        return `
        <tr class="align-middle">
            <td class="font-monospace small text-nowrap">${log.timestamp}</td>
            <td><span class="badge ${levelBadgeClass[log.level] || 'bg-secondary'}">${log.level}</span></td>
            <td>
                <span class="text-primary fw-bold">${log.operator}</span>
                ${log.operatorId ? `<span class="text-muted small">(#${log.operatorId})</span>` : ''}
            </td>
            <td>
                <i class="bi ${icon} me-1"></i>${log.action}
            </td>
            <td class="text-truncate" style="max-width: 180px;" title="${log.target || ''}">
                ${log.target ? `<span class="badge bg-light text-dark border">${log.target}</span>` : '-'}
            </td>
            <td class="text-truncate" style="max-width: 200px;" title="${log.description || ''}">
                ${log.description || '-'}
            </td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-info" onclick="showLogDetail(${index})" title="查看详情">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        </tr>
    `}).join('');
}

// 更新分页控件
function updateLogPagination(pagination) {
    const paginationNav = document.getElementById('logPagination');
    const prevBtn = document.getElementById('logPrevPage');
    const nextBtn = document.getElementById('logNextPage');
    const pageInfo = document.getElementById('logPageInfo');

    if (pagination.totalPages <= 1) {
        paginationNav.classList.add('d-none');
        return;
    }

    paginationNav.classList.remove('d-none');
    pageInfo.innerHTML = `第 ${pagination.page} / ${pagination.totalPages} 页 <span class="text-muted">(${pagination.total}条)</span>`;

    if (pagination.page <= 1) {
        prevBtn.classList.add('disabled');
    } else {
        prevBtn.classList.remove('disabled');
    }

    if (pagination.page >= pagination.totalPages) {
        nextBtn.classList.add('disabled');
    } else {
        nextBtn.classList.remove('disabled');
    }
}

// 切换日志页码
function changeLogPage(delta) {
    currentLogPage += delta;
    if (currentLogPage < 1) currentLogPage = 1;
    loadLogs();
}

// 重置筛选条件
function resetLogFilters() {
    document.getElementById('logDateFilter').value = 'today';
    document.getElementById('logLevelFilter').value = 'all';
    document.getElementById('logActionFilter').value = 'all';
    document.getElementById('logOperatorFilter').value = '';
    document.getElementById('logOperatorIdFilter').value = '';
    document.getElementById('logTargetFilter').value = '';
    document.getElementById('logKeywordFilter').value = '';
    document.getElementById('logStartTime').value = '';
    document.getElementById('logEndTime').value = '';
    currentLogPage = 1;
    loadLogs();
}

// 切换日志视图（表格/原始）
async function toggleLogView() {
    const viewMode = document.querySelector('input[name="logViewMode"]:checked').value;
    const tableView = document.getElementById('logTableView');
    const rawView = document.getElementById('logRawView');

    if (viewMode === 'table') {
        tableView.classList.remove('d-none');
        rawView.classList.add('d-none');
        loadLogs();
    } else {
        tableView.classList.add('d-none');
        rawView.classList.remove('d-none');
        loadRawLogs();
    }
}

// 加载原始日志
async function loadRawLogs() {
    const dateFilter = document.getElementById('logDateFilter').value;

    try {
        const response = await fetch(`/api/logs/raw?date=${dateFilter}`);
        const data = await response.json();

        const rawContent = document.getElementById('logRawContent');
        rawContent.textContent = data.content || '暂无日志内容';
    } catch (error) {
        console.error('加载原始日志失败:', error);
        document.getElementById('logRawContent').textContent = '加载失败: ' + error.message;
    }
}

// 显示日志详情
function showLogDetail(index) {
    const log = currentLogs[index];
    if (!log) return;

    document.getElementById('logDetailTime').textContent = log.timestamp;
    document.getElementById('logDetailLevel').innerHTML = `<span class="badge bg-${log.level === 'INFO' ? 'info' : log.level === 'WARN' ? 'warning text-dark' : 'danger'}">${log.level}</span>`;
    document.getElementById('logDetailOperator').innerHTML = `${log.operator} ${log.operatorId ? `<span class="text-muted">(ID: ${log.operatorId})</span>` : ''}`;
    document.getElementById('logDetailAction').textContent = log.action;
    document.getElementById('logDetailTarget').innerHTML = log.target ? `<span class="badge bg-light text-dark border">${log.target}</span>` : '-';
    document.getElementById('logDetailDescription').textContent = log.description || '-';
    document.getElementById('logDetailExtra').textContent = log.extra ? JSON.stringify(log.extra, null, 2) : '无';

    const modal = new bootstrap.Modal(document.getElementById('logDetailModal'));
    modal.show();
}

// 监听日志选项卡激活事件，自动加载日志
document.addEventListener('shown.bs.tab', function (event) {
    if (event.target.id === 'logs-tab') {
        loadLogs();
    }
    if (event.target.id === 'stock-method-tab') {
        loadStockMethodList();
    }
});

// ============================================
// 出入库方式管理功能
// ============================================

let stockMethodModal = null;

// 加载出入库方式列表
async function loadStockMethodList() {
    try {
        const response = await fetch('/api/stock-methods-admin');
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || '加载失败');
        }

        const tbody = document.getElementById('stockMethodListBody');
        const emptyDiv = document.getElementById('stockMethodListEmpty');

        if (data.methods.length === 0) {
            tbody.innerHTML = '';
            emptyDiv.classList.remove('d-none');
            return;
        }

        emptyDiv.classList.add('d-none');
        tbody.innerHTML = data.methods.map(method => `
            <tr>
                <td>${method.id}</td>
                <td>
                    <span class="badge bg-${method.type === 'in' ? 'success' : 'warning'}">
                        ${method.type === 'in' ? '入库' : '出库'}
                    </span>
                </td>
                <td>${method.method_name}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="showEditStockMethodModal(${method.id}, '${method.type}', '${method.method_name}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteStockMethod(${method.id}, '${method.method_name}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('加载出入库方式列表失败:', error);
        alert('加载出入库方式列表失败: ' + error.message);
    }
}

// 显示新增出入库方式模态框
function showAddStockMethodModal() {
    document.getElementById('stockMethodId').value = '';
    document.getElementById('stockMethodType').value = 'in';
    document.getElementById('stockMethodName').value = '';
    document.getElementById('stockMethodModalTitle').textContent = '新增出入库方式';

    stockMethodModal = new bootstrap.Modal(document.getElementById('stockMethodModal'));
    stockMethodModal.show();
}

// 显示编辑出入库方式模态框
function showEditStockMethodModal(id, type, methodName) {
    document.getElementById('stockMethodId').value = id;
    document.getElementById('stockMethodType').value = type;
    document.getElementById('stockMethodName').value = methodName;
    document.getElementById('stockMethodModalTitle').textContent = '编辑出入库方式';

    stockMethodModal = new bootstrap.Modal(document.getElementById('stockMethodModal'));
    stockMethodModal.show();
}

// 保存出入库方式（新增或编辑）
async function saveStockMethod() {
    const id = document.getElementById('stockMethodId').value;
    const type = document.getElementById('stockMethodType').value;
    const methodName = document.getElementById('stockMethodName').value.trim();

    if (!methodName) {
        alert('请输入方式名称');
        return;
    }

    try {
        const url = id ? `/api/stock-methods-admin/${id}` : '/api/stock-methods-admin';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, method_name: methodName })
        });

        const data = await response.json();

        if (data.success) {
            stockMethodModal.hide();
            loadStockMethodList();
            alert(id ? '更新成功' : '创建成功');
        } else {
            alert(data.message || '操作失败');
        }
    } catch (error) {
        console.error('保存出入库方式失败:', error);
        alert('保存失败: ' + error.message);
    }
}

// 删除出入库方式
async function deleteStockMethod(id, methodName) {
    if (!confirm(`确定要删除出入库方式 "${methodName}" 吗？\n注意：如果该方式已被使用，将无法删除。`)) {
        return;
    }

    try {
        const response = await fetch(`/api/stock-methods-admin/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            loadStockMethodList();
            alert('删除成功');
        } else {
            alert(data.message || '删除失败');
        }
    } catch (error) {
        console.error('删除出入库方式失败:', error);
        alert('删除失败: ' + error.message);
    }
}
