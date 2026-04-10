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
        await fetch('/api/auth/logout');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('退出登录失败:', error);
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    checkLogin();
});

// 获取设置（供其他页面使用）
window.getWarehouseSettings = function() {
    return getCurrentSettings();
};
