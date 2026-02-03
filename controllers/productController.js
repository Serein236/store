// controllers/productController.js
const ProductModel = require('../models/ProductModel');

const productController = {
    async getAllProducts(req, res) {
        try {
            const products = await ProductModel.findAll();
            res.json(products);
        } catch (error) {
            console.error('获取商品错误:', error);
            res.status(500).json({ error: '获取商品失败' });
        }
    },

    async createProduct(req, res) {
        const { product_code, name, spec, unit, packing_spec, retail_price, barcode, manufacturer } = req.body;
        
        try {
            // 检查商品编码是否已存在
            const existingProductByCode = await ProductModel.findByProductCode(product_code);
            if (existingProductByCode) {
                return res.status(400).json({ 
                    success: false, 
                    message: '商品编码已存在' 
                });
            }
            
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
                product_code, name, spec, unit, packing_spec, retail_price, barcode, manufacturer
            });
            res.json({ success: true, id: product.id });
        } catch (error) {
            console.error('添加商品错误:', error);
            res.status(500).json({ 
                success: false, 
                message: '添加商品失败' 
            });
        }
    },

    async updateProduct(req, res) {
        const { id } = req.params;
        const { product_code, name, spec, unit, packing_spec, retail_price, barcode, manufacturer } = req.body;
        
        try {
            // 检查商品编码是否已被其他商品使用
            const existingProductByCode = await ProductModel.findByProductCode(product_code);
            if (existingProductByCode && existingProductByCode.id != id) {
                return res.status(400).json({ 
                    success: false, 
                    message: '商品编码已存在' 
                });
            }
            
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
                product_code, name, spec, unit, packing_spec, retail_price, barcode, manufacturer
            });
            res.json({ success: true });
        } catch (error) {
            console.error('更新商品错误:', error);
            res.status(500).json({ 
                success: false, 
                message: '更新商品失败' 
            });
        }
    },

    async deleteProduct(req, res) {
        const { id } = req.params;
        
        try {
            await ProductModel.delete(id);
            res.json({ success: true });
        } catch (error) {
            console.error('删除商品错误:', error);
            res.status(500).json({ 
                success: false, 
                message: '删除商品失败' 
            });
        }
    }
};

module.exports = productController;