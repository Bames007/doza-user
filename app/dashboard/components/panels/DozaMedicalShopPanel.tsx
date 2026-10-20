// app/dashboard/panels/MedicalShopPanel.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShoppingCart,
  Heart,
  Filter,
  Package,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import { useUser } from "@/app/dashboard/hooks/useProfile";
import { useCart } from "../../hooks/useCart";
import { useMedicalSavedItems } from "../../hooks/useMedicalSavedItems";
import { useMedicalOrders } from "../../hooks/useMedicalOrder";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";

import { products } from "../../constants/productlist";
import type { MedicalProduct } from "../../constants/medicalShop";
import {
  CATEGORIES,
  FOCUS,
  type CategoryFilter,
} from "../../constants/medicalShopConstants";
import { SearchInput } from "../subcomponents/medicalshop/SearchInput";
import { ProductCard } from "../subcomponents/medicalshop/ProductCard";
import { SavedItemsTab } from "../subcomponents/medicalshop/SavedItemsTab";
import { OrdersTab } from "../subcomponents/medicalshop/OrdersTab";
import { CartSidebar } from "../subcomponents/medicalshop/CartSideBar";
import { ProductQuickView } from "../subcomponents/medicalshop/ProductQuickView";
import { CheckoutModal } from "../subcomponents/medicalshop/CheckoutModal";
import { HelpModal } from "../subcomponents/medicalshop/HelpModal";

// ─── sessionStorage helpers ─────────────────────────────
function ssGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function ssSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, value);
  } catch {}
}

