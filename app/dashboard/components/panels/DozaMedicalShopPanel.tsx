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
  MapPin,
  Phone,
  CheckCircle,
  Activity,
  Stethoscope,
  HeartPulse,
  Loader2,
  Menu,
  ChevronDown,
  Receipt,
  Clock,
  Truck,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useUser } from "@/app/dashboard/hooks/useProfile";
import { useCart } from "../../hooks/useCart";
import { useMedicalSavedItems } from "../../hooks/useMedicalSavedItems";
import { useMedicalOrders } from "../../hooks/useMedicalOrder";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ---------- Types (unchanged) ----------
export interface MedicalProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category:
    | "Monitoring Devices"
    | "Mobility Aids"
    | "First Aid"
    | "Personal Care"
    | "Fitness & Wellness"
    | "Respiratory & Sleep";
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

import { CartItem } from "../../hooks/useCart";

// ---------- PDF Generation Function (unchanged) ----------
const generateOrderReceipt = (order: Order, userName: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("DOZA MEDICAL", pageWidth / 2, 25, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Order Receipt", 14, 55);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Order ID: ${order.orderId}`, 14, 65);
  doc.text(
    `Date: ${new Date(order.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    14,
    71,
  );

  const deliveryDate = new Date(order.createdAt);
  deliveryDate.setDate(deliveryDate.getDate() + 5);
  doc.text(
    `Estimated Delivery: ${deliveryDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`,
    14,
    77,
  );

  doc.setFont("helvetica", "bold");
  doc.text("Customer Information", 14, 90);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${userName}`, 14, 98);
  doc.text(`Address: ${order.deliveryAddress}`, 14, 104);
  doc.text(`Phone: ${order.phoneNumber}`, 14, 110);

  autoTable(doc, {
    startY: 120,
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
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    columnStyles: { 0: { cellWidth: 80 } },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "bold");
  doc.text("Payment Method", 14, finalY);
  doc.setFont("helvetica", "normal");
  doc.text(order.paymentMethod, 14, finalY + 6);

  doc.setFont("helvetica", "bold");
  doc.text("Order Status", 14, finalY + 16);
  doc.setFont("helvetica", "normal");
  const statusColor =
    order.status === "processing"
      ? "#F59E0B"
      : order.status === "confirmed"
        ? "#3B82F6"
        : "#10B981";
  doc.setTextColor(statusColor);
  doc.text(
    order.status.charAt(0).toUpperCase() + order.status.slice(1),
    14,
    finalY + 22,
  );
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(9);
  doc.text("Thank you for choosing Doza Medical!", pageWidth / 2, finalY + 40, {
    align: "center",
  });
  doc.text(
    "For any inquiries, contact support@dozamedical.com",
    pageWidth / 2,
    finalY + 46,
    { align: "center" },
  );

  doc.save(`DozaMedical_Order_${order.orderId}.pdf`);
};

// ---------- Sample Medical Products (unchanged) ----------
const products: MedicalProduct[] = [
  // Monitoring Devices
  {
    id: "med1",
    name: "Omron Blood Pressure Monitor",
    description:
      "Clinically validated automatic upper arm monitor with irregular heartbeat detection.",
    price: 35000,
    category: "Monitoring Devices",
    brand: "Omron",
    sizes: ["Standard Cuff", "Large Cuff"],
    colors: ["White", "Black"],
    imageUrl:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    inStock: true,
  },
  {
    id: "med2",
    name: "Accu-Chek Active Glucose Meter",
    description:
      "Easy‑to‑use blood glucose monitoring system with no coding and fast results.",
    price: 15000,
    category: "Monitoring Devices",
    brand: "Accu-Chek",
    colors: ["Blue", "Silver"],
    imageUrl:
      "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    inStock: true,
  },
  {
    id: "med3",
    name: "Braun ThermoScan 7 Ear Thermometer",
    description:
      "Professional, accurate ear thermometer with pre‑warmed tip for comfort.",
    price: 28000,
    category: "Monitoring Devices",
    brand: "Braun",
    colors: ["White/Blue"],
    imageUrl:
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800",
    rating: 4.9,
    inStock: true,
  },
  {
    id: "med4",
    name: "Fingertip Pulse Oximeter",
    description:
      "Measures blood oxygen saturation and pulse rate, accurate and portable.",
    price: 12000,
    category: "Monitoring Devices",
    brand: "DozaMed",
    colors: ["Black", "Blue", "Red"],
    imageUrl:
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800",
    rating: 4.6,
    inStock: true,
  },
  {
    id: "med5",
    name: "Withings Body+ Smart Scale",
    description:
      "Wi‑Fi scale that measures weight, body fat, and cardiovascular health.",
    price: 65000,
    category: "Monitoring Devices",
    brand: "Withings",
    colors: ["White", "Black"],
    imageUrl:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    inStock: true,
  },
  {
    id: "med6",
    name: "Samsung Galaxy Watch 6 (Health Edition)",
    description:
      "Advanced health tracking: ECG, blood pressure, sleep, and fitness.",
    price: 200000,
    category: "Monitoring Devices",
    brand: "Samsung",
    sizes: ["40mm", "44mm"],
    colors: ["Black", "Silver", "Gold"],
    imageUrl:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800",
    rating: 4.9,
    inStock: true,
  },
  // Mobility Aids
  {
    id: "med7",
    name: "Lightweight Folding Wheelchair",
    description:
      "Aluminium frame, padded armrests, and removable footrests for easy transport.",
    price: 120000,
    category: "Mobility Aids",
    brand: "DozaCare",
    sizes: ["Standard", "Bariatric"],
    colors: ["Black", "Red"],
    imageUrl:
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=800",
    rating: 4.5,
    inStock: true,
  },
  {
    id: "med8",
    name: "Adjustable Walker with Wheels",
    description:
      "Sturdy walker with 4 wheels, hand brakes, and a storage pouch.",
    price: 45000,
    category: "Mobility Aids",
    brand: "DozaCare",
    colors: ["Silver/Blue"],
    imageUrl:
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=800",
    rating: 4.6,
    inStock: true,
  },
  {
    id: "med9",
    name: "Forearm Crutches Pair",
    description:
      "Lightweight aluminium crutches with ergonomic grips and adjustable height.",
    price: 28000,
    category: "Mobility Aids",
    brand: "DozaCare",
    sizes: ["Standard", "Tall"],
    colors: ["Black", "Blue"],
    imageUrl:
      "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    inStock: true,
  },
  {
    id: "med10",
    name: "Wooden Cane with Ergonomic Handle",
    description: "Classic wooden cane with a comfortable, non‑slip tip.",
    price: 8000,
    category: "Mobility Aids",
    brand: "DozaCare",
    sizes: ["Adjustable"],
    colors: ["Brown", "Black"],
    imageUrl:
      "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=800",
    rating: 4.5,
    inStock: true,
  },
  // First Aid
  {
    id: "med11",
    name: "Comprehensive First Aid Kit",
    description:
      "100‑piece kit for home, car, or travel – includes bandages, antiseptics, and tools.",
    price: 20000,
    category: "First Aid",
    brand: "DozaMed",
    colors: ["Red", "Blue"],
    imageUrl:
      "https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    inStock: true,
  },
  {
    id: "med12",
    name: "Elastic Bandage Wrap (4 pack)",
    description:
      "Breathable elastic bandages for sprains and support, 4 sizes.",
    price: 5000,
    category: "First Aid",
    brand: "DozaMed",
    sizes: ["2 inch", "3 inch", "4 inch", "6 inch"],
    colors: ["Tan"],
    imageUrl:
      "https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&q=80&w=800",
    rating: 4.6,
    inStock: true,
  },
  {
    id: "med13",
    name: "Instant Hot/Cold Pack (5 pack)",
    description: "Disposable packs that activate instantly for pain relief.",
    price: 4000,
    category: "First Aid",
    brand: "DozaMed",
    colors: ["White"],
    imageUrl:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    inStock: true,
  },
  {
    id: "med14",
    name: "Antiseptic Wipes (100 wipes)",
    description:
      "Alcohol‑free, gentle wound cleansing wipes in a resealable pack.",
    price: 3500,
    category: "First Aid",
    brand: "DozaMed",
    colors: ["White/Blue"],
    imageUrl:
      "https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    inStock: true,
  },
  // Personal Care
  {
    id: "med15",
    name: "Adult Diapers (Large, 30 count)",
    description: "High‑absorbency, comfortable diapers with leak guards.",
    price: 8000,
    category: "Personal Care",
    brand: "DozaCare",
    sizes: ["Medium", "Large", "Extra Large"],
    colors: ["White"],
    imageUrl:
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800",
    rating: 4.5,
    inStock: true,
  },
  {
    id: "med16",
    name: "Bedside Commode Chair",
    description:
      "Adjustable height commode with removable bucket and splash guard.",
    price: 55000,
    category: "Personal Care",
    brand: "DozaCare",
    colors: ["White/Blue"],
    imageUrl:
      "https://images.unsplash.com/photo-1586015518255-b74b1773d2a0?auto=format&fit=crop&q=80&w=800",
    rating: 4.6,
    inStock: true,
  },
  {
    id: "med17",
    name: "Shower Chair with Backrest",
    description: "Non‑slip, rust‑proof shower chair with adjustable legs.",
    price: 35000,
    category: "Personal Care",
    brand: "DozaCare",
    colors: ["White"],
    imageUrl:
      "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    inStock: true,
  },
  {
    id: "med18",
    name: "Moisturizing Lotion for Dry Skin (500ml)",
    description:
      "Hypoallergenic, fragrance‑free lotion recommended for sensitive skin.",
    price: 6000,
    category: "Personal Care",
    brand: "DozaMed",
    colors: ["White"],
    imageUrl:
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800",
    rating: 4.9,
    inStock: true,
  },
  // Fitness & Wellness
  {
    id: "med19",
    name: "Resistance Bands Set (5 pcs)",
    description: "Different resistance levels for strength training and rehab.",
    price: 12000,
    category: "Fitness & Wellness",
    brand: "DozaFit",
    colors: ["Multi"],
    imageUrl:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    inStock: true,
  },
  {
    id: "med20",
    name: "Posture Corrector Brace",
    description:
      "Adjustable back brace for improved posture and shoulder support.",
    price: 9000,
    category: "Fitness & Wellness",
    brand: "DozaCare",
    sizes: ["S/M", "L/XL"],
    colors: ["Black", "Beige"],
    imageUrl:
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=800",
    rating: 4.5,
    inStock: true,
  },
  {
    id: "med21",
    name: "Percussion Massage Gun",
    description: "Deep tissue massage gun with 4 heads and adjustable speed.",
    price: 55000,
    category: "Fitness & Wellness",
    brand: "DozaFit",
    colors: ["Black", "Red"],
    imageUrl:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    inStock: true,
  },
  {
    id: "med22",
    name: "Non‑Slip Yoga Mat (6mm)",
    description: "Extra thick, eco‑friendly mat for yoga and floor exercises.",
    price: 10000,
    category: "Fitness & Wellness",
    brand: "DozaFit",
    colors: ["Purple", "Green", "Blue"],
    imageUrl:
      "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&q=80&w=800",
    rating: 4.6,
    inStock: true,
  },
  // Respiratory & Sleep
  {
    id: "med23",
    name: "ResMed AirSense 10 CPAP Machine",
    description: "Auto‑adjusting CPAP machine with humidifier for sleep apnea.",
    price: 350000,
    category: "Respiratory & Sleep",
    brand: "ResMed",
    colors: ["White"],
    imageUrl:
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=800",
    rating: 4.9,
    inStock: true,
    prescriptionRequired: true,
  },
  {
    id: "med24",
    name: "Portable Nebulizer",
    description:
      "Ultrasonic nebulizer for asthma and respiratory treatments, quiet and compact.",
    price: 45000,
    category: "Respiratory & Sleep",
    brand: "Omron",
    colors: ["White/Blue"],
    imageUrl:
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    inStock: true,
  },
  {
    id: "med25",
    name: "Cool Mist Humidifier (4L)",
    description:
      "Ultrasonic humidifier with adjustable mist output and essential oil tray.",
    price: 25000,
    category: "Respiratory & Sleep",
    brand: "DozaCare",
    colors: ["White", "Black"],
    imageUrl:
      "https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&q=80&w=800",
    rating: 4.6,
    inStock: true,
  },
  {
    id: "med26",
    name: "Pulse Oximeter with Plethysmograph",
    description:
      "Accurate SpO2 and pulse rate monitoring with waveform display.",
    price: 18000,
    category: "Respiratory & Sleep",
    brand: "DozaMed",
    colors: ["Black", "Blue"],
    imageUrl:
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    inStock: true,
  },
];

const categories = [
  "All",
  "Monitoring Devices",
  "Mobility Aids",
  "First Aid",
  "Personal Care",
  "Fitness & Wellness",
  "Respiratory & Sleep",
] as const;

// ---------- Help Slides (updated icons) ----------
const helpSlides = [
  {
    icon: <Activity className="w-12 h-12 text-emerald-600" />,
    title: "Find Medical Gear",
    description:
      "Browse categories or search for specific devices and supplies.",
  },
  {
    icon: <Heart className="w-12 h-12 text-emerald-600" />,
    title: "Save Favourites",
    description: "Click the heart to save items for later.",
  },
  {
    icon: <Filter className="w-12 h-12 text-emerald-600" />,
    title: "Filter by Needs",
    description:
      "Narrow by category, size, price, or prescription requirement.",
  },
  {
    icon: <CreditCard className="w-12 h-12 text-emerald-600" />,
    title: "Secure Checkout",
    description: "Add delivery address and choose payment method.",
  },
  {
    icon: <Package className="w-12 h-12 text-emerald-600" />,
    title: "Track Your Order",
    description: "Monitor order status in the Orders tab.",
  },
  {
    icon: <Stethoscope className="w-12 h-12 text-emerald-600" />,
    title: "Prescription Items",
    description: "Some products require a prescription – we'll guide you.",
  },
];

// ---------- Subcomponent Props (unchanged) ----------
interface ProductCardProps {
  product: MedicalProduct;
  isSaved: boolean;
  onToggleSave: () => void;
  onAddToCart: (size?: string, color?: string) => void;
  onQuickView: () => void;
}

interface SavedItemsTabProps {
  savedItems: SavedItem[];
  onToggleSave: (product: MedicalProduct) => void;
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
  product: MedicalProduct;
  onClose: () => void;
  onAddToCart: (
    product: MedicalProduct,
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
  onPlaceOrder: (orderData: any) => Promise<string>;
  user: any;
}

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg";
}

// ---------- Main Component (Enhanced Mobile & Desktop UI) ----------
export default function MedicalShopPanel() {
  const { user } = useUser();
  const {
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    subtotal,
    deliveryFee,
    total,
  } = useCart();
  const { savedItems, toggleSave, isSaved } = useMedicalSavedItems();
  const { orders, placeOrder } = useMedicalOrders();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof categories)[number]>("All");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showQuickView, setShowQuickView] = useState<MedicalProduct | null>(
    null,
  );
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
    const groups: Record<string, MedicalProduct[]> = {};
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
    const hasSeen = localStorage.getItem("doza_medical_help");
    if (!hasSeen) {
      setShowHelp(true);
      localStorage.setItem("doza_medical_help", "true");
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
      {/* Header – Refined layout with modern badging */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8 bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 mb-3 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
              Verified Wellness Store
            </span>
          </div>
          <h1
            className={cn(
              "text-3xl sm:text-5xl text-slate-900 leading-none tracking-tight",
              bebasNeue.className,
            )}
          >
            Medical <span className="text-emerald-600">Shop</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg leading-relaxed">
            Discover hospital-grade equipment, daily wellness solutions, and
            personal care essentials delivered right to your doorstep safely.
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
                  placeholder="Search equipment, remedies, supplies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-gray-800 text-xs sm:text-sm transition-all placeholder:text-gray-400"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200/50 transition-colors"
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
                  <option value="">All Sizes / Specifications</option>
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
                        Size / Spec
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
                Try adjusting your search query, price filter, or category
                selection to find what you need.
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

      {/* Checkout Modal */}
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
                  How to Shop Medical
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
              Start Exploring Store
            </button>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------- Product Card – Redesigned ----------
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 350, damping: 20 }}
      className="group bg-white rounded-3xl border border-gray-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden cursor-pointer h-full flex flex-col"
      onClick={onQuickView}
    >
      {/* Image Section */}
      <div className="relative h-52 sm:h-60 overflow-hidden bg-gray-50 flex-shrink-0">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-60" />

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave();
          }}
          className="absolute top-3.5 right-3.5 p-2.5 bg-white/90 backdrop-blur-md rounded-2xl shadow-sm hover:bg-white hover:scale-105 active:scale-95 transition-all duration-200"
          aria-label={isSaved ? "Remove from saved" : "Save item"}
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-colors",
              isSaved
                ? "fill-red-500 text-red-500"
                : "text-gray-600 hover:text-red-500",
            )}
          />
        </button>

        <div className="absolute top-3.5 left-3.5 flex flex-col gap-1.5 items-start">
          {!product.inStock && (
            <span className="px-3 py-1 bg-red-500 text-white text-[10px] font-bold rounded-lg shadow-sm uppercase tracking-wider">
              Out of Stock
            </span>
          )}
          {product.prescriptionRequired && product.inStock && (
            <span className="px-3 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-lg shadow-sm uppercase tracking-wider">
              Rx Required
            </span>
          )}
        </div>

        {product.rating && (
          <div className="absolute bottom-3.5 right-3.5 flex items-center gap-1 bg-black/70 backdrop-blur-md text-white px-2.5 py-1 rounded-xl text-xs font-semibold shadow-xs">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{product.rating}</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="mb-2">
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
            {product.brand}
          </p>
          <h3
            className={cn(
              "text-lg sm:text-xl text-gray-900 line-clamp-1 tracking-wide",
              bebasNeue.className,
            )}
            style={{ fontWeight: 600 }}
          >
            {product.name}
          </h3>
        </div>

        <div className="flex items-center justify-between mt-1 mb-4">
          <span className="text-2xl font-bold text-emerald-600 tracking-tight">
            ₦{product.price.toLocaleString()}
          </span>
          {product.inStock && (
            <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              In Stock
            </span>
          )}
        </div>

        {product.sizes && product.sizes.length > 0 && (
          <div className="mb-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">
              Size Options
            </p>
            <div className="flex flex-wrap gap-1.5">
              {product.sizes.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-xl font-semibold border transition-all duration-150 cursor-pointer",
                    selectedSize === s
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-gray-50 text-gray-700 border-gray-200/80 hover:bg-gray-100",
                  )}
                >
                  {s}
                </button>
              ))}
              {product.sizes.length > 3 && (
                <span className="text-xs text-gray-400 font-semibold self-center ml-1">
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
            "w-full mt-auto py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all duration-200 min-h-[44px] cursor-pointer shadow-xs",
            product.inStock
              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 hover:shadow-emerald-600/30 active:scale-[0.98]"
              : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200",
          )}
        >
          {product.inStock ? "Add to Cart" : "Out of Stock"}
        </button>
      </div>
    </motion.div>
  );
};

