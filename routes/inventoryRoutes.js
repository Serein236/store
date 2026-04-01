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

module.exports = router;