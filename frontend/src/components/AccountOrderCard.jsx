import ProductVisual from './ProductVisual';
import { AccountIcon } from './AccountUI';
import { dateTime, money, orderStatus } from './accountFormat';

export default function AccountOrderCard({ order, onDetail }) {
    return <article className="account-order">
        <header className="account-order__header"><div><strong>Đơn hàng #{order.id}</strong><time>{dateTime(order.created_at)}</time></div><span className={`account-status ${order.status === 'cancelled' ? 'account-status--muted' : ''}`}>{orderStatus(order.status)}</span></header>
        <ul className="account-order__items">{(order.items || []).map((item, index) => <li key={`${item.product_id}-${index}`}><div className="account-product-image"><ProductVisual name={item.product_name || `Sản phẩm #${item.product_id}`} imageUrl={item.image_url}/></div><div><h3>{item.product_name || `Sản phẩm #${item.product_id}`}</h3><p>Số lượng: {item.quantity}</p></div><strong>{money(item.line_total ?? Number(item.unit_price) * item.quantity)}</strong></li>)}</ul>
        <footer className="account-order__footer"><div><span>Tổng tiền</span><strong>{money(order.total_amount)}</strong></div><button type="button" className="account-button account-button--secondary" onClick={() => onDetail(order.id)} aria-label={`Xem chi tiết đơn hàng #${order.id}`}>Xem chi tiết <AccountIcon name="arrow" size={15}/></button></footer>
    </article>;
}
