const orderRepository = require("../repositories/order.repository");

// Tạo lỗi HTTP với mã trạng thái phù hợp
function createHttpError(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
}

// Kiểm tra dữ liệu và xử lý yêu cầu đặt hàng
async function placeOrder(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw createHttpError("Du lieu don hang khong hop le");
    }

    const { customer_name, customer_phone, items } = body;

    // 1. Kiểm tra tên khách hàng
    if (
        typeof customer_name !== "string" ||
        customer_name.trim().length < 2 ||
        customer_name.trim().length > 100
    ) {
        throw createHttpError("Ten khach hang khong hop le");
    }

    // 2. Kiểm tra số điện thoại
    if (
        typeof customer_phone !== "string" ||
        !/^0[0-9]{9}$/.test(customer_phone.trim())
    ) {
        throw createHttpError("So dien thoai khong hop le");
    }

    // 3. Kiểm tra giỏ hàng
    if (
        !Array.isArray(items) ||
        items.length < 1 ||
        items.length > 50
    ) {
        throw createHttpError("Gio hang phai co tu 1 den 50 san pham");
    }

    const normalizedItems = [];
    const productIds = new Set();

    // 4. Kiểm tra từng sản phẩm
    for (const item of items) {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
            throw createHttpError("San pham trong gio khong hop le");
        }

        const productId = item.product_id;
        const quantity = item.quantity;

        if (
            !Number.isSafeInteger(productId) ||
            productId <= 0 ||
            !Number.isSafeInteger(quantity) ||
            quantity < 1 ||
            quantity > 100
        ) {
            throw createHttpError("ID hoac so luong san pham khong hop le");
        }

        if (productIds.has(productId)) {
            throw createHttpError("San pham bi trung trong gio hang");
        }

        productIds.add(productId);

        normalizedItems.push({
            productId,
            quantity
        });
    }

    // 5. Chuyển dữ liệu hợp lệ xuống Repository
    return await orderRepository.createOrder({
        customerName: customer_name.trim(),
        customerPhone: customer_phone.trim(),
        items: normalizedItems
    });
}

module.exports = { placeOrder };