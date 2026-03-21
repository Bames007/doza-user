import React from "react";
import { motion } from "framer-motion";

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full"
      />
    </div>
  );
};

export default LoadingScreen;
