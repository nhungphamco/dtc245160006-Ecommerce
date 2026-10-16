const pool = require("../config/database");

async function findAll() {
    const [rows] = await pool.execute(
        "SELECT id, name, description, price, stock, image_url FROM products ORDER BY id DESC"
    );

    return rows;
}

module.exports = { findAll };