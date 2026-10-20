// app/dashboard/components/medicalshop/OrdersTab.tsx
"use client";

import { Package, Clock, Truck, CheckCircle, Receipt } from "lucide-react";
import { cn } from "@/app/utils/utils";
import type { OrderStatus, Order } from "@/app/dashboard/constants/medicalShop";
import { generateOrderReceipt } from "@/app/dashboard/utils/generateOrderReceipt";
import { FOCUS } from "@/app/dashboard/constants/medicalShopConstants";

interface OrdersTabProps {
  orders: Record<string, Order>;
  userName: string;
}

export function OrdersTab({ orders, userName }: OrdersTabProps) {
  const orderList = Object.values(orders || {}).sort(
    (a, b) => b.createdAt - a.createdAt,
  );

  if (!orderList.length) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-white rounded-2xl border-2 border-dashed border-slate-200">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">
          No orders yet
        </h3>
        <p className="text-sm text-slate-600 max-w-sm leading-relaxed">
          Your active and past orders will show up here.
        </p>
      </div>
    );
  }

  const getStatusDetails = (status: OrderStatus) => {
    switch (status) {
      case "processing":
        return {
          icon: Clock,
          color: "text-amber-700",
          bg: "bg-amber-50 border-amber-200",
          label: "Processing",
        };
      case "confirmed":
        return {
          icon: Truck,
          color: "text-emerald-700",
          bg: "bg-emerald-50 border-emerald-200",
          label: "Confirmed",
        };
      case "delivered":
        return {
          icon: CheckCircle,
          color: "text-emerald-700",
          bg: "bg-emerald-50 border-emerald-200",
          label: "Delivered",
        };
      default:
        return {
          icon: Clock,
          color: "text-slate-700",
          bg: "bg-slate-100 border-slate-200",
          label: status,
        };
    }
  };

  return (
    <div className="space-y-4">
      {orderList.map((order) => {
        const status = getStatusDetails(order.status);
        const StatusIcon = status.icon;

        return (
          <div
            key={order.orderId}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-base font-bold text-slate-900 truncate">
                    Order #{order.orderId}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border shrink-0",
                  status.bg,
                  status.color,
                )}
              >
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </div>
            </div>

            <div className="px-5 py-4 divide-y divide-slate-100">
              {order.items.map((item) => (
                <div
                  key={item.cartItemId}
                  className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-sm gap-3"
                >
                  <div className="min-w-0">
                    <span className="text-slate-900 font-medium block truncate">
                      {item.name}
                    </span>
                    {(item.size || item.color) && (
                      <span className="text-xs text-slate-500">
                        {item.size && `Size: ${item.size}`}
                        {item.size && item.color && " • "}
                        {item.color && `Color: ${item.color}`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      ×{item.quantity}
                    </span>
                    <span className="font-bold text-slate-900">
                      ₦{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                <span>
                  Subtotal:{" "}
                  <span className="font-semibold text-slate-900">
                    ₦{order.subtotal.toLocaleString()}
                  </span>
                </span>
                <span>
                  Delivery:{" "}
                  <span className="font-semibold text-slate-900">
                    ₦{order.deliveryFee.toLocaleString()}
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4">
                <div className="text-right">
                  <span className="text-xs uppercase font-bold tracking-wider text-slate-500 block">
                    Total
                  </span>
                  <span className="text-lg font-bold text-emerald-700">
                    ₦{order.totalAmount.toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => generateOrderReceipt(order, userName)}
                  className={cn(
                    "min-h-10 inline-flex items-center gap-2 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700",
                    FOCUS,
                  )}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Receipt
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
