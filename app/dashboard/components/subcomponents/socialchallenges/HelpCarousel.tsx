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
      className="fixed inset-0 bg-slate-950/50 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white/95 backdrop-blur-2xl rounded-[28px] sm:rounded-[32px] max-w-md w-full p-6 sm:p-7 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.2)] border border-slate-200/80 relative overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative background gradient splash */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Carousel Header Section */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100/60 shadow-2xs">
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </div>
            <h2
              className={cn(
                "text-xl sm:text-2xl font-bold text-slate-900 tracking-wide",
                bebasNeue.className,
              )}
            >
              Doza Challenge Guide
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 border border-transparent hover:border-slate-200/60 rounded-xl transition-all active:scale-95"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Dynamic Display Area */}
        <div className="relative min-h-[190px] sm:min-h-[210px] flex items-center justify-center px-6 sm:px-8 py-6 bg-gradient-to-b from-slate-50/80 to-slate-100/50 border border-slate-100/80 rounded-2xl sm:rounded-3xl mb-5 shadow-inner">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex flex-col items-center text-center my-auto"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-2xl shadow-md border border-slate-200/60 flex items-center justify-center text-3xl sm:text-4xl mb-4 select-none transform hover:scale-105 transition-transform">
                {helpSlides[slide].icon}
              </div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest mb-1.5">
                {helpSlides[slide].title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-[280px]">
                {helpSlides[slide].description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Navigational Arrows */}
          <button
            onClick={handlePrev}
            className="absolute left-2.5 p-2 bg-white/95 hover:bg-white border border-slate-200/80 text-slate-600 rounded-xl hover:text-emerald-600 active:scale-90 transition-all shadow-sm"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2.5 p-2 bg-white/95 hover:bg-white border border-slate-200/80 text-slate-600 rounded-xl hover:text-emerald-600 active:scale-90 transition-all shadow-sm"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Indicator Timeline Pills & Confirmation Element */}
        <div className="flex items-center justify-between mt-1 relative z-10">
          <div className="flex gap-1.5 items-center">
            {helpSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 outline-none",
                  i === slide
                    ? "bg-emerald-600 w-6 shadow-xs shadow-emerald-500/20"
                    : "bg-slate-200 hover:bg-slate-300 w-2",
                )}
              />
            ))}
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-slate-900/10 transition-all active:scale-95"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Got It</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
