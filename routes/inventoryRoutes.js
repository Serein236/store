const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { requireAdmin } = require('../middleware/auth');

router.post('/in', inventoryController.inStock);
router.post('/out', inventoryController.outStock);
router.get('/in-records', inventoryController.getInRecords);
router.delete('/in-records/:id/cancel', inventoryController.cancelInStock);
router.put('/in-records/:id', inventoryController.updateInStock);
router.get('/out-records', inventoryController.getOutRecords);
router.delete('/out-records/:id/cancel', inventoryController.cancelOutStock);
router.put('/out-records/:id', inventoryController.updateOutStock);
router.get('/stock', inventoryController.getStock);
router.get('/query/:productId', inventoryController.queryProductDetail);
router.get('/stock-methods', inventoryController.getStockMethods);
router.get('/product-batches', inventoryController.getProductBatches);
router.get('/product-batches/:productId', inventoryController.getProductBatches);
router.get('/suppliers', inventoryController.getSuppliers);
router.get('/customers', inventoryController.getCustomers);
router.get('/out-records/:id', inventoryController.getOutRecordById);

// 出入库方式管理API（仅管理员）
router.get('/stock-methods-admin', requireAdmin, inventoryController.getAllStockMethods);
router.post('/stock-methods-admin', requireAdmin, inventoryController.createStockMethod);
router.put('/stock-methods-admin/:id', requireAdmin, inventoryController.updateStockMethod);
router.delete('/stock-methods-admin/:id', requireAdmin, inventoryController.deleteStockMethod);

// 设置API
router.get('/settings', inventoryController.getSettings);
router.post('/settings', inventoryController.saveSettings);

// 备份管理API
router.post('/backup', inventoryController.createBackup);
router.get('/backups', inventoryController.getBackupList);
router.get('/backups/:id/download', inventoryController.downloadBackup);
router.delete('/backups/:id', inventoryController.deleteBackup);
router.post('/backups/:id/restore', inventoryController.restoreBackup);
router.post('/auto-backup-config', inventoryController.saveAutoBackupConfig);

// 密码修改API
router.post('/change-password', inventoryController.changePassword);

// 数据清理API（清理前会自动备份）
router.post('/cleanup', inventoryController.cleanupData);

module.exports = router;