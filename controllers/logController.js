const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '../logs');

/**
 * 解析日志文件内容为结构化数据
 */
function parseLogFile(filePath) {
    const logs = [];
    
    if (!fs.existsSync(filePath)) {
        return logs;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    let currentLog = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // 匹配日志行格式: [2026-04-13 16:30:45] [INFO] [admin|1] 用户登录 | 用户成功登录系统
        const logPattern = /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] \[(\w+)\] \[([^|]*)\|([^\]]*)\] (.+)$/;
        const match = line.match(logPattern);
        
        if (match) {
            // 保存之前的日志
            if (currentLog) {
                logs.push(currentLog);
            }
            
            const [, timestamp, level, operator, operatorId, rest] = match;
            
            // 解析 rest 部分，提取操作类型、对象和描述
            // 格式: 操作类型 | 对象: xxx | 描述
            let action = rest;
            let target = '';
            let description = '';
            
            const parts = rest.split(' | ');
            if (parts.length >= 1) {
                action = parts[0].trim();
            }
            if (parts.length >= 2) {
                // 可能是 "对象: xxx" 或直接是描述
                if (parts[1].startsWith('对象:')) {
                    target = parts[1].replace('对象:', '').trim();
                    if (parts.length >= 3) {
                        description = parts[2].trim();
                    }
                } else {
                    description = parts[1].trim();
                }
            }
            if (parts.length >= 3 && parts[1].startsWith('对象:')) {
                description = parts[2].trim();
            }
            
            currentLog = {
                timestamp,
                level,
                operator: operator || 'system',
                operatorId: operatorId !== '-' ? parseInt(operatorId) || null : null,
                action,
                target,
                description,
                extra: null,
                raw: line
            };
        } else if (line.startsWith('    详情:') && currentLog) {
            // 这是详情行
            const extraStr = line.replace('    详情:', '').trim();
            try {
                currentLog.extra = JSON.parse(extraStr);
                currentLog.raw += '\n' + line;
            } catch (e) {
                currentLog.extra = extraStr;
                currentLog.raw += '\n' + line;
            }
        } else if (currentLog) {
            // 续行，添加到 raw
            currentLog.raw += '\n' + line;
        }
    }
    
    // 保存最后一条日志
    if (currentLog) {
        logs.push(currentLog);
    }
    
    return logs;
}

/**
 * 获取日志列表
 */
async function getLogs(req, res) {
    try {
        const { 
            date = 'today',      // today, yesterday, week, month, all, 或具体日期 YYYY-MM-DD
            level = 'all',       // all, INFO, WARN, ERROR
            action = 'all',      // 操作类型筛选
            operator = '',       // 操作人用户名筛选
            operatorId = '',     // 操作人ID筛选
            target = '',         // 操作对象筛选
            keyword = '',        // 关键词搜索（搜索描述、对象、操作类型）
            startTime = '',      // 开始时间 HH:mm
            endTime = '',        // 结束时间 HH:mm
            page = 1,
            pageSize = 50
        } = req.query;
        
        // 确定要读取的日志文件
        let logFiles = [];
        
        if (date === 'all') {
            // 获取所有日志文件
            if (fs.existsSync(LOGS_DIR)) {
                logFiles = fs.readdirSync(LOGS_DIR)
                    .filter(f => f.endsWith('.log'))
                    .sort().reverse()
                    .map(f => path.join(LOGS_DIR, f));
            }
        } else if (date === 'month') {
            // 最近30天
            const today = new Date();
            for (let i = 0; i < 30; i++) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const fileName = formatDateFileName(d);
                const filePath = path.join(LOGS_DIR, fileName);
                if (fs.existsSync(filePath)) {
                    logFiles.push(filePath);
                }
            }
        } else if (date === 'week') {
            // 最近7天
            const today = new Date();
            for (let i = 0; i < 7; i++) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const fileName = formatDateFileName(d);
                const filePath = path.join(LOGS_DIR, fileName);
                if (fs.existsSync(filePath)) {
                    logFiles.push(filePath);
                }
            }
        } else if (date === 'today') {
            const fileName = formatDateFileName(new Date());
            const filePath = path.join(LOGS_DIR, fileName);
            if (fs.existsSync(filePath)) {
                logFiles.push(filePath);
            }
        } else if (date === 'yesterday') {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            const fileName = formatDateFileName(d);
            const filePath = path.join(LOGS_DIR, fileName);
            if (fs.existsSync(filePath)) {
                logFiles.push(filePath);
            }
        } else {
            // 具体日期
            const filePath = path.join(LOGS_DIR, `${date}.log`);
            if (fs.existsSync(filePath)) {
                logFiles.push(filePath);
            }
        }
        
        // 解析所有日志文件
        let allLogs = [];
        for (const filePath of logFiles) {
            const logs = parseLogFile(filePath);
            allLogs = allLogs.concat(logs);
        }
        
        // 按时间倒序排列
        allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // 应用筛选条件
        let filteredLogs = allLogs;
        
        // 级别筛选
        if (level !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.level === level);
        }
        
        // 操作类型筛选
        if (action !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.action === action);
        }
        
        // 操作人用户名筛选
        if (operator) {
            filteredLogs = filteredLogs.filter(log => 
                log.operator.toLowerCase().includes(operator.toLowerCase())
            );
        }
        
        // 操作人ID筛选
        if (operatorId) {
            filteredLogs = filteredLogs.filter(log => 
                log.operatorId === parseInt(operatorId)
            );
        }
        
        // 操作对象筛选
        if (target) {
            filteredLogs = filteredLogs.filter(log => 
                log.target && log.target.toLowerCase().includes(target.toLowerCase())
            );
        }
        
        // 关键词搜索（操作类型、对象、描述）
        if (keyword) {
            const keywordLower = keyword.toLowerCase();
            filteredLogs = filteredLogs.filter(log => 
                (log.action && log.action.toLowerCase().includes(keywordLower)) ||
                (log.target && log.target.toLowerCase().includes(keywordLower)) ||
                (log.description && log.description.toLowerCase().includes(keywordLower))
            );
        }
        
        // 时间范围筛选
        if (startTime || endTime) {
            filteredLogs = filteredLogs.filter(log => {
                const logTime = log.timestamp.split(' ')[1]; // HH:mm:ss
                const logHourMin = logTime.substring(0, 5); // HH:mm
                
                if (startTime && logHourMin < startTime) return false;
                if (endTime && logHourMin > endTime) return false;
                return true;
            });
        }
        
        // 计算分页
        const total = filteredLogs.length;
        const totalPages = Math.ceil(total / pageSize);
        const start = (page - 1) * pageSize;
        const end = start + parseInt(pageSize);
        const paginatedLogs = filteredLogs.slice(start, end);
        
        // 统计信息
        const stats = {
            total: allLogs.length,
            filtered: filteredLogs.length,
            byLevel: {
                INFO: filteredLogs.filter(l => l.level === 'INFO').length,
                WARN: filteredLogs.filter(l => l.level === 'WARN').length,
                ERROR: filteredLogs.filter(l => l.level === 'ERROR').length
            }
        };
        
        res.json({
            success: true,
            logs: paginatedLogs,
            stats,
            pagination: {
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                total,
                totalPages
            }
        });
        
    } catch (error) {
        console.error('获取日志错误:', error);
        res.status(500).json({
            success: false,
            message: '获取日志失败: ' + error.message
        });
    }
}

