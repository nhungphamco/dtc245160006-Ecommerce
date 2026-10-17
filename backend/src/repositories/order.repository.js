const pool = require("../config/database");

async function createOrder({ customerName, customerPhone, items }) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Gom các ID và khóa theo thứ tự cố định
        // để giảm nguy cơ deadlock.
        const sortedItems = [...items].sort(
            (a, b) => a.productId - b.productId
        );

        const products = [];
        let totalAmount = 0;

        for (const item of sortedItems) {
            const [rows] = await connection.execute(
                `SELECT id, name, price, stock
                 FROM products
                 WHERE id = ?
                 FOR UPDATE`,
                [item.productId]
            );

            if (rows.length === 0) {
                const error = new Error(
                    `San pham ${item.productId} khong ton tai`
                );
                error.status = 404;
                throw error;
            }

            const product = rows[0];

            if (product.stock < item.quantity) {
                const error = new Error(
                    `San pham ${product.name} khong du ton kho`
                );
                error.status = 409;
                throw error;
            }

            // Giá demo đang tính bằng VND nguyên.
            // Decimal từ MySQL được chuyển sang Number
            // sau khi kiểm tra giới hạn an toàn.
            const price = Number(product.price);

            if (
                !Number.isSafeInteger(price) ||
                price < 0
            ) {
                throw new Error("Gia san pham khong hop le");
            }

            const lineTotal = price * item.quantity;

            if (
                !Number.isSafeInteger(lineTotal) ||
                !Number.isSafeInteger(totalAmount + lineTotal)
            ) {
                throw new Error("Tong gia tri don hang vuot gioi han");
            }

            totalAmount += lineTotal;

            products.push({
                productId: product.id,
                name: product.name,
                quantity: item.quantity,
                unitPrice: price
            });
        }

        const [orderResult] = await connection.execute(
            `INSERT INTO orders
             (customer_name, customer_phone, total_amount, status)
             VALUES (?, ?, ?, 'pending')`,
            [customerName, customerPhone, totalAmount]
        );

        const orderId = orderResult.insertId;

        for (const product of products) {
            await connection.execute(
                `INSERT INTO order_items
                 (order_id, product_id, quantity, unit_price)
                 VALUES (?, ?, ?, ?)`,
                [
                    orderId,
                    product.productId,
                    product.quantity,
                    product.unitPrice
                ]
            );

            const [updateResult] = await connection.execute(
                `UPDATE products
                 SET stock = stock - ?
                 WHERE id = ? AND stock >= ?`,
                [
                    product.quantity,
                    product.productId,
                    product.quantity
                ]
            );

            if (updateResult.affectedRows !== 1) {
                const error = new Error("Khong the cap nhat ton kho");
                error.status = 409;
                throw error;
            }
        }

        await connection.commit();

        return {
            orderId,
            status: "pending",
            totalAmount,
            items: products
        };
    } catch (error) {
        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error("Rollback failed:", rollbackError);
        }

        throw error;
    } finally {
        connection.release();
    }
}

module.exports = { createOrder };