// ---------- Saved Items Tab (improved grid) ----------
const SavedItemsTab: React.FC<SavedItemsTabProps> = ({
  savedItems,
  onToggleSave,
}) => {
  if (!savedItems?.length) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-4 bg-gradient-to-b from-gray-50/50 to-transparent rounded-3xl border border-dashed border-gray-200">
        <div className="w-20 h-20 bg-red-50/80 rounded-2xl flex items-center justify-center mb-5 shadow-inner ring-8 ring-red-50/30">
          <Heart className="w-10 h-10 text-red-500 animate-pulse" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-2">
          Your saved items are empty
        </h3>
        <p className="text-gray-500 text-sm max-w-sm mb-8 leading-relaxed">
          Start exploring our collection and tap the heart icon to save products
          you love for later.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {savedItems.map((item) => (
        <div
          key={item.id}
          className="group bg-white rounded-3xl border border-gray-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden flex flex-col"
        >
          <div className="relative h-52 overflow-hidden bg-gray-50">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />
          </div>
          <div className="p-5 flex-1 flex flex-col justify-between">
            <div>
              <h3
                className={cn(
                  "text-lg text-gray-900 line-clamp-1 tracking-wide",
                  bebasNeue.className,
                )}
                style={{ fontWeight: 600 }}
              >
                {item.name}
              </h3>
              <p className="text-2xl font-bold text-emerald-600 tracking-tight mt-1">
                ₦{item.price.toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => onToggleSave(item as any)}
              className="mt-5 w-full py-2.5 bg-red-50 hover:bg-red-100/80 active:scale-98 text-red-600 rounded-xl transition-all duration-200 text-xs font-semibold min-h-[40px] cursor-pointer flex items-center justify-center gap-2 border border-red-100"
            >
              <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
              <span>Remove from Saved</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ---------- Orders Tab (improved) ----------
const OrdersTab: React.FC<OrdersTabProps> = ({ orders }) => {
  const orderList = Object.values(orders || {}).sort(
    (a, b) => b.createdAt - a.createdAt,
  );

  if (!orderList.length) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-4 bg-gradient-to-b from-gray-50/50 to-transparent rounded-3xl border border-dashed border-gray-200">
        <div className="w-20 h-20 bg-emerald-50/80 rounded-2xl flex items-center justify-center mb-5 shadow-inner ring-8 ring-emerald-50/30">
          <Package className="w-10 h-10 text-emerald-600 animate-pulse" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-2">
          No orders placed yet
        </h3>
        <p className="text-gray-500 text-sm max-w-sm mb-8 leading-relaxed">
          Your active and past orders will show up here once you start exploring
          our collection.
        </p>
        <button
          onClick={() => {}}
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/35 active:scale-[0.98] transition-all duration-200 text-sm"
        >
          <span>Start Shopping</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const getStatusDetails = (status: Order["status"]) => {
    switch (status) {
      case "processing":
        return {
          icon: Clock,
          color: "text-amber-700",
          bg: "bg-amber-50 border-amber-200/60",
          dot: "bg-amber-500",
          label: "Processing",
        };
      case "confirmed":
        return {
          icon: Truck,
          color: "text-blue-700",
          bg: "bg-blue-50 border-blue-200/60",
          dot: "bg-blue-500",
          label: "Confirmed",
        };
      case "delivered":
        return {
          icon: CheckCircle,
          color: "text-emerald-700",
          bg: "bg-emerald-50 border-emerald-200/60",
          dot: "bg-emerald-500",
          label: "Delivered",
        };
      default:
        return {
          icon: Clock,
          color: "text-gray-700",
          bg: "bg-gray-100 border-gray-200/60",
          dot: "bg-gray-400",
          label: status,
        };
    }
  };

  return (
    <div className="space-y-6">
      {orderList.map((order) => {
        const status = getStatusDetails(order.status);
        const StatusIcon = status.icon;

        return (
          <div
            key={order.orderId}
            className="group bg-white rounded-3xl border border-gray-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden"
          >
            {/* Card Header – Order summary */}
            <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/50 via-white to-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300">
                  <Package className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h4
                      className={cn(
                        "text-xl text-gray-900 tracking-wide",
                        bebasNeue.className,
                      )}
                      style={{ fontWeight: 600 }}
                    >
                      Order #{order.orderId}
                    </h4>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-semibold text-gray-600 tracking-wider uppercase">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />{" "}
                      Secure
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-400 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                    {" • "}
                    {new Date(order.createdAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border shadow-xs transition-colors",
                  status.bg,
                  status.color,
                )}
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    status.dot,
                  )}
                />
                <StatusIcon className="w-3.5 h-3.5" />
                <span>{status.label}</span>
              </div>
            </div>

            {/* Order Items */}
            <div className="px-6 py-5 divide-y divide-gray-100">
              {order.items.map((item) => (
                <div
                  key={item.cartItemId}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between text-sm group/item"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-200 group-hover/item:bg-emerald-500 transition-colors" />
                    <div>
                      <span className="text-gray-900 font-medium block">
                        {item.name}
                      </span>
                      {(item.size || item.color) && (
                        <span className="text-xs text-gray-400 font-medium tracking-wide">
                          {item.size && `Size: ${item.size}`}
                          {item.size && item.color && " • "}
                          {item.color && `Color: ${item.color}`}
                        </span>
                      )}
                    </div>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-md ml-2">
                      ×{item.quantity}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-900 tracking-tight">
                    ₦{(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Card Footer – Totals and actions */}
            <div className="px-6 py-4 bg-gray-50/70 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs font-medium text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span>Subtotal:</span>
                  <span className="text-gray-900 font-semibold">
                    ₦{order.subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="w-1 h-1 rounded-full bg-gray-300 hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <span>Delivery Fee:</span>
                  <span className="text-gray-900 font-semibold">
                    ₦{order.deliveryFee.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-200/60">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                    Total Amount
                  </span>
                  <span
                    className={cn(
                      "text-2xl text-emerald-600 tracking-tight leading-none",
                      bebasNeue.className,
                    )}
                    style={{ fontWeight: 600 }}
                  >
                    ₦{order.totalAmount.toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => {
                    // Optional: call receipt generation (pass order and user name)
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-100/80 active:scale-95 border border-gray-200/80 rounded-xl text-xs font-semibold text-gray-700 shadow-xs hover:border-gray-300 transition-all duration-200 cursor-pointer"
                >
                  <Receipt className="w-4 h-4 text-gray-500" />
                  <span>View Receipt</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------- Cart Sidebar (enhanced with mobile bottom-sheet & emerald styling) ----------
const CartSidebar: React.FC<CartSidebarProps> = ({
  cartItems,
  subtotal,
  deliveryFee,
  total,
  onUpdateQuantity,
  onRemove,
  onClose,
  onCheckout,
}) => {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
      />

      {/* Sidebar / Bottom Sheet Container */}
      <motion.div
        initial={{ y: "100%", x: 0 }}
        animate={{ y: 0, x: 0 }}
        exit={{ y: "100%", x: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 sm:top-0 sm:right-0 sm:left-auto sm:bottom-auto sm:h-full w-full sm:w-96 max-h-[90vh] sm:max-h-full bg-white shadow-2xl z-50 flex flex-col rounded-t-3xl sm:rounded-none overflow-hidden"
      >
        {/* Mobile Drag Handle Indicator */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 sm:hidden" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <h2
              className={cn(
                "text-2xl font-bold text-gray-800 tracking-wide",
                bebasNeue.className,
              )}
            >
              Your Cart
            </h2>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-full">
              {cartItems.reduce((acc, item) => acc + item.quantity, 0)} items
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-emerald-50 text-gray-500 hover:text-emerald-700 rounded-full transition-colors"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items List with Custom Emerald Scrollbar */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-emerald-500/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-emerald-500/40">
          {cartItems.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                <Trash2 className="w-8 h-8 opacity-40" />
              </div>
              <p className="text-gray-800 font-semibold text-lg">
                Your cart is empty
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Explore our medical catalog and add items to get started.
              </p>
            </div>
          ) : (
            cartItems.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                key={item.cartItemId}
                className="flex gap-3 bg-gray-50/60 p-3 rounded-2xl border border-gray-100 items-center transition-all hover:bg-gray-50"
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-xl border border-gray-200/60 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 text-sm truncate">
                    {item.name}
                  </h3>
                  <p className="text-xs text-emerald-700 font-medium mt-0.5 truncate">
                    {item.size} {item.size && item.color && "•"} {item.color}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-2xs overflow-hidden">
                      <button
                        onClick={() =>
                          onUpdateQuantity(item.cartItemId, item.quantity - 1)
                        }
                        className="px-2 py-1 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 transition"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 py-0.5 text-xs font-semibold w-7 text-center text-gray-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          onUpdateQuantity(item.cartItemId, item.quantity + 1)
                        }
                        className="px-2 py-1 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 transition"
                        aria-label="Increase quantity"
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
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl self-center transition-colors"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))
          )}
        </div>

        {/* Footer Summary & Checkout */}
        {cartItems.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/80 backdrop-blur-md">
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium text-gray-800">
                  ₦{subtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery Fee</span>
                <span className="font-medium text-gray-800">
                  ₦{deliveryFee.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200/60">
                <span className="text-gray-900">Total</span>
                <span className="text-emerald-700 text-lg">
                  ₦{total.toLocaleString()}
                </span>
              </div>
            </div>
            <button
              onClick={onCheckout}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-2xl hover:from-emerald-700 hover:to-emerald-600 shadow-lg shadow-emerald-600/20 transition-all font-semibold text-base active:scale-95"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
};

// ---------- Product Quick View (Enhanced with Emerald Themes) ----------
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
      <div className="flex flex-col lg:flex-row gap-6 max-h-[85vh] overflow-y-auto p-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-emerald-500/20 [&::-webkit-scrollbar-thumb]:rounded-full">
        {/* Image Section */}
        <div className="lg:w-1/2 flex-shrink-0">
          <div className="sticky top-0 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-emerald-50/30 border border-gray-100 shadow-sm">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-auto object-cover aspect-square hover:scale-105 transition-transform duration-500"
            />
          </div>
        </div>

        {/* Details Section */}
        <div className="lg:w-1/2 flex flex-col gap-4">
          {/* Header */}
          <div className="flex justify-between items-start gap-4">
            <h2
              className={cn(
                "text-2xl sm:text-3xl font-bold text-gray-800 leading-tight tracking-wide",
                bebasNeue.className,
              )}
            >
              {product.name}
            </h2>
            <button
              onClick={onToggleSave}
              className="p-2.5 border border-gray-200/80 rounded-full hover:bg-emerald-50 hover:border-emerald-200 transition-all flex-shrink-0 group"
              aria-label={isSaved ? "Remove from saved" : "Save item"}
            >
              <Heart
                className={cn(
                  "w-5 h-5 transition-transform group-hover:scale-110",
                  isSaved ? "fill-red-500 text-red-500" : "text-gray-600",
                )}
              />
            </button>
          </div>

          {/* Price & Rating */}
          <div>
            <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">
              ₦{product.price.toLocaleString()}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex items-center bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1" />
                <span className="text-amber-800 font-semibold text-xs">
                  {product.rating}
                </span>
              </div>
              <span className="text-gray-300">|</span>
              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md font-medium text-xs border border-emerald-100">
                {product.brand}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
            {product.description}
          </p>

          {product.prescriptionRequired && (
            <div className="bg-amber-50 border border-amber-200/80 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-start gap-2.5 shadow-2xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Prescription required</span> –
                you can securely upload it during checkout.
              </div>
            </div>
          )}

          {/* Size selection */}
          {product.sizes && product.sizes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Select Size
              </p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={cn(
                      "px-4 py-2 text-sm rounded-xl border font-medium transition-all duration-200",
                      selectedSize === s
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 scale-102"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-emerald-50/50 hover:border-emerald-200",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color selection */}
          {product.colors && product.colors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Color
              </p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className={cn(
                      "px-4 py-2 text-sm rounded-xl border font-medium transition-all duration-200",
                      selectedColor === c
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 scale-102"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-emerald-50/50 hover:border-emerald-200",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity & Add to Cart */}
          <div className="mt-2 flex items-center gap-4">
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50 shadow-2xs">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3.5 py-2.5 hover:bg-emerald-100/50 text-gray-600 hover:text-emerald-700 transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 py-2.5 text-base w-12 text-center text-gray-800 font-semibold">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-3.5 py-2.5 hover:bg-emerald-100/50 text-gray-600 hover:text-emerald-700 transition-colors"
                aria-label="Increase quantity"
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
                "flex-1 py-3.5 rounded-xl text-base font-semibold transition-all duration-200",
                product.inStock
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:scale-[1.02] active:scale-95"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed",
              )}
            >
              {product.inStock ? "Add to Cart" : "Out of Stock"}
            </button>
          </div>

          {/* Additional info */}
          <div className="text-xs text-gray-400 border-t border-gray-100 pt-3 mt-1 flex justify-between">
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-emerald-500" /> Free delivery
              on orders above ₦50,000
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> 30-day
              return policy
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ---------- Checkout Modal (Enhanced with Progress Steps & Emerald Highlights) ----------
const CheckoutModal: React.FC<CheckoutModalProps> = ({
  cartItems,
  subtotal,
  deliveryFee,
  total,
  onClose,
  onPlaceOrder,
  user,
}) => {
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
      if (!orderId) {
        throw new Error("Order creation failed – no order ID returned");
      }

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
          "text-2xl sm:text-3xl font-bold text-gray-800 mb-6 tracking-wide",
          bebasNeue.className,
        )}
      >
        Secure Checkout
      </h2>

      {/* Progress Steps */}
      <div className="flex mb-8 items-center px-2">
        {[
          { num: 1, label: "Address" },
          { num: 2, label: "Payment" },
          { num: 3, label: "Summary" },
        ].map((s, index, arr) => (
          <div key={s.num} className="flex-1 flex items-center">
            <div className="flex flex-col items-center relative">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-sm",
                  step >= s.num
                    ? "bg-emerald-600 text-white shadow-emerald-600/30 ring-4 ring-emerald-50"
                    : "bg-gray-100 text-gray-400 border border-gray-200",
                )}
              >
                {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
              </div>
              <span
                className={cn(
                  "absolute -bottom-5 text-[11px] font-medium tracking-tight whitespace-nowrap",
                  step >= s.num
                    ? "text-emerald-700 font-semibold"
                    : "text-gray-400",
                )}
              >
                {s.label}
              </span>
            </div>
            {index < arr.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-1 mx-3 transition-all duration-300 rounded-full",
                  step > s.num ? "bg-emerald-600" : "bg-gray-100",
                )}
              />
            )}
          </div>
        ))}
      </div>

      <div className="pt-4">
        {step === 1 && (
          <div className="space-y-5">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              Where should we deliver your order?
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Street Address
                </label>
                <input
                  type="text"
                  placeholder="e.g., 15 Ahmadu Bello Way, Victoria Island"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-gray-800 placeholder:text-gray-400 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <div className="flex items-center gap-2">
                  <div className="bg-gray-100 border border-gray-200 px-3.5 py-3 rounded-xl text-gray-600 font-medium text-sm">
                    +234
                  </div>
                  <input
                    type="tel"
                    placeholder="803 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-gray-800 placeholder:text-gray-400 transition"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!address || !phone}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-50 text-base font-semibold shadow-md shadow-emerald-600/20 transition-all active:scale-95 mt-4"
            >
              Continue to Payment
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Choose Payment Method
            </h3>
            <div className="space-y-3">
              {[
                {
                  title: "Pay on Delivery",
                  desc: "Pay with cash or transfer when your order arrives",
                },
                {
                  title: "Card",
                  desc: "Secure online payment via debit/credit card",
                },
                {
                  title: "Bank Transfer",
                  desc: "Direct bank transfer to our corporate account",
                },
              ].map((method) => (
                <label
                  key={method.title}
                  className={cn(
                    "flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all",
                    paymentMethod === method.title
                      ? "border-emerald-600 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-600"
                      : "border-gray-200 hover:bg-gray-50",
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
                  <div>
                    <span className="block font-semibold text-gray-800 text-sm">
                      {method.title}
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {method.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-base font-medium transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-600 text-base font-semibold shadow-md shadow-emerald-600/20 transition active:scale-95"
              >
                Review Order
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              Final Order Summary
            </h3>

            <div className="bg-gray-50/80 p-4 rounded-2xl space-y-3 border border-gray-100">
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-emerald-500/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                {cartItems.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="flex justify-between items-center text-sm border-b border-gray-200/40 pb-2"
                  >
                    <div>
                      <span className="text-gray-800 font-medium block">
                        {item.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        Qty: {item.quantity} {item.size && `• ${item.size}`}
                      </span>
                    </div>
                    <span className="font-semibold text-gray-700">
                      ₦{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 space-y-1.5">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-800">
                    ₦{subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Delivery Fee</span>
                  <span className="font-medium text-gray-800">
                    ₦{deliveryFee.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Payment Method</span>
                  <span className="font-medium text-emerald-700">
                    {paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Total Amount</span>
                  <span className="text-emerald-700 text-lg">
                    ₦{total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {orderError && (
              <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm border border-red-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span>{orderError}</span>
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setStep(2)}
                disabled={isPlacingOrder}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-base font-medium disabled:opacity-50 transition"
              >
                Back
              </button>
              <button
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder}
                className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-600 text-base font-semibold shadow-lg shadow-emerald-600/25 disabled:opacity-50 flex items-center justify-center gap-2 transition active:scale-95"
              >
                {isPlacingOrder ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  "Confirm & Place Order"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ---------- Reusable Modal (improved overlay) ----------
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
