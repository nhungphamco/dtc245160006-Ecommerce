import { useEffect, useState } from "react";
import { CartContext } from "./cartContext";

// Đọc dữ liệu giỏ hàng đã lưu trong localStorage
function readSavedCart() {
    try {
        const saved = localStorage.getItem("minishop_cart");

        if (!saved) return [];

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) return [];

        return parsed.filter((item) =>
            item !== null &&
            typeof item === "object" &&
            Number.isSafeInteger(item.id) &&
            item.id > 0 &&
            Number.isSafeInteger(item.quantity) &&
            item.quantity > 0 &&
            Number.isSafeInteger(item.stock) &&
            item.stock >= 0 &&
            Number.isFinite(Number(item.price)) &&
            Number(item.price) >= 0
        );
    } catch {
        return [];
    }
}

// Component quản lý trạng thái giỏ hàng
export function CartProvider({ children }) {
    const [cart, setCart] = useState(readSavedCart);

    // Lưu giỏ hàng khi dữ liệu thay đổi
    useEffect(() => {
        try {
            localStorage.setItem(
                "minishop_cart",
                JSON.stringify(cart)
            );
        } catch (error) {
            console.warn("Khong the luu gio hang:", error);
        }
    }, [cart]);

    // Thêm sản phẩm vào giỏ hàng
    function addToCart(product) {
        setCart((current) => {
            const stock = Number(product.stock);

            if (
                !Number.isSafeInteger(stock) ||
                stock <= 0
            ) {
                return current;
            }

            const existing = current.find(
                (item) => item.id === product.id
            );

            if (existing) {
                return current.map((item) => {
                    if (item.id !== product.id) {
                        return item;
                    }

                    return {
                        ...item,
                        name: product.name,
                        price: product.price,
                        stock,
                        image_url: product.image_url,
                        quantity: Math.min(
                            item.quantity + 1,
                            stock
                        )
                    };
                });
            }

            return [
                ...current,
                {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    stock,
                    image_url: product.image_url,
                    quantity: 1
                }
            ];
        });
    }

    // Cập nhật số lượng sản phẩm
    function updateQuantity(productId, quantity) {
        if (
            !Number.isSafeInteger(quantity) ||
            quantity < 1
        ) {
            return;
        }

        setCart((current) =>
            current.map((item) => {
                if (item.id !== productId) {
                    return item;
                }

                return {
                    ...item,
                    quantity: Math.max(
                        1,
                        Math.min(quantity, item.stock)
                    )
                };
            })
        );
    }

    // Xóa một sản phẩm khỏi giỏ hàng
    function removeFromCart(productId) {
        setCart((current) =>
            current.filter(
                (item) => item.id !== productId
            )
        );
    }

    // Xóa toàn bộ giỏ hàng
    function clearCart() {
        setCart([]);
    }

    // Tổng số lượng sản phẩm
    const cartCount = cart.reduce(
        (total, item) => total + item.quantity,
        0
    );

    // Tổng tiền tạm tính
    const cartTotal = cart.reduce(
        (total, item) =>
            total + Number(item.price) * item.quantity,
        0
    );

    return (
        <CartContext.Provider
            value={{
                cart,
                cartCount,
                cartTotal,
                addToCart,
                updateQuantity,
                removeFromCart,
                clearCart
            }}
        >
            {children}
        </CartContext.Provider>
    );
}