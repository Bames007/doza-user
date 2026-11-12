// app/dashboard/components/MiniChatPill.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
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

/** Where we remember a long-press dismissal (per appointment). */
const DISMISS_KEY = "doza_minichat_dismissed_id";
/** How long a press must be held to dismiss the pill. */
const LONG_PRESS_MS = 550;
/** Movement (px) after which a press is treated as a drag, not a tap/long-press. */
const DRAG_THRESHOLD = 5;
/** Keep the pill this far from the viewport edges while dragging. */
const EDGE_MARGIN = 8;

type Gesture = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  /** The pill's layout box with the current translate stripped out. */
  box: { left: number; top: number; right: number; bottom: number };
  dragging: boolean;
  longPressed: boolean;
  timer: number | null;
};

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

function readDismissedId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(DISMISS_KEY);
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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
  const [dismissedId, setDismissedId] = useState<string | null>(
    readDismissedId,
  );

  // Drag offset (applied as a transform on top of the fixed right/bottom anchor).
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const btnRef = useRef<HTMLButtonElement>(null);
  const gesture = useRef<Gesture | null>(null);

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

  // If the viewport changes (rotation, resize, mobile keyboard), keep the pill on-screen.
  useEffect(() => {
    const handleResize = () => {
      const el = btnRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ox = x.get();
      const oy = y.get();
      const left = rect.left - ox;
      const top = rect.top - oy;
      const right = rect.right - ox;
      const bottom = rect.bottom - oy;

      const minX = EDGE_MARGIN - left;
      const maxX = window.innerWidth - EDGE_MARGIN - right;
      const minY = EDGE_MARGIN - top;
      const maxY = window.innerHeight - EDGE_MARGIN - bottom;

      x.set(clamp(ox, minX, maxX));
      y.set(clamp(oy, minY, maxY));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [x, y]);

  if (!snap) return null;
  if (snap.isChatOpen) return null;
  if (dismissedId === snap.appointmentId) return null;
  if (now >= snap.endedMs) return null;

  const isWaiting = now < snap.scheduledMs;
  const remaining = isWaiting ? snap.scheduledMs - now : snap.endedMs - now;
  const total = snap.endedMs - snap.scheduledMs;
  const endingSoon = !isWaiting && remaining / total < 0.2;

  const dismissPill = (appointmentId: string) => {
    setDismissedId(appointmentId);
    try {
      sessionStorage.setItem(DISMISS_KEY, appointmentId);
    } catch {}
    try {
      navigator.vibrate?.(10);
    } catch {}
  };

  const openChat = () => {
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

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = btnRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const ox = x.get();
    const oy = y.get();
    const appointmentId = snap.appointmentId;

    // Long press => dismiss the pill.
    const timer = window.setTimeout(() => {
      const g = gesture.current;
      if (!g || g.dragging) return;
      g.longPressed = true;
      if (g.timer) {
        window.clearTimeout(g.timer);
        g.timer = null;
      }
      dismissPill(appointmentId);
    }, LONG_PRESS_MS);

    gesture.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: ox,
      originY: oy,
      box: {
        left: rect.left - ox,
        top: rect.top - oy,
        right: rect.right - ox,
        bottom: rect.bottom - oy,
      },
      dragging: false,
      longPressed: false,
      timer,
    };

    try {
      el.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    if (!g.dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      g.dragging = true;
      if (g.timer) {
        window.clearTimeout(g.timer);
        g.timer = null;
      }
    }
    if (!g.dragging) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const minX = EDGE_MARGIN - g.box.left;
    const maxX = vw - EDGE_MARGIN - g.box.right;
    const minY = EDGE_MARGIN - g.box.top;
    const maxY = vh - EDGE_MARGIN - g.box.bottom;

    x.set(clamp(g.originX + dx, minX, maxX));
    y.set(clamp(g.originY + dy, minY, maxY));
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    if (g.timer) {
      window.clearTimeout(g.timer);
      g.timer = null;
    }
    try {
      btnRef.current?.releasePointerCapture(e.pointerId);
    } catch {}
    // Note: we intentionally keep `gesture.current` around so the
    // immediately following `click` can see whether it was a drag/long-press.
    // It's replaced on the next pointerdown.
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const g = gesture.current;
    // e.detail === 0 => keyboard activation (Enter/Space), never suppress.
    if (e.detail !== 0 && g && (g.dragging || g.longPressed)) {
      e.preventDefault();
      return;
    }
    openChat();
  };

  return (
    <AnimatePresence>
      <motion.button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        style={{ x, y }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        className={cn(
          "fixed z-[55] flex items-center gap-2.5 pl-2 pr-3 py-2 rounded-full border shadow-lg backdrop-blur-md text-left transition-colors select-none touch-none cursor-grab active:cursor-grabbing",
          isMobile
            ? "right-4 bottom-[88px] max-w-[calc(100vw-2rem)]"
            : "right-6 bottom-6 max-w-sm",
          endingSoon
            ? "bg-rose-50 border-rose-200 text-rose-900 shadow-rose-200/40"
            : isWaiting
              ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/40"
              : "bg-emerald-600 border-emerald-500 text-white shadow-emerald-600/30",
        )}
        aria-label={`Open chat with ${snap.medicName}. Long press to dismiss.`}
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
              draggable={false}
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
