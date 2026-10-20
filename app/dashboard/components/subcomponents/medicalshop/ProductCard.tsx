// app/dashboard/components/medicalshop/ProductCard.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Star } from "lucide-react";
import { cn } from "@/app/utils/utils";
import type { MedicalProduct } from "@/app/dashboard/constants/medicalShop";
import { FOCUS } from "@/app/dashboard/constants/medicalShopConstants";

interface ProductCardProps {
  product: MedicalProduct;
  isSaved: boolean;
  onToggleSave: () => void;
  onAddToCart: (size?: string, color?: string) => void;
  onQuickView: () => void;
}

export function ProductCard({
  product,
  isSaved,
  onToggleSave,
  onAddToCart,
  onQuickView,
}: ProductCardProps) {
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || "");
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || "");

  return (
    <motion.div
      whileTap={{ scale: 0.995 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="group bg-white rounded-2xl border border-slate-200 shadow-sm md:hover:shadow-md transition-shadow overflow-hidden cursor-pointer h-full flex flex-col"
      onClick={onQuickView}
    >
      <div className="relative h-48 sm:h-56 overflow-hidden bg-slate-50 flex-shrink-0">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
        />

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave();
          }}
          aria-label={isSaved ? "Remove from saved" : "Save item"}
          className={cn(
            "absolute top-3 right-3 min-h-10 min-w-10 inline-flex items-center justify-center bg-white/95 backdrop-blur rounded-xl shadow-sm hover:bg-white transition-colors",
            FOCUS,
          )}
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-colors",
              isSaved ? "fill-rose-500 text-rose-500" : "text-slate-600",
            )}
          />
        </button>

        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
          {!product.inStock && (
            <span className="px-2.5 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg uppercase tracking-wider">
              Out of stock
            </span>
          )}
          {product.prescriptionRequired && product.inStock && (
            <span className="px-2.5 py-1 bg-amber-600 text-white text-xs font-bold rounded-lg uppercase tracking-wider">
              Rx required
            </span>
          )}
        </div>

        {product.rating && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-slate-900/85 backdrop-blur text-white px-2 py-0.5 rounded-lg text-xs font-bold">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {product.rating}
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="mb-2">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
            {product.brand}
          </p>
          <h3 className="text-base font-bold text-slate-900 line-clamp-1 mt-0.5">
            {product.name}
          </h3>
        </div>

        <div className="flex items-center justify-between mt-auto mb-3">
          <span className="text-lg font-bold text-emerald-700">
            ₦{product.price.toLocaleString()}
          </span>
          {product.inStock && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              In stock
            </span>
          )}
        </div>

        {product.sizes && product.sizes.length > 0 && (
          <div className="mb-3" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1.5">
              Size
            </p>
            <div className="flex flex-wrap gap-1.5">
              {product.sizes.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  className={cn(
                    "min-h-8 px-2.5 text-xs rounded-lg font-semibold border transition-colors",
                    selectedSize === s
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100",
                  )}
                >
                  {s}
                </button>
              ))}
              {product.sizes.length > 3 && (
                <span className="text-xs text-slate-500 font-semibold self-center">
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
            "w-full mt-auto min-h-11 rounded-xl text-sm font-bold transition-colors",
            product.inStock
              ? "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]"
              : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200",
            FOCUS,
          )}
        >
          {product.inStock ? "Add to cart" : "Out of stock"}
        </button>
      </div>
    </motion.div>
  );
}
