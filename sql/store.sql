/*
 仓库管理系统数据库
 版本: v2.2
 日期: 2026-01-23
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- 1. 商品信息表
-- ----------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_code` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '商品编码',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `spec` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '规格',
  `unit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '单位',
  `packing_spec` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '装箱规格',
  `retail_price` decimal(12, 2) NULL DEFAULT 0.00 COMMENT '零售价',
  `barcode` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '商品条形码',
  `manufacturer` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '生产厂家',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_product_code`(`product_code` ASC) USING BTREE,
  UNIQUE INDEX `uk_barcode`(`barcode` ASC) USING BTREE,
  INDEX `idx_name`(`name` ASC) USING BTREE,
  INDEX `idx_manufacturer`(`manufacturer` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- 2. 出入库方式表
-- ----------------------------
DROP TABLE IF EXISTS `stock_methods`;
CREATE TABLE `stock_methods`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` enum('in','out') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'in:入库, out:出库',
  `method_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '方式名称',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_method_name_type`(`method_name` ASC, `type` ASC) USING BTREE,
  INDEX `idx_type`(`type` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- 预置常用出入库方式
INSERT INTO `stock_methods` (type, method_name) VALUES 
('in', '采购入库'),
('in', '退货入库'),
('in', '调拨入库'),
('in', '生产入库'),
('in', '其他入库'),
('out', '销售出库'),
('out', '调拨出库'),
('out', '报损出库'),
('out', '样品出库'),
('out', '其他出库');

-- ----------------------------
-- 3. 入库记录表
-- ----------------------------
DROP TABLE IF EXISTS `in_records`;
CREATE TABLE `in_records`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `stock_method_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '入库方式名称',
  `quantity` int NOT NULL COMMENT '入库数量',
  `unit_price` decimal(12, 2) NOT NULL DEFAULT 0.00 COMMENT '入库单价',
  `total_amount` decimal(12, 2) NOT NULL DEFAULT 0.00 COMMENT '总金额',
  `source` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '货物来源（如供应商）',
  `remark` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '备注',
  `recorded_date` date NOT NULL COMMENT '入库日期',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int NULL DEFAULT NULL COMMENT '操作人',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_product_id`(`product_id` ASC) USING BTREE,
  INDEX `idx_recorded_date`(`recorded_date` ASC) USING BTREE,
  INDEX `idx_stock_method_name`(`stock_method_name` ASC) USING BTREE,
  CONSTRAINT `fk_in_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_in_stock_method_name` FOREIGN KEY (`stock_method_name`) REFERENCES `stock_methods` (`method_name`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- 4. 出库记录表
-- ----------------------------
DROP TABLE IF EXISTS `out_records`;
CREATE TABLE `out_records`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `stock_method_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '出库方式名称',
  `quantity` int NOT NULL COMMENT '出库数量',
  `unit_price` decimal(12, 2) NOT NULL DEFAULT 0.00 COMMENT '出库单价',
  `total_amount` decimal(12, 2) NOT NULL DEFAULT 0.00 COMMENT '总金额',
  `destination` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '货物去向（如客户/门店）',
  `remark` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '备注',
  `recorded_date` date NOT NULL COMMENT '出库日期',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int NULL DEFAULT NULL COMMENT '操作人',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_product_id`(`product_id` ASC) USING BTREE,
  INDEX `idx_recorded_date`(`recorded_date` ASC) USING BTREE,
  INDEX `idx_stock_method_name`(`stock_method_name` ASC) USING BTREE,
  CONSTRAINT `fk_out_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_out_stock_method_name` FOREIGN KEY (`stock_method_name`) REFERENCES `stock_methods` (`method_name`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- 5. 库存表
-- ----------------------------
DROP TABLE IF EXISTS `stock_inventory`;
CREATE TABLE `stock_inventory`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `total_in_quantity` int NOT NULL DEFAULT 0 COMMENT '总入库数量',
  `total_out_quantity` int NOT NULL DEFAULT 0 COMMENT '总出库数量',
  `current_stock` int NOT NULL DEFAULT 0 COMMENT '当前库存',
  `warning_quantity` int NULL DEFAULT 10 COMMENT '警告库存数量',
  `danger_quantity` int NULL DEFAULT 5 COMMENT '危险库存数量',
  `stock_status` enum('normal','warning','danger','out_of_stock') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal' COMMENT '库存状态',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_product_id`(`product_id` ASC) USING BTREE,
  INDEX `idx_stock_status`(`stock_status` ASC) USING BTREE,
  INDEX `idx_current_stock`(`current_stock` ASC) USING BTREE,
  CONSTRAINT `fk_inventory_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- 6. 用户表
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '登录用户名',
  `display_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '显示用户名',
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_username`(`username` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- 初始化管理员用户
INSERT INTO `users` (username, display_name, password) VALUES 
('admin', '系统管理员', '$2b$10$leTrmigjUad6O0TiF8Fg0.Ho7RalUj.8M/jQQar6XLF2dELiPX.AG');

SET FOREIGN_KEY_CHECKS = 1;