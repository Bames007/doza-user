// app/dashboard/components/medicalshop/ProductQuickView.tsx
"use client";

import { useState } from "react";
import {
  Heart,
  Star,
  Minus,
  Plus,
  AlertTriangle,
  Truck,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import type { MedicalProduct } from "@/app/dashboard/constants/medicalShop";
import { Modal } from "../../modals/MedicalShopModal";
import { FOCUS } from "@/app/dashboard/constants/medicalShopConstants";

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

export function ProductQuickView({
  product,
  onClose,
  onAddToCart,
  isSaved,
  onToggleSave,
}: ProductQuickViewProps) {
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || "");
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || "");
  const [quantity, setQuantity] = useState(1);

  return (
    <Modal onClose={onClose} size="lg">
      <div className="flex flex-col lg:flex-row gap-5 max-h-[85vh] overflow-y-auto">
        <div className="lg:w-1/2 flex-shrink-0">
          <div className="rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-auto object-cover aspect-square"
            />
          </div>
        </div>

        <div className="lg:w-1/2 flex flex-col gap-3">
          <div className="flex justify-between items-start gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
              {product.name}
            </h2>
            <button
              onClick={onToggleSave}
              aria-label={isSaved ? "Remove from saved" : "Save item"}
              className={cn(
                "min-h-11 min-w-11 inline-flex items-center justify-center border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shrink-0",
                FOCUS,
              )}
            >
              <Heart
                className={cn(
                  "w-5 h-5",
                  isSaved ? "fill-rose-500 text-rose-500" : "text-slate-600",
                )}
              />
            </button>
          </div>

          <div>
            <p className="text-2xl font-bold text-emerald-700">
              ₦{product.price.toLocaleString()}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {product.rating && (
                <div className="flex items-center bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 mr-1" />
                  <span className="text-xs font-bold text-amber-800">
                    {product.rating}
                  </span>
                </div>
              )}
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {product.brand}
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-700 leading-relaxed border-t border-slate-100 pt-3">
            {product.description}
          </p>

          {product.prescriptionRequired && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Prescription required</span> — you
                can upload it during checkout.
              </div>
            </div>
          )}

          {product.sizes && product.sizes.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Size
              </p>
              <div className="flex flex-wrap gap-1.5">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={cn(
                      "min-h-10 px-3 text-sm rounded-xl border font-semibold transition-colors",
                      selectedSize === s
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                      FOCUS,
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.colors && product.colors.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Color
              </p>
              <div className="flex flex-wrap gap-1.5">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className={cn(
                      "min-h-10 px-3 text-sm rounded-xl border font-semibold transition-colors",
                      selectedColor === c
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                      FOCUS,
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Decrease quantity"
                className="min-h-11 min-w-11 inline-flex items-center justify-center hover:bg-slate-100 text-slate-600 transition-colors rounded-l-xl"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-2 text-base w-10 text-center text-slate-900 font-bold">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                aria-label="Increase quantity"
                className="min-h-11 min-w-11 inline-flex items-center justify-center hover:bg-slate-100 text-slate-600 transition-colors rounded-r-xl"
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
                "flex-1 min-h-12 rounded-xl text-sm font-bold transition-colors",
                product.inStock
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed",
                FOCUS,
              )}
            >
              {product.inStock ? "Add to cart" : "Out of stock"}
            </button>
          </div>

          <div className="text-xs text-slate-500 border-t border-slate-100 pt-3 flex flex-wrap justify-between gap-2">
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-emerald-600" /> Free delivery
              above ₦50,000
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 30-day
              returns
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
