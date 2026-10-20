import { useEffect, useState } from "react";

import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import AuthPage from "./pages/AuthPage";
import Account from "./pages/Account";
import Admin, { AdminAccess } from "./admin/Admin";

import { useCart } from "./context/useCart";
import { useAuth } from "./context/useAuth";

import "./App.css";

function App() {
    // Quản lý trang hiện tại
    const [currentPage, setCurrentPage] = useState(() => ["#admin", "#admin-main"].includes(window.location.hash) ? "admin" : "home");

    // Lưu thông tin đơn hàng đã tạo thành công
    const [completedOrder, setCompletedOrder] = useState(null);
    const [authMode, setAuthMode] = useState(null);
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const [accountError, setAccountError] = useState("");

    // Trạng thái giỏ hàng
    const { cartCount, clearCart } = useCart();
    const {
        user,
        status: authStatus,
        sessionError,
        refreshSession,
        login,
        register,
        logout
    } = useAuth();

    useEffect(() => {
        const onHash = () => { if (["#admin", "#admin-main"].includes(window.location.hash)) { setAuthMode(null); setCurrentPage("admin"); } else { setCurrentPage(page => page === "admin" ? "home" : page); } };
        window.addEventListener("hashchange", onHash);
        return () => window.removeEventListener("hashchange", onHash);
    }, []);

    function goAdmin() {
        setAuthMode(null); setAccountMenuOpen(false); setCurrentPage("admin");
        window.location.hash = "admin"; window.scrollTo(0, 0);
    }

    // Điều hướng về trang chủ
    function goHome() {
        if (["#admin", "#admin-main"].includes(window.location.hash)) window.history.replaceState(null, "", window.location.pathname + window.location.search);
        setAuthMode(null);
        setCurrentPage("home");
        window.scrollTo(0, 0);
    }

    // Điều hướng đến giỏ hàng
    function goCart() {
        setAuthMode(null);
        setCurrentPage("cart");
        window.scrollTo(0, 0);
    }

    // Điều hướng đến trang Checkout
    function goCheckout() {
        setAuthMode(null);
        if (cartCount === 0) {
            goCart();
            return;
        }

        setCurrentPage("checkout");
        window.scrollTo(0, 0);
    }

    function goAccount() {
        setAuthMode(null);
        setAccountMenuOpen(false);
        setCurrentPage("account");
        window.scrollTo(0, 0);
    }

    function openAuth(mode) {
        setAuthMode(mode);
        setAccountMenuOpen(false);
        setAccountError("");
        window.scrollTo(0, 0);
    }

    function closeAuth() {
        setAuthMode(null);
        window.scrollTo(0, 0);
    }

    async function handleAuthSuccess(credentials) {
        if (authMode === "register") {
            await register(credentials);
        } else {
            await login(credentials);
        }

        setAuthMode(null);
        setAccountMenuOpen(false);
        setAccountError("");
        window.scrollTo(0, 0);
    }

    async function handleLogout() {
        setAccountError("");

        try {
            await logout();
            if (currentPage === "account") goHome();
            setAccountMenuOpen(false);
        } catch (error) {
            setAccountError(error.message);
        }
    }

    // Xử lý khi Backend xác nhận đơn hàng thành công
    function handleOrderSuccess(order) {
        setCompletedOrder(order);

        // Chỉ xóa giỏ khi Backend đã tạo đơn thành công
        clearCart();

        setCurrentPage("success");
        window.scrollTo(0, 0);
    }

    if (!authMode && currentPage === "admin") {
        return user?.role === "admin"
            ? <Admin key={user.id} onShop={goHome} onSignIn={() => openAuth("login")} onLogout={async () => { await logout(); goHome(); }} />
            : <AdminAccess status={authStatus} error={sessionError} onRetry={refreshSession} onShop={goHome} onSignIn={() => openAuth("login")} />;
    }
    return (
        <>
            {/* Liên kết hỗ trợ truy cập bằng bàn phím */}
            <a className="skip-link" href="#main-content">
                Đến nội dung chính
            </a>

            {/* Thanh thông báo */}
            <div className="announcement">
                Góc setup mới. Cảm hứng mới.{" "}
                <span>MAKE IT YOURS.</span>
            </div>

            {/* Header */}
            <header className="site-header">
                <div className="site-header__inner">
                    <button
                        type="button"
                        className="logo logo-button"
                        onClick={goHome}
                    >
                        MiniShop<span>.</span>
                    </button>

                    <nav
                        className="site-nav"
                        aria-label="Điều hướng chính"
                    >
                        <button
                            type="button"
                            className="nav-link"
                            onClick={goHome}
                        >
                            Sản phẩm
                        </button>

                        <button
                            type="button"
                            className="cart-nav-button"
                            onClick={goCart}
                        >
                            Giỏ hàng

                            <span
                                className="cart-count"
                                aria-live="polite"
                            >
                                {cartCount}
                            </span>
                        </button>

                        <div className="account-menu" onKeyDown={event => { if (event.key === "Escape") { setAccountMenuOpen(false); event.currentTarget.querySelector("button")?.focus(); } }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setAccountMenuOpen(false); }}>
                            <button
                                type="button"
                                className="account-menu__trigger"
                                aria-expanded={accountMenuOpen}
                                aria-controls="account-menu-panel"
                                onClick={() => setAccountMenuOpen((open) => !open)}
                                disabled={authStatus === "checking"}
                            >
                                {authStatus === "checking"
                                    ? "Đang kiểm tra..."
                                    : user ? user.fullName : "Tài khoản"}
                            </button>

                            {accountMenuOpen && (
                                <div id="account-menu-panel" className="account-menu__panel">
                                    {authStatus === "error" && (
                                        <p className="account-menu__message" role="alert">
                                            {sessionError}
                                        </p>
                                    )}

                                    {authStatus === "error" && (
                                        <button
                                            type="button"
                                            className="account-menu__action"
                                            onClick={() => refreshSession()}
                                        >
                                            Thử kiểm tra lại
                                        </button>
                                    )}

                                    {authStatus === "anonymous" && (
                                        <>
                                            <button
                                                type="button"
                                                className="account-menu__action"
                                                onClick={() => openAuth("login")}
                                            >
                                                Đăng nhập
                                            </button>
                                            <button
                                                type="button"
                                                className="account-menu__action"
                                                onClick={() => openAuth("register")}
                                            >
                                                Đăng ký
                                            </button>
                                        </>
                                    )}

                                    {authStatus === "authenticated" && (
                                        <>
                                            {user?.role === "admin" && <button type="button" className="account-menu__action" onClick={goAdmin}>Quản trị cửa hàng</button>}
                                            <button type="button" className="account-menu__action" onClick={goAccount}>Tài khoản &amp; đơn mua</button>
                                            <button
                                                type="button"
                                                className="account-menu__action"
                                                onClick={handleLogout}
                                            >
                                                Đăng xuất
                                            </button>
                                            {accountError && (
                                                <p className="account-menu__message account-menu__message--error" role="alert">
                                                    {accountError}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </nav>
                </div>
            </header>

            {authMode && (
                <AuthPage
                    mode={authMode}
                    onModeChange={setAuthMode}
                    onSuccess={handleAuthSuccess}
                    onContinueAsGuest={closeAuth}
                />
            )}

            {/* Trang chủ */}
            {!authMode && currentPage === "home" && (
                <Home />
            )}

            {/* Trang giỏ hàng */}
            {!authMode && currentPage === "cart" && (
                <Cart
                    onContinueShopping={goHome}
                    onCheckout={goCheckout}
                />
            )}

            {/* Trang nhập thông tin đặt hàng */}
            {!authMode && currentPage === "checkout" && (
                <Checkout
                    onBack={goCart}
                    onSuccess={handleOrderSuccess}
                />
            )}

            {/* Trang xác nhận đơn hàng thành công */}
            {!authMode && currentPage === "success" && completedOrder && (
                <OrderSuccess
                    order={completedOrder}
                    onContinueShopping={goHome}
                />
            )}

            {!authMode && currentPage === "account" && (
                user ? <Account key={user.id} onShop={goHome} onSignIn={() => openAuth("login")} onLogout={async () => { await logout(); goHome(); }} />
                    : <main id="main-content" className="home"><section className="account-empty"><h1>Đăng nhập để xem tài khoản</h1><p>{authStatus === "error" ? sessionError : "Hồ sơ và đơn mua chỉ hiển thị cho tài khoản của bạn."}</p><button type="button" className="account-button" onClick={() => openAuth("login")}>Đăng nhập</button></section></main>
            )}
            {/* Footer */}
            <footer id="about" className="site-footer">
                <div>
                    <strong className="footer-brand">
                        MiniShop.
                    </strong>

                    <p>
                        Thiết bị tốt. Trải nghiệm khác biệt.
                    </p>
                </div>

                <p>
                    © 2026 MiniShop
                    <span>CURATED FOR YOUR EVERYDAY.</span>
                </p>
            </footer>
        </>
    );
}

export default App;
