const productService = require("../services/product.service");

async function getAllProducts(req, res, next) {
    try {
        const products = await productService.getProducts();

        res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        next(error);
    }
}

module.exports = { getAllProducts };