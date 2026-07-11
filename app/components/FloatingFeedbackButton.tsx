// components/FloatingFeedbackButton.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue } from "framer-motion";
import Image from "next/image";
import FeedbackModal from "./DozaFeedbackSystem";

export default function FloatingFeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragEndRef = useRef({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Restore position from localStorage
  useEffect(() => {
    const savedX = localStorage.getItem("feedbackBtnX");
    const savedY = localStorage.getItem("feedbackBtnY");
    if (savedX && savedY) {
      x.set(parseFloat(savedX));
      y.set(parseFloat(savedY));
    }
  }, [x, y]);

  const handleDragStart = () => {
    setIsDragging(false);
    dragStartRef.current = { x: x.get(), y: y.get() };
  };

  const handleDrag = () => {
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    dragEndRef.current = { x: x.get(), y: y.get() };
    localStorage.setItem("feedbackBtnX", String(x.get()));
    localStorage.setItem("feedbackBtnY", String(y.get()));
    setTimeout(() => setIsDragging(false), 50);
  };

  const handleClick = () => {
    if (!isDragging) {
      setIsOpen(true);
    }
  };

  return (
    <>
      <motion.div
        ref={buttonRef}
        drag
        dragMomentum={false}
        style={{ x, y }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        className="fixed bottom-6 right-6 z-50 cursor-grab active:cursor-grabbing"
        whileHover={{ scale: 1.4, opacity: 1 }}
        whileTap={{ scale: 0.85 }}
        animate={{
          opacity: 0.65,
          scale: 1,
          boxShadow: [
            "0 0 0 0 rgba(16, 185, 129, 0.3)",
            "0 0 0 8px rgba(16, 185, 129, 0)",
          ],
        }}
        transition={{
          opacity: { duration: 0.4 },
          scale: { type: "spring", stiffness: 300, damping: 20 },
          boxShadow: {
            duration: 2.5,
            repeat: Infinity,
            ease: "easeOut",
          },
        }}
      >
        <div
          className="relative flex items-center justify-center w-11 h-11 rounded-full 
                     bg-white/70 backdrop-blur-sm border border-emerald-300/40 
                     shadow-sm transition-shadow duration-300
                     hover:bg-white/90 hover:border-emerald-400/70 hover:shadow-md"
        >
          <Image
            src="/logo.png"
            alt="Feedback"
            width={22}
            height={22}
            className="drop-shadow-sm"
          />
          {/* Small green dot indicator */}
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm animate-pulse" />
        </div>
        {/* Tooltip label – only appears on hover */}
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/90 backdrop-blur-sm text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg border border-emerald-100 opacity-0 pointer-events-none transition-opacity duration-200 hover:opacity-100">
          Feedback
        </div>
      </motion.div>

      <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
