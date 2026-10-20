const pool = require('../config/database');

function createAccountRepository(database = pool) {
    async function findProfile(userId) {
        const [rows] = await database.execute(
            `SELECT id, full_name, email, role, created_at FROM users
             WHERE id = ? AND is_active = TRUE LIMIT 1`, [userId]);
        return rows[0] || null;
    }

    async function findItems(userId, orderIds) {
        if (!orderIds.length) return [];
        const [rows] = await database.execute(
            `SELECT oi.order_id, oi.product_id, p.name AS product_name,
                    p.image_url, oi.quantity, oi.unit_price,
                    (oi.quantity * oi.unit_price) AS line_total
             FROM order_items oi
             INNER JOIN orders o ON o.id = oi.order_id
             INNER JOIN products p ON p.id = oi.product_id
             WHERE o.user_id = ? AND o.id IN (${orderIds.map(() => '?').join(',')})
             ORDER BY oi.id ASC`, [userId, ...orderIds]);
        return rows;
    }

    function attachItems(orders, items) {
        return orders.map(order => ({ ...order, items: items.filter(item => item.order_id === order.id) }));
    }

    return {
        findProfile,
        async updateProfile(userId, fullName) {
            await database.execute(
                'UPDATE users SET full_name = ? WHERE id = ? AND is_active = TRUE', [fullName, userId]);
            return findProfile(userId);
        },
        async listOrders(userId, { limit, offset }) {
            const [counts] = await database.execute(
                'SELECT COUNT(*) AS total FROM orders WHERE user_id = ?', [userId]);
            const [orders] = await database.execute(
                `SELECT id, customer_name, customer_phone, total_amount, status, created_at
                 FROM orders WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
                [userId, limit, offset]);
            const items = await findItems(userId, orders.map(order => order.id));
            return { orders: attachItems(orders, items), total: Number(counts[0].total) };
        },
        async findOrder(userId, orderId) {
            const [orders] = await database.execute(
                `SELECT id, customer_name, customer_phone, total_amount, status, created_at
                 FROM orders WHERE user_id = ? AND id = ? LIMIT 1`, [userId, orderId]);
            if (!orders.length) return null;
            return attachItems(orders, await findItems(userId, [orderId]))[0];
        }
    };
}

module.exports = { createAccountRepository };
