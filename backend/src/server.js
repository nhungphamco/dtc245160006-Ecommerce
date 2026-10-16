const express = require("express");
const helmet = require("helmet");
const pool = require("./config/database");
const productRoutes = require("./routes/product.routes");

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.json({
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

app.use("/api/products", productRoutes);

app.use((err, req, res, next) => {
    console.error("API error:", err);

    res.status(500).json({
        success: false,
        message: "Loi he thong"
    });
});

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, "0.0.0.0", () => {
    console.log(`MiniShop API listening on port ${PORT}`);
});