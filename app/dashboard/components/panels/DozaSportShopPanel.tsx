"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShoppingCart,
  Heart,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Star,
  CreditCard,
  Package,
  Plus,
  Minus,
  Trash2,
  Trophy,
  MapPin,
  Phone,
  CheckCircle,
} from "lucide-react";
import { useUser } from "@/app/dashboard/hooks/useProfile";
import { useCart } from "../../hooks/useCart";
import { useSavedItems } from "../../hooks/useSavedItems";
import { useOrders } from "../../hooks/useOrders";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ---------- Types ----------
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "Sport Shoes" | "Sport Wears" | "Sport Gears" | "Audio & Tech";
  brand: string;
  sizes?: string[];
  colors?: string[];
  imageUrl: string;
  rating?: number;
  inStock?: boolean;
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

export interface SavedItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  brand?: string;
  description?: string;
  savedAt: number;
}

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
  status: "processing" | "confirmed" | "delivered";
  couponUsed?: string;
  discount?: number;
}

// ---------- Sample Products (detailed) ----------
const products: Product[] = [
  // Sport Shoes
  {
    id: "1",
    name: "Nike Air Zoom Pegasus 40",
    description:
      "Responsive running shoes with Zoom Air units and a breathable mesh upper. Ideal for daily training.",
    price: 45000,
    category: "Sport Shoes",
    brand: "Nike",
    sizes: ["US 7", "US 8", "US 9", "US 10", "US 11", "US 12"],
    colors: ["Red/Black", "Blue/White", "Grey"],
    imageUrl: "/assets/shop/running_shoes.jpg",
    rating: 4.8,
    inStock: true,
  },
  {
    id: "2",
    name: "Adidas Ultraboost 22",
    description:
      "Energy-returning running shoes with Boost midsole and Primeknit upper. Maximum comfort.",
    price: 50000,
    category: "Sport Shoes",
    brand: "Adidas",
    sizes: ["US 7", "US 8", "US 9", "US 10", "US 11", "US 12"],
    colors: ["White", "Black", "Blue"],
    imageUrl: "/assets/shop/nike.jpg",
    rating: 4.7,
    inStock: true,
  },
  {
    id: "3",
    name: "Nike Mercurial Vapor 14",
    description:
      "Lightweight football boots for speed and precision. Synthetic upper with NikeGrip technology.",
    price: 65000,
    category: "Sport Shoes",
    brand: "Nike",
    sizes: ["UK 7", "UK 8", "UK 9", "UK 10", "UK 11"],
    colors: ["Blue/Orange", "Black/Green"],
    imageUrl: "/assets/shop/football.jpg",
    rating: 4.9,
    inStock: true,
  },
  {
    id: "16",
    name: "Under Armour HOVR Phantom 2",
    description:
      "Connected running shoes with UA HOVR cushioning and embedded sensor for real-time feedback.",
    price: 55000,
    category: "Sport Shoes",
    brand: "Under Armour",
    sizes: ["US 8", "US 9", "US 10", "US 11", "US 12"],
    colors: ["Black/Red", "Blue/Grey"],
    imageUrl: "/assets/shop/running_shoes.jpg",
    rating: 4.6,
    inStock: true,
  },
  {
    id: "17",
    name: "New Balance Fresh Foam 1080v12",
    description: "Plush cushioning and a soft upper for long-distance running.",
    price: 48000,
    category: "Sport Shoes",
    brand: "New Balance",
    sizes: ["US 7", "US 8", "US 9", "US 10", "US 11"],
    colors: ["Grey/Blue", "Black/White"],
    imageUrl: "/assets/shop/running_shoes.jpg",
    rating: 4.7,
    inStock: true,
  },
  // Sport Wears
  {
    id: "9",
    name: "Nike Dri-FIT Training Set",
    description:
      "Moisture-wicking top and shorts for intense workouts. Breathable fabric keeps you dry.",
    price: 35000,
    category: "Sport Wears",
    brand: "Nike",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "Navy", "Grey"],
    imageUrl: "/assets/shop/jordans.jpg",
    rating: 4.5,
    inStock: true,
  },
  {
    id: "18",
    name: "Adidas Own the Run 3-Stripes Tights",
    description: "Aeroready fabric tights with ankle zips for easy on/off.",
    price: 22000,
    category: "Sport Wears",
    brand: "Adidas",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "Navy"],
    imageUrl: "/assets/shop/jordans.jpg",
    rating: 4.4,
    inStock: true,
  },
  {
    id: "19",
    name: "Puma Running Lightweight Jacket",
    description:
      "Wind-resistant jacket with reflective details for night runs.",
    price: 28000,
    category: "Sport Wears",
    brand: "Puma",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Yellow/Black", "Blue/White"],
    imageUrl: "/assets/shop/jordans.jpg",
    rating: 4.6,
    inStock: true,
  },
  {
    id: "20",
    name: "Under Armour Tech 2.0 Short Sleeve Tee",
    description: "Soft, lightweight fabric with UA Tech moisture-wicking.",
    price: 12000,
    category: "Sport Wears",
    brand: "Under Armour",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: ["Red", "Blue", "Black", "White"],
    imageUrl: "/assets/shop/jordans.jpg",
    rating: 4.8,
    inStock: true,
  },
  // Sport Gears
  {
    id: "4",
    name: "Spalding NBA Official Ball",
    description:
      "Official size and weight basketball with premium leather cover.",
    price: 35000,
    category: "Sport Gears",
    brand: "Spalding",
    sizes: ["Size 7"],
    colors: ["Orange"],
    imageUrl: "/assets/shop/basketball.jpg",
    rating: 4.9,
    inStock: true,
  },
  {
    id: "5",
    name: "Wilson NFL Game Ball",
    description: "Official NFL football with tacky leather and natural grip.",
    price: 30000,
    category: "Sport Gears",
    brand: "Wilson",
    sizes: ["Official"],
    colors: ["Brown"],
    imageUrl: "/assets/shop/american football.jpg",
    rating: 4.8,
    inStock: true,
  },
  {
    id: "6",
    name: "Mikasa Volleyball",
    description:
      "FIVB official volleyball with soft touch and durable surface.",
    price: 25000,
    category: "Sport Gears",
    brand: "Mikasa",
    sizes: ["Size 5"],
    colors: ["Blue/Yellow"],
    imageUrl: "/assets/shop/volleyball.jpg",
    rating: 4.7,
    inStock: true,
  },
  {
    id: "7",
    name: "Adjustable Dumbbells Set",
    description:
      "20kg adjustable dumbbells with sturdy stand. Quick-change mechanism.",
    price: 95000,
    category: "Sport Gears",
    brand: "DozaFit",
    sizes: ["20kg"],
    colors: ["Black"],
    imageUrl: "/assets/shop/dumbbells.jpg",
    rating: 4.6,
    inStock: true,
  },
  {
    id: "8",
    name: "Weighted Jump Rope",
    description:
      "Speed and agility training rope with weighted handles for extra resistance.",
    price: 15000,
    category: "Sport Gears",
    brand: "DozaFit",
    sizes: ["Adjustable"],
    colors: ["Blue", "Black", "Red"],
    imageUrl: "/assets/shop/jumprope.jpg",
    rating: 4.5,
    inStock: true,
  },
  {
    id: "13",
    name: "Doza Steel Water Bottle",
    description:
      "1L insulated stainless steel bottle keeps drinks cold for 24h.",
    price: 8000,
    category: "Sport Gears",
    brand: "Doza",
    colors: ["Silver", "Black", "Blue"],
    imageUrl: "/assets/shop/watterbottle.jpg",
    rating: 4.9,
    inStock: true,
  },
  {
    id: "14",
    name: "Barbell Weight Set",
    description:
      "50kg barbell with weight plates and collars. Ideal for home gym.",
    price: 120000,
    category: "Sport Gears",
    brand: "DozaFit",
    sizes: ["50kg"],
    colors: ["Black"],
    imageUrl: "/assets/shop/barbells.jpg",
    rating: 4.7,
    inStock: true,
  },
  {
    id: "21",
    name: "TRX Suspension Trainer Pro4",
    description:
      "Professional suspension training system for full-body workouts.",
    price: 85000,
    category: "Sport Gears",
    brand: "TRX",
    colors: ["Black/Red"],
    imageUrl: "/assets/shop/jumprope.jpg",
    rating: 4.9,
    inStock: true,
  },
  {
    id: "22",
    name: "Yoga Mat with Carrying Strap",
    description:
      "Non-slip, eco-friendly mat with extra cushioning. Includes strap.",
    price: 12000,
    category: "Sport Gears",
    brand: "Doza",
    colors: ["Purple", "Green", "Blue"],
    imageUrl: "/assets/shop/jumprope.jpg",
    rating: 4.6,
    inStock: true,
  },
  // Audio & Tech
  {
    id: "10",
    name: "Apple AirPods Pro (2nd gen)",
    description:
      "Active noise cancellation, transparency mode, and sweat‑resistant.",
    price: 120000,
    category: "Audio & Tech",
    brand: "Apple",
    colors: ["White"],
    imageUrl: "/assets/shop/earpodspro.jpg",
    rating: 4.9,
    inStock: true,
  },
  {
    id: "11",
    name: "Samsung Galaxy Watch 6",
    description:
      "Advanced fitness tracking, heart rate monitoring, GPS, and sleep coaching.",
    price: 180000,
    category: "Audio & Tech",
    brand: "Samsung",
    colors: ["Black", "Silver", "Gold"],
    imageUrl: "/assets/shop/smart_watch.jpg",
    rating: 4.8,
    inStock: true,
  },
  {
    id: "12",
    name: "Garmin Forerunner 245",
    description:
      "GPS running watch with music storage, body battery, and performance metrics.",
    price: 220000,
    category: "Audio & Tech",
    brand: "Garmin",
    colors: ["Black", "Blue"],
    imageUrl: "/assets/shop/smart_watch_two.jpg",
    rating: 4.9,
    inStock: true,
  },
  {
    id: "15",
    name: "AirPods (2nd gen)",
    description:
      "Wireless earbuds with charging case and seamless Apple integration.",
    price: 85000,
    category: "Audio & Tech",
    brand: "Apple",
    colors: ["White"],
    imageUrl: "/assets/shop/earpods.jpg",
    rating: 4.7,
    inStock: true,
  },
  {
    id: "23",
    name: "Fitbit Charge 5",
    description:
      "Advanced fitness tracker with daily readiness score and EDA sensor.",
    price: 95000,
    category: "Audio & Tech",
    brand: "Fitbit",
    colors: ["Black", "White", "Blue"],
    imageUrl: "/assets/shop/smart_watch.jpg",
    rating: 4.7,
    inStock: true,
  },
  {
    id: "24",
    name: "Bose SoundSport Free",
    description:
      "Truly wireless sport earbuds with sweat resistance and powerful sound.",
    price: 110000,
    category: "Audio & Tech",
    brand: "Bose",
    colors: ["Black", "Blue", "Yellow"],
    imageUrl: "/assets/shop/earpodspro.jpg",
    rating: 4.8,
    inStock: true,
  },
];

