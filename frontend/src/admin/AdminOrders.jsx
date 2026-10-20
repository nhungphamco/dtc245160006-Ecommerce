import { statuses } from './adminConstants';
import { useState } from 'react';
import { adminRequest } from './adminApi';
import { useAdminResource } from './useAdminResource';
import { Badge, Button, Empty, Modal, Pagination, Resource, Search } from './AdminUI';
import { OrdersTable } from './AdminDashboard';
import ProductVisual from '../components/ProductVisual';
import { dateTime, money } from '../components/accountFormat';

function DetailContent({ order, reload, notify }) {
    const [next,setNext]=useState('');
    const [confirm,setConfirm]=useState(false);
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState(null);
    async function update(){
        setBusy(true);setError(null);
        try{const result=await adminRequest(`/orders/${order.id}/status`,{method:'PATCH',body:{status:next,expectedStatus:order.status}});if(typeof result.changed!=='boolean')throw new Error('Chưa nhận được xác nhận cập nhật. Vui lòng tải lại đơn hàng.');setConfirm(false);reload();notify(result.changed?(result.restocked?'Đã hủy đơn và hoàn kho thành công.':'Đã cập nhật trạng thái đơn hàng.'):'Trạng thái đã được cập nhật trước đó; không thực hiện thêm thao tác.');}
        catch(failure){setError(failure);}finally{setBusy(false);}
    }
    return <><div className="ad-order-summary"><div><p className="ad-eyebrow">THÔNG TIN ĐƠN HÀNG</p><h1>Đơn hàng #{order.id}</h1><p>Đặt lúc {dateTime(order.created_at)}</p></div><Badge status={order.status}/></div>
        <div className="ad-detail-grid"><section className="ad-panel ad-panel--table"><div className="ad-panel-heading"><h2>Sản phẩm trong đơn</h2></div><div className="ad-order-items">{order.items.map((item,index)=><div key={`${item.product_id}-${index}`}><div className="ad-thumb"><ProductVisual name={item.product_name || `Sản phẩm #${item.product_id}`} imageUrl={item.image_url}/></div><div><strong>{item.product_name || `Sản phẩm #${item.product_id}`}</strong><small>Đơn giá: {money(item.unit_price)} · Số lượng: {item.quantity}</small></div><strong>{money(item.line_total)}</strong></div>)}</div><div className="ad-order-total"><span>Tổng tiền chính thức</span><strong>{money(order.total_amount)}</strong></div></section>
        <aside><section className="ad-panel"><h2>Khách hàng</h2><dl className="ad-definition"><div><dt>Họ và tên</dt><dd>{order.customer_name}</dd></div><div><dt>Số điện thoại</dt><dd>{order.customer_phone}</dd></div><div><dt>Tài khoản</dt><dd>{order.user_id ? `Khách hàng #${order.user_id}` : 'Khách vãng lai'}</dd></div></dl></section>
        <section className="ad-panel"><h2>Xử lý đơn hàng</h2>{order.allowedTransitions.length ? <><label className="ad-field ad-state-select">Trạng thái tiếp theo<select value={next} onChange={e=>setNext(e.target.value)}><option value="">Chọn trạng thái</option>{order.allowedTransitions.map(status=><option key={status} value={status}>{statuses[status]||status}</option>)}</select></label><Button className="ad-full" disabled={!next} onClick={()=>{setConfirm(true);setError(null);}}>Cập nhật trạng thái</Button></> : <p className="ad-footnote">Đơn hàng không có bước chuyển trạng thái tiếp theo.</p>}<p className="ad-footnote">Trạng thái đơn hàng không xác nhận việc thanh toán.</p></section></aside></div>
        {confirm && <Modal title={next==='cancelled'?'Hủy đơn và hoàn kho?':'Xác nhận trạng thái đơn hàng'} busy={busy} onClose={()=>setConfirm(false)}><div className="ad-confirm"><h3>Đơn hàng #{order.id}</h3><p><Badge status={order.status}/> → <Badge status={next}/></p><p>{next==='cancelled'?'Máy chủ sẽ hủy đơn và hoàn lại số lượng sản phẩm đúng một lần cùng lúc với việc hủy đơn. Đơn đã hủy không thể mở lại. Thao tác này không thực hiện hoàn tiền.':'Trạng thái sẽ được kiểm tra lại trên máy chủ trước khi lưu. Không hỗ trợ chuyển ngược về trạng thái trước.'}</p></div>{error&&<p className="ad-inline-error" role="alert">{error.message}</p>}<div className="ad-modal__actions"><Button secondary disabled={busy} onClick={()=>setConfirm(false)}>Quay lại</Button>{error?.status===409?<Button onClick={()=>{setConfirm(false);reload();}}>Tải lại đơn hàng</Button>:<Button disabled={busy} danger={next==='cancelled'} onClick={update}>{busy?'Đang xử lý…':'Xác nhận cập nhật'}</Button>}</div></Modal>}
    </>;
}
export function AdminOrderDetail({ id, onBack, notify, ...actions }) {
    const resource=useAdminResource(`/orders/${id}`);
    return <><button type="button" className="ad-text-button ad-back" onClick={onBack}>← Quay lại đơn hàng</button><Resource resource={resource} {...actions}>{data=><DetailContent key={`${data.order.id}:${data.order.status}`} order={data.order} reload={resource.retry} notify={notify}/>}</Resource></>;
}
export default function AdminOrders({ onDetail, query, setQuery, ...actions }) {
    const resource=useAdminResource(`/orders?${new URLSearchParams({...query,limit:10})}`);
    return <><div className="ad-page-heading"><div><p className="ad-eyebrow">VẬN HÀNH CỬA HÀNG</p><h1>Đơn hàng</h1><p>Theo dõi và xử lý đơn hàng theo từng trạng thái.</p></div><Button secondary onClick={resource.retry}>Cập nhật dữ liệu</Button></div><section className="ad-panel ad-panel--table"><div className="ad-toolbar"><Search initial={query.search} placeholder="Tìm mã đơn, tên hoặc số điện thoại" onSearch={search=>setQuery(q=>({...q,search,page:1}))}/><div className="ad-filters"><label>Trạng thái<select value={query.status} onChange={e=>setQuery(q=>({...q,status:e.target.value,page:1}))}><option value="all">Tất cả trạng thái</option>{Object.entries(statuses).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label></div></div><Resource resource={resource} {...actions}>{data=><>{data.rows.length?<OrdersTable rows={data.rows} onDetail={onDetail}/>:<Empty/>}<Pagination pagination={data.pagination} onPage={page=>setQuery(q=>({...q,page}))}/></>}</Resource></section></>;
}
