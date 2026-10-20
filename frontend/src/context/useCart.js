import { useContext } from "react";
import { CartContext } from "./cartContext";

export function useCart() {
    const context = useContext(CartContext);

    if (!context) {
        throw new Error(
            "useCart phai duoc su dung trong CartProvider"
        );
    }

    return context;
}