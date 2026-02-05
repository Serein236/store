const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

router.post('/in', inventoryController.inStock);
router.post('/out', inventoryController.outStock);
router.get('/in-records', inventoryController.getInRecords);
router.get('/out-records', inventoryController.getOutRecords);
router.get('/stock', inventoryController.getStock);
router.get('/query/:productId', inventoryController.queryProductDetail);
router.get('/stock-methods', inventoryController.getStockMethods);
router.get('/product-batches/:productId', inventoryController.getProductBatches);
router.get('/out-records/:id', inventoryController.getOutRecordById);

module.exports = router;