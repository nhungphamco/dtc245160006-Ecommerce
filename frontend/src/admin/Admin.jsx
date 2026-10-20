import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/useAuth';
import AdminDashboard from './AdminDashboard';
import AdminProducts from './AdminProducts';
import AdminOrders, { AdminOrderDetail } from './AdminOrders';
import AdminCustomers from './AdminCustomers';
import { Button, Icon } from './AdminUI';
import './Admin.css';
const titles={dashboard:'Tổng quan',products:'Sản phẩm',orders:'Đơn hàng',customers:'Khách hàng',detail:'Chi tiết đơn hàng'};
export default function Admin({ onShop, onSignIn, onLogout }) {
    const { user }=useAuth();
    const [view,setView]=useState('dashboard');
    const [orderId,setOrderId]=useState(null);
    const [orderQuery,setOrderQuery]=useState({search:'',status:'all',page:1});
    const [toast,setToast]=useState(null);
    const [logoutBusy,setLogoutBusy]=useState(false);
    const [logoutError,setLogoutError]=useState('');
    const content=useRef(null);
    useEffect(()=>{content.current?.focus({preventScroll:true});},[view,orderId]);
    useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(null),6000);return()=>clearTimeout(timer);},[toast]);
    const navigate=next=>{setView(next);window.scrollTo(0,0);};
    const detail=id=>{setOrderId(id);navigate('detail');};
    const actions={onShop,onSignIn};
    const notify=message=>setToast({message,key:Date.now()});
    async function logout(){setLogoutBusy(true);setLogoutError('');try{await onLogout();}catch(error){setLogoutError(error.message);}finally{setLogoutBusy(false);}}
    return <div className="ad-shell"><a className="skip-link" href="#admin-main">Đến nội dung quản trị</a><aside className="ad-sidebar"><button type="button" className="ad-brand" onClick={()=>navigate('dashboard')}>MiniShop<span>.</span><small>ADMIN WORKSPACE</small></button><p className="ad-sidebar-label">QUẢN LÝ CỬA HÀNG</p><nav aria-label="Điều hướng quản trị">{['dashboard','products','orders','customers'].map(key=><button type="button" key={key} aria-current={(view===key||(view==='detail'&&key==='orders'))?'page':undefined} onClick={()=>navigate(key)}><Icon name={key}/><span>{titles[key]}</span><Icon name="arrow" size={13}/></button>)}</nav><div className="ad-sidebar-bottom"><button type="button" onClick={onShop}><Icon name="store"/>Quay về cửa hàng</button><button type="button" onClick={logout} disabled={logoutBusy}><Icon name="logout"/>{logoutBusy?'Đang đăng xuất…':'Đăng xuất'}</button>{logoutError&&<p className="ad-inline-error" role="alert">{logoutError}</p>}<span>MINISHOP / STORE OPERATIONS</span></div></aside><div className="ad-workspace"><header className="ad-header"><div className="ad-breadcrumb"><span>Quản trị</span><Icon name="arrow" size={12}/><strong>{titles[view]}</strong></div><div className="ad-admin-identity"><span className="ad-avatar">{user.fullName.trim().split(/\s+/).slice(-1)[0].slice(0,1).toUpperCase()}</span><div><strong>{user.fullName}</strong><small>Quản trị viên</small></div></div></header><main id="main-content" className="ad-main"><div id="admin-main" tabIndex={-1} ref={content} className="ad-content">
        {view==='dashboard'&&<AdminDashboard onOrders={()=>navigate('orders')} onOrder={detail} onProducts={()=>navigate('products')} {...actions}/>}
        {view==='products'&&<AdminProducts notify={notify} {...actions}/>}
        {view==='orders'&&<AdminOrders query={orderQuery} setQuery={setOrderQuery} onDetail={detail} {...actions}/>}
        {view==='detail'&&<AdminOrderDetail id={orderId} onBack={()=>navigate('orders')} notify={notify} {...actions}/>}
        {view==='customers'&&<AdminCustomers {...actions}/>}
        </div><footer className="ad-footer">MiniShop Admin <span>Không gian vận hành cửa hàng.</span></footer></main></div>{toast&&<div className="ad-toast" role="status"><Icon name="check"/><span>{toast.message}</span><button type="button" aria-label="Đóng thông báo" onClick={()=>setToast(null)}><Icon name="close" size={16}/></button></div>}</div>;
}
export function AdminAccess({ status, error, onRetry, onShop, onSignIn }) {
    return <main id="main-content" className="home"><section className="ad-access"><Icon name="alert" size={32}/><h1>{status==='checking'?'Đang kiểm tra phiên đăng nhập…':status==='error'?'Chưa thể xác minh phiên đăng nhập':'Không thể truy cập trang quản trị'}</h1><p>{status==='checking'?'Vui lòng chờ trong giây lát.':status==='error'?error || 'Vui lòng kiểm tra kết nối và thử lại.':'Khu vực này chỉ dành cho tài khoản Admin được máy chủ xác thực.'}</p><div><Button secondary onClick={onShop}>Về cửa hàng</Button>{status!=='checking'&&<Button onClick={status==='error'?onRetry:onSignIn}>{status==='error'?'Thử lại':'Đăng nhập'}</Button>}</div></section></main>;
}
