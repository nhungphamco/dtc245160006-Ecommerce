const pool = require('../config/database');
const { TRANSITIONS, httpError } = require('../services/adminRules');
const PRODUCT_FIELDS = 'id, name, description, price, stock, image_url, is_active';
const ORDER_FIELDS = 'id, user_id, customer_name, customer_phone, total_amount, status, created_at';
const LOW_STOCK = 5;
const MAX_STOCK = 2147483647;

function createAdminRepository(database = pool) {
    async function transaction(work) {
        const connection = await database.getConnection();
        try {
            await connection.beginTransaction();
            const result = await work(connection);
            await connection.commit();
            return result;
        } catch (error) {
            try { await connection.rollback(); }
            catch { console.error('Admin transaction rollback failed'); }
            throw error;
        } finally { connection.release(); }
    }
    async function list(table, selected, where, params, order, { limit, offset }) {
        const [counts] = await database.execute(`SELECT COUNT(*) AS total FROM ${table} WHERE ${where}`, params);
        const [rows] = await database.query(`SELECT ${selected} FROM ${table} WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, limit, offset]);
        return { rows, total: Number(counts[0].total) };
    }
    // Treat wildcard characters literally in admin search, without SQL-mode-dependent backslashes.
    const like = value => `%${value.replace(/[!%_]/g, match => `!${match}`)}%`;
    async function findProduct(productId, connection = database) {
        const [rows] = await connection.execute(`SELECT ${PRODUCT_FIELDS} FROM products WHERE id = ?`, [productId]);
        return rows[0] || null;
    }
    return {
        findProduct,
        async dashboard() {
            return transaction(async connection => {
                const [[counts]] = await connection.execute(`SELECT COUNT(*) AS totalOrders,
                    COALESCE(SUM(status = 'pending'), 0) AS pendingOrders FROM orders`);
                const [[products]] = await connection.execute(`SELECT COALESCE(SUM(is_active = TRUE), 0) AS activeProducts,
                    COALESCE(SUM(is_active = TRUE AND stock <= ?), 0) AS lowStockProducts FROM products`, [LOW_STOCK]);
                const [byStatus] = await connection.execute(`SELECT status, COUNT(*) AS orderCount,
                    SUM(total_amount) AS orderValue FROM orders GROUP BY status ORDER BY status`);
                const [series] = await connection.execute(`SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day,
                    status, COUNT(*) AS orderCount, SUM(total_amount) AS orderValue
                    FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL 29 DAY
                    AND created_at < CURRENT_DATE + INTERVAL 1 DAY
                    GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d'), status ORDER BY day, status`);
                const [recentOrders] = await connection.execute(`SELECT ${ORDER_FIELDS} FROM orders ORDER BY created_at DESC, id DESC LIMIT 10`);
                const [lowStockProducts] = await connection.execute(`SELECT ${PRODUCT_FIELDS} FROM products
                    WHERE is_active = TRUE AND stock <= ? ORDER BY stock ASC, id ASC LIMIT 10`, [LOW_STOCK]);
                return { counts: { totalOrders: Number(counts.totalOrders), pendingOrders: Number(counts.pendingOrders), activeProducts: Number(products.activeProducts), lowStockProducts: Number(products.lowStockProducts) },
                    lowStockThreshold: LOW_STOCK, byStatus, series, seriesTimeBasis: 'database-session', recentOrders, lowStockProducts };
            });
        },
        listProducts(query) {
            let where = "name LIKE ? ESCAPE '!'";
            const params = [like(query.search)];
            if (query.status !== 'all') { where += ' AND is_active = ?'; params.push(query.status === 'active'); }
            if (query.lowStock) { where += ' AND stock <= ?'; params.push(LOW_STOCK); }
            const sorts = { newest: 'id DESC', name_asc: 'name ASC, id ASC', price_asc: 'price ASC, id ASC', price_desc: 'price DESC, id DESC', stock_asc: 'stock ASC, id ASC' };
            return list('products', PRODUCT_FIELDS, where, params, sorts[query.sort] || sorts.newest, query);
        },
        async createProduct(product) {
            const [result] = await database.execute(`INSERT INTO products (name, description, price, stock, image_url, is_active)
                VALUES (?, ?, ?, ?, ?, ?)`, [product.name, product.description ?? null, product.price, product.stock, product.image_url ?? null, product.is_active ?? true]);
            return findProduct(result.insertId);
        },
        async updateProduct(productId, patch) {
            return transaction(async connection => {
                const [rows] = await connection.execute(`SELECT ${PRODUCT_FIELDS} FROM products WHERE id = ? FOR UPDATE`, [productId]);
                if (!rows.length) throw httpError('Khong tim thay san pham', 404);
                if (patch.stock !== undefined && rows[0].stock !== patch.expectedStock) throw httpError('Ton kho da thay doi. Hay tai lai san pham', 409);
                const keys = ['name', 'description', 'price', 'stock', 'image_url', 'is_active'].filter(key => patch[key] !== undefined);
                await connection.execute(`UPDATE products SET ${keys.map(key => `${key} = ?`).join(', ')} WHERE id = ?`, [...keys.map(key => patch[key]), productId]);
                return findProduct(productId, connection);
            });
        },
        listOrders(query) {
            const search = like(query.search);
            let where = "(CAST(id AS CHAR) LIKE ? ESCAPE '!' OR customer_name LIKE ? ESCAPE '!' OR customer_phone LIKE ? ESCAPE '!')";
            const params = [search, search, search];
            if (query.status !== 'all') { where += ' AND status = ?'; params.push(query.status); }
            return list('orders', ORDER_FIELDS, where, params, 'created_at DESC, id DESC', query);
        },
        async findOrder(orderId) {
            const [rows] = await database.execute(`SELECT ${ORDER_FIELDS} FROM orders WHERE id = ?`, [orderId]);
            if (!rows.length) return null;
            const [items] = await database.execute(`SELECT oi.product_id, p.name AS product_name, p.image_url,
                oi.quantity, oi.unit_price, oi.quantity * oi.unit_price AS line_total
                FROM order_items oi INNER JOIN products p ON p.id = oi.product_id
                WHERE oi.order_id = ? ORDER BY oi.id ASC`, [orderId]);
            return { ...rows[0], items, allowedTransitions: TRANSITIONS[rows[0].status] || [] };
        },
        async updateOrderStatus(orderId, status, expectedStatus) {
            return transaction(async connection => {
                // Serializes transitions/cancellation for this order, including retries.
                const [rows] = await connection.execute(`SELECT ${ORDER_FIELDS} FROM orders WHERE id = ? FOR UPDATE`, [orderId]);
                if (!rows.length) throw httpError('Khong tim thay don hang', 404);
                const order = rows[0];
                if (order.status === status) return { order, changed: false, restocked: false };
                if (order.status !== expectedStatus) throw httpError('Trang thai da thay doi. Hay tai lai don hang', 409);
                if (!TRANSITIONS[order.status]?.includes(status)) throw httpError('Khong duoc chuyen trang thai nay', 409);
                if (status === 'cancelled') {
                    const [items] = await connection.execute('SELECT product_id, quantity FROM order_items WHERE order_id = ? ORDER BY product_id ASC FOR UPDATE', [orderId]);
                    const quantities = new Map();
                    for (const item of items) {
                        if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw Error('Invalid stored order quantity');
                        const quantity = (quantities.get(item.product_id) || 0) + item.quantity;
                        if (!Number.isSafeInteger(quantity) || quantity > MAX_STOCK) throw httpError('So luong hoan kho vuot gioi han', 409);
                        quantities.set(item.product_id, quantity);
                    }
                    // Same product lock ordering as checkout. Restore hidden products too.
                    for (const [productId, quantity] of [...quantities].sort((a, b) => a[0] - b[0])) {
                        const [products] = await connection.execute('SELECT id, stock FROM products WHERE id = ? FOR UPDATE', [productId]);
                        if (!products.length) throw httpError('Khong the hoan kho san pham', 409);
                        const stock = products[0].stock;
                        if (!Number.isSafeInteger(stock) || stock < 0 || stock + quantity > MAX_STOCK) throw httpError('Ton kho sau hoan vuot gioi han', 409);
                        const [updated] = await connection.execute('UPDATE products SET stock = stock + ? WHERE id = ? AND stock <= ?', [quantity, productId, MAX_STOCK - quantity]);
                        if (updated.affectedRows !== 1) throw httpError('Khong the hoan kho', 409);
                    }
                }
                const [updated] = await connection.execute('UPDATE orders SET status = ? WHERE id = ? AND status = ?', [status, orderId, order.status]);
                if (updated.affectedRows !== 1) throw httpError('Trang thai don hang da thay doi', 409);
                return { order: { ...order, status }, changed: true, restocked: status === 'cancelled' };
            });
        },
        listCustomers(query) {
            const search = like(query.search);
            return list('users u', `u.id, u.full_name, u.email, u.created_at, u.is_active,
                (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count`,
                "u.role = 'customer' AND (u.full_name LIKE ? ESCAPE '!' OR u.email LIKE ? ESCAPE '!')", [search, search], 'u.created_at DESC, u.id DESC', query);
        }
    };
}
module.exports = { createAdminRepository };
