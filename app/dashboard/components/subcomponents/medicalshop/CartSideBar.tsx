// app/dashboard/components/medicalshop/CartSidebar.tsx
"use client";

import { motion } from "framer-motion";
import { X, Plus, Minus, Trash2 } from "lucide-react";
import { cn } from "@/app/utils/utils";
import { bebasNeue } from "@/app/constants";
import type { CartItem } from "@/app/dashboard/constants/medicalShop";
import { useBodyScrollLock } from "@/app/dashboard/hooks/useBodyScrollLock";
import { FOCUS } from "@/app/dashboard/constants/medicalShopConstants";

interface CartSidebarProps {
  cartItems: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  onUpdateQuantity: (cartItemId: string, newQuantity: number) => void;
  onRemove: (cartItemId: string) => void;
  onClose: () => void;
  onCheckout: () => void;
}

export function CartSidebar({
  cartItems,
  subtotal,
  deliveryFee,
  total,
  onUpdateQuantity,
  onRemove,
  onClose,
  onCheckout,
}: CartSidebarProps) {
  useBodyScrollLock(true);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50"
        aria-hidden
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className="fixed bottom-0 left-0 right-0 sm:top-0 sm:right-0 sm:left-auto sm:bottom-auto sm:h-full w-full sm:w-96 max-h-[90vh] sm:max-h-full bg-white shadow-2xl z-50 flex flex-col rounded-t-3xl sm:rounded-none overflow-hidden"
      >
        <div
          className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-3 sm:hidden"
          aria-hidden
        />

        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <h2
              className={cn(
                "text-xl font-bold text-slate-900",
                bebasNeue.className,
              )}
            >
              Your cart
            </h2>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {cartItems.reduce((acc, i) => acc + i.quantity, 0)} items
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className={cn(
              "min-h-11 min-w-11 inline-flex items-center justify-center hover:bg-slate-100 text-slate-500 rounded-xl transition-colors",
              FOCUS,
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cartItems.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <p className="text-slate-900 font-bold">Your cart is empty</p>
              <p className="text-sm text-slate-600 mt-1">
                Add items from the shop to get started.
              </p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.cartItemId}
                className="flex gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 items-center"
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm truncate">
                    {item.name}
                  </h3>
                  <p className="text-xs text-emerald-700 font-medium mt-0.5 truncate">
                    {item.size} {item.size && item.color && "•"} {item.color}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() =>
                          onUpdateQuantity(item.cartItemId, item.quantity - 1)
                        }
                        aria-label="Decrease quantity"
                        className="min-h-8 min-w-8 inline-flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-bold w-6 text-center text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          onUpdateQuantity(item.cartItemId, item.quantity + 1)
                        }
                        aria-label="Increase quantity"
                        className="min-h-8 min-w-8 inline-flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="font-bold text-emerald-700 text-sm">
                      ₦{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onRemove(item.cartItemId)}
                  aria-label="Remove item"
                  className="min-h-9 min-w-9 inline-flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50">
            <div className="space-y-1.5 text-sm mb-3">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">
                  ₦{subtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery</span>
                <span className="font-semibold text-slate-900">
                  ₦{deliveryFee.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-200">
                <span>Total</span>
                <span className="text-emerald-700">
                  ₦{total.toLocaleString()}
                </span>
              </div>
            </div>
            <button
              onClick={onCheckout}
              className={cn(
                "w-full min-h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-sm active:scale-[0.98] transition-colors",
                FOCUS,
              )}
            >
              Proceed to checkout
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}
