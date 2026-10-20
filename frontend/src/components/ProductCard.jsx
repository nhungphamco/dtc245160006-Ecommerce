import ProductVisual from './ProductVisual';
import { useCart } from '../context/useCart';
function ProductCard({ product, onAddToCart }) {
    const { cart } = useCart();
    const quantity = cart.find(item => item.id === product.id)?.quantity || 0;
    const inStock = product.stock > 0;
    const atLimit = inStock && quantity >= product.stock;
    const price = new Intl.NumberFormat('vi-VN', {style:'currency',currency:'VND'}).format(Number(product.price));
    return <article className="product-card"><div className="product-card__image"><ProductVisual name={product.name} imageUrl={product.image_url}/><span className="stock-tag">{inStock ? 'Còn hàng' : 'Hết hàng'}</span></div><div className="product-card__content"><p className="section-label">GEAR & ACCESSORIES</p><h3 className="product-card__name">{product.name}</h3><p className="product-card__description">{product.description || 'Phụ kiện công nghệ cho góc setup của bạn.'}</p><p className="product-card__stock">{inStock ? `Có sẵn ${product.stock} sản phẩm` : 'Sản phẩm tạm hết hàng'}</p><p className="product-card__price">{price}</p><button className="product-card__button" type="button" disabled={!inStock || atLimit || !onAddToCart} onClick={()=>onAddToCart?.(product)} aria-label={`Thêm ${product.name} vào giỏ hàng`}>{!inStock ? 'Tạm hết hàng' : atLimit ? 'Đã đạt giới hạn tồn kho' : 'Thêm vào giỏ hàng +'}</button><span className="product-feedback" role="status">{quantity > 0 ? `${quantity} sản phẩm trong giỏ của bạn` : ''}</span></div></article>;
}
export default ProductCard;
