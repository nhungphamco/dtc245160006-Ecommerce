import { useEffect, useRef, useState } from 'react';
import { useAccountResource } from '../context/useAccountResource';
import { useAuth } from '../context/useAuth';
import { accountRequest } from '../services/accountApi';
import { AccountEmpty, AccountError, AccountIcon, AccountLoading } from '../components/AccountUI';
import AccountOrderCard from '../components/AccountOrderCard';
import ProductVisual from '../components/ProductVisual';
import { dateTime, money, orderStatus } from '../components/accountFormat';
import './Account.css';

function ProfileForm({ profile, onSaved, onSignIn }) {
    const [name, setName] = useState(profile.fullName);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [savedName, setSavedName] = useState(profile.fullName);
    const [success, setSuccess] = useState(false);
    const { refreshSession } = useAuth();
    const dirty = name.trim() !== savedName;
    async function submit(event) {
        event.preventDefault();
        if (saving || !dirty) return;
        const normalized = name.trim();
        if (normalized.length < 2 || normalized.length > 100 || Array.from(normalized).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) {
            setError(new Error('Họ tên cần có từ 2–100 ký tự, không chứa ký tự điều khiển.'));
            return;
        }
        setSaving(true); setError(null); setSuccess(false);
        try {
            const { user } = await accountRequest('/profile', { fullName: normalized });
            setSavedName(user.fullName); setName(user.fullName); setSuccess(true); onSaved(user);
            await refreshSession();
        } catch (failure) { setError(failure); }
        finally { setSaving(false); }
    }
    return <section className="account-panel"><div className="account-panel__heading"><div><h2>Thông tin cá nhân</h2><p>Thông tin cơ bản cho trải nghiệm mua sắm của bạn.</p></div><AccountIcon name="profile"/></div>
        <form className="account-profile-form" onSubmit={submit} aria-busy={saving}>
            <div className="account-field"><label htmlFor="profile-name">Họ và tên <span>Có thể chỉnh sửa</span></label><input id="profile-name" name="fullName" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={e => { setName(e.target.value); setSuccess(false); setError(null); }} disabled={saving} aria-describedby="profile-name-help"/><small id="profile-name-help">Sử dụng từ 2–100 ký tự.</small></div>
            <div className="account-field"><label htmlFor="profile-email">Địa chỉ email <span>Chỉ đọc</span></label><input id="profile-email" type="email" value={profile.email} readOnly/><small>Email đăng nhập của tài khoản.</small></div>
            <div className="account-profile-meta"><span>Ngày tạo tài khoản</span><strong>{dateTime(profile.createdAt)}</strong></div>
            {error && <div className="account-inline-error" role="alert"><p>{error.message}</p>{error.status === 401 && <button className="account-link" type="button" onClick={onSignIn}>Đăng nhập lại</button>}</div>}
            {success && <p className="account-save-success" role="status"><AccountIcon name="check" size={18}/> Đã lưu thông tin cá nhân.</p>}
            <div className="account-form-actions"><button type="submit" className="account-button" disabled={saving || !dirty}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button><p>Email và ngày tạo tài khoản không thể chỉnh sửa.</p></div>
        </form>
    </section>;
}

function Overview({ profile, onNavigate, onDetail, onShop, onSignIn }) {
    const resource = useAccountResource('/orders?page=1&pageSize=1');
    return <>
        <div className="account-welcome"><p className="section-label">KHÔNG GIAN CỦA BẠN</p><h1>Xin chào, {profile.fullName}.</h1><p>Quản lý thông tin cá nhân và theo dõi những đơn hàng của bạn tại MiniShop.</p></div>
        <div className="account-overview-grid"><section className="account-stat"><span className="account-stat__icon"><AccountIcon name="orders"/></span><div><span>Tổng số đơn hàng</span><strong>{resource.loading ? '…' : resource.error ? '—' : resource.data.pagination.total}</strong></div><button type="button" className="account-link" onClick={() => onNavigate('orders')}>Xem đơn mua <AccountIcon name="arrow" size={14}/></button></section><section className="account-stat"><span className="account-stat__icon"><AccountIcon name="profile"/></span><div><span>Thành viên từ</span><strong className="account-stat__date">{dateTime(profile.createdAt)}</strong></div><button type="button" className="account-link" onClick={() => onNavigate('profile')}>Cập nhật hồ sơ <AccountIcon name="arrow" size={14}/></button></section></div>
        <div className="account-section-heading"><h2>Đơn hàng gần nhất</h2><button className="account-link" type="button" onClick={() => onNavigate('orders')}>Tất cả đơn hàng <AccountIcon name="arrow" size={14}/></button></div>
        {resource.loading ? <AccountLoading/> : resource.error ? <AccountError error={resource.error} onRetry={resource.retry} onSignIn={onSignIn}/> : resource.data.orders.length ? <AccountOrderCard order={resource.data.orders[0]} onDetail={onDetail}/> : <AccountEmpty onShop={onShop}/>}
        <div className="account-note"><AccountIcon name="bag"/><p>Tiếp tục tìm cảm hứng cho góc setup của bạn.</p><button type="button" className="account-link" onClick={onShop}>Khám phá sản phẩm <AccountIcon name="arrow" size={14}/></button></div>
    </>;
}

