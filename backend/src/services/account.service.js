const { createAccountRepository } = require('../repositories/account.repository');

function httpError(message, status = 400) {
    return Object.assign(new Error(message), { status });
}

function positiveInteger(value, fallback, max = Number.MAX_SAFE_INTEGER) {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) throw httpError('Tham so khong hop le');
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number > max) throw httpError('Tham so vuot gioi han');
    return number;
}

function publicProfile(user) {
    if (!user) throw httpError('Can dang nhap', 401);
    return { id: user.id, fullName: user.full_name, email: user.email, role: user.role, createdAt: user.created_at };
}

function createAccountService({ repository = createAccountRepository() } = {}) {
    return {
        async getProfile(userId) {
            return publicProfile(await repository.findProfile(userId));
        },
        async updateProfile(userId, body) {
            if (!body || typeof body !== 'object' || Array.isArray(body) ||
                Object.keys(body).some(key => key !== 'fullName') ||
                typeof body.fullName !== 'string') throw httpError('Chi duoc cap nhat ho ten');
            const name = body.fullName.trim();
            if (name.length < 2 || name.length > 100 || /[\u0000-\u001f\u007f]/.test(name)) {
                throw httpError('Ho ten phai co tu 2 den 100 ky tu va khong chua ky tu dieu khien');
            }
            return publicProfile(await repository.updateProfile(userId, name));
        },
        async listOrders(userId, query = {}) {
            const page = positiveInteger(query.page, 1);
            const pageSize = positiveInteger(query.pageSize, 10, 50);
            const offset = (page - 1) * pageSize;
            if (!Number.isSafeInteger(offset)) throw httpError('Trang vuot gioi han');
            const result = await repository.listOrders(userId, { limit: pageSize, offset });
            return { orders: result.orders, pagination: { page, pageSize, total: result.total, totalPages: Math.ceil(result.total / pageSize) } };
        },
        async getOrder(userId, id) {
            const orderId = positiveInteger(id);
            if (orderId === undefined) throw httpError('Ma don hang khong hop le');
            const order = await repository.findOrder(userId, orderId);
            if (!order) throw httpError('Khong tim thay don hang', 404);
            return order;
        }
    };
}

module.exports = { createAccountService };
