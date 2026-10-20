const BASE = '/api/admin';
const integer = value => Number.isSafeInteger(value) && value >= 0;
const amount = value => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value)) && Number(value) >= 0;
const flag = value => [0,1,false,true].includes(value);
const orderValid = value => value && integer(value.id) && value.id > 0 && typeof value.status === 'string' && typeof value.customer_name === 'string' && amount(value.total_amount);
const customerValid = value => value && integer(value.id) && typeof value.full_name === 'string' && typeof value.email === 'string' && flag(value.is_active) && amount(value.order_count);
const productValid = value => value && integer(value.id) && typeof value.name === 'string' && integer(value.stock) && amount(value.price) && flag(value.is_active);

export async function adminRequest(path, { method = 'GET', body, signal } = {}) {
    let response;
    try {
        response = await fetch(`${BASE}${path}`, {
            method, credentials: 'include', signal,
            ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        });
    } catch (cause) {
        if (cause.name === 'AbortError') throw cause;
        const error = new Error(method === 'GET' ? 'Không thể kết nối máy chủ. Vui lòng thử lại.' : 'Chưa nhận được xác nhận từ máy chủ. Kiểm tra dữ liệu trước khi gửi lại để tránh thao tác trùng.', { cause });
        error.uncertain = method !== 'GET';
        throw error;
    }
    let result;
    try { result = await response.json(); }
    catch (cause) {
        const error = new Error('Máy chủ trả về dữ liệu không hợp lệ.', { cause });
        error.status = response.status; error.uncertain = method !== 'GET'; throw error;
    }
    if (!response.ok || !result?.success) {
        const messages = { 400: 'Thông tin chưa hợp lệ. Kiểm tra các trường và giới hạn nhập.', 401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 403: 'Bạn không có quyền thực hiện yêu cầu này hoặc nguồn trang chưa được cho phép.', 404: 'Không tìm thấy dữ liệu hoặc API quản trị chưa được triển khai.', 409: 'Dữ liệu đã thay đổi hoặc thao tác không còn hợp lệ. Tải lại dữ liệu trước khi tiếp tục.', 429: 'Quá nhiều yêu cầu. Vui lòng chờ rồi thử lại.' };
        const uncertain = method !== 'GET' && response.status >= 500;
        const error = new Error(uncertain ? 'Máy chủ chưa xác nhận thao tác. Kiểm tra dữ liệu trước khi gửi lại.' : messages[response.status] || 'Dịch vụ quản trị chưa thể xử lý yêu cầu. Vui lòng thử lại sau.');
        error.uncertain = uncertain;
        error.status = response.status; throw error;
    }
    const data = result.data;
    let valid = !!data && typeof data === 'object';
    if (valid) {
        if (path === '/dashboard') valid = ['totalOrders','pendingOrders','activeProducts','lowStockProducts'].every(key => integer(data.counts?.[key])) && Array.isArray(data.byStatus) && data.byStatus.every(row => row && typeof row.status === 'string' && amount(row.orderCount) && amount(row.orderValue)) && Array.isArray(data.series) && data.series.every(row => row && typeof row.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.day) && amount(row.orderCount)) && Array.isArray(data.recentOrders) && data.recentOrders.every(orderValid) && Array.isArray(data.lowStockProducts) && data.lowStockProducts.every(productValid) && integer(data.lowStockThreshold);
        else if (method === 'GET' && path.includes('?')) {
            const rowValid = path.startsWith('/products?') ? productValid : path.startsWith('/orders?') ? orderValid : customerValid;
            valid = Array.isArray(data.rows) && data.rows.every(rowValid) && ['page','limit','total','totalPages'].every(key => integer(data.pagination?.[key]));
        } else if (path === '/products' || path.startsWith('/products/')) valid = productValid(data.product);
        else if (path.endsWith('/status')) valid = integer(data.order?.id) && typeof data.changed === 'boolean' && typeof data.restocked === 'boolean';
        else if (path.startsWith('/orders/')) valid = orderValid(data.order) && Array.isArray(data.order.items) && data.order.items.every(item => item && integer(item.product_id) && integer(item.quantity) && amount(item.unit_price) && amount(item.line_total)) && Array.isArray(data.order.allowedTransitions);
    }
    if (!valid) {
        const error = new Error(method === 'GET' ? 'Dữ liệu quản trị chưa đầy đủ. Vui lòng tải lại.' : 'Chưa nhận được xác nhận đầy đủ. Kiểm tra dữ liệu trước khi gửi lại.');
        error.uncertain = method !== 'GET';
        throw error;
    }
    return data;
}

export function productPayload(values, original) {
    const name = values.name.trim();
    const price = Number(values.price), stock = Number(values.stock);
    if (!name || name.length > 150 || Array.from(name).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) throw new Error('Tên sản phẩm cần từ 1–150 ký tự, không chứa ký tự điều khiển.');
    if (!String(values.price).trim() || !Number.isSafeInteger(price) || price < 0 || price > 9999999999) throw new Error('Giá cần là số nguyên VND từ 0 đến 9.999.999.999.');
    if (!String(values.stock).trim() || !Number.isSafeInteger(stock) || stock < 0 || stock > 2147483647) throw new Error('Tồn kho cần là số nguyên từ 0 đến 2.147.483.647.');
    if (values.description.length > 10000 || Array.from(values.description).some(c => (c.charCodeAt(0) < 32 && !['\t','\n','\r'].includes(c)) || c.charCodeAt(0) === 127)) throw new Error('Mô tả tối đa 10.000 ký tự.');
    const image = values.image_url.trim();
    if (image) {
        let url;
        try { url = new URL(image); } catch { throw new Error('Đường dẫn ảnh chưa hợp lệ.'); }
        if (image.length > 500 || !['http:','https:'].includes(url.protocol) || url.username || url.password) throw new Error('Ảnh cần là URL HTTP(S), tối đa 500 ký tự, không chứa thông tin đăng nhập.');
    }
    const normalized = { name, price, stock, description: values.description.trim() || null, image_url: image || null, is_active: values.is_active };
    if (!original) return normalized;
    const payload = {};
    for (const [key, value] of Object.entries(normalized)) {
        const previous = ['price','stock'].includes(key) ? Number(original[key]) : key === 'is_active' ? Boolean(original[key]) : original[key] || null;
        if (value !== previous) payload[key] = value;
    }
    if ('stock' in payload) payload.expectedStock = original.stock;
    if (!Object.keys(payload).length) throw new Error('Bạn chưa thay đổi thông tin sản phẩm.');
    return payload;
}
