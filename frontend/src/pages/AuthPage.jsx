import { useState } from "react";

function AuthPage({ mode, onModeChange, onSuccess, onContinueAsGuest }) {
    const isRegister = mode === "register";
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        if (submitting) return;

        const normalizedEmail = email.trim();

        if (isRegister && fullName.trim().length < 2) {
            setError("Họ tên cần có ít nhất 2 ký tự.");
            return;
        }

        if (isRegister && password !== confirmPassword) {
            setError("Mật khẩu xác nhận chưa khớp.");
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            await onSuccess(isRegister
                ? { fullName: fullName.trim(), email: normalizedEmail, password }
                : { email: normalizedEmail, password });
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main id="main-content" className="home">
            <section className="auth-page" aria-labelledby="auth-title">
                <button
                    type="button"
                    className="cart-back"
                    onClick={onContinueAsGuest}
                    disabled={submitting}
                >
                    ← Tiếp tục mua sắm với tư cách khách
                </button>

                <div className="auth-card">
                    <p className="section-label">MINISHOP / TÀI KHOẢN</p>
                    <h1 id="auth-title">
                        {isRegister ? "Tạo tài khoản" : "Chào mừng trở lại"}
                    </h1>
                    <p className="auth-card__description">
                        {isRegister
                            ? "Đăng ký tài khoản MiniShop để bắt đầu."
                            : "Đăng nhập vào tài khoản MiniShop của bạn."}
                    </p>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        {isRegister && (
                            <div className="auth-form__field">
                                <label htmlFor="auth-full-name">Họ và tên</label>
                                <input
                                    id="auth-full-name"
                                    type="text"
                                    name="name"
                                    autoComplete="name"
                                    minLength={2}
                                    maxLength={100}
                                    value={fullName}
                                    onChange={(event) => setFullName(event.target.value)}
                                    required
                                    disabled={submitting}
                                />
                            </div>
                        )}

                        <div className="auth-form__field">
                            <label htmlFor="auth-email">Email</label>
                            <input
                                id="auth-email"
                                type="email"
                                name="email"
                                autoComplete="email"
                                maxLength={254}
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                required
                                disabled={submitting}
                            />
                        </div>

                        <div className="auth-form__field">
                            <label htmlFor="auth-password">Mật khẩu</label>
                            <input
                                id="auth-password"
                                type="password"
                                name="password"
                                autoComplete={isRegister ? "new-password" : "current-password"}
                                minLength={12}
                                maxLength={1024}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                required
                                disabled={submitting}
                            />
                            {isRegister && (
                                <small>Mật khẩu cần có ít nhất 12 ký tự.</small>
                            )}
                        </div>

                        {isRegister && (
                            <div className="auth-form__field">
                                <label htmlFor="auth-confirm-password">
                                    Xác nhận mật khẩu
                                </label>
                                <input
                                    id="auth-confirm-password"
                                    type="password"
                                    name="confirm-password"
                                    autoComplete="new-password"
                                    minLength={12}
                                    maxLength={1024}
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    required
                                    disabled={submitting}
                                />
                            </div>
                        )}

                        {error && (
                            <p className="auth-form__error" role="alert">
                                {error}
                            </p>
                        )}

                        <button
                            className="auth-form__submit"
                            type="submit"
                            disabled={submitting}
                        >
                            {submitting
                                ? "Đang xử lý..."
                                : isRegister ? "Tạo tài khoản" : "Đăng nhập"}
                        </button>
                    </form>

                    <p className="auth-card__switch">
                        {isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
                        <button
                            type="button"
                            onClick={() => onModeChange(isRegister ? "login" : "register")}
                            disabled={submitting}
                        >
                            {isRegister ? "Đăng nhập" : "Đăng ký"}
                        </button>
                    </p>
                </div>
            </section>
        </main>
    );
}

export default AuthPage;
