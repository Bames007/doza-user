// app/dashboard/components/medicalshop/SavedItemsTab.tsx
"use client";

import { Heart } from "lucide-react";
import { cn } from "@/app/utils/utils";
import type { SavedItem } from "@/app/dashboard/constants/medicalShop";
import { FOCUS } from "@/app/dashboard/constants/medicalShopConstants";

interface SavedItemsTabProps {
  savedItems: SavedItem[];
  onToggleSave: (product: any) => void;
}

export function SavedItemsTab({
  savedItems,
  onToggleSave,
}: SavedItemsTabProps) {
  if (!savedItems?.length) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-white rounded-2xl border-2 border-dashed border-slate-200">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
          <Heart className="w-8 h-8 text-rose-500" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Your saved items are empty
        </h3>
        <p className="text-sm text-slate-600 max-w-sm leading-relaxed">
          Tap the heart on any product to save it here for later.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {savedItems.map((item) => (
        <div
          key={item.id}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
        >
          <div className="relative h-48 overflow-hidden bg-slate-50">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                {item.name}
              </h3>
              <p className="text-lg font-bold text-emerald-700 mt-1">
                ₦{item.price.toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => onToggleSave(item)}
              className={cn(
                "mt-4 w-full min-h-11 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-rose-100 transition-colors",
                FOCUS,
              )}
            >
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              Remove from saved
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
