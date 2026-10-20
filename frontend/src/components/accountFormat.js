const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
export const money = value => value === null || value === undefined || !Number.isFinite(Number(value)) ? 'Chưa có thông tin' : currency.format(Number(value));
export function dateTime(value) {
    if (!value) return 'Chưa có thông tin';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Chưa có thông tin' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
export function orderStatus(value) {
    // Only translate actual order status. Do not infer payment or shipping progress.
    return { pending: 'Chờ xử lý', processing: 'Đang xử lý', completed: 'Hoàn tất', cancelled: 'Đã hủy' }[value] || value || 'Chưa có thông tin';
}
