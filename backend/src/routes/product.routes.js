const express = require("express");
const router = express.Router();

const productController = require("../controllers/product.controller");

// GET /api/products
// Lấy danh sách sản phẩm, hỗ trợ tìm kiếm và phân trang
router.get("/", productController.getAllProducts);

// GET /api/products/:id
// Lấy thông tin chi tiết một sản phẩm
router.get("/:id", productController.getProductById);

module.exports = router;