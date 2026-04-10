const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

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

module.exports = router;