const BASE = '/api/account';
const validMoney = value => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value)) && Number(value) >= 0;
const validOrder = order => order && Number.isSafeInteger(order.id) && order.id > 0 && validMoney(order.total_amount) && Array.isArray(order.items) && order.items.every(item => item && Number.isSafeInteger(item.product_id) && Number.isSafeInteger(item.quantity) && item.quantity > 0 && validMoney(item.unit_price));

export async function accountRequest(path, { signal, fullName } = {}) {
    let response;
    try {
        response = await fetch(`${BASE}${path}`, {
            credentials: 'include',
            signal,
            ...(fullName === undefined ? {} : {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName })
            })
        });
    } catch (error) {
        if (error.name === 'AbortError') throw error;
        throw new Error('Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.', { cause: error });
    }
    let result;
    try { result = await response.json(); }
    catch {
        const error = new Error('Máy chủ trả về dữ liệu không hợp lệ. Vui lòng thử lại sau.');
        error.status = response.status;
        throw error;
    }
    if (!response.ok || !result?.success) {
        const messages = {
            400: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.',
            401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
            403: 'Yêu cầu bị từ chối. Vui lòng mở đúng địa chỉ MiniShop được cho phép.',
            404: 'Không tìm thấy thông tin này hoặc bạn không có quyền truy cập.',
            429: 'Có quá nhiều yêu cầu. Vui lòng chờ một lúc rồi thử lại.'
        };
        const error = new Error(messages[response.status] || 'Không thể tải dữ liệu tài khoản. Vui lòng thử lại sau.');
        error.status = response.status;
        throw error;
    }
    const data = result.data;
    const valid = path === '/profile' ? data?.user && Number.isSafeInteger(data.user.id) && typeof data.user.fullName === 'string' && typeof data.user.email === 'string'
        : path.startsWith('/orders?') ? Array.isArray(data?.orders) && data.orders.every(validOrder) && Number.isSafeInteger(data?.pagination?.total) && data.pagination.total >= 0 && Number.isSafeInteger(data.pagination.totalPages) && data.pagination.totalPages >= 0
        : validOrder(data?.order);
    if (!valid) throw new Error('Dữ liệu tài khoản chưa đầy đủ. Vui lòng thử lại sau.');
    return data;
}
