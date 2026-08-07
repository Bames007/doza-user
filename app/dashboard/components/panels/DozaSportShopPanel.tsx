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

// ---------- Main Component (Enhanced Sport Shop Panel) ----------
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

  // First-visit help
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
        "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 bg-gradient-to-br from-gray-50/80 via-white to-emerald-50/20 min-h-screen",
        poppins.className,
      )}
    >
      {/* Top Banner – Refined layout with modern badging */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8 bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 mb-3 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
              Active Lifestyle
            </span>
          </div>
          <h1
            className={cn(
              "text-3xl sm:text-5xl text-slate-900 leading-none tracking-tight",
              bebasNeue.className,
            )}
          >
            Sport <span className="text-emerald-600">Shop</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg leading-relaxed">
            Gear up for your fitness journey with high-performance equipment and
            professional accessories.
          </p>
        </div>
        <button
          onClick={() => setShowHelp(true)}
          className="group inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl font-semibold hover:bg-emerald-600 active:scale-98 transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-emerald-600/20 text-xs sm:text-sm cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-emerald-400 group-hover:text-white transition-colors" />
          <span>How to Shop</span>
        </button>
      </div>

      {/* Tabs – Modern pill layout with animated states */}
      <div className="flex border-b border-gray-200/80 mb-8 overflow-x-auto gap-2 scrollbar-hide pb-2">
        {[
          { id: "shop", label: "Shop Catalog", icon: ShoppingCart },
          {
            id: "saved",
            label: "Saved Items",
            icon: Heart,
            count: savedItems?.length,
          },
          {
            id: "orders",
            label: "My Orders",
            icon: Package,
            count: Object.keys(orders || {}).length,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "group flex items-center gap-2.5 px-5 py-3 text-xs sm:text-sm font-semibold rounded-2xl transition-all duration-300 whitespace-nowrap cursor-pointer",
                isActive
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-[1.02]"
                  : "bg-white/80 text-gray-600 hover:bg-gray-100/80 border border-gray-200/60 shadow-xs",
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 transition-transform group-hover:scale-110",
                  isActive ? "text-white" : "text-gray-400",
                )}
              />
              <span>{tab.label}</span>
              {tab.count ? (
                <span
                  className={cn(
                    "ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-emerald-50 text-emerald-600 border border-emerald-100",
                  )}
                >
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
          {/* Search & Filter Bar – Modern floating aesthetic */}
          <div className="sticky top-4 z-20 bg-white/90 backdrop-blur-md border border-gray-200/80 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8 transition-all">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search products, gear, apparel..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-gray-800 text-xs sm:text-sm transition-all placeholder:text-gray-400"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200/50 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-gray-100/80 hover:bg-gray-200/80 active:scale-98 border border-gray-200/80 text-gray-700 rounded-xl font-medium text-xs sm:text-sm transition-all lg:hidden cursor-pointer"
              >
                <Filter className="w-4 h-4 text-gray-500" />
                <span>Filters</span>
                <span className="w-5 h-5 rounded-full bg-white text-emerald-600 text-[10px] font-bold flex items-center justify-center shadow-2xs">
                  {showFilters ? "▲" : "▼"}
                </span>
              </button>
              <div className="hidden lg:flex items-center gap-3 flex-wrap">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as any)}
                  className="px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-gray-700 text-xs font-medium cursor-pointer transition-all"
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
                  className="px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-gray-700 text-xs font-medium cursor-pointer transition-all"
                >
                  <option value="">All Sizes</option>
                  {allSizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-1.5">
                  <span className="text-xs text-gray-400 font-semibold">₦</span>
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange[0]}
                    onChange={(e) =>
                      setPriceRange([+e.target.value, priceRange[1]])
                    }
                    className="w-16 bg-transparent text-xs text-gray-800 focus:outline-none placeholder:text-gray-400 font-medium"
                  />
                  <span className="text-gray-300">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange[1]}
                    onChange={(e) =>
                      setPriceRange([priceRange[0], +e.target.value])
                    }
                    className="w-16 bg-transparent text-xs text-gray-800 focus:outline-none placeholder:text-gray-400 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Mobile filters – smooth expansion */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="lg:hidden mt-4 pt-4 border-t border-gray-100"
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                        Category
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) =>
                          setSelectedCategory(e.target.value as any)
                        }
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 font-medium"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                        Size
                      </label>
                      <select
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 font-medium"
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
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
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
                          className="w-1/2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder:text-gray-400 font-medium"
                        />
                        <span className="text-gray-400 font-bold">-</span>
                        <input
                          type="number"
                          placeholder="Max"
                          value={priceRange[1]}
                          onChange={(e) =>
                            setPriceRange([priceRange[0], +e.target.value])
                          }
                          className="w-1/2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder:text-gray-400 font-medium"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Product rows with improved layout */}
          {Object.entries(groupedByCategory).map(([category, products]) => (
            <div key={category} className="mb-12">
              {/* Category header */}
              <div className="flex items-center gap-3 mb-5 px-1">
                <div className="w-1.5 h-6 rounded-full bg-emerald-500 shadow-xs" />
                <h3
                  className={cn(
                    "text-xl sm:text-2xl font-semibold text-slate-800 tracking-tight",
                    bebasNeue.className,
                  )}
                >
                  {category}
                  <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100/80 px-2.5 py-0.5 rounded-full">
                    {products.length} available
                  </span>
                </h3>
              </div>

              {/* Scrollable product row */}
              <div className="relative group/slider">
                <div className="absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-gray-50/80 via-white/40 to-transparent pointer-events-none z-10" />
                <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-gray-50/80 via-white/40 to-transparent pointer-events-none z-10" />

                <div className="overflow-x-auto pb-4 pt-1 px-1 scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-emerald-500/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-emerald-500/40 transition-all">
                  <div className="flex gap-5 px-1">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="w-60 sm:w-68 flex-shrink-0"
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
            </div>
          ))}

          {Object.keys(groupedByCategory).length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-400">
                <Search className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-1">
                No products found
              </h4>
              <p className="text-gray-400 text-xs sm:text-sm max-w-xs mx-auto">
                Try adjusting your search criteria or price filters to explore
                more items.
              </p>
            </div>
          )}
        </>
      )}

      {activeTab === "saved" && (
        <SavedItemsTab savedItems={savedItems} onToggleSave={toggleSave} />
      )}
      {activeTab === "orders" && <OrdersTab orders={orders} />}

      {/* Floating Cart Button – modern pulsating badge */}
      <button
        onClick={() => setShowCart(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 bg-emerald-600 text-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(16,185,129,0.5)] hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer group"
      >
        <ShoppingCart className="w-6 h-6 transition-transform group-hover:rotate-12" />
        {cartItems.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md animate-bounce">
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
          <Modal onClose={() => setShowHelp(false)} size="lg">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h2
                  className={cn(
                    "text-2xl font-bold text-slate-900 tracking-wide",
                    bebasNeue.className,
                  )}
                >
                  How to Shop Sport
                </h2>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative py-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={helpSlide}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="flex flex-col items-center text-center px-4"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl flex items-center justify-center mb-6 shadow-inner text-emerald-600">
                    {helpSlides[helpSlide].icon}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                    {helpSlides[helpSlide].title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 max-w-sm leading-relaxed">
                    {helpSlides[helpSlide].description}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="flex justify-center gap-2 mt-8">
                {helpSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setHelpSlide(idx)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300 cursor-pointer",
                      idx === helpSlide
                        ? "bg-emerald-600 w-6"
                        : "bg-gray-200 w-2",
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
                className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-gray-200 shadow-md rounded-full flex items-center justify-center hover:bg-gray-50 transition-all cursor-pointer text-gray-600"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() =>
                  setHelpSlide((prev) =>
                    prev === helpSlides.length - 1 ? 0 : prev + 1,
                  )
                }
                className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-gray-200 shadow-md rounded-full flex items-center justify-center hover:bg-gray-50 transition-all cursor-pointer text-gray-600"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-8 w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all duration-200 text-xs sm:text-sm cursor-pointer"
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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="bg-white/90 backdrop-blur-md rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] transition-all overflow-hidden cursor-pointer group h-full flex flex-col relative"
      onClick={onQuickView}
    >
      <div className="relative h-44 sm:h-48 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 flex-shrink-0">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave();
          }}
          className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-md rounded-2xl shadow-md hover:bg-white active:scale-90 transition-all cursor-pointer group/heart"
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-transform group-hover/heart:scale-110",
              isSaved ? "fill-red-500 text-red-500" : "text-gray-500",
            )}
          />
        </button>

        {!product.inStock && (
          <span className="absolute bottom-3 left-3 px-3 py-1 bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold tracking-wider uppercase rounded-xl shadow-xs">
            Out of Stock
          </span>
        )}
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/50">
              {product.brand}
            </span>
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100/50">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-[11px] font-bold text-amber-700">
                {product.rating}
              </span>
            </div>
          </div>

          <h3 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-1 group-hover:text-emerald-600 transition-colors">
            {product.name}
          </h3>

          <div className="mt-2 mb-4">
            <span className="text-emerald-700 font-extrabold text-base sm:text-lg tracking-tight">
              ₦{product.price.toLocaleString()}
            </span>
          </div>

          {product.sizes && (
            <div className="mb-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Size
                </span>
                <span className="text-[11px] font-medium text-emerald-600">
                  {selectedSize}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {product.sizes.slice(0, 3).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-semibold rounded-xl border transition-all cursor-pointer",
                      selectedSize === s
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20"
                        : "bg-gray-50 text-gray-700 border-gray-200/80 hover:bg-gray-100",
                    )}
                  >
                    {s}
                  </button>
                ))}
                {product.sizes.length > 3 && (
                  <span className="flex items-center text-[11px] font-bold text-gray-400 px-1">
                    +{product.sizes.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(selectedSize, selectedColor);
          }}
          disabled={!product.inStock}
          className={cn(
            "w-full py-3 rounded-2xl transition-all text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm",
            product.inStock
              ? "bg-slate-900 text-white hover:bg-emerald-600 active:scale-98 shadow-slate-900/10 hover:shadow-emerald-600/20"
              : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200",
          )}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>{product.inStock ? "Add to Cart" : "Out of Stock"}</span>
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
      <div className="text-center py-24 bg-white/60 backdrop-blur-md rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
        <div className="w-20 h-20 bg-red-50 border border-red-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-red-400 shadow-inner">
          <Heart className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-1">
          No saved items yet
        </h3>
        <p className="text-gray-500 text-xs sm:text-sm max-w-sm mx-auto">
          Tap the heart icon on any product card to save your favorite gear and
          equipment for later.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {savedItems.map((item) => (
        <div
          key={item.id}
          className="bg-white/90 backdrop-blur-md rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] p-4 flex flex-col justify-between group hover:shadow-lg transition-all"
        >
          <div>
            <div className="relative h-44 rounded-2xl overflow-hidden bg-gray-50 mb-4">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500 ease-out"
              />
            </div>
            <h3 className="font-bold text-slate-900 text-base line-clamp-1 mb-1">
              {item.name}
            </h3>
            <p className="text-emerald-700 font-extrabold text-lg tracking-tight">
              ₦{item.price.toLocaleString()}
            </p>
          </div>

          <button
            onClick={() => onToggleSave(item as any)}
            className="mt-5 w-full py-3 bg-red-50 hover:bg-red-100 active:scale-98 text-red-600 rounded-2xl transition-all text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer border border-red-100"
          >
            <Heart className="w-4 h-4 fill-red-500 text-red-500" />
            <span>Remove from Saved</span>
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
      <div className="text-center py-24 bg-white/60 backdrop-blur-md rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
        <div className="w-20 h-20 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-emerald-500 shadow-inner">
          <Package className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-1">
          No orders placed yet
        </h3>
        <p className="text-gray-500 text-xs sm:text-sm max-w-sm mx-auto">
          Your active and past fitness gear orders will appear right here once
          you complete checkout.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {orderList.map((order) => (
        <div
          key={order.orderId}
          className="bg-white/90 backdrop-blur-md rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] p-6 transition-all hover:shadow-md"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b border-gray-100 gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                  Order #{order.orderId}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-medium">
                Placed on{" "}
                {new Date(order.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <span
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider",
                order.status === "delivered"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  : order.status === "confirmed"
                    ? "bg-blue-50 text-blue-700 border border-blue-100"
                    : "bg-amber-50 text-amber-700 border border-amber-100",
              )}
            >
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>

          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.cartItemId}
                className="flex items-center justify-between text-xs sm:text-sm bg-gray-50/50 p-3 rounded-2xl border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                    {item.quantity}x
                  </span>
                  <span className="text-slate-700 font-medium">
                    {item.name}
                  </span>
                </div>
                <span className="font-bold text-slate-900">
                  ₦{(item.price * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 mt-5 pt-4 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Total Amount
            </span>
            <span className="text-emerald-700 font-extrabold text-lg sm:text-xl tracking-tight">
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
    transition={{ type: "spring", damping: 25, stiffness: 200 }}
    className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white/95 backdrop-blur-xl shadow-2xl z-50 flex flex-col border-l border-gray-100"
  >
    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
      <div>
        <h2
          className={cn(
            "text-2xl sm:text-3xl font-bold text-slate-900 tracking-wide",
            bebasNeue.className,
          )}
        >
          Your Cart
        </h2>
        <p className="text-xs text-gray-400 font-medium">
          {cartItems.length} items selected
        </p>
      </div>
      <button
        onClick={onClose}
        className="p-2.5 hover:bg-gray-200/60 rounded-2xl transition-all cursor-pointer text-gray-500 hover:text-slate-900 active:scale-90"
      >
        <X className="w-5 h-5" />
      </button>
    </div>

    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {cartItems.length === 0 ? (
        <div className="text-center py-24 flex flex-col items-center justify-center h-full">
          <div className="w-20 h-20 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-emerald-500 shadow-inner">
            <ShoppingCart className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-1">
            Your cart is empty
          </h3>
          <p className="text-gray-500 text-xs sm:text-sm max-w-xs mx-auto">
            Looks like you haven't added anything to your cart yet. Explore our
            store to find great gear.
          </p>
        </div>
      ) : (
        cartItems.map((item) => (
          <div
            key={item.cartItemId}
            className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] items-center group transition-all hover:border-gray-200"
          >
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-18 h-18 object-cover rounded-xl bg-gray-50 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 text-sm truncate">
                {item.name}
              </h3>
              <p className="text-[11px] font-medium text-gray-400 mt-0.5">
                {item.size} {item.size && item.color && "•"} {item.color}
              </p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center border border-gray-200/80 rounded-xl bg-gray-50 overflow-hidden shadow-2xs">
                  <button
                    onClick={() =>
                      onUpdateQuantity(item.cartItemId, item.quantity - 1)
                    }
                    className="p-1.5 hover:bg-gray-200/70 text-gray-600 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="px-2.5 text-xs font-bold w-7 text-center text-slate-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      onUpdateQuantity(item.cartItemId, item.quantity + 1)
                    }
                    className="p-1.5 hover:bg-gray-200/70 text-gray-600 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="font-extrabold text-emerald-700 text-sm tracking-tight">
                  ₦{(item.price * item.quantity).toLocaleString()}
                </span>
              </div>
            </div>
            <button
              onClick={() => onRemove(item.cartItemId)}
              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer self-center"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))
      )}
    </div>

    {cartItems.length > 0 && (
      <div className="p-6 border-t border-gray-100 bg-gray-50/80 backdrop-blur-md">
        <div className="space-y-2.5 text-sm mb-5">
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Subtotal</span>
            <span className="font-semibold text-slate-900">
              ₦{subtotal.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Delivery Fee</span>
            <span className="font-semibold text-slate-900">
              ₦{deliveryFee.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between font-bold text-base pt-3 border-t border-gray-200/80">
            <span className="text-slate-900">Total</span>
            <span className="text-emerald-700 text-lg tracking-tight">
              ₦{total.toLocaleString()}
            </span>
          </div>
        </div>
        <button
          onClick={onCheckout}
          className="w-full py-3.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-2xl transition-all font-bold text-sm sm:text-base cursor-pointer shadow-lg shadow-slate-900/10 hover:shadow-emerald-600/20 active:scale-98"
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
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/2">
          <div className="rounded-3xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm relative h-72 sm:h-96">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <div className="md:w-1/2 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100/50 mb-2 inline-block">
                  {product.brand}
                </span>
                <h2
                  className={cn(
                    "text-2xl sm:text-3xl font-bold text-slate-900 leading-tight",
                    bebasNeue.className,
                  )}
                >
                  {product.name}
                </h2>
              </div>
              <button
                onClick={onToggleSave}
                className="p-3 border border-gray-100 bg-white shadow-sm rounded-2xl hover:bg-gray-50 transition-all cursor-pointer flex-shrink-0"
              >
                <Heart
                  className={cn(
                    "w-5 h-5",
                    isSaved ? "fill-red-500 text-red-500" : "text-gray-500",
                  )}
                />
              </button>
            </div>

            <p className="text-emerald-700 font-extrabold text-2xl mt-3 tracking-tight">
              ₦{product.price.toLocaleString()}
            </p>

            <div className="flex items-center gap-2 mt-3 bg-amber-50/60 border border-amber-100/50 px-3 py-1.5 rounded-xl w-fit">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-amber-800 font-bold text-xs">
                {product.rating}
              </span>
            </div>

            <p className="text-sm text-gray-500 mt-4 leading-relaxed">
              {product.description}
            </p>

            {product.sizes && (
              <div className="mt-6">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                  Size
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={cn(
                        "px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer",
                        selectedSize === s
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
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
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                  Color
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={cn(
                        "px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer",
                        selectedColor === c
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-4">
            <div className="flex items-center border border-gray-200 rounded-2xl bg-gray-50 overflow-hidden shadow-2xs h-12">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3.5 py-2 hover:bg-gray-200/70 text-gray-600 transition-colors cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 text-sm font-bold w-10 text-center text-slate-900">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-3.5 py-2 hover:bg-gray-200/70 text-gray-600 transition-colors cursor-pointer"
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
                "flex-1 py-3.5 rounded-2xl transition-all text-sm font-bold cursor-pointer shadow-sm flex items-center justify-center gap-2",
                product.inStock
                  ? "bg-slate-900 text-white hover:bg-emerald-600 active:scale-98 shadow-slate-900/10 hover:shadow-emerald-600/20"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200",
              )}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{product.inStock ? "Add to Cart" : "Out of Stock"}</span>
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
          "text-2xl sm:text-3xl font-bold text-slate-900 mb-6 tracking-wide",
          bebasNeue.className,
        )}
      >
        Checkout
      </h2>

      {/* Steps */}
      <div className="flex mb-8 items-center">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1 flex items-center">
            <div
              className={cn(
                "w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold transition-all shadow-sm",
                step >= s
                  ? "bg-emerald-600 text-white shadow-emerald-600/20"
                  : "bg-gray-100 text-gray-400 border border-gray-200",
              )}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={cn(
                  "flex-1 h-1 mx-3 rounded-full transition-all",
                  step > s ? "bg-emerald-600" : "bg-gray-100",
                )}
              />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-5">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            Delivery Address & Contact
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                Street Address
              </label>
              <input
                type="text"
                placeholder="e.g., 15 Admiralty Way, Lekki Phase 1"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 placeholder:text-gray-400 text-sm transition-all outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                Phone Number
              </label>
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-emerald-600" />
                <input
                  type="tel"
                  placeholder="e.g., 08012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 placeholder:text-gray-400 text-sm transition-all outline-none"
                />
              </div>
            </div>
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={!address || !phone}
            className="w-full py-3.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-2xl disabled:opacity-50 text-sm font-bold cursor-pointer shadow-lg shadow-slate-900/10 hover:shadow-emerald-600/20 transition-all mt-4"
          >
            Continue to Payment
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            Payment Method
          </h3>
          <div className="space-y-3">
            {["Pay on Delivery", "Card", "Bank Transfer"].map((method) => (
              <label
                key={method}
                className={cn(
                  "flex items-center gap-3 p-4 border rounded-2xl cursor-pointer transition-all",
                  paymentMethod === method
                    ? "border-emerald-600 bg-emerald-50/30 shadow-xs"
                    : "border-gray-200 hover:bg-gray-50/60 bg-gray-50/30",
                )}
              >
                <input
                  type="radio"
                  name="payment"
                  value={method}
                  checked={paymentMethod === method}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-4 h-4 text-emerald-600 accent-emerald-600"
                />
                <span className="text-sm font-semibold text-slate-900">
                  {method}
                </span>
              </label>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-2xl text-sm font-bold cursor-pointer transition-all"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-2xl text-sm font-bold cursor-pointer shadow-lg shadow-slate-900/10 hover:shadow-emerald-600/20 transition-all"
            >
              Review Order
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            Order Summary
          </h3>
          <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-100 space-y-3">
            <div className="max-h-40 overflow-y-auto space-y-2.5 pr-1">
              {cartItems.map((item) => (
                <div
                  key={item.cartItemId}
                  className="flex justify-between text-xs sm:text-sm items-center"
                >
                  <span className="text-gray-600 font-medium">
                    {item.name}{" "}
                    <span className="text-emerald-600 font-bold">
                      x{item.quantity}
                    </span>
                  </span>
                  <span className="font-bold text-slate-900">
                    ₦{(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200/80 pt-3 mt-3 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Subtotal</span>
                <span className="text-slate-900 font-semibold">
                  ₦{subtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Delivery Fee</span>
                <span className="text-slate-900 font-semibold">
                  ₦{deliveryFee.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between font-extrabold text-base pt-2 border-t border-gray-200/80">
                <span className="text-slate-900">Total</span>
                <span className="text-emerald-700 text-lg tracking-tight">
                  ₦{total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep(2)}
              disabled={isPlacingOrder}
              className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-2xl text-sm font-bold cursor-pointer transition-all"
            >
              Back
            </button>
            <button
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder}
              className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-bold cursor-pointer shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isPlacingOrder ? "Processing..." : "Place Order"}
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
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="fixed inset-0 bg-slate-950/50 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 12, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className={cn(
          "bg-white/95 backdrop-blur-xl rounded-3xl w-full max-h-[88vh] overflow-y-auto p-6 sm:p-8 shadow-[0_24px_54px_-12px_rgba(0,0,0,0.18)] border border-gray-100/80 relative focus:outline-none scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent",
          sizeClasses[size],
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-slate-900 rounded-t-3xl" />
        <div className="relative">{children}</div>
      </motion.div>
    </motion.div>
  );
};
