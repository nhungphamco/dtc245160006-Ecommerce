const { createAdminRepository } = require('../repositories/admin.repository');
const { STATUSES, httpError } = require('./adminRules');
const MAX_STOCK = 2147483647;
const MAX_PRICE = 9999999999; // DECIMAL(12,2), whole VND to preserve checkout arithmetic.

function object(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw httpError('Du lieu khong hop le');
}
function fields(value, allowed) {
    object(value);
    if (Object.keys(value).some(key => !allowed.includes(key))) throw httpError('Truong du lieu khong duoc phep');
}
function text(value, min, max) {
    if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max || /[\u0000-\u001f\u007f]/.test(value)) throw httpError('Noi dung van ban khong hop le');
    return value.trim();
}
function integer(value, min, max) {
    if (!Number.isSafeInteger(value) || value < min || value > max) throw httpError('Gia tri so khong hop le');
    return value;
}
function id(value) {
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) throw httpError('ID khong hop le');
    return integer(Number(value), 1, 2147483647);
}
function choice(value, options, fallback) {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !options.includes(value)) throw httpError('Bo loc khong hop le');
    return value;
}
function pagination(query) {
    const page = query.page === undefined ? 1 : id(query.page);
    const limit = query.limit === undefined ? 20 : integer(id(query.limit), 1, 50);
    if (page > 10000) throw httpError('Trang vuot gioi han');
    return { page, limit, offset: (page - 1) * limit };
}
function listQuery(query, extra) {
    fields(query, ['search', 'page', 'limit', ...extra]);
    return { ...pagination(query), search: query.search === undefined ? '' : text(query.search, 0, 100) };
}
function productBody(body, create) {
    fields(body, ['name', 'description', 'price', 'stock', 'image_url', 'is_active', ...(create ? [] : ['expectedStock'])]);
    const result = {};
    for (const key of ['name', 'price', 'stock']) {
        if (create && body[key] === undefined) throw httpError('Thieu thong tin san pham');
    }
    if (body.name !== undefined) result.name = text(body.name, 1, 150);
    if (body.description !== undefined) {
        if (body.description === null) result.description = null;
        else {
            if (typeof body.description !== 'string' || body.description.length > 10000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body.description)) throw httpError('Mo ta khong hop le');
            result.description = body.description.trim();
        }
    }
    if (body.price !== undefined) result.price = integer(body.price, 0, MAX_PRICE);
    if (body.stock !== undefined) {
        result.stock = integer(body.stock, 0, MAX_STOCK);
        if (!create) result.expectedStock = integer(body.expectedStock, 0, MAX_STOCK);
    } else if (body.expectedStock !== undefined) throw httpError('expectedStock phai di kem stock');
    if (body.image_url !== undefined) {
        if (body.image_url === null || body.image_url === '') result.image_url = null;
        else {
            const url = text(body.image_url, 1, 500);
            let parsed;
            try { parsed = new URL(url); } catch { throw httpError('URL hinh anh khong hop le'); }
            if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw httpError('URL hinh anh khong hop le');
            result.image_url = url;
        }
    }
    if (body.is_active !== undefined) {
        if (typeof body.is_active !== 'boolean') throw httpError('Trang thai kinh doanh khong hop le');
        result.is_active = body.is_active;
    }
    if (!Object.keys(result).length) throw httpError('Khong co thong tin cap nhat');
    return result;
}
function createAdminService({ repository = createAdminRepository() } = {}) {
    const paginate = async (query, action) => {
        const { rows, total } = await action(query);
        return { rows, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
    };
    return {
        dashboard: () => repository.dashboard(),
        products(query) {
            const q = listQuery(query, ['status', 'sort', 'lowStock']);
            q.status = choice(query.status, ['all', 'active', 'inactive'], 'all');
            q.sort = choice(query.sort, ['newest', 'name_asc', 'price_asc', 'price_desc', 'stock_asc'], 'newest');
            q.lowStock = choice(query.lowStock, ['true', 'false'], 'false') === 'true';
            return paginate(q, value => repository.listProducts(value));
        },
        async product(productId) {
            const product = await repository.findProduct(id(productId));
            if (!product) throw httpError('Khong tim thay san pham', 404);
            return product;
        },
        createProduct(body) { return repository.createProduct(productBody(body, true)); },
        updateProduct(productId, body) { return repository.updateProduct(id(productId), productBody(body, false)); },
        orders(query) {
            const q = listQuery(query, ['status']);
            q.status = choice(query.status, ['all', ...STATUSES], 'all');
            return paginate(q, value => repository.listOrders(value));
        },
        async order(orderId) {
            const order = await repository.findOrder(id(orderId));
            if (!order) throw httpError('Khong tim thay don hang', 404);
            return order;
        },
        updateOrderStatus(orderId, body) {
            fields(body, ['status', 'expectedStatus']);
            if (!STATUSES.includes(body.status) || !STATUSES.includes(body.expectedStatus)) throw httpError('Trang thai don hang khong hop le');
            return repository.updateOrderStatus(id(orderId), body.status, body.expectedStatus);
        },
        customers(query) {
            const q = listQuery(query, []);
            return paginate(q, value => repository.listCustomers(value));
        }
    };
}
module.exports = { createAdminService };
