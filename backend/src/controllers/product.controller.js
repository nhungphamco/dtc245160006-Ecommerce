const productService = require("../services/product.service");

// Lấy danh sách sản phẩm
async function getAllProducts(req, res, next) {
    try {
        const result = await productService.getProducts(req.query);

        res.status(200).json({
            success: true,
            count: result.products.length,
            pagination: result.pagination,
            data: result.products
        });
    } catch (error) {
        next(error);
    }
}

// Lấy chi tiết sản phẩm theo ID
async function getProductById(req, res, next) {
    try {
        const id = Number(req.params.id);

        const product = await productService.getProductById(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Khong tim thay san pham"
            });
        }

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getAllProducts,
    getProductById
};