const categories = [
  "All",
  "Sport Shoes",
  "Sport Wears",
  "Sport Gears",
  "Audio & Tech",
] as const;

// ---------- Help Slides (complete) ----------
const helpSlides = [
  {
    icon: <ShoppingCart className="w-12 h-12 text-emerald-600" />,
    title: "Browse & Add to Cart",
    description: "Find your gear, select size/color, and add to cart.",
  },
  {
    icon: <Heart className="w-12 h-12 text-emerald-600" />,
    title: "Save for Later",
    description: "Click the heart to save items to your wishlist.",
  },
  {
    icon: <Filter className="w-12 h-12 text-emerald-600" />,
    title: "Filter & Search",
    description: "Narrow down by category, size, or price range.",
  },
  {
    icon: <CreditCard className="w-12 h-12 text-emerald-600" />,
    title: "Secure Checkout",
    description: "Enter your address, choose payment, and place order.",
  },
  {
    icon: <Package className="w-12 h-12 text-emerald-600" />,
    title: "Track Orders",
    description: "Monitor your order status in the Orders tab.",
  },
  {
    icon: <Star className="w-12 h-12 text-emerald-600" />,
    title: "Reviews & Ratings",
    description: "See what others think before you buy.",
  },
];

// ---------- PDF Generation Function (modern, professional, robust) ----------
const generateOrderReceipt = async (order: Order, userName: string) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = margin;

    // Ensure orderId is a string
    const orderId = order?.orderId || "N/A";

    // Header with logo and company name
    try {
      doc.addImage("/logo.png", "PNG", margin, y, 20, 20);
      y += 25;
    } catch (e) {
      // Logo failed, just use text
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(16, 185, 129); // emerald-600
      doc.text("DOZA SPORT", margin, y + 10);
      y += 20;
    }

    // Company name alongside logo (or after)
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129);
    doc.text("DOZA SPORT", pageWidth - margin - 60, y - 10, { align: "right" });

    // Decorative line
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Receipt title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Order Receipt", margin, y);
    y += 8;

    // Order details in a clean two-column layout
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Order ID:", margin, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(orderId, margin + 30, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Date:", pageWidth / 2, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    const dateStr = new Date(order.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    doc.text(dateStr, pageWidth / 2 + 20, y);
    y += 8;

    // Estimated delivery
    const deliveryDate = new Date(order.createdAt);
    deliveryDate.setDate(deliveryDate.getDate() + 5);
    const deliveryStr = deliveryDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Est. Delivery:", margin, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(deliveryStr, margin + 45, y);
    y += 12;

    // Customer info section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129);
    doc.text("Customer Information", margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Name:", margin, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(userName, margin + 20, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Address:", margin, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(order.deliveryAddress, margin + 25, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Phone:", margin, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(order.phoneNumber, margin + 20, y);
    y += 10;

    // Items table
    autoTable(doc, {
      startY: y,
      head: [["Product", "Qty", "Unit Price (NGN)", "Total (NGN)"]],
      body: order.items.map((item) => [
        item.name +
          (item.size ? ` (${item.size})` : "") +
          (item.color ? `, ${item.color}` : ""),
        item.quantity,
        `NGN ${item.price.toLocaleString()}`,
        `NGN ${(item.price * item.quantity).toLocaleString()}`,
      ]),
      foot: [
        ["", "", "Subtotal", `NGN ${order.subtotal.toLocaleString()}`],
        ["", "", "Delivery Fee", `NGN ${order.deliveryFee.toLocaleString()}`],
        ["", "", "Total", `NGN ${order.totalAmount.toLocaleString()}`],
      ],
      theme: "striped",
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: [255, 255, 255],
        fontSize: 11,
      },
      footStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 11,
      },
      columnStyles: { 0: { cellWidth: 70 } },
      styles: { fontSize: 10, cellPadding: 3 },
    });

    // Payment method and status
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129);
    doc.text("Payment & Status", margin, finalY);
    y = finalY + 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Payment Method:", margin, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(order.paymentMethod, margin + 40, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Order Status:", margin, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    const statusColor =
      order.status === "processing"
        ? "#F59E0B"
        : order.status === "confirmed"
          ? "#3B82F6"
          : "#10B981";
    doc.setTextColor(statusColor);
    doc.text(
      order.status.charAt(0).toUpperCase() + order.status.slice(1),
      margin + 40,
      y,
    );
    doc.setTextColor(0, 0, 0);
    y += 12;

    // Support contact
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129);
    doc.text("Need help?", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("support@doza.com  |  +234 81 27728084", margin, y);
    y += 8;

    // Thank you message
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "Thank you for shopping with Doza Sport!",
      pageWidth / 2,
      pageHeight - margin,
      { align: "center" },
    );

    // Save PDF
    doc.save(`DozaSport_Order_${orderId}.pdf`);
    return true;
  } catch (error) {
    console.error("PDF generation failed:", error);
    alert("Failed to generate receipt, but your order has been placed.");
    return false;
  }
};

