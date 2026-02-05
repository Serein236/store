// controllers/productController.js
const ProductModel = require('../models/ProductModel');
const logger = require('../utils/logger');

const productController = {
    async getAllProducts(req, res) {
        const username = req.session.username;
        
        try {
            const products = await ProductModel.findAll();
            logger.info('获取商品列表', { username, productCount: products.length, timestamp: new Date().toISOString() });
            res.json(products);
        } catch (error) {
            console.error('获取商品错误:', error);
            logger.error('获取商品失败', { error: error.message });
            res.status(500).json({ error: '获取商品失败' });
        }
    },

    async createProduct(req, res) {
        const { name, spec, unit, packing_spec, retail_price, barcode, manufacturer, warning_quantity, danger_quantity } = req.body;
        const username = req.session.username;
        
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
            
            logger.productOperation('创建商品', product.id, name, username);
            res.json({ success: true, id: product.id });
        } catch (error) {
            console.error('添加商品错误:', error);
            logger.error('添加商品失败', { name, spec, error: error.message });
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
            
            logger.productOperation('更新商品', id, name, username);
            res.json({ success: true });
        } catch (error) {
            console.error('更新商品错误:', error);
            logger.error('更新商品失败', { id, name, spec, error: error.message });
            res.status(500).json({ 
                success: false, 
                message: '更新商品失败' 
            });
        }
    },

    async deleteProduct(req, res) {
        const { id } = req.params;
        const username = req.session.username;
        
        try {
            // 获取商品名称用于日志记录
            const product = await ProductModel.findById(id);
            const productName = product ? product.name : '未知商品';
            
            await ProductModel.delete(id);
            
            logger.productOperation('删除商品', id, productName, username);
            res.json({ success: true });
        } catch (error) {
            console.error('删除商品错误:', error);
            logger.error('删除商品失败', { id, error: error.message });
            res.status(500).json({ 
                success: false, 
                message: '删除商品失败' 
            });
        }
    }
};

module.exports = productController;