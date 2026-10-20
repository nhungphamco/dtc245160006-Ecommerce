import { useState } from "react";
import { useCart } from "../context/useCart";
import { createOrder } from "../services/api";

const formatPrice = (value) =>
    new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND"
    }).format(Number(value));

function Checkout({ onBack, onSuccess }) {
    const { cart, cartTotal } = useCart();

    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(event) {
        event.preventDefault();

        if (loading || cart.length === 0) return;

        const name = customerName.trim();
        const phone = customerPhone.trim();

        if (name.length < 2 || name.length > 100) {
            setError("Tên khách hàng phải có từ 2 đến 100 ký tự.");
            return;
        }

        if (!/^0[0-9]{9}$/.test(phone)) {
            setError("Số điện thoại phải có 10 chữ số và bắt đầu bằng 0.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const orderData = {
                customer_name: name,
                customer_phone: phone,
                items: cart.map((item) => ({
                    product_id: item.id,
                    quantity: item.quantity
                }))
            };

            const result = await createOrder(orderData);

            onSuccess(result);
        } catch (err) {
            setError(err.message || "Không thể đặt hàng.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main id="main-content" className="home">
            <section className="checkout-page">
                <button
                    type="button"
                    className="cart-back"
                    onClick={onBack}
                    disabled={loading}
                >
                    ← Quay lại giỏ hàng
                </button>

                <p className="section-label">MINISHOP / CHECKOUT</p>
                <h1>Thông tin đặt hàng</h1>

                <div className="cart-layout">
                    <form
                        className="checkout-form"
                        onSubmit={handleSubmit}
                    >
                        <h2>Thông tin khách hàng</h2>

                        <div className="checkout-form__fields">
                            <div className="checkout-form__field">
                                <label htmlFor="customer-name">
                                    Họ và tên
                                </label>
                                <input
                                    id="customer-name"
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    maxLength={100}
                                    autoComplete="name"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="checkout-form__field">
                                <label htmlFor="customer-phone">
                                    Số điện thoại
                                </label>
                                <input
                                    id="customer-phone"
                                    type="tel"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    autoComplete="tel"
                                    inputMode="numeric"
                                    pattern="0[0-9]{9}"
                                    maxLength={10}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="error-message" role="alert">
                                {error}
                            </p>
                        )}

                        <button
                            className="cart-checkout"
                            type="submit"
                            disabled={loading || cart.length === 0}
                        >
                            {loading
                                ? "Đang xử lý đơn hàng..."
                                : "Xác nhận đặt hàng"}
                        </button>
                    </form>

                    <aside className="cart-summary">
                        <h2>Đơn hàng của bạn</h2>

                        {cart.map((item) => (
                            <div
                                key={item.id}
                                className="cart-summary__row"
                            >
                                <span>
                                    {item.name} × {item.quantity}
                                </span>
                                <strong>
                                    {formatPrice(
                                        Number(item.price) * item.quantity
                                    )}
                                </strong>
                            </div>
                        ))}

                        <div className="cart-summary__total">
                            <span>Tổng tạm tính</span>
                            <strong>{formatPrice(cartTotal)}</strong>
                        </div>

                        <p className="cart-summary__note">
                            Giá và tồn kho chính thức được kiểm tra
                            trên máy chủ khi xác nhận đặt hàng.
                        </p>
                    </aside>
                </div>
            </section>
        </main>
    );
}

export default Checkout;