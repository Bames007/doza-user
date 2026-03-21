"use client";

import React from "react";
import { motion } from "framer-motion";
import { Home, ArrowRight } from "lucide-react";
import Link from "next/link";
import { bebasNeue, poppins } from "./constants";
import Image from "next/image";

const Error404: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50/30 relative overflow-hidden flex items-center justify-center px-4 sm:px-6 lg:px-8">
      {/* Single, subtle animated background element */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.1, 0.15, 0.1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-20 left-1/2 -translate-x-1/2 w-64 h-64 sm:w-96 sm:h-96 bg-green-200 rounded-full blur-3xl"
      />

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        {/* Doza Logo – clean, brand-centered */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center justify-center gap-2 mb-8 sm:mb-12"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-white-600 to-white-600 rounded-xl flex items-center justify-center shadow-lg">
            <Image alt="Doza Logo" src={"/logo.png"} height={30} width={30} />
          </div>
          <span
            className={`text-2xl sm:text-3xl font-bold text-slate-900 text-color-green ${bebasNeue.className}`}
          >
            DOZA
          </span>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* 404 – clean, bold, no decorative overload */}
          <motion.h1
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 80,
              damping: 15,
              delay: 0.2,
            }}
            className={`text-8xl sm:text-9xl md:text-[12rem] font-bold text-slate-900 ${bebasNeue.className} leading-none mb-4`}
          >
            404
          </motion.h1>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className={`text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 mb-4 ${bebasNeue.className}`}
          >
            Page Not Found
          </motion.h2>

          {/* Description – clear and concise */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className={`text-base sm:text-lg text-slate-600 mb-10 sm:mb-12 leading-relaxed ${poppins.className} px-2`}
          >
            The page you're looking for doesn't exist or has been moved. Let's
            get you back to a familiar place.
          </motion.p>

          {/* Single, prominent call-to-action – only home */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <Link href="/" className="inline-block w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:min-w-[240px] px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold shadow-xl hover:shadow-green-500/25 transition-all duration-300 flex items-center justify-center gap-3 group"
              >
                <Home size={20} />
                <span className="text-base sm:text-lg">Return Home</span>
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </motion.button>
            </Link>
          </motion.div>

          {/* Subtle brand reassurance – replaces previous clutter */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className={`text-xs sm:text-sm text-slate-500 mt-10 sm:mt-12 ${poppins.className}`}
          >
            Doza Healthcare – your health, our priority
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
};

export default Error404;
