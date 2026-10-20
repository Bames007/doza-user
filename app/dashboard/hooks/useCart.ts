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

// Module-level store — shared across ALL useCart() calls in this page
let cartStore: CartItem[] | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

function readFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("doza_cart");
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeToStorage(items: CartItem[]) {
  try {
    localStorage.setItem("doza_cart", JSON.stringify(items));
  } catch {}
}

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (cartStore !== null) return cartStore;
    cartStore = readFromStorage();
    return cartStore;
  });

  // Sync this instance with the module store
  useEffect(() => {
    const listener = () => setCartItems(cartStore || []);
    listeners.add(listener);
    // Sync immediately in case another instance updated before we mounted
    if (cartStore !== null) setCartItems(cartStore);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const updateCart = (next: CartItem[]) => {
    cartStore = next;
    writeToStorage(next);
    setCartItems(next);
    notify();
  };

  const addToCart = (
    product: any,
    quantity = 1,
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
    updateCart([...(cartStore || []), newItem]);
  };

  const updateQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(cartItemId);
      return;
    }
    updateCart(
      (cartStore || []).map((item) =>
        item.cartItemId === cartItemId
          ? { ...item, quantity: newQuantity }
          : item,
      ),
    );
  };

  const removeFromCart = (cartItemId: string) => {
    updateCart(
      (cartStore || []).filter((item) => item.cartItemId !== cartItemId),
    );
  };

  const clearCart = () => {
    updateCart([]);
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const deliveryFee = subtotal > 0 ? 500 : 0;
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
