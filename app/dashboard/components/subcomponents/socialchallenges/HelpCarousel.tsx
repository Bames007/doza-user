import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/app/utils/utils";
import { bebasNeue } from "@/app/constants";
import { helpSlides } from "@/app/types/challengeConstant";

export function HelpCarousel({ onClose }: { onClose: () => void }) {
  const [slide, setSlide] = useState(0);

  const handleNext = () => {
    setSlide((p) => (p === helpSlides.length - 1 ? 0 : p + 1));
  };

  const handlePrev = () => {
    setSlide((p) => (p === 0 ? helpSlides.length - 1 : p - 1));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 8 }}
        className="bg-white rounded-[24px] max-w-sm w-full p-5 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.15)] border border-slate-200/60 relative overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Carousel Header Section */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100/40">
              <HelpCircle className="w-4 h-4" />
            </div>
            <h2
              className={cn(
                "text-lg font-bold text-slate-800 tracking-wide",
                bebasNeue.className,
              )}
            >
              Operational Guide
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-lg transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dynamic Display Area */}
        <div className="relative min-h-[160px] flex items-center justify-center px-4 bg-slate-50/50 border border-slate-100 rounded-2xl mb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center text-center py-2"
            >
              <div className="text-4xl mb-3 drop-shadow-sm select-none">
                {helpSlides[slide].icon}
              </div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                {helpSlides[slide].title}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-[240px]">
                {helpSlides[slide].description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Navigational Arrows */}
          <button
            onClick={handlePrev}
            className="absolute left-2 p-1.5 bg-white border border-slate-200/60 text-slate-500 rounded-lg hover:bg-slate-50 active:scale-90 transition-all shadow-3xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 p-1.5 bg-white border border-slate-200/60 text-slate-500 rounded-lg hover:bg-slate-50 active:scale-90 transition-all shadow-3xs"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Indicator Timeline Pills & Confirmation Element */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex gap-1">
            {helpSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={cn(
                  "h-1 rounded-full transition-all duration-300 outline-none",
                  i === slide ? "bg-slate-800 w-4" : "bg-slate-200 w-1.5",
                )}
              />
            ))}
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all active:scale-95"
          >
            <Check className="w-3 h-3 stroke-[3]" />
            <span>Acknowledge</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
