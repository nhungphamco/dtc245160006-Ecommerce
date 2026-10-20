export function AccountIcon({ name, size = 20 }) {
    const paths = {
        overview: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
        profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
        orders: <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M8 8h8M8 12h6"/></>,
        logout: <><path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h12"/></>,
        arrow: <path d="m9 5 7 7-7 7"/>,
        bag: <><path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></>,
        check: <path d="m5 12 4 4L19 6"/>,
        alert: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16v1"/></>
    };
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.bag}</svg>;
}

export function AccountLoading() {
    return <div className="account-loading" role="status"><span className="account-sr">Đang tải thông tin tài khoản…</span><div className="account-skeleton account-skeleton--title"/><div className="account-skeleton"/><div className="account-skeleton"/></div>;
}

export function AccountError({ error, onRetry, onSignIn }) {
    return <div className="account-notice account-notice--error" role="alert"><AccountIcon name="alert"/><div><h3>{error.status === 401 ? 'Vui lòng đăng nhập lại' : 'Chưa thể tải thông tin'}</h3><p>{error.message}</p><button type="button" className="account-button account-button--secondary" onClick={error.status === 401 ? onSignIn : onRetry}>{error.status === 401 ? 'Đăng nhập lại' : 'Thử lại'}</button></div></div>;
}

export function AccountEmpty({ onShop }) {
    return <div className="account-empty"><span className="account-empty__icon"><AccountIcon name="bag" size={32}/></span><h3>Đơn hàng đầu tiên đang chờ bạn</h3><p>Những món gear bạn đặt khi đăng nhập sẽ xuất hiện ở đây.</p><button type="button" className="account-button" onClick={onShop}>Khám phá sản phẩm <AccountIcon name="arrow" size={16}/></button></div>;
}
