const pool = require("../config/database");

async function findAll({ search, sort, limit, offset }) {
    let sql = `
        SELECT id, name, description, price, stock, image_url
        FROM products
        WHERE name LIKE ?
    `;

    const searchValue = `%${search}%`;

    const sortOptions = {
        newest: "id DESC",
        price_asc: "price ASC, id ASC",
        price_desc: "price DESC, id DESC"
    };

    sql += ` ORDER BY ${sortOptions[sort] || sortOptions.newest}`;
    sql += " LIMIT ? OFFSET ?";

    const [rows] = await pool.query(
        sql,
        [searchValue, limit, offset]
    );

    const [[{ total }]] = await pool.execute(
        "SELECT COUNT(*) AS total FROM products WHERE name LIKE ?",
        [searchValue]
    );

    return { rows, total };
}

async function findById(id) {
    const [rows] = await pool.execute(
        `SELECT id, name, description, price, stock, image_url
         FROM products
         WHERE id = ?`,
        [id]
    );

    return rows[0] || null;
}

module.exports = { findAll, findById };