const express = require("express");
const router = express.Router();

const orderController = require("../controllers/order.controller");

// POST /api/orders
// Tiếp nhận yêu cầu đặt hàng từ frontend
router.post("/", orderController.createOrder);

module.exports = router;