/**
 * 获取原始日志内容
 */
async function getRawLogs(req, res) {
    try {
        const { date = 'today' } = req.query;
        
        let logFiles = [];
        
        if (date === 'all') {
            if (fs.existsSync(LOGS_DIR)) {
                logFiles = fs.readdirSync(LOGS_DIR)
                    .filter(f => f.endsWith('.log'))
                    .sort().reverse()
                    .map(f => path.join(LOGS_DIR, f));
            }
        } else if (date === 'today') {
            const fileName = formatDateFileName(new Date());
            const filePath = path.join(LOGS_DIR, fileName);
            if (fs.existsSync(filePath)) {
                logFiles.push(filePath);
            }
        } else if (date === 'yesterday') {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            const fileName = formatDateFileName(d);
            const filePath = path.join(LOGS_DIR, fileName);
            if (fs.existsSync(filePath)) {
                logFiles.push(filePath);
            }
        } else if (date === 'week') {
            const today = new Date();
            for (let i = 0; i < 7; i++) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const fileName = formatDateFileName(d);
                const filePath = path.join(LOGS_DIR, fileName);
                if (fs.existsSync(filePath)) {
                    logFiles.push(filePath);
                }
            }
        } else {
            const filePath = path.join(LOGS_DIR, `${date}.log`);
            if (fs.existsSync(filePath)) {
                logFiles.push(filePath);
            }
        }
        
        // 读取所有文件内容
        let content = '';
        for (const filePath of logFiles) {
            content += `\n=== ${path.basename(filePath)} ===\n\n`;
            content += fs.readFileSync(filePath, 'utf8');
            content += '\n';
        }
        
        res.json({
            success: true,
            content: content || '暂无日志内容'
        });
        
    } catch (error) {
        console.error('获取原始日志错误:', error);
        res.status(500).json({
            success: false,
            message: '获取原始日志失败: ' + error.message
        });
    }
}

/**
 * 获取可用的日志日期列表
 */
async function getLogDates(req, res) {
    try {
        let dates = [];
        
        if (fs.existsSync(LOGS_DIR)) {
            dates = fs.readdirSync(LOGS_DIR)
                .filter(f => f.endsWith('.log'))
                .map(f => f.replace('.log', ''))
                .sort()
                .reverse();
        }
        
        res.json({
            success: true,
            dates
        });
        
    } catch (error) {
        console.error('获取日志日期错误:', error);
        res.status(500).json({
            success: false,
            message: '获取日志日期失败: ' + error.message
        });
    }
}

function formatDateFileName(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}.log`;
}

module.exports = {
    getLogs,
    getRawLogs,
    getLogDates
};
