// app/dashboard/components/LoadingScreen.tsx
"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { bebasNeue, poppins } from "../constants";

interface LoadingScreenProps {
  message?: string;
  submessage?: string;
}

export default function LoadingScreen({
  message = "Loading Dashboard",
  submessage = "Preparing your medic workspace",
}: LoadingScreenProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${poppins.className}`}
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -10%, #d1fae5 0%, #ecfdf5 35%, #f8fafc 75%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 h-1/2 w-1/2 rounded-full bg-emerald-200/30 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-teal-200/30 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative flex flex-col items-center"
      >
        <div className="relative flex h-32 w-32 items-center justify-center">
          {[0, 0.4, 0.8].map((delay, i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full border border-emerald-500/40"
              initial={{ scale: 0.6, opacity: 0.7 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{
                duration: 2,
                delay,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          ))}

          <div className="absolute inset-0 rounded-full bg-white/70 backdrop-blur-sm shadow-[0_10px_40px_-12px_rgba(16,185,129,0.35)] border border-emerald-100" />

          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-inner"
          >
            <Image
              src="/logo.png"
              alt="Doza Medic"
              width={40}
              height={40}
              priority
              // FIX: prevent the flex parent from stretching one axis only
              style={{ width: "auto", height: "auto" }}
            />
          </motion.div>
        </div>

        <h1
          className={`mt-10 text-4xl font-bold tracking-wide text-slate-900 ${bebasNeue.className}`}
        >
          DOZA <span className="text-emerald-600">MEDIC</span>
        </h1>

        <p className="mt-2 text-sm font-medium text-slate-500">{message}</p>

        <div className="mt-8 flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-8 rounded-full bg-emerald-500"
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          {submessage}
        </p>
      </motion.div>
    </div>
  );
}