// ─── Tabs (typed — all variants share the same shape) ──
type ShopTab = {
  id: "shop" | "saved" | "orders";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
};

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

  // ─── Persisted ───────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"shop" | "saved" | "orders">(
    () => {
      const v = ssGet("medshop:tab");
      return v === "saved" || v === "orders" || v === "shop" ? v : "shop";
    },
  );
  useEffect(() => ssSet("medshop:tab", activeTab), [activeTab]);

  const [search, setSearch] = useState<string>(
    () => ssGet("medshop:search") || "",
  );
  useEffect(() => ssSet("medshop:search", search), [search]);

  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>(
    () => {
      const v = ssGet("medshop:category");
      return v && (CATEGORIES as readonly string[]).includes(v)
        ? (v as CategoryFilter)
        : "All";
    },
  );
  useEffect(
    () => ssSet("medshop:category", selectedCategory),
    [selectedCategory],
  );

  const [priceRange, setPriceRange] = useState<[number, number]>(() => {
    const v = ssGet("medshop:priceRange");
    if (v) {
      try {
        const p = JSON.parse(v);
        if (Array.isArray(p) && p.length === 2) {
          return [Number(p[0]) || 0, Number(p[1]) || 500000];
        }
      } catch {}
    }
    return [0, 500000];
  });
  useEffect(
    () => ssSet("medshop:priceRange", JSON.stringify(priceRange)),
    [priceRange],
  );

  const [selectedSize, setSelectedSize] = useState<string>(
    () => ssGet("medshop:size") || "",
  );
  useEffect(() => ssSet("medshop:size", selectedSize), [selectedSize]);

  // ─── Ephemeral UI ───────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showQuickView, setShowQuickView] = useState<MedicalProduct | null>(
    null,
  );
  const [showCheckout, setShowCheckout] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // ─── Scroll restore ─────────────────────────────────
  const scrollRestoredRef = useRef(false);
  useEffect(() => {
    const el =
      (document.getElementById("dashboard-scroll") as HTMLElement | null) ||
      (document.querySelector("main") as HTMLElement | null);
    if (!el) return;

    if (!scrollRestoredRef.current) {
      const saved = ssGet("medshop:scroll");
      el.scrollTo({ top: saved ? Number(saved) : 0, behavior: "instant" });
      scrollRestoredRef.current = true;
    }

    const onScroll = () => ssSet("medshop:scroll", String(el.scrollTop));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // ─── Derived ────────────────────────────────────────
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

  // ─── Tabs data (explicitly typed — no union error) ──
  const tabs: ShopTab[] = [
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
  ];

  // ─── First-visit help ───────────────────────────────
  useEffect(() => {
    if (!localStorage.getItem("doza_medical_help")) {
      setShowHelp(true);
      localStorage.setItem("doza_medical_help", "true");
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("min-h-screen bg-[#F8FAFC] pb-24 pt-4", poppins.className)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="h-6 w-1 rounded-full bg-emerald-600" />
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
                Verified wellness store
              </span>
            </div>
            <h1
              className={cn(
                "text-3xl sm:text-4xl md:text-5xl text-slate-900 leading-[1.05] tracking-tight",
                bebasNeue.className,
              )}
            >
              Medical <span className="text-emerald-600">Shop</span>
            </h1>
            <p className="text-sm text-slate-600 mt-2 max-w-lg leading-relaxed">
              Hospital-grade equipment, daily wellness solutions, and personal
              care essentials — delivered safely.
            </p>
          </div>
          <button
            onClick={() => setShowHelp(true)}
            className={cn(
              "shrink-0 min-h-11 inline-flex items-center justify-center gap-2 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors shadow-sm text-sm",
              FOCUS,
            )}
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">How to shop</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "min-h-11 flex items-center gap-2 px-4 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors",
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50",
                  FOCUS,
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count ? (
                  <span
                    className={cn(
                      "ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-5 h-5 inline-flex items-center justify-center",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-700",
                    )}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Shop tab */}
        {activeTab === "shop" && (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm mb-6">
              <div className="flex flex-col lg:flex-row gap-3">
                <SearchInput
                  initialValue={search}
                  onDebouncedChange={setSearch}
                  placeholder="Search equipment, remedies, supplies…"
                />
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "min-h-11 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 lg:hidden",
                    FOCUS,
                  )}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 transition-transform",
                      showFilters && "rotate-180",
                    )}
                  />
                </button>

                <div className="hidden lg:flex items-center gap-2 flex-wrap">
                  <select
                    value={selectedCategory}
                    onChange={(e) =>
                      setSelectedCategory(e.target.value as CategoryFilter)
                    }
                    className={cn(
                      "min-h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 cursor-pointer",
                      FOCUS,
                    )}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className={cn(
                      "min-h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 cursor-pointer",
                      FOCUS,
                    )}
                  >
                    <option value="">All sizes</option>
                    {allSizes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-3 min-h-11">
                    <span className="text-xs text-slate-500 font-semibold">
                      ₦
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="Min"
                      value={priceRange[0]}
                      onChange={(e) =>
                        setPriceRange([+e.target.value, priceRange[1]])
                      }
                      className="w-16 bg-transparent text-xs text-slate-800 focus:outline-none placeholder:text-slate-400 font-medium"
                    />
                    <span className="text-slate-300">–</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="Max"
                      value={priceRange[1]}
                      onChange={(e) =>
                        setPriceRange([priceRange[0], +e.target.value])
                      }
                      className="w-20 bg-transparent text-xs text-slate-800 focus:outline-none placeholder:text-slate-400 font-medium"
                    />
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="lg:hidden mt-3 pt-3 border-t border-slate-100 overflow-hidden"
                  >
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                          Category
                        </label>
                        <select
                          value={selectedCategory}
                          onChange={(e) =>
                            setSelectedCategory(
                              e.target.value as CategoryFilter,
                            )
                          }
                          className="w-full min-h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                          Size
                        </label>
                        <select
                          value={selectedSize}
                          onChange={(e) => setSelectedSize(e.target.value)}
                          className="w-full min-h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium"
                        >
                          <option value="">All sizes</option>
                          {allSizes.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                          Price range (₦)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="Min"
                            value={priceRange[0]}
                            onChange={(e) =>
                              setPriceRange([+e.target.value, priceRange[1]])
                            }
                            className="w-1/2 min-h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400"
                          />
                          <span className="text-slate-400 font-bold">–</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="Max"
                            value={priceRange[1]}
                            onChange={(e) =>
                              setPriceRange([priceRange[0], +e.target.value])
                            }
                            className="w-1/2 min-h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {Object.entries(groupedByCategory).map(([category, items]) => (
              <div key={category} className="mb-8">
                <div className="flex items-center gap-2.5 mb-3 px-1">
                  <div className="w-1 h-5 rounded-full bg-emerald-600" />
                  <h3
                    className={cn(
                      "text-lg sm:text-xl font-bold text-slate-900 tracking-tight",
                      bebasNeue.className,
                    )}
                  >
                    {category}
                  </h3>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>

                <div className="overflow-x-auto pb-3 px-1 snap-x snap-proximity scrollbar-none [&::-webkit-scrollbar]:hidden">
                  <div className="flex gap-4">
                    {items.map((product) => (
                      <div
                        key={product.id}
                        className="w-60 sm:w-64 flex-shrink-0 snap-start"
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
              <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-800 mb-1">
                  No products found
                </h4>
                <p className="text-sm text-slate-600 max-w-xs mx-auto">
                  Try adjusting your search, price filter, or category.
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === "saved" && (
          <SavedItemsTab savedItems={savedItems} onToggleSave={toggleSave} />
        )}
        {activeTab === "orders" && (
          <OrdersTab orders={orders} userName={user?.fullName || "Customer"} />
        )}
      </div>

      {/* Floating cart */}
      <button
        onClick={() => setShowCart(true)}
        aria-label={`Open cart (${cartItems.length} items)`}
        className={cn(
          "fixed bottom-6 right-6 z-40 min-h-14 min-w-14 inline-flex items-center justify-center bg-emerald-600 text-white rounded-2xl shadow-lg hover:bg-emerald-700 active:scale-95 transition-all",
          FOCUS,
        )}
      >
        <ShoppingCart className="w-6 h-6" />
        {cartItems.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white text-xs font-bold rounded-full min-w-6 h-6 px-1.5 flex items-center justify-center shadow-md">
            {cartItems.length}
          </span>
        )}
      </button>

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

      <AnimatePresence>
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
