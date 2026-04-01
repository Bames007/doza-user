// components/FloatingFeedbackButton.tsx
"use client";

import { useState } from "react";
import { MessageSquareHeart } from "lucide-react";
import { motion } from "framer-motion";
import FeedbackModal from "./DozaFeedbackSystem";

export default function FloatingFeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-emerald-600 text-white rounded-full shadow-2xl shadow-emerald-200 flex items-center justify-center border-4 border-white active:bg-emerald-700 transition-colors"
      >
        <MessageSquareHeart size={28} />
      </motion.button>
      <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
