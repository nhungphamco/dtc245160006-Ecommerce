const orderService = require("../services/order.service");

// Xử lý yêu cầu tạo đơn hàng
async function createOrder(req, res, next) {
    try {
        // 1. Nhận dữ liệu đơn hàng từ frontend
        // 2. Gọi Service để kiểm tra và xử lý
        const result = await orderService.placeOrder(req.body);

        // 3. Trả kết quả khi đặt hàng thành công
        res.status(201).json({
            success: true,
            message: "Dat hang thanh cong",
            data: result
        });

    } catch (error) {
        // Chuyển lỗi đến middleware xử lý lỗi
        next(error);
    }
}

module.exports = {
    createOrder
};