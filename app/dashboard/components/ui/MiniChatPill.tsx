// app/dashboard/components/MiniChatPill.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ChevronRight } from "lucide-react";
import { cn } from "@/app/utils/utils";
import { CHAT_SESSION_KEY, CHAT_EVENT } from "./ChatPanel";

type Snapshot = {
  appointmentId: string;
  medicName: string;
  medicImage: string | null;
  scheduledMs: number;
  endedMs: number;
  durationLabel: string;
  isChatOpen: boolean;
  updatedAt: number;
};

export const OPEN_CHAT_KEY = "doza_open_chat_id";
export const OPEN_CHAT_EVENT = "doza:open-chat";

function readSnapshot(): Snapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CHAT_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Snapshot;
  } catch {
    return null;
  }
}

function fmtTimer(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export default function MiniChatPill({
  onOpenChat,
  isMobile = false,
}: {
  onOpenChat: (appointmentId: string) => void;
  isMobile?: boolean;
}) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const sync = () => setSnap(readSnapshot());
    sync();
    window.addEventListener(CHAT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHAT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!snap) return null;
  if (snap.isChatOpen) return null;
  if (now >= snap.endedMs) return null;

  const isWaiting = now < snap.scheduledMs;
  const remaining = isWaiting ? snap.scheduledMs - now : snap.endedMs - now;
  const total = snap.endedMs - snap.scheduledMs;
  const endingSoon = !isWaiting && remaining / total < 0.2;

  const handleClick = () => {
    // Belt + suspenders: storage for cold-start, event for warm-start
    try {
      sessionStorage.setItem(OPEN_CHAT_KEY, snap.appointmentId);
    } catch {}

    try {
      window.dispatchEvent(
        new CustomEvent(OPEN_CHAT_EVENT, {
          detail: { appointmentId: snap.appointmentId },
        }),
      );
    } catch {}

    onOpenChat(snap.appointmentId);
  };

  return (
    <AnimatePresence>
      <motion.button
        type="button"
        onClick={handleClick}
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        className={cn(
          "fixed z-[55] flex items-center gap-2.5 pl-2 pr-3 py-2 rounded-full border shadow-lg backdrop-blur-md text-left transition-colors",
          isMobile
            ? "right-4 bottom-[88px] max-w-[calc(100vw-2rem)]"
            : "right-6 bottom-6 max-w-sm",
          endingSoon
            ? "bg-rose-50 border-rose-200 text-rose-900 shadow-rose-200/40"
            : isWaiting
              ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/40"
              : "bg-emerald-600 border-emerald-500 text-white shadow-emerald-600/30",
        )}
        aria-label={`Open chat with ${snap.medicName}`}
      >
        <div
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden border",
            endingSoon
              ? "bg-rose-100 border-rose-200"
              : isWaiting
                ? "bg-slate-100 border-slate-200"
                : "bg-white/20 border-white/30",
          )}
        >
          {snap.medicImage ? (
            <img
              src={snap.medicImage}
              alt={snap.medicName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span
              className={cn(
                "text-sm font-bold",
                endingSoon
                  ? "text-rose-700"
                  : isWaiting
                    ? "text-slate-600"
                    : "text-white",
              )}
            >
              {snap.medicName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <MessageCircle size={10} className="shrink-0 opacity-70" />
            <p
              className={cn(
                "text-[9px] font-bold uppercase tracking-wider",
                endingSoon
                  ? "text-rose-700"
                  : isWaiting
                    ? "text-slate-500"
                    : "text-emerald-100",
              )}
            >
              {isWaiting
                ? "Chat starts in"
                : endingSoon
                  ? "Ending soon"
                  : "Chat with"}
            </p>
          </div>
          <p className="text-xs font-bold truncate leading-tight">
            {snap.medicName}
          </p>
          <p
            className={cn(
              "text-[11px] font-semibold tabular-nums mt-0.5",
              endingSoon
                ? "text-rose-700"
                : isWaiting
                  ? "text-slate-600"
                  : "text-emerald-100",
            )}
          >
            {fmtTimer(remaining)}
          </p>
        </div>

        <ChevronRight
          size={14}
          className={cn(
            "shrink-0",
            endingSoon
              ? "text-rose-500"
              : isWaiting
                ? "text-slate-400"
                : "text-white/80",
          )}
        />
      </motion.button>
    </AnimatePresence>
  );
}
