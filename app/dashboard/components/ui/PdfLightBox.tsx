// app/dashboard/components/PdfLightbox.tsx
"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { X, ShieldAlert, FileText, Lock } from "lucide-react";
import SecurePdfViewer from "./SecurePdfViewer";

export default function PdfLightbox({
  url,
  fileName,
  watermarkText,
  onClose,
}: {
  url: string;
  fileName?: string | null;
  watermarkText: string;
  onClose: () => void;
}) {
  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="dialog"
      aria-modal="true"
      aria-label={`Full screen document: ${fileName || "Document.pdf"}`}
      className="fixed inset-0 z-[500] bg-neutral-950 flex flex-col"
      onClick={onClose}
    >
      {/* ── Header ───────────────────────────────── */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 flex items-center gap-3 px-3 sm:px-5 py-3 bg-neutral-950/90 backdrop-blur-md border-b border-white/10 pt-[max(0.75rem,env(safe-area-inset-top))]"
      >
        <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
          <FileText size={18} className="text-rose-300" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-bold text-white truncate leading-tight">
            {fileName || "Document.pdf"}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
              <ShieldAlert size={10} />
              Secure preview
            </span>
            <span className="text-white/30">·</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/60">
              <Lock size={9} />
              Watermarked
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close document"
          className="shrink-0 min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white active:scale-95 transition-all"
        >
          <X size={20} />
        </button>
      </motion.header>

      {/* ── Body ─────────────────────────────────── */}
      {/* Clicking the dark area around the PDF closes; clicking the PDF does not. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          delay: 0.05,
          type: "spring",
          stiffness: 280,
          damping: 26,
        }}
        className="flex-1 min-h-0 overflow-hidden flex items-start justify-center p-2 sm:p-6"
        onClick={onClose}
      >
        <div
          className="w-full max-w-4xl h-full flex flex-col rounded-xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <SecurePdfViewer
            url={url}
            fileName={fileName}
            watermarkText={watermarkText}
            fillHeight
          />
        </div>
      </motion.div>

      {/* ── Footer ───────────────────────────────── */}
      <motion.footer
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 px-3 sm:px-5 py-2.5 bg-neutral-950/90 backdrop-blur-md border-t border-white/10 flex items-center justify-between gap-2 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
      >
        <p className="text-[10px] sm:text-[11px] font-medium text-white/50 flex items-center gap-1.5 min-w-0 truncate">
          <Lock size={10} className="text-emerald-400 shrink-0" />
          <span className="truncate">Downloads and printing are disabled</span>
        </p>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Desktop: keyboard hint */}
          <span className="hidden sm:inline text-[10px] font-medium text-white/40">
            Press
          </span>
          <kbd className="hidden sm:inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold text-white/70 bg-white/10 border border-white/20 rounded-md">
            ESC
          </kbd>
          <span className="hidden sm:inline text-[10px] font-medium text-white/40">
            to close
          </span>

          {/* Mobile: tap hint */}
          <span className="sm:hidden text-[10px] font-medium text-white/40">
            Tap outside to close
          </span>
        </div>
      </motion.footer>
    </motion.div>
  );
}
