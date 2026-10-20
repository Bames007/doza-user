// app/dashboard/components/medicalshop/CheckoutModal.tsx
"use client";

import { useState } from "react";
import {
  MapPin,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import { bebasNeue } from "@/app/constants";
import type { CartItem, Order } from "@/app/dashboard/constants/medicalShop";
import { useCart } from "@/app/dashboard/hooks/useCart";
import { generateOrderReceipt } from "@/app/dashboard/utils/generateOrderReceipt";
import { Modal } from "../../modals/MedicalShopModal";
import { FOCUS } from "@/app/dashboard/constants/medicalShopConstants";

interface CheckoutModalProps {
  cartItems: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  onClose: () => void;
  onPlaceOrder: (orderData: any) => Promise<string>;
  user: any;
}

export function CheckoutModal({
  cartItems,
  subtotal,
  deliveryFee,
  total,
  onClose,
  onPlaceOrder,
  user,
}: CheckoutModalProps) {
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Pay on Delivery");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const { clearCart } = useCart();

  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true);
    setOrderError(null);
    try {
      const orderData = {
        items: cartItems,
        subtotal,
        deliveryFee,
        totalAmount: total,
        deliveryAddress: address,
        phoneNumber: phone,
        paymentMethod,
        userId: user?.id,
        createdAt: Date.now(),
        status: "processing" as const,
      };

      const orderId = await onPlaceOrder(orderData);
      if (!orderId)
        throw new Error("Order creation failed – no order ID returned");

      const receiptOrder: Order = {
        ...orderData,
        orderId,
        createdAt: orderData.createdAt,
        items: cartItems,
      };

      generateOrderReceipt(receiptOrder, user?.fullName || "Customer");
      clearCart();
      onClose();
    } catch (error: any) {
      console.error("Order placement failed:", error);
      setOrderError(
        error.message || "Failed to place order. Please try again.",
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <Modal onClose={onClose} size="lg">
      <h2
        className={cn(
          "text-xl sm:text-2xl font-bold text-slate-900 mb-5",
          bebasNeue.className,
        )}
      >
        Secure checkout
      </h2>

      <div className="flex mb-8 items-center px-1">
        {[
          { num: 1, label: "Address" },
          { num: 2, label: "Payment" },
          { num: 3, label: "Summary" },
        ].map((s, index, arr) => (
          <div key={s.num} className="flex-1 flex items-center">
            <div className="flex flex-col items-center relative">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                  step >= s.num
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-400 border border-slate-200",
                )}
              >
                {step > s.num ? <CheckCircle className="w-4 h-4" /> : s.num}
              </div>
              <span
                className={cn(
                  "absolute -bottom-5 text-xs font-medium whitespace-nowrap",
                  step >= s.num
                    ? "text-emerald-700 font-semibold"
                    : "text-slate-500",
                )}
              >
                {s.label}
              </span>
            </div>
            {index < arr.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-3 transition-colors rounded-full",
                  step > s.num ? "bg-emerald-600" : "bg-slate-200",
                )}
              />
            )}
          </div>
        ))}
      </div>

      <div className="pt-4">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Where should we deliver?
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Street address
                </label>
                <input
                  type="text"
                  autoComplete="street-address"
                  placeholder="e.g., 15 Ahmadu Bello Way, Victoria Island"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={cn(
                    "w-full min-h-12 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition",
                    FOCUS,
                  )}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Phone number
                </label>
                <div className="flex items-center gap-2">
                  <div className="bg-slate-100 border border-slate-200 px-3.5 min-h-12 inline-flex items-center rounded-xl text-slate-700 font-semibold text-sm">
                    +234
                  </div>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="803 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={cn(
                      "flex-1 min-h-12 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition",
                      FOCUS,
                    )}
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!address || !phone}
              className={cn(
                "w-full min-h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50 text-sm font-bold transition-colors mt-3",
                FOCUS,
              )}
            >
              Continue to payment
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Choose payment method
            </h3>
            <div className="space-y-2">
              {[
                {
                  title: "Pay on Delivery",
                  desc: "Cash or transfer when your order arrives",
                },
                {
                  title: "Card",
                  desc: "Secure online payment via debit/credit card",
                },
                {
                  title: "Bank Transfer",
                  desc: "Direct bank transfer to our account",
                },
              ].map((method) => (
                <label
                  key={method.title}
                  className={cn(
                    "flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer transition-colors",
                    paymentMethod === method.title
                      ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20"
                      : "border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={method.title}
                    checked={paymentMethod === method.title}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4 text-emerald-600 mt-0.5 focus:ring-emerald-500"
                  />
                  <div className="min-w-0">
                    <span className="block font-semibold text-slate-900 text-sm">
                      {method.title}
                    </span>
                    <span className="block text-xs text-slate-600 mt-0.5">
                      {method.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className={cn(
                  "flex-1 min-h-12 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 text-sm font-semibold transition-colors",
                  FOCUS,
                )}
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className={cn(
                  "flex-1 min-h-12 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-bold transition-colors",
                  FOCUS,
                )}
              >
                Review order
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Final order summary
            </h3>

            <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-200">
              <div className="max-h-40 overflow-y-auto space-y-2">
                {cartItems.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="flex justify-between items-center text-sm border-b border-slate-200 pb-2 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <span className="text-slate-900 font-medium block truncate">
                        {item.name}
                      </span>
                      <span className="text-xs text-slate-600">
                        Qty: {item.quantity} {item.size && `• ${item.size}`}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 shrink-0">
                      ₦{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 space-y-1.5 border-t border-slate-200">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">
                    ₦{subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Delivery</span>
                  <span className="font-semibold text-slate-900">
                    ₦{deliveryFee.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Payment</span>
                  <span className="font-semibold text-emerald-700">
                    {paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-200">
                  <span className="text-slate-900">Total</span>
                  <span className="text-emerald-700">
                    ₦{total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {orderError && (
              <div
                role="alert"
                className="bg-rose-50 text-rose-800 p-3 rounded-xl text-sm border border-rose-200 flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{orderError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(2)}
                disabled={isPlacingOrder}
                className={cn(
                  "flex-1 min-h-12 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 text-sm font-semibold disabled:opacity-50 transition-colors",
                  FOCUS,
                )}
              >
                Back
              </button>
              <button
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder}
                className={cn(
                  "flex-1 min-h-12 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors",
                  FOCUS,
                )}
              >
                {isPlacingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Placing…
                  </>
                ) : (
                  "Place order"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
