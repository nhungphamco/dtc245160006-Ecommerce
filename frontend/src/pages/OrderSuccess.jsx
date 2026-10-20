const formatPrice = (value) =>
    new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND"
    }).format(Number(value));

function OrderSuccess({ order, onContinueShopping }) {
    return (
        <main id="main-content" className="home">
            <section className="checkout-success">
                <div className="checkout-success__icon">
                    ✓
                </div>

                <p className="section-label">MINISHOP / ORDER CONFIRMED</p>

                <h1>Đặt hàng thành công!</h1>

                <p>
                    Đơn hàng của bạn đã được ghi nhận.
                </p>

                <div className="checkout-success__details">
                    <div>
                        <span>Mã đơn hàng</span>
                        <strong>#{order.orderId}</strong>
                    </div>

                    <div>
                        <span>Trạng thái</span>
                        <strong>Chờ xử lý</strong>
                    </div>

                    <div>
                        <span>Tổng tiền</span>
                        <strong>{formatPrice(order.totalAmount)}</strong>
                    </div>
                </div>

                <button
                    type="button"
                    className="hero__button"
                    onClick={onContinueShopping}
                >
                    Tiếp tục mua sắm
                </button>
            </section>
        </main>
    );
}

export default OrderSuccess;