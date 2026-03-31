"use client";

import React from "react";
import { motion } from "framer-motion";
import { Home, ArrowRight, Activity, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { bebasNeue, poppins } from "./constants";
import Image from "next/image";
import { cn } from "@/app/utils/utils";

const Error404: React.FC = () => {
  return (
    <div
      className={cn(
        "min-h-screen bg-[#FAFAFA] relative overflow-hidden flex items-center justify-center px-6",
        poppins.className,
      )}
    >
      {/* Signature Background Blurs */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-100/30 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-2xl w-full mx-auto text-center">
        {/* Brand Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-12 sm:mb-16"
        >
          <div className="w-16 h-16 bg-white border-2 border-slate-50 rounded-[2rem] flex items-center justify-center shadow-xl shadow-slate-200/50 mb-4 transition-transform hover:rotate-12">
            <Image
              alt="Doza Logo"
              src="/logo.png"
              height={40}
              width={40}
              className="object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              System Error: 404
            </p>
          </div>
        </motion.div>

        {/* Main 404 Content */}
        <div className="space-y-2 mb-12">
          <motion.h1
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, delay: 0.1 }}
            className={cn(
              "text-[10rem] sm:text-[14rem] md:text-[18rem] font-black text-slate-900 leading-[0.7] tracking-tighter uppercase",
              bebasNeue.className,
            )}
          >
            404
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2
              className={cn(
                "text-3xl sm:text-5xl font-black text-emerald-500 uppercase tracking-tighter leading-none",
                bebasNeue.className,
              )}
            >
              Lost in the <span className="text-slate-900">System</span>
            </h2>
            <p className="mt-6 text-sm sm:text-lg text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
              The record you're searching for isn't in our current database.
              Let's re-route you to the primary dashboard.
            </p>
          </motion.div>
        </div>

        {/* Action Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:min-w-[240px] px-8 py-5 bg-slate-900 text-white rounded-[2rem] font-bold shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 transition-colors hover:bg-emerald-600 group"
            >
              <Home size={20} className="text-emerald-400" />
              <span className="uppercase tracking-widest text-xs font-black">
                Back to Dashboard
              </span>
              <ArrowRight
                size={18}
                className="group-hover:translate-x-1 transition-transform"
              />
            </motion.button>
          </Link>
        </motion.div>

        {/* Bottom Metrics/Decor */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-20 pt-10 border-t border-slate-100 flex flex-col items-center gap-6"
        >
          <div className="flex items-center gap-8 opacity-40">
            <div className="flex flex-col items-center">
              <Activity size={20} className="text-slate-400 mb-1" />
              <span className="text-[8px] font-black uppercase tracking-widest">
                Live Status
              </span>
            </div>
            <div className="flex flex-col items-center">
              <ShieldAlert size={20} className="text-slate-400 mb-1" />
              <span className="text-[8px] font-black uppercase tracking-widest">
                Secure Link
              </span>
            </div>
          </div>

          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
            Doza Healthcare Systems © 2024
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Error404;
