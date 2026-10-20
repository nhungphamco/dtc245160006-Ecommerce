import { useState } from 'react';
import { adminRequest, productPayload } from './adminApi';
import { useAdminResource } from './useAdminResource';
import { Badge, Button, Empty, Icon, Modal, Pagination, Resource, Search } from './AdminUI';
import ProductVisual from '../components/ProductVisual';
import { money } from '../components/accountFormat';

function ProductForm({ product, onClose, onSaved, reload }) {
    const [values, setValues] = useState({ name:product?.name || '', description:product?.description || '', price:product ? String(Number(product.price)) : '', stock:product ? String(product.stock) : '', image_url:product?.image_url || '', is_active:product ? Boolean(product.is_active) : true });
    const [error,setError] = useState(null);
    const [busy,setBusy] = useState(false);
    const [review,setReview] = useState(null);
    const change = event => { setValues(v => ({...v,[event.target.name]:event.target.type === 'checkbox' ? event.target.checked : event.target.value})); setError(null); };
    async function save(payload) {
        setBusy(true); setError(null);
        try { const result=await adminRequest(product ? `/products/${product.id}` : '/products',{method:product?'PATCH':'POST',body:payload}); if (!result.product?.id) throw new Error('Chưa nhận được xác nhận lưu sản phẩm. Hãy kiểm tra danh sách trước khi gửi lại.'); onSaved(product ? 'Đã cập nhật sản phẩm.' : 'Đã thêm sản phẩm mới.'); }
        catch(failure){setError(failure);} finally{setBusy(false);}
    }
    function submit(event) {
        event.preventDefault(); setError(null);
        try { const payload=productPayload(values,product); if(product && ('stock' in payload || 'is_active' in payload)) setReview(payload); else save(payload); }
        catch(failure){setError(failure);}
    }
    return <Modal title={review ? 'Xác nhận cập nhật sản phẩm' : product ? `Chỉnh sửa sản phẩm #${product.id}` : 'Thêm sản phẩm mới'} onClose={onClose} busy={busy}>
        {review ? <div className="ad-confirm"><span className="ad-confirm-icon"><Icon name="alert" size={28}/></span><h3>{values.name}</h3>{'stock' in review && <p>Tồn kho: <strong>{product.stock} → {review.stock}</strong>. Máy chủ sẽ kiểm tra lại tồn kho trước khi lưu.</p>}{'is_active' in review && <p>{review.is_active ? 'Sản phẩm sẽ hiển thị trở lại ở cửa hàng.' : 'Sản phẩm sẽ bị ẩn và không nhận đơn mới. Lịch sử đơn hàng được giữ nguyên.'}</p>}<p>Các trường thông tin đã sửa cũng sẽ được lưu.</p></div> : <form id="admin-product-form" className="ad-product-form" onSubmit={submit}>
            <fieldset disabled={busy}><div className="ad-field"><label htmlFor="ad-product-name">Tên sản phẩm</label><input id="ad-product-name" name="name" value={values.name} onChange={change} required maxLength={150}/></div>
            <div className="ad-form-grid"><div className="ad-field"><label htmlFor="ad-price">Giá bán (VND)</label><input id="ad-price" name="price" type="number" inputMode="numeric" min="0" max="9999999999" step="1" value={values.price} onChange={change} required/></div><div className="ad-field"><label htmlFor="ad-stock">Tồn kho</label><input id="ad-stock" name="stock" type="number" inputMode="numeric" min="0" max="2147483647" step="1" value={values.stock} onChange={change} required/></div></div>
            <div className="ad-field"><label htmlFor="ad-description">Mô tả <small>Không bắt buộc</small></label><textarea id="ad-description" name="description" rows="4" maxLength={10000} value={values.description} onChange={change}/></div>
            <div className="ad-field"><label htmlFor="ad-image">Đường dẫn ảnh <small>HTTP hoặc HTTPS</small></label><input id="ad-image" name="image_url" type="url" maxLength={500} value={values.image_url} onChange={change} placeholder="https://…"/><small>Để trống để dùng hình minh họa MiniShop.</small></div>
            <label className="ad-checkbox"><input type="checkbox" name="is_active" checked={values.is_active} onChange={change}/>Đang kinh doanh — hiển thị trên cửa hàng</label></fieldset>
        </form>}
        {error && <p className="ad-inline-error" role="alert">{error.message}</p>}
        <div className="ad-modal__actions">{product && error?.status === 409 ? <><Button secondary onClick={onClose}>Đóng</Button><Button onClick={reload}>Tải lại dữ liệu sản phẩm</Button></> : <><Button secondary onClick={review ? () => {setReview(null);setError(null);} : onClose} disabled={busy}>{review?'Quay lại':'Hủy'}</Button>{review ? <Button onClick={() => save(review)} disabled={busy}>{busy?'Đang lưu…':'Xác nhận cập nhật'}</Button> : <Button type="submit" form="admin-product-form" disabled={busy}>{busy?'Đang lưu…':product?'Lưu thay đổi':'Thêm sản phẩm'}</Button>}</>}</div>
    </Modal>;
}
function ProductEditor({ id, onClose, onSaved, ...actions }) {
    const resource=useAdminResource(`/products/${id}`);
    return resource.loading || resource.error ? <Modal title="Thông tin sản phẩm" onClose={onClose}><Resource resource={resource} {...actions}>{()=>null}</Resource></Modal> : <ProductForm product={resource.data.product} onClose={onClose} onSaved={onSaved} reload={resource.retry}/>;
}
export default function AdminProducts({ notify, ...actions }) {
    const [query,setQuery] = useState({search:'',status:'all',sort:'newest',lowStock:'false',page:1});
    const [editor,setEditor] = useState(null);
    const [toggle,setToggle] = useState(null);
    const [busy,setBusy] = useState(false);
    const [error,setError] = useState(null);
    const resource = useAdminResource(`/products?${new URLSearchParams({...query,limit:10})}`);
    const filter=(key,value)=>setQuery(q=>({...q,[key]:value,page:1}));
    const saved=message=>{setEditor(null);resource.retry();notify(message);};
    async function toggleVisibility(){setBusy(true);setError(null);try{await adminRequest(`/products/${toggle.id}`,{method:'PATCH',body:{is_active:!toggle.is_active}});setToggle(null);resource.retry();notify(toggle.is_active?'Đã ẩn sản phẩm.':'Đã hiển thị sản phẩm.');}catch(failure){setError(failure);}finally{setBusy(false);}}
    return <><div className="ad-page-heading"><div><p className="ad-eyebrow">DANH MỤC CỬA HÀNG</p><h1>Sản phẩm</h1><p>Quản lý thông tin, tồn kho và trạng thái kinh doanh.</p></div><Button onClick={()=>setEditor('new')}><Icon name="plus" size={17}/>Thêm sản phẩm</Button></div>
        <section className="ad-panel ad-panel--table"><div className="ad-toolbar"><Search initial={query.search} onSearch={value=>filter('search',value)} placeholder="Tìm theo tên sản phẩm"/><div className="ad-filters"><label>Trạng thái<select value={query.status} onChange={e=>filter('status',e.target.value)}><option value="all">Tất cả</option><option value="active">Đang kinh doanh</option><option value="inactive">Đã ẩn</option></select></label><label>Sắp xếp<select value={query.sort} onChange={e=>filter('sort',e.target.value)}><option value="newest">Mới nhất</option><option value="name_asc">Tên A–Z</option><option value="price_asc">Giá tăng dần</option><option value="price_desc">Giá giảm dần</option><option value="stock_asc">Tồn kho tăng dần</option></select></label><label className="ad-checkbox"><input type="checkbox" checked={query.lowStock==='true'} onChange={e=>filter('lowStock',String(e.target.checked))}/>Tồn kho ≤ 5</label></div></div>
        <Resource resource={resource} {...actions}>{data=><>{data.rows.length ? <div className="ad-table-wrap"><table><caption className="ad-sr">Danh sách sản phẩm</caption><thead><tr><th scope="col">Sản phẩm</th><th scope="col">Giá bán</th><th scope="col">Tồn kho</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead><tbody>{data.rows.map(product=><tr key={product.id}><td data-label="Sản phẩm"><div className="ad-product-cell"><div className="ad-thumb"><ProductVisual name={product.name} imageUrl={product.image_url}/></div><div><strong>{product.name}</strong><small>#{product.id}</small></div></div></td><td data-label="Giá bán" className="ad-nowrap">{money(product.price)}</td><td data-label="Tồn kho"><Badge muted={product.stock>5}>{product.stock===0?'Hết hàng':`${product.stock} sản phẩm`}</Badge></td><td data-label="Trạng thái"><Badge muted={!product.is_active}>{product.is_active?'Đang bán':'Đã ẩn'}</Badge></td><td className="ad-row-action"><Button secondary onClick={()=>setEditor(product.id)} aria-label={`Sửa ${product.name}`}>Sửa</Button><button type="button" className="ad-text-button" onClick={()=>{setToggle(product);setError(null);}} aria-label={`${product.is_active?'Ẩn':'Hiện'} ${product.name}`}>{product.is_active?'Ẩn':'Hiện'}</button></td></tr>)}</tbody></table></div> : <Empty/>}<Pagination pagination={data.pagination} onPage={page=>setQuery(q=>({...q,page}))}/></>}</Resource></section>
        {editor==='new' && <ProductForm onClose={()=>setEditor(null)} onSaved={saved}/>}{typeof editor==='number' && <ProductEditor id={editor} onClose={()=>setEditor(null)} onSaved={saved} {...actions}/>}
        {toggle && <Modal title={toggle.is_active?'Ẩn sản phẩm?':'Hiển thị sản phẩm?'} busy={busy} onClose={()=>setToggle(null)}><div className="ad-confirm"><h3>{toggle.name}</h3><p>{toggle.is_active?'Sản phẩm sẽ ngừng nhận đơn mới. Dữ liệu và lịch sử đơn hàng vẫn được giữ nguyên.':'Sản phẩm sẽ xuất hiện trở lại ở cửa hàng.'}</p></div>{error && <p className="ad-inline-error" role="alert">{error.message}</p>}<div className="ad-modal__actions"><Button secondary disabled={busy} onClick={()=>setToggle(null)}>Quay lại</Button><Button disabled={busy} danger={!!toggle.is_active} onClick={toggleVisibility}>{busy?'Đang lưu…':'Xác nhận'}</Button></div></Modal>}
    </>;
}
