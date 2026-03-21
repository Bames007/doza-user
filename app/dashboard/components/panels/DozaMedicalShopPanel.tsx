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
} from "lucide-react";
import { useUser } from "@/app/dashboard/hooks/useProfile";
import { useCart } from "../../hooks/useCart";
import { useMedicalSavedItems } from "../../hooks/useMedicalSavedItems";
import { useMedicalOrders } from "../../hooks/useMedicalOrder";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ---------- Types ----------
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

// ---------- PDF Generation Function ----------
const generateOrderReceipt = (order: Order, userName: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(16, 185, 129); // emerald-600
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("DOZA MEDICAL", pageWidth / 2, 25, { align: "center" });

  // Receipt title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Order Receipt", 14, 55);

  // Order details
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

  // Estimated delivery (5 business days from now)
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

  // Customer info
  doc.setFont("helvetica", "bold");
  doc.text("Customer Information", 14, 90);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${userName}`, 14, 98);
  doc.text(`Address: ${order.deliveryAddress}`, 14, 104);
  doc.text(`Phone: ${order.phoneNumber}`, 14, 110);

  // Items table – using NGN for reliability
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

  // Payment method
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "bold");
  doc.text("Payment Method", 14, finalY);
  doc.setFont("helvetica", "normal");
  doc.text(order.paymentMethod, 14, finalY + 6);

  // Status
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

  // Footer
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

  // Save PDF
  doc.save(`DozaMedical_Order_${order.orderId}.pdf`);
};

// ---------- Sample Medical Products (detailed) ----------
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
    imageUrl: "/assets/medical/bp_monitor.jpg",
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
    imageUrl: "/assets/medical/glucose_meter.jpg",
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
    imageUrl: "/assets/medical/thermometer.jpg",
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
    imageUrl: "/assets/medical/oximeter.jpg",
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
    imageUrl: "/assets/medical/smart_scale.jpg",
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
    imageUrl: "/assets/medical/smart_watch.jpg",
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
    imageUrl: "/assets/medical/wheelchair.jpg",
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
    imageUrl: "/assets/medical/walker.jpg",
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
    imageUrl: "/assets/medical/crutches.jpg",
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
    imageUrl: "/assets/medical/cane.jpg",
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
    imageUrl: "/assets/medical/first_aid_kit.jpg",
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
    imageUrl: "/assets/medical/bandage.jpg",
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
    imageUrl: "/assets/medical/hot_cold_pack.jpg",
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
    imageUrl: "/assets/medical/wipes.jpg",
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
    imageUrl: "/assets/medical/diapers.jpg",
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
    imageUrl: "/assets/medical/commode.jpg",
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
    imageUrl: "/assets/medical/shower_chair.jpg",
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
    imageUrl: "/assets/medical/lotion.jpg",
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
    imageUrl: "/assets/medical/resistance_bands.jpg",
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
    imageUrl: "/assets/medical/posture_corrector.jpg",
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
    imageUrl: "/assets/medical/massage_gun.jpg",
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
    imageUrl: "/assets/medical/yoga_mat.jpg",
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
    imageUrl: "/assets/medical/cpap.jpg",
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
    imageUrl: "/assets/medical/nebulizer.jpg",
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
    imageUrl: "/assets/medical/humidifier.jpg",
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
    imageUrl: "/assets/medical/oximeter_advanced.jpg",
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

// ---------- Help Slides ----------
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

// ---------- Subcomponent Props ----------
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
  onPlaceOrder: (orderData: any) => Promise<string>; // now returns orderId string
  user: any;
}

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg";
}

// ---------- Main Component ----------
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

  // UI state
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

  // First‑visit help
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
        "max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-6 bg-gradient-to-br from-gray-50 to-white min-h-screen",
        poppins.className,
      )}
    >
      {/* Top Banner */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-xl">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between p-5 sm:p-8">
          <div className="flex items-center gap-4 sm:gap-6 mb-4 sm:mb-0">
            <HeartPulse className="w-10 h-10 sm:w-14 sm:h-14 text-white/90" />
            <div>
              <h2
                className={cn(
                  "text-2xl sm:text-3xl font-bold tracking-wide",
                  bebasNeue.className,
                )}
              >
                YOUR HEALTH, OUR PRIORITY
              </h2>
              <p className="text-white/90 text-sm sm:text-base max-w-md">
                Quality medical equipment, wellness products, and personal care
                essentials delivered to your door.
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
                  placeholder="Search medical products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-800 text-sm min-h-[44px] placeholder:text-gray-400"
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
                  className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-800 text-sm min-h-[44px]"
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
                  className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-800 text-sm min-h-[44px]"
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
                    className="w-20 px-2 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange[1]}
                    onChange={(e) =>
                      setPriceRange([priceRange[0], +e.target.value])
                    }
                    className="w-20 px-2 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400"
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
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800"
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
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800"
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
                          className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                          type="number"
                          placeholder="Max"
                          value={priceRange[1]}
                          onChange={(e) =>
                            setPriceRange([priceRange[0], +e.target.value])
                          }
                          className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400"
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
                How to Shop Medical
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
        {product.prescriptionRequired && (
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 text-white text-xs font-semibold rounded-full">
            Rx Required
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
                  <span className="px-2 py-1 text-sm w-8 text-center text-gray-800">
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
            <span className="font-medium text-gray-800">
              ₦{subtotal.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Delivery</span>
            <span className="font-medium text-gray-800">
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
          {product.prescriptionRequired && (
            <p className="mt-2 text-sm text-amber-600 font-medium">
              * Prescription required – you can upload it during checkout.
            </p>
          )}

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
              <span className="px-4 py-2 text-base w-12 text-center text-gray-800">
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

      // onPlaceOrder now returns the orderId string directly
      const orderId = await onPlaceOrder(orderData);
      if (!orderId) {
        throw new Error("Order creation failed – no order ID returned");
      }

      // Build the full order object for the receipt
      const receiptOrder: Order = {
        ...orderData,
        orderId,
        createdAt: orderData.createdAt,
        items: cartItems,
      };

      // Generate and download PDF
      generateOrderReceipt(receiptOrder, user?.fullName || "Customer");

      // Clear the cart
      clearCart();

      // Close modal
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
          "text-2xl sm:text-3xl font-bold text-gray-800 mb-6",
          bebasNeue.className,
        )}
      >
        Checkout
      </h2>

      {/* Steps indicator (unchanged) */}
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
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-800 placeholder:text-gray-400"
          />
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-emerald-600" />
            <input
              type="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-800 placeholder:text-gray-400"
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
                <span className="font-medium text-gray-800">
                  ₦{(item.price * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-800">
                  ₦{subtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery</span>
                <span className="text-gray-800">
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

          {orderError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {orderError}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setStep(2)}
              disabled={isPlacingOrder}
              className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 text-lg font-medium disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPlacingOrder ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Placing Order...
                </>
              ) : (
                "Place Order"
              )}
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
