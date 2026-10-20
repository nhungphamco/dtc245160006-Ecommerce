const { createApp } = require("./app");

const app = createApp();

// Khởi chạy server
const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, "0.0.0.0", () => {
    console.log(`MiniShop API listening on port ${PORT}`);
});