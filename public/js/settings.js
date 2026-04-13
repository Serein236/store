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

// 数据清理
async function cleanupData() {
    const cleanupDate = document.getElementById('cleanupDate').value;

    if (!cleanupDate) {
        alert('请选择要清理的截止日期');
        return;
    }

    const confirmCleanup = confirm(`警告：这将永久删除 ${cleanupDate} 之前的所有出入库记录！\n\n确定要继续吗？`);
    if (!confirmCleanup) return;

    const doubleConfirm = confirm('再次确认：数据删除后无法恢复，是否继续？');
    if (!doubleConfirm) return;

    try {
        const response = await fetch(`/api/cleanup?date=${cleanupDate}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            const result = await response.json();
            alert(`数据清理完成！\n已删除 ${result.deletedCount || 0} 条记录`);
        } else {
            alert('数据清理失败，请稍后重试');
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

        tbody.innerHTML = backups.map(backup => `
            <tr>
                <td>${backup.file_name}</td>
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
        `).join('');
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
