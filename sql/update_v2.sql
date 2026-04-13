-- 仓库管理系统升级脚本 v2.0
-- 适用于已有项目的升级（从旧版本升级到新版本）
-- 执行前请务必备份数据库！

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- 1. 更新用户表 (users) - 添加用户管理功能所需字段
-- ============================================

-- 检查并添加 role 字段
SET @dbname = DATABASE();
SET @tablename = 'users';
SET @columnname = 'role';

SELECT COUNT(*) INTO @exist 
FROM information_schema.columns 
WHERE table_schema = @dbname 
AND table_name = @tablename 
AND column_name = @columnname;

SET @sql = IF(@exist = 0, 
    'ALTER TABLE users ADD COLUMN role VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT "user" COMMENT "角色: admin-管理员, user-普通用户"',
    'SELECT "Column role already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 is_active 字段
SET @columnname = 'is_active';
SELECT COUNT(*) INTO @exist 
FROM information_schema.columns 
WHERE table_schema = @dbname 
AND table_name = @tablename 
AND column_name = @columnname;

SET @sql = IF(@exist = 0, 
    'ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT "是否启用: 1-启用, 0-禁用"',
    'SELECT "Column is_active already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 确保管理员账号存在且有正确角色
UPDATE users SET role = 'admin', is_active = 1 WHERE username = 'admin';
-- 其他用户默认设置为普通用户并启用
UPDATE users SET role = 'user', is_active = 1 WHERE role IS NULL;

-- ============================================
-- 2. 更新商品表 (products) - 添加库存相关字段
-- ============================================

-- 检查并添加 stock 字段
SET @tablename = 'products';
SET @columnname = 'stock';

SELECT COUNT(*) INTO @exist 
FROM information_schema.columns 
WHERE table_schema = @dbname 
AND table_name = @tablename 
AND column_name = @columnname;

SET @sql = IF(@exist = 0, 
    'ALTER TABLE products ADD COLUMN stock INT NOT NULL DEFAULT 0 COMMENT "当前库存"',
    'SELECT "Column stock already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 warning_quantity 字段
SET @columnname = 'warning_quantity';
SELECT COUNT(*) INTO @exist 
FROM information_schema.columns 
WHERE table_schema = @dbname 
AND table_name = @tablename 
AND column_name = @columnname;

SET @sql = IF(@exist = 0, 
    'ALTER TABLE products ADD COLUMN warning_quantity INT NULL DEFAULT 10 COMMENT "警告库存数量"',
    'SELECT "Column warning_quantity already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 danger_quantity 字段
SET @columnname = 'danger_quantity';
SELECT COUNT(*) INTO @exist 
FROM information_schema.columns 
WHERE table_schema = @dbname 
AND table_name = @tablename 
AND column_name = @columnname;

SET @sql = IF(@exist = 0, 
    'ALTER TABLE products ADD COLUMN danger_quantity INT NULL DEFAULT 5 COMMENT "危险库存数量"',
    'SELECT "Column danger_quantity already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 3. 创建备份记录表 (backups) - 如不存在
-- ============================================
CREATE TABLE IF NOT EXISTS `backups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '备份文件名',
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文件完整路径',
  `file_size` decimal(10,2) NULL DEFAULT NULL COMMENT '文件大小(MB)',
  `created_by` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '创建者',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `backup_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'manual' COMMENT '备份类型: manual-手动, auto-自动, pre_delete-删除前备份',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_created_at`(`created_at` ASC) USING BTREE,
  INDEX `idx_backup_type`(`backup_type` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ============================================
-- 4. 创建系统设置表 (settings) - 如不存在
-- ============================================
CREATE TABLE IF NOT EXISTS `settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '设置键',
  `setting_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '设置值(JSON格式)',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '描述',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_setting_key`(`setting_key` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- 插入默认系统设置（如不存在）
INSERT INTO `settings` (setting_key, setting_value, description)
SELECT 'export', '{"companyName":"公司名称","address":"公司地址","phone":"联系电话"}', '导出配置'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE setting_key = 'export');

INSERT INTO `settings` (setting_key, setting_value, description)
SELECT 'autoBackup', '{"enabled":false,"retention":5}', '自动备份配置'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE setting_key = 'autoBackup');

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 升级完成
-- ============================================
SELECT '数据库升级完成！请检查应用程序是否正常工作。' as message;
