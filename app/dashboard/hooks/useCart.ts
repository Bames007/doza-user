// app/dashboard/hooks/useCart.ts
import { useState, useEffect } from "react";

export interface CartItem {
  cartItemId: string;
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  size?: string;
  color?: string;
  quantity: number;
}

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("doza_cart");
    if (stored) {
      try {
        setCartItems(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse cart", e);
      }
    }
  }, []);

  // Save to localStorage whenever cart changes
  useEffect(() => {
    localStorage.setItem("doza_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (
    product: any,
    quantity: number = 1,
    size?: string,
    color?: string,
  ) => {
    const cartItemId = `${product.id}-${size || "nosize"}-${color || "nocolor"}-${Date.now()}`;
    const newItem: CartItem = {
      cartItemId,
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      size,
      color,
      quantity,
    };
    setCartItems((prev) => [...prev, newItem]);
  };

  const updateQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(cartItemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.cartItemId === cartItemId
          ? { ...item, quantity: newQuantity }
          : item,
      ),
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCartItems((prev) =>
      prev.filter((item) => item.cartItemId !== cartItemId),
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const deliveryFee = subtotal > 0 ? 500 : 0; // Flat rate
  const total = subtotal + deliveryFee;

  return {
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    deliveryFee,
    total,
  };
};