function OrderHistory({ page, onPage, onDetail, onShop, onSignIn }) {
    const resource = useAccountResource(`/orders?page=${page}&pageSize=5`);
    return <><div className="account-page-heading"><p className="section-label">LỊCH SỬ MUA SẮM</p><h1>Đơn mua của tôi</h1><p>Thông tin đơn hàng được cập nhật từ MiniShop.</p></div>
        {resource.loading ? <AccountLoading/> : resource.error ? <AccountError error={resource.error} onRetry={resource.retry} onSignIn={onSignIn}/> : <>
            <div className="account-list-heading"><span>{resource.data.pagination.total} đơn hàng</span><button type="button" className="account-link" onClick={resource.retry}>Cập nhật lại</button></div>
            {resource.data.orders.length ? <div className="account-order-list">{resource.data.orders.map(order => <AccountOrderCard key={order.id} order={order} onDetail={onDetail}/>)}</div> : page > 1 ? <div className="account-empty"><h2>Trang này chưa có đơn hàng</h2><button type="button" className="account-button" onClick={() => onPage(1)}>Về trang đầu</button></div> : <AccountEmpty onShop={onShop}/>}
            {resource.data.pagination.totalPages > 1 && <nav className="account-pagination" aria-label="Phân trang đơn hàng"><button type="button" className="account-button account-button--secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Trước</button><span aria-live="polite">Trang {page} / {resource.data.pagination.totalPages}</span><button type="button" className="account-button account-button--secondary" disabled={page >= resource.data.pagination.totalPages} onClick={() => onPage(page + 1)}>Tiếp</button></nav>}
        </>}
    </>;
}

function OrderDetail({ id, onBack, onSignIn }) {
    const resource = useAccountResource(`/orders/${id}`);
    const order = resource.data?.order;
    return <><button type="button" className="account-link account-detail-back" onClick={onBack}>← Quay lại đơn mua</button>
        {resource.loading ? <AccountLoading/> : resource.error ? <AccountError error={resource.error} onRetry={resource.retry} onSignIn={onSignIn}/> : <>
            <div className="account-detail-heading"><div><p className="section-label">CHI TIẾT ĐƠN HÀNG</p><h1>Đơn hàng #{order.id}</h1><p>Đặt lúc <time>{dateTime(order.created_at)}</time></p></div><span className="account-status">{orderStatus(order.status)}</span></div>
            <section className="account-panel account-detail-products"><h2>Sản phẩm trong đơn</h2><ul>{order.items.map((item, index) => <li key={`${item.product_id}-${index}`}><div className="account-product-image"><ProductVisual name={item.product_name || `Sản phẩm #${item.product_id}`} imageUrl={item.image_url}/></div><div className="account-detail-product-info"><h3>{item.product_name || `Sản phẩm #${item.product_id}`}</h3><p>Đơn giá: {money(item.unit_price)}</p><span>Số lượng: {item.quantity}</span></div><strong>{money(item.line_total ?? Number(item.unit_price) * item.quantity)}</strong></li>)}</ul><div className="account-detail-total"><span>Tổng tiền đơn hàng</span><strong>{money(order.total_amount)}</strong></div></section>
            <section className="account-panel"><div className="account-panel__heading"><h2>Thông tin khách hàng</h2><AccountIcon name="profile"/></div><dl className="account-customer-details"><div><dt>Họ và tên người đặt</dt><dd>{order.customer_name || 'Chưa có thông tin'}</dd></div><div><dt>Số điện thoại</dt><dd>{order.customer_phone || 'Chưa có thông tin'}</dd></div></dl><p className="account-caption">Thông tin được ghi nhận tại thời điểm đặt hàng.</p></section>
        </>}
    </>;
}

export default function Account({ onShop, onSignIn, onLogout }) {
    const { user } = useAuth();
    const resource = useAccountResource('/profile');
    const [savedProfile, setSavedProfile] = useState(null);
    const contentRef = useRef(null);
    const [view, setView] = useState('overview');
    const [orderId, setOrderId] = useState(null);
    const [page, setPage] = useState(1);
    const [logoutBusy, setLogoutBusy] = useState(false);
    const [logoutError, setLogoutError] = useState('');
    useEffect(() => { contentRef.current?.focus({ preventScroll: true }); }, [view, page]);
    const profile = savedProfile || resource.data?.user;
    const name = profile?.fullName || user.fullName;
    const initials = name.trim().split(/\s+/).slice(-2).map(word => word[0]).join('').toUpperCase();
    function navigate(next) { setView(next); window.scrollTo(0, 0); }
    async function signOut() {
        setLogoutBusy(true); setLogoutError('');
        try { await onLogout(); } catch (error) { setLogoutError(error.message); }
        finally { setLogoutBusy(false); }
    }
    return <main id="main-content" className="home account-page"><div className="account-breadcrumb"><button type="button" onClick={onShop}>Trang chủ</button><AccountIcon name="arrow" size={12}/><span>Tài khoản của tôi</span></div><div className="account-layout">
        <aside className="account-sidebar" aria-label="Tài khoản khách hàng"><div className="account-identity"><span className="account-avatar" aria-hidden="true">{initials}</span><div><strong>{name}</strong><p>{profile?.email || user.email}</p></div></div><nav aria-label="Điều hướng tài khoản">{[['overview','Tổng quan tài khoản'],['profile','Hồ sơ cá nhân'],['orders','Đơn mua của tôi']].map(([key, label]) => <button type="button" key={key} aria-current={(view === key || (view === 'detail' && key === 'orders')) ? 'page' : undefined} onClick={() => navigate(key)}><AccountIcon name={key}/><span>{label}</span><AccountIcon name="arrow" size={14}/></button>)}</nav><div className="account-sidebar__bottom"><button type="button" className="account-logout" onClick={signOut} disabled={logoutBusy}><AccountIcon name="logout"/>{logoutBusy ? 'Đang đăng xuất…' : 'Đăng xuất'}</button>{logoutError && <p className="account-inline-error" role="alert">{logoutError}</p>}<span>MINISHOP / YOUR EVERYDAY UPGRADE</span></div></aside>
        <div className="account-content" key={user.id} ref={contentRef} tabIndex={-1}>
            {resource.loading ? <AccountLoading/> : resource.error ? <AccountError error={resource.error} onRetry={resource.retry} onSignIn={onSignIn}/> : <>
                {view === 'overview' && <Overview profile={profile} onNavigate={navigate} onDetail={id => { setOrderId(id); navigate('detail'); }} onShop={onShop} onSignIn={onSignIn}/>}
                {view === 'profile' && <><div className="account-page-heading"><p className="section-label">HỒ SƠ CỦA BẠN</p><h1>Hồ sơ cá nhân</h1><p>Một chút thông tin, trải nghiệm trọn vẹn hơn.</p></div><ProfileForm profile={profile} onSaved={setSavedProfile} onSignIn={onSignIn}/></>}
                {view === 'orders' && <OrderHistory page={page} onPage={next => { setPage(next); window.scrollTo(0, 0); }} onDetail={id => { setOrderId(id); navigate('detail'); }} onShop={onShop} onSignIn={onSignIn}/>}
                {view === 'detail' && <OrderDetail id={orderId} onBack={() => navigate('orders')} onSignIn={onSignIn}/>}
            </>}
        </div>
    </div></main>;
}
