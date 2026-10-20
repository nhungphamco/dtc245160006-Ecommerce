import { statuses } from './adminConstants';
import { useEffect, useId, useRef } from 'react';
export function Icon({ name, size = 20 }) {
    const paths = {
        dashboard: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
        products: <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9M7 5.8l9 5"/></>,
        orders: <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M8 8h8M8 12h6"/></>,
        customers: <><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5"/></>,
        store: <><path d="M3 10h18l-2-7H5l-2 7ZM5 10v11h14V10M10 21v-7h4v7"/></>,
        logout: <><path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h12"/></>,
        plus: <path d="M12 5v14M5 12h14"/>,
        arrow: <path d="m9 5 7 7-7 7"/>,
        close: <path d="m6 6 12 12M6 18 18 6"/>,
        alert: <><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5M12 17v1"/></>,
        check: <path d="m5 12 4 4L19 6"/>,
        search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,
        chart: <path d="M4 3v18h17M8 16l4-6 4 3 5-8"/>
    };
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.products}</svg>;
}
export function Badge({ status, children, muted }) { return <span className={`ad-badge ${status ? `ad-badge--${status in statuses ? status : 'unknown'}` : ''} ${muted ? 'ad-badge--muted' : ''}`}>{children || statuses[status] || status}</span>; }
export function Button({ children, secondary, danger, className = '', ...props }) { return <button type="button" className={`ad-button ${secondary ? 'ad-button--secondary' : ''} ${danger ? 'ad-button--danger' : ''} ${className}`} {...props}>{children}</button>; }
export function Loading() { return <div className="ad-loading" role="status"><span className="ad-sr">Đang tải dữ liệu quản trị…</span><div/><div/><div/></div>; }
export function ErrorState({ error, retry, onSignIn, onShop }) { return <div className="ad-error" role="alert"><Icon name="alert"/><div><h2>{error.status === 403 ? 'Không có quyền truy cập' : error.status === 401 ? 'Vui lòng đăng nhập lại' : 'Chưa thể tải thông tin'}</h2><p>{error.message}</p><Button secondary onClick={error.status === 401 ? onSignIn : error.status === 403 ? onShop : retry}>{error.status === 401 ? 'Đăng nhập lại' : error.status === 403 ? 'Về cửa hàng' : 'Thử lại'}</Button></div></div>; }
export function Empty({ title = 'Chưa có dữ liệu phù hợp', children }) { return <div className="ad-empty"><Icon name="products" size={30}/><h3>{title}</h3><p>{children || 'Thử thay đổi từ khóa hoặc bộ lọc.'}</p></div>; }
export function Pagination({ pagination, onPage }) { return pagination.totalPages > 1 && <nav className="ad-pagination" aria-label="Phân trang"><span>{pagination.total} kết quả · Trang {pagination.page}/{pagination.totalPages}</span><div><Button secondary disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>Trước</Button><Button secondary disabled={pagination.page >= pagination.totalPages} onClick={() => onPage(pagination.page + 1)}>Tiếp</Button></div></nav>; }
export function Resource({ resource, children, ...actions }) { return resource.loading ? <Loading/> : resource.error ? <ErrorState error={resource.error} retry={resource.retry} {...actions}/> : children(resource.data); }
export function Modal({ title, onClose, busy, children }) {
    const ref = useRef(null);
    const id = useId();
    useEffect(() => { const previous = document.activeElement; const dialog = ref.current; dialog.showModal(); return () => { dialog.close(); if (previous?.isConnected) previous.focus(); }; }, []);
    return <dialog className="ad-modal" ref={ref} aria-labelledby={id} aria-busy={busy || false} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}><div className="ad-modal__heading"><h2 id={id}>{title}</h2><button type="button" className="ad-icon-button" aria-label="Đóng hộp thoại" disabled={busy} onClick={onClose}><Icon name="close"/></button></div>{children}</dialog>;
}
export function Search({ onSearch, placeholder, initial = '' }) { return <form className="ad-search" onSubmit={event => { event.preventDefault(); onSearch(new FormData(event.currentTarget).get('search').trim()); }}><Icon name="search" size={18}/><input name="search" aria-label={placeholder} placeholder={placeholder} maxLength={100} defaultValue={initial}/><Button secondary type="submit">Tìm</Button></form>; }
