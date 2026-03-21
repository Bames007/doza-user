// app/dashboard/hooks/useOrders.ts
import useSWR, { mutate } from "swr";
import { authFetcher, authPost } from "@/app/utils/client-auth";
import { useUser } from "./useProfile";

export interface Order {
  orderId: string;
  createdAt: number;
  items: any[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  deliveryAddress: string;
  phoneNumber: string;
  paymentMethod: string;
  status: "processing" | "confirmed" | "delivered";
  couponUsed?: string;
  discount?: number;
}

export const useOrders = () => {
  const { user } = useUser();

  const { data, error, isLoading } = useSWR<{
    success: boolean;
    data: Record<string, Order>;
  }>(user ? "/api/store/orders" : null, authFetcher, {
    revalidateOnFocus: false,
  });

  const orders = data?.success ? data.data : {};

  const placeOrder = async (
    orderData: Omit<Order, "orderId" | "createdAt" | "status">,
  ) => {
    if (!user) return;
    const result = await authPost("/api/store/orders", orderData);
    if (result.success) {
      mutate("/api/store/orders"); // refresh orders list
      return result.data; // new order ID
    }
    throw new Error(result.error || "Failed to place order");
  };

  return {
    orders,
    isLoading,
    error,
    placeOrder,
  };
};
