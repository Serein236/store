// controllers/productController.js
const ProductModel = require('../models/ProductModel');
const logger = require('../utils/logger');

const productController = {
    async getAllProducts(req, res) {
        const username = req.session.username;
        const userId = req.session.userId;
        
        try {
            const products = await ProductModel.findAll();
            logger.query('获取商品列表', {}, username, userId, products.length);
            res.json(products);
        } catch (error) {
            console.error('获取商品错误:', error);
            logger.error('获取商品失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ error: '获取商品失败' });
        }
    },

    async createProduct(req, res) {
        const { name, spec, unit, packing_spec, retail_price, barcode, manufacturer, warning_quantity, danger_quantity } = req.body;
        const username = req.session.username;
        const userId = req.session.userId;
        
        try {
            // 检查条形码是否已存在
            if (barcode) {
                const existingProductByBarcode = await ProductModel.findByBarcode(barcode);
                if (existingProductByBarcode) {
                    return res.status(400).json({ 
                        success: false, 
                        message: '条形码已存在' 
                    });
                }
            }
            
            const product = await ProductModel.create({
                name, spec, unit, packing_spec, retail_price, barcode, manufacturer, warning_quantity, danger_quantity
            });
            
            logger.productCreated(product.id, name, product.product_code || 'N/A', username, userId, { spec, unit, barcode, manufacturer });
            res.json({ success: true, id: product.id });
        } catch (error) {
            console.error('添加商品错误:', error);
            logger.error('添加商品失败', { operator: username, operatorId: userId, name, spec, error: error.message });
            res.status(500).json({ 
                success: false, 
                message: '添加商品失败' 
            });
        }
    },

    async updateProduct(req, res) {
        const { id } = req.params;
        const { name, spec, unit, packing_spec, retail_price, barcode, manufacturer, warning_quantity, danger_quantity } = req.body;
        const username = req.session.username;
        const userId = req.session.userId;
        
        try {
            // 检查条形码是否已被其他商品使用
            if (barcode) {
                const existingProductByBarcode = await ProductModel.findByBarcode(barcode);
                if (existingProductByBarcode && existingProductByBarcode.id != id) {
                    return res.status(400).json({ 
                        success: false, 
                        message: '条形码已存在' 
                    });
                }
            }
            
            await ProductModel.update(id, {
                name, spec, unit, packing_spec, retail_price, barcode, manufacturer, warning_quantity, danger_quantity
            });
            
            logger.productUpdated(id, name, barcode || 'N/A', username, userId, { spec, unit, retail_price, manufacturer });
            res.json({ success: true });
        } catch (error) {
            console.error('更新商品错误:', error);
            logger.error('更新商品失败', { operator: username, operatorId: userId, id, name, spec, error: error.message });
            res.status(500).json({ 
                success: false, 
                message: '更新商品失败' 
            });
        }
    },

    async deleteProduct(req, res) {
        const { id } = req.params;
        const username = req.session.username;
        const userId = req.session.userId;
        
        try {
            // 获取商品名称用于日志记录
            const product = await ProductModel.findById(id);
            const productName = product ? product.name : '未知商品';
            
            await ProductModel.delete(id);
            
            logger.productDeleted(id, productName, product ? product.product_code || 'N/A' : '未知', username, userId);
            res.json({ success: true });
        } catch (error) {
            console.error('删除商品错误:', error);
            logger.error('删除商品失败', { operator: username, operatorId: userId, id, error: error.message });
            res.status(500).json({ 
                success: false, 
                message: '删除商品失败' 
            });
        }
    }
};

module.exports = productController;