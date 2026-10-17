const express = require("express");
const helmet = require("helmet");

const pool = require("./config/database");
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");

const app = express();

// Ẩn thông tin công nghệ Express
app.disable("x-powered-by");

// Cấu hình các HTTP Security Headers
app.use(helmet({
    // Tạm tắt HSTS khi môi trường chưa có HTTPS
    strictTransportSecurity: false
}));

// Cho phép nhận dữ liệu JSON từ frontend
app.use(express.json({ limit: "100kb" }));

// API kiểm tra trạng thái hệ thống
app.get("/api/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.status(200).json({
            status: "ok",
            database: "connected"
        });
    } catch (error) {
        console.error("Database healthcheck failed:", error.message);

        res.status(503).json({
            status: "unavailable"
        });
    }
});

// API quản lý sản phẩm
app.use("/api/products", productRoutes);

// API đặt hàng
app.use("/api/orders", orderRoutes);

// Xử lý đường dẫn API không tồn tại
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API khong ton tai"
    });
});

// Middleware xử lý lỗi
app.use((err, req, res, next) => {
    const status =
        Number.isInteger(err.status) &&
        err.status >= 400 &&
        err.status <= 599
            ? err.status
            : 500;

    if (status >= 500) {
        console.error("API error:", err);
    }

    res.status(status).json({
        success: false,
        message: status < 500
            ? err.message
            : "Loi he thong"
    });
});

// Khởi chạy server
const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, "0.0.0.0", () => {
    console.log(`MiniShop API listening on port ${PORT}`);
});