// ---------- Subcomponent Props ----------
interface ProductCardProps {
  product: Product;
  isSaved: boolean;
  onToggleSave: () => void;
  onAddToCart: (size?: string, color?: string) => void;
  onQuickView: () => void;
}

interface SavedItemsTabProps {
  savedItems: SavedItem[];
  onToggleSave: (product: Product) => void;
}

interface OrdersTabProps {
  orders: Record<string, Order>;
}

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

interface ProductQuickViewProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (
    product: Product,
    quantity: number,
    size?: string,
    color?: string,
  ) => void;
  isSaved: boolean;
  onToggleSave: () => void;
}

interface CheckoutModalProps {
  cartItems: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  onClose: () => void;
  onPlaceOrder: (orderData: any) => Promise<any>; // returns order object with orderId
  user: any;
  clearCart: () => void;
}

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg";
}

// ---------- Main Component ----------
export default function DozaSportShopPanel() {
  const { user } = useUser();
  const {
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    deliveryFee,
    total,
  } = useCart();
  const { savedItems, toggleSave, isSaved } = useSavedItems();
  const { orders, placeOrder } = useOrders();

  // UI state
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof categories)[number]>("All");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 300000]);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showQuickView, setShowQuickView] = useState<Product | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpSlide, setHelpSlide] = useState(0);
  const [activeTab, setActiveTab] = useState<"shop" | "saved" | "orders">(
    "shop",
  );

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || p.category === selectedCategory;
      const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
      const matchesSize =
        !selectedSize || (p.sizes && p.sizes.includes(selectedSize));
      return matchesSearch && matchesCategory && matchesPrice && matchesSize;
    });
  }, [search, selectedCategory, priceRange, selectedSize]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach((p) => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, [filteredProducts]);

  const allSizes = useMemo(() => {
    const sizeSet = new Set<string>();
    products.forEach((p) => p.sizes?.forEach((s) => sizeSet.add(s)));
    return Array.from(sizeSet).sort();
  }, []);

  // First‑visit help
  useEffect(() => {
    const hasSeen = localStorage.getItem("doza_shop_help");
    if (!hasSeen) {
      setShowHelp(true);
      localStorage.setItem("doza_shop_help", "true");
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-6 bg-gradient-to-br from-gray-50 to-white min-h-screen",
        poppins.className,
      )}
    >
      {/* Top Banner */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-xl">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between p-5 sm:p-8">
          <div className="flex items-center gap-4 sm:gap-6 mb-4 sm:mb-0">
            <Trophy className="w-10 h-10 sm:w-14 sm:h-14 text-white/90" />
            <div>
              <h2
                className={cn(
                  "text-2xl sm:text-3xl font-bold tracking-wide",
                  bebasNeue.className,
                )}
              >
                GEAR UP, GAME ON
              </h2>
              <p className="text-white/90 text-sm sm:text-base max-w-md">
                Your one‑stop shop for premium sport equipment, apparel, and
                tech.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition text-white text-sm sm:text-base font-medium min-h-[44px]"
          >
            <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>How to shop</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-5 overflow-x-auto pb-1 gap-2 scrollbar-hide">
        {[
          { id: "shop", label: "Shop", icon: ShoppingCart },
          {
            id: "saved",
            label: "Saved",
            icon: Heart,
            count: savedItems?.length,
          },
          {
            id: "orders",
            label: "Orders",
            icon: Package,
            count: Object.keys(orders || {}).length,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm sm:text-base font-medium border-b-2 transition relative whitespace-nowrap",
                activeTab === tab.id
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
              )}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              {tab.label}
              {tab.count ? (
                <span className="ml-1 text-xs bg-emerald-100 text-emerald-700 px-1.5 rounded-full">
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Conditional Content */}
      {activeTab === "shop" && (
        <>
          {/* Search & Filter Bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-md mb-6">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm min-h-[44px] placeholder:text-gray-400"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition min-h-[44px] lg:hidden"
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
              <div className="hidden lg:flex items-center gap-3">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as any)}
                  className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm min-h-[44px]"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm min-h-[44px]"
                >
                  <option value="">All Sizes</option>
                  {allSizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">₦</span>
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange[0]}
                    onChange={(e) =>
                      setPriceRange([+e.target.value, priceRange[1]])
                    }
                    className="w-20 px-2 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange[1]}
                    onChange={(e) =>
                      setPriceRange([priceRange[0], +e.target.value])
                    }
                    className="w-20 px-2 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Mobile filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="lg:hidden mt-3 pt-3 border-t border-gray-200"
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) =>
                          setSelectedCategory(e.target.value as any)
                        }
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Size
                      </label>
                      <select
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900"
                      >
                        <option value="">All Sizes</option>
                        {allSizes.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price Range (₦)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={priceRange[0]}
                          onChange={(e) =>
                            setPriceRange([+e.target.value, priceRange[1]])
                          }
                          className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                          type="number"
                          placeholder="Max"
                          value={priceRange[1]}
                          onChange={(e) =>
                            setPriceRange([priceRange[0], +e.target.value])
                          }
                          className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Horizontally scrollable product rows by category */}
          {Object.entries(groupedByCategory).map(([category, products]) => (
            <div key={category} className="mb-8">
              <h3
                className={cn(
                  "text-xl sm:text-2xl font-bold text-gray-800 mb-3 px-1",
                  bebasNeue.className,
                )}
              >
                {category}
              </h3>
              <div className="overflow-x-auto pb-4 scrollbar-hide">
                <div className="flex gap-4">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="w-64 sm:w-72 flex-shrink-0"
                    >
                      <ProductCard
                        product={product}
                        isSaved={isSaved(product.id)}
                        onToggleSave={() => toggleSave(product)}
                        onAddToCart={(size, color) =>
                          addToCart(product, 1, size, color)
                        }
                        onQuickView={() => setShowQuickView(product)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {Object.keys(groupedByCategory).length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">
                No products match your filters.
              </p>
            </div>
          )}
        </>
      )}

      {activeTab === "saved" && (
        <SavedItemsTab savedItems={savedItems} onToggleSave={toggleSave} />
      )}
      {activeTab === "orders" && <OrdersTab orders={orders} />}

      {/* Floating Cart Button */}
      <button
        onClick={() => setShowCart(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 bg-emerald-600 text-white rounded-full shadow-xl hover:bg-emerald-700 transition hover:scale-110"
      >
        <ShoppingCart className="w-6 h-6" />
        {cartItems.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {cartItems.length}
          </span>
        )}
      </button>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {showCart && (
          <CartSidebar
            cartItems={cartItems}
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            total={total}
            onUpdateQuantity={updateQuantity}
            onRemove={removeFromCart}
            onClose={() => setShowCart(false)}
            onCheckout={() => {
              setShowCart(false);
              setShowCheckout(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Quick View Modal */}
      <AnimatePresence>
        {showQuickView && (
          <ProductQuickView
            product={showQuickView}
            onClose={() => setShowQuickView(null)}
            onAddToCart={addToCart}
            isSaved={isSaved(showQuickView.id)}
            onToggleSave={() => toggleSave(showQuickView)}
          />
        )}
      </AnimatePresence>

      {/* Checkout Modal with PDF generation */}
      <AnimatePresence>
        {showCheckout && (
          <CheckoutModal
            cartItems={cartItems}
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            total={total}
            onClose={() => setShowCheckout(false)}
            onPlaceOrder={placeOrder}
            user={user}
            clearCart={clearCart}
          />
        )}
      </AnimatePresence>

      {/* Help Carousel Modal */}
      <AnimatePresence>
        {showHelp && (
          <Modal onClose={() => setShowHelp(false)}>
            <div className="flex items-center justify-between mb-6">
              <h2
                className={cn(
                  "text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2",
                  bebasNeue.className,
                )}
              >
                <HelpCircle className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
                How to Shop
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={helpSlide}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center text-center p-6"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                    {helpSlides[helpSlide].icon}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-3">
                    {helpSlides[helpSlide].title}
                  </h3>
                  <p className="text-base text-gray-600 max-w-sm">
                    {helpSlides[helpSlide].description}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="flex justify-center gap-2 mt-6">
                {helpSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setHelpSlide(idx)}
                    className={cn(
                      "w-2.5 h-2.5 rounded-full transition",
                      idx === helpSlide ? "bg-emerald-600 w-6" : "bg-gray-300",
                    )}
                  />
                ))}
              </div>

              <button
                onClick={() =>
                  setHelpSlide((prev) =>
                    prev === 0 ? helpSlides.length - 1 : prev - 1,
                  )
                }
                className="absolute left-0 top-1/2 -translate-y-1/2 p-2 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() =>
                  setHelpSlide((prev) =>
                    prev === helpSlides.length - 1 ? 0 : prev + 1,
                  )
                }
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-8 w-full px-4 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition text-lg font-medium min-h-[44px]"
            >
              Start Shopping
            </button>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------- Product Card ----------
const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isSaved,
  onToggleSave,
  onAddToCart,
  onQuickView,
}) => {
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || "");
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || "");

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      whileHover={{ y: -5 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-xl transition-all overflow-hidden cursor-pointer group h-full flex flex-col"
      onClick={onQuickView}
    >
      <div className="relative h-40 sm:h-44 overflow-hidden bg-gray-100 flex-shrink-0">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave();
          }}
          className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition"
        >
          <Heart
            className={cn(
              "w-4 h-4",
              isSaved ? "fill-red-500 text-red-500" : "text-gray-600",
            )}
          />
        </button>
        {!product.inStock && (
          <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-red-500 text-white text-xs font-semibold rounded-full">
            Out of Stock
          </span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-gray-800 text-base sm:text-lg line-clamp-1">
          {product.name}
        </h3>
        <p className="text-xs text-gray-500 mb-2">{product.brand}</p>
        <div className="flex items-center justify-between mb-3">
          <span className="text-emerald-700 font-bold text-lg">
            ₦{product.price.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-gray-600">{product.rating}</span>
          </div>
        </div>

        {product.sizes && (
          <div className="mb-3" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs text-gray-500 mb-1">Select Size</p>
            <div className="flex flex-wrap gap-1">
              {product.sizes.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  className={cn(
                    "px-2 py-1 text-xs rounded-lg border",
                    selectedSize === s
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200",
                  )}
                >
                  {s}
                </button>
              ))}
              {product.sizes.length > 3 && (
                <span className="text-xs text-gray-400">
                  +{product.sizes.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(selectedSize, selectedColor);
          }}
          disabled={!product.inStock}
          className={cn(
            "w-full mt-auto py-2.5 rounded-xl transition text-sm font-medium min-h-[40px]",
            product.inStock
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed",
          )}
        >
          {product.inStock ? "Add to Cart" : "Out of Stock"}
        </button>
      </div>
    </motion.div>
  );
};

// ---------- Saved Items Tab ----------
const SavedItemsTab: React.FC<SavedItemsTabProps> = ({
  savedItems,
  onToggleSave,
}) => {
  if (!savedItems?.length) {
    return (
      <div className="text-center py-16">
        <Heart className="w-20 h-20 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600 text-lg">
          Your saved items will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {savedItems.map((item) => (
        <div
          key={item.id}
          className="bg-white rounded-2xl border border-gray-100 shadow-md p-4"
        >
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-40 object-cover rounded-xl mb-4"
          />
          <h3 className="font-bold text-gray-800 text-lg">{item.name}</h3>
          <p className="text-emerald-700 font-bold text-xl mt-2">
            ₦{item.price.toLocaleString()}
          </p>
          <button
            onClick={() => onToggleSave(item as any)}
            className="mt-4 w-full py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition text-sm font-medium min-h-[44px]"
          >
            Remove from Saved
          </button>
        </div>
      ))}
    </div>
  );
};

// ---------- Orders Tab ----------
const OrdersTab: React.FC<OrdersTabProps> = ({ orders }) => {
  const orderList = Object.values(orders || {}).sort(
    (a, b) => b.createdAt - a.createdAt,
  );

  if (!orderList.length) {
    return (
      <div className="text-center py-16">
        <Package className="w-20 h-20 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600 text-lg">
          You haven't placed any orders yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {orderList.map((order) => (
        <div
          key={order.orderId}
          className="bg-white rounded-xl border border-gray-200 shadow-md p-5"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <div>
              <p className="text-sm text-gray-500">Order #{order.orderId}</p>
              <p className="text-xs text-gray-400">
                {new Date(order.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <span
              className={cn(
                "mt-2 sm:mt-0 px-3 py-1 rounded-full text-xs font-semibold",
                order.status === "delivered"
                  ? "bg-green-100 text-green-700"
                  : order.status === "confirmed"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-yellow-100 text-yellow-700",
              )}
            >
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div
                key={item.cartItemId}
                className="flex justify-between text-sm"
              >
                <span className="text-gray-700">
                  {item.name} x{item.quantity}
                </span>
                <span className="font-medium text-gray-800">
                  ₦{(item.price * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between font-bold text-lg">
            <span className="text-gray-800">Total</span>
            <span className="text-emerald-700">
              ₦{order.totalAmount.toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ---------- Cart Sidebar ----------
const CartSidebar: React.FC<CartSidebarProps> = ({
  cartItems,
  subtotal,
  deliveryFee,
  total,
  onUpdateQuantity,
  onRemove,
  onClose,
  onCheckout,
}) => (
  <motion.div
    initial={{ x: "100%" }}
    animate={{ x: 0 }}
    exit={{ x: "100%" }}
    transition={{ type: "tween" }}
    className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col"
  >
    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
      <h2
        className={cn("text-2xl font-bold text-gray-800", bebasNeue.className)}
      >
        Your Cart
      </h2>
      <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
        <X className="w-5 h-5 text-gray-500" />
      </button>
    </div>

    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {cartItems.length === 0 ? (
        <p className="text-center text-gray-500 mt-10">Your cart is empty.</p>
      ) : (
        cartItems.map((item) => (
          <div
            key={item.cartItemId}
            className="flex gap-3 border-b border-gray-100 pb-4"
          >
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-16 h-16 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h3 className="font-medium text-gray-800 text-sm">{item.name}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {item.size} {item.size && item.color && "/"} {item.color}
              </p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center border border-gray-200 rounded-lg">
                  <button
                    onClick={() =>
                      onUpdateQuantity(item.cartItemId, item.quantity - 1)
                    }
                    className="px-2 py-1 hover:bg-gray-100"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="px-2 py-1 text-sm w-8 text-center text-gray-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      onUpdateQuantity(item.cartItemId, item.quantity + 1)
                    }
                    className="px-2 py-1 hover:bg-gray-100"
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
              className="text-gray-400 hover:text-red-500 self-center"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))
      )}
    </div>

    {cartItems.length > 0 && (
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-900">
              ₦{subtotal.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Delivery</span>
            <span className="font-medium text-gray-900">
              ₦{deliveryFee.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
            <span className="text-gray-800">Total</span>
            <span className="text-emerald-700">₦{total.toLocaleString()}</span>
          </div>
        </div>
        <button
          onClick={onCheckout}
          className="w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-medium text-base"
        >
          Proceed to Checkout
        </button>
      </div>
    )}
  </motion.div>
);

// ---------- Product Quick View ----------
const ProductQuickView: React.FC<ProductQuickViewProps> = ({
  product,
  onClose,
  onAddToCart,
  isSaved,
  onToggleSave,
}) => {
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || "");
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || "");
  const [quantity, setQuantity] = useState(1);

  return (
    <Modal onClose={onClose} size="lg">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/2">
          <div className="rounded-xl overflow-hidden bg-gray-100">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
        <div className="md:w-1/2">
          <div className="flex justify-between items-start">
            <h2
              className={cn(
                "text-2xl sm:text-3xl font-bold text-gray-800",
                bebasNeue.className,
              )}
            >
              {product.name}
            </h2>
            <button
              onClick={onToggleSave}
              className="p-2 border border-gray-200 rounded-full hover:bg-gray-50"
            >
              <Heart
                className={cn(
                  "w-5 h-5",
                  isSaved ? "fill-red-500 text-red-500" : "text-gray-600",
                )}
              />
            </button>
          </div>
          <p className="text-emerald-700 font-bold text-2xl mt-2">
            ₦{product.price.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mt-4 leading-relaxed">
            {product.description}
          </p>
          <div className="flex items-center gap-2 mt-4">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            <span className="text-gray-700 font-medium">{product.rating}</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">{product.brand}</span>
          </div>

          {product.sizes && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Size</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={cn(
                      "px-4 py-2 text-sm rounded-lg border transition",
                      selectedSize === s
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.colors && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className={cn(
                      "px-4 py-2 text-sm rounded-lg border transition",
                      selectedColor === c
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center border border-gray-200 rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-2 hover:bg-gray-100"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 py-2 text-base w-12 text-center text-gray-900">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-3 py-2 hover:bg-gray-100"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => {
                onAddToCart(product, quantity, selectedSize, selectedColor);
                onClose();
              }}
              disabled={!product.inStock}
              className={cn(
                "flex-1 py-3 rounded-xl transition text-base font-medium",
                product.inStock
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed",
              )}
            >
              {product.inStock ? "Add to Cart" : "Out of Stock"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ---------- Checkout Modal with PDF Generation ----------
const CheckoutModal: React.FC<CheckoutModalProps> = ({
  cartItems,
  subtotal,
  deliveryFee,
  total,
  onClose,
  onPlaceOrder,
  user,

  clearCart,
}) => {
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Pay on Delivery");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true);
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

    try {
      const createdOrder = await onPlaceOrder(orderData);

      // Determine the order ID robustly
      let orderId: string;
      if (typeof createdOrder === "string") {
        orderId = createdOrder;
      } else if (createdOrder && typeof createdOrder === "object") {
        orderId = createdOrder.orderId || createdOrder.id;
      } else {
        orderId = "N/A";
      }

      const receiptOrder: Order = {
        ...orderData,
        orderId,
        createdAt: orderData.createdAt,
        items: cartItems,
      };

      await generateOrderReceipt(receiptOrder, user?.fullName || "Customer");
      clearCart();
      onClose();
    } catch (error) {
      console.error("Order placement failed:", error);
      alert("Failed to place order. Please try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <Modal onClose={onClose} size="lg">
      <h2
        className={cn(
          "text-2xl sm:text-3xl font-bold text-gray-800 mb-6",
          bebasNeue.className,
        )}
      >
        Checkout
      </h2>

      {/* Steps */}
      <div className="flex mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1 flex items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                step >= s
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-200 text-gray-500",
              )}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={cn(
                  "flex-1 h-1 mx-2",
                  step > s ? "bg-emerald-600" : "bg-gray-200",
                )}
              />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            Delivery Address
          </h3>
          <input
            type="text"
            placeholder="Street address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder:text-gray-400"
          />
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-emerald-600" />
            <input
              type="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={!address || !phone}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 text-lg font-medium"
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            Payment Method
          </h3>
          {["Pay on Delivery", "Card", "Bank Transfer"].map((method) => (
            <label
              key={method}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50"
            >
              <input
                type="radio"
                name="payment"
                value={method}
                checked={paymentMethod === method}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-4 h-4 text-emerald-600"
              />
              <span className="text-gray-700">{method}</span>
            </label>
          ))}
          <div className="flex gap-4">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 text-lg font-medium"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-lg font-medium"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            Order Summary
          </h3>
          <div className="bg-gray-50 p-5 rounded-xl space-y-3">
            {cartItems.map((item) => (
              <div
                key={item.cartItemId}
                className="flex justify-between text-sm"
              >
                <span className="text-gray-700">
                  {item.name} x{item.quantity}
                </span>
                <span className="font-medium text-gray-900">
                  ₦{(item.price * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">
                  ₦{subtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery</span>
                <span className="text-gray-900">
                  ₦{deliveryFee.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2">
                <span className="text-gray-800">Total</span>
                <span className="text-emerald-700">
                  ₦{total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 text-lg font-medium"
            >
              Back
            </button>
            <button
              onClick={handlePlaceOrder}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-lg font-medium"
            >
              Place Order
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ---------- Reusable Modal ----------
const Modal: React.FC<ModalProps> = ({ children, onClose, size = "md" }) => {
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className={cn(
          "bg-white rounded-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl",
          sizeClasses[size],
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};
