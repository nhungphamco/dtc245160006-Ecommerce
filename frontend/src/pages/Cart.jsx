import ProductVisual from "../components/ProductVisual";
import { useCart } from "../context/useCart";

const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND"
    }).format(Number(price));

function Cart({ onContinueShopping, onCheckout }) {
    const {
        cart,
        cartCount,
        cartTotal,
        updateQuantity,
        removeFromCart
    } = useCart();

    return (
        <main id="main-content" className="home">
            <section className="cart-page">
                <div className="cart-page__header">
                    <div>
                        <p className="section-label">MINISHOP</p>
                        <h1>Giỏ hàng của bạn</h1>
                        <p>{cartCount} sản phẩm trong giỏ hàng</p>
                    </div>

                    <button
                        type="button"
                        className="cart-back"
                        onClick={onContinueShopping}
                    >
                        ← Tiếp tục mua sắm
                    </button>
                </div>

                {cart.length === 0 ? (
                    <div className="cart-empty">
                        <h2>Giỏ hàng đang trống</h2>
                        <p>Hãy khám phá và thêm sản phẩm yêu thích.</p>
                        <button
                            type="button"
                            className="hero__button"
                            onClick={onContinueShopping}
                        >
                            Khám phá sản phẩm
                        </button>
                    </div>
                ) : (
                    <div className="cart-layout">
                        <div className="cart-items">
                            {cart.map((item) => (
                                <article
                                    className="cart-item"
                                    key={item.id}
                                >
                                    <div className="cart-item__image">
<ProductVisual name={item.name} imageUrl={item.image_url}/>
                                    </div>

                                    <div className="cart-item__info">
                                        <h3>{item.name}</h3>
                                        <p>{formatPrice(item.price)}</p>
                                        <small>
                                            Tồn kho tham khảo: {item.stock}{item.quantity >= item.stock ? " · Đã đạt giới hạn" : ""}
                                        </small>

                                        <div className="cart-item__actions">
                                            <div className="quantity-control">
                                                <button
                                                    type="button"
                                                    aria-label={`Giảm số lượng ${item.name}`}
                                                    disabled={item.quantity <= 1}
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.id,
                                                            item.quantity - 1
                                                        )
                                                    }
                                                >
                                                    −
                                                </button>

                                                <span>{item.quantity}</span>

                                                <button
                                                    type="button"
                                                    aria-label={`Tăng số lượng ${item.name}`}
                                                    disabled={
                                                        item.quantity >= item.stock
                                                    }
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.id,
                                                            item.quantity + 1
                                                        )
                                                    }
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                className="cart-remove"
                                                onClick={() =>
                                                    removeFromCart(item.id)
                                                }
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    </div>

                                    <strong className="cart-item__subtotal">
                                        {formatPrice(
                                            Number(item.price) * item.quantity
                                        )}
                                    </strong>
                                </article>
                            ))}
                        </div>

                        <aside className="cart-summary">
                            <h2>Tóm tắt đơn hàng</h2>

                            <div className="cart-summary__row">
                                <span>Số lượng</span>
                                <strong>{cartCount}</strong>
                            </div>

                            <div className="cart-summary__row">
                                <span>Tạm tính</span>
                                <strong>{formatPrice(cartTotal)}</strong>
                            </div>

                            <p className="cart-summary__note">
                                Tổng tiền chính thức sẽ được xác nhận
                                theo giá và tồn kho trên máy chủ.
                            </p>

                            <div className="cart-summary__total">
                                <span>Tổng tạm tính</span>
                                <strong>{formatPrice(cartTotal)}</strong>
                            </div>

                            <button
                                type="button"
                                className="cart-checkout"
                                disabled={!onCheckout}
                                onClick={onCheckout}
                            >
                                {onCheckout ? "Tiến hành đặt hàng →" : "Đặt hàng chưa khả dụng"}
                            </button>
                        </aside>
                    </div>
                )}
            </section>
        </main>
    );
}

export default Cart;
