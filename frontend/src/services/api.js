const API_BASE_URL = "/api";

async function readApiResult(response) {
    if (response.status === 204) {
        return null;
    }

    try {
        return await response.json();
    } catch {
        throw new Error("Máy chủ trả về dữ liệu không hợp lệ.");
    }
}

function authErrorMessage(status, message) {
    if (status === 400) {
        return "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại họ tên, email và mật khẩu.";
    }

    if (status === 401) {
        return "Email hoặc mật khẩu không đúng.";
    }

    if (status === 403) {
        return "Yêu cầu bị từ chối do nguồn trang không được máy chủ cho phép.";
    }

    if (status === 409) {
        return "Không thể tạo tài khoản với thông tin này. Email có thể đã được sử dụng.";
    }

    if (status === 429) {
        return "Bạn đã thử quá nhiều lần. Vui lòng chờ một lúc rồi thử lại.";
    }

    return message || "Không thể kết nối dịch vụ tài khoản. Vui lòng thử lại sau.";
}

async function authRequest(path, options = {}) {
    let response;

    try {
        response = await fetch(`${API_BASE_URL}/auth${path}`, {
            ...options,
            credentials: "include",
            headers: {
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...options.headers
            }
        });
    } catch {
        throw new Error("Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.");
    }

    const result = await readApiResult(response);

    if (!response.ok) {
        const error = new Error(authErrorMessage(response.status, result?.message));
        error.status = response.status;
        throw error;
    }

    return result;
}

export async function getCurrentUser({ signal } = {}) {
    const result = await authRequest("/me", { signal });

    if (!result?.success || !result.data?.user) {
        throw new Error("Máy chủ trả về thông tin phiên không hợp lệ.");
    }

    return result.data.user;
}

export async function registerAccount({ fullName, email, password }) {
    const result = await authRequest("/register", {
        method: "POST",
        body: JSON.stringify({ fullName, email, password })
    });

    if (!result?.success || !result.data?.user) {
        throw new Error("Máy chủ trả về thông tin đăng ký không hợp lệ.");
    }

    return result.data.user;
}

export async function loginAccount({ email, password }) {
    const result = await authRequest("/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });

    if (!result?.success || !result.data?.user) {
        throw new Error("Máy chủ trả về thông tin đăng nhập không hợp lệ.");
    }

    return result.data.user;
}

export async function logoutAccount() {
    await authRequest("/logout", { method: "POST" });
}

export async function getProducts() {
    const response = await fetch(`${API_BASE_URL}/products`);

    if (!response.ok) {
        throw new Error("Khong the tai danh sach san pham");
    }

    const result = await response.json();

    if (!result.success || !Array.isArray(result.data)) {
        throw new Error("Du lieu san pham khong hop le");
    }

    return result.data;

}
export async function createOrder(orderData) {
    const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(orderData)
    });

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error("May chu tra ve du lieu khong hop le");
    }

    if (!response.ok || !result.success) {
        throw new Error(
            result.message || "Khong the tao don hang"
        );
    }

    return result.data;
}