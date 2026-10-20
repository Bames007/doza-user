// app/types/medicalshop.ts

export type MedicalCategory =
  | "Monitoring Devices"
  | "Mobility Aids"
  | "First Aid"
  | "Personal Care"
  | "Fitness & Wellness"
  | "Respiratory & Sleep";

export interface MedicalProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: MedicalCategory;
  brand: string;
  sizes?: string[];
  colors?: string[];
  imageUrl: string;
  rating?: number;
  inStock?: boolean;
  prescriptionRequired?: boolean;
}

export interface SavedItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  brand?: string;
  description?: string;
  savedAt: number;
}

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

export type OrderStatus = "processing" | "confirmed" | "delivered";

export interface Order {
  orderId: string;
  createdAt: number;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  deliveryAddress: string;
  phoneNumber: string;
  paymentMethod: string;
  status: OrderStatus;
  couponUsed?: string;
  discount?: number;
}
