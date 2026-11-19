// app/dashboard/components/ui/ChatPanel.tsx
"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Mic,
  Image as ImageIcon,
  Play,
  Pause,
  Clock,
  Star,
  Loader2,
  ShieldCheck,
  Video,
  AlertCircle,
  Check,
  ChevronLeft,
  Lock,
  ArrowDown,
  Paperclip,
  FilePlus,
  ClipboardList,
  FlaskConical,
  FileText,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { authFetcher, authPost } from "@/app/utils/client-auth";
import { cn } from "@/app/utils/utils";
import { fetchFile } from "@/app/utils/fireStore";
import SecurePdfViewer from "./SecurePdfViewer";
import PdfLightbox from "./PdfLightBox";
import {
  PrescriptionPad,
  TestsPad,
  NotesPad,
  type PrescriptionData,
  type PrescriptionDrug,
  type TestsData,
  type TestItem,
  type NoteData,
} from "../chat/ClinicalPads";
import {
  PrescriptionBubble,
  TestsBubble,
  NoteBubble,
} from "../chat/ClinicalBubble";
import { playMessageChime } from "@/app/utils/notify";
import {
  markChatSeen,
  popChatBackGuard,
  pushChatBackGuard,
  setOpenChatId,
} from "@/app/utils/chat-seen-state";
import { useDashboard } from "../../DashboardContext";
import AddDrugToCabinetModal from "./AddToDrugCabinetModal";

// ─── Types ─────────────────────────────────────────────
type ChatMessage = {
  id: string;
  senderId: string;
  senderRole: "patient" | "medic";
  text?: string | null;
  mediaUrl?: string | null;
  mediaType?:
    | "image"
    | "voice"
    | "pdf"
    | "prescription"
    | "tests"
    | "note"
    | null;
  mediaDurationMs?: number | null;
  fileName?: string | null;
  fileSize?: number | null;
  prescriptionData?: PrescriptionData | null;
  testsData?: TestsData | null;
  noteData?: NoteData | null;
  createdAt: number;
  editedAt?: number | null;
};

type PendingMessage = {
  id: string;
  text: string;
  createdAt: number;
  status: "sending" | "failed";
};

type ChatMeta = {
  patientId: string;
  patientName: string;
  patientProfileImage?: string | null;
  medicId: string;
  medicName: string;
  medicProfileImage: string | null;
  scheduledMs: number;
  endedMs: number;
  durationMs: number;
  durationLabel: string;
  status: "waiting" | "active" | "ended";
};

type ChatData = {
  role: "patient" | "medic";
  meta: ChatMeta | null;
  messages: ChatMessage[];
  ratings: {
    patient?: { stars: number; comment: string | null; createdAt: string };
    medic?: { stars: number; comment: string | null; createdAt: string };
  };
};

type ChatPhase = "waiting" | "active" | "ending" | "ended" | "rated";

interface ChatPanelProps {
  appointmentId: string;
  onClose: () => void;
}

// ─── Constants ─────────────────────────────────────────
export const CHAT_SESSION_KEY = "doza_chat_session";
export const CHAT_EVENT = "doza:chat-session-changed";

const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const PDF_MAX_BYTES = 6 * 1024 * 1024;
const VOICE_MAX_BYTES = 5 * 1024 * 1024;

const PENDING_RECONCILE_WINDOW_MS = 2 * 60 * 1000; // match real msg within 2 min
const PENDING_FAIL_AFTER_MS = 15_000; // flip to failed after 15 s

type ChatSessionSnapshot = {
  appointmentId: string;
  medicName: string;
  medicImage: string | null;
  scheduledMs: number;
  endedMs: number;
  durationLabel: string;
  isChatOpen: boolean;
  updatedAt: number;
};

function writeChatSession(s: ChatSessionSnapshot) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(s));
    window.dispatchEvent(new Event(CHAT_EVENT));
  } catch {}
}
function clearChatSession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CHAT_SESSION_KEY);
    window.dispatchEvent(new Event(CHAT_EVENT));
  } catch {}
}

// ─── Helpers ───────────────────────────────────────────
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
function fmtMessageTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtVoiceDuration(ms?: number | null): string {
  if (!ms) return "0:00";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
function fmtFileSize(bytes?: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function derivePhase(
  meta: ChatMeta | null,
  hasRating: boolean,
  now: number,
): ChatPhase {
  if (hasRating) return "rated";
  if (!meta) return "waiting";
  if (now < meta.scheduledMs) return "waiting";
  if (now >= meta.endedMs) return "ended";
  const elapsed = now - meta.scheduledMs;
  const total = meta.endedMs - meta.scheduledMs;
  return elapsed > total * 0.8 ? "ending" : "active";
}

async function fileToCompressedDataUrl(file: File): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = rawDataUrl;
  });
  const MAX_DIM = 1200;
  let { width: w, height: h } = img;
  if (w > MAX_DIM || h > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.7);
}
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Main component ────────────────────────────────────
export default function ChatPanel({ appointmentId, onClose }: ChatPanelProps) {
  const [now, setNow] = useState(Date.now());
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [pdfLightbox, setPdfLightbox] = useState<{
    url: string;
    fileName?: string | null;
    watermarkText: string;
  } | null>(null);
  const [addDrugModal, setAddDrugModal] = useState<{
    drug: PrescriptionDrug;
    index: number;
  } | null>(null);

  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showPrescriptionPad, setShowPrescriptionPad] = useState(false);
  const [showTestsPad, setShowTestsPad] = useState(false);
  const [showNotesPad, setShowNotesPad] = useState(false);
  const [clinicalSending, setClinicalSending] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordStartAt, setRecordStartAt] = useState<number>(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const sendingRef = useRef(false);

  // ── Optimistic + edit state ─────────────────────────
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [savingEditId, setSavingEditId] = useState<string | null>(null);

  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [unreadWhileScrolled, setUnreadWhileScrolled] = useState(0);
  const lastMessageCountRef = useRef(0);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const {
    data,
    error: fetchError,
    mutate,
  } = useSWR<{
    success: boolean;
    data: ChatData;
  }>(`/api/appointments/${appointmentId}/messages`, authFetcher, {
    refreshInterval: 8000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 4000,
    keepPreviousData: true,
  });

  const { setActivePanel } = useDashboard();

  // Tap a prescription drug row → open the Doza Map panel pre-seeded with
  // a search for that drug name. Same for tests below.
  //
  // Uses the `doza_map_handoff_v1` sessionStorage contract that
  // DozaMapPanel already reads on mount (and re-reads when the
  // `doza-map-handoff` event fires), so the map panel needs no changes.
  const sendToMap = useCallback(
    (term: string, type: "drug" | "test") => {
      const q = term.trim();
      if (!q) return;
      try {
        sessionStorage.setItem(
          "doza_map_handoff_v1",
          JSON.stringify({ q, type, ts: Date.now() }),
        );
      } catch {}
      try {
        window.dispatchEvent(new Event("doza-map-handoff"));
      } catch {}
      setActivePanel("doza-map");
      onClose();
    },
    [onClose, setActivePanel],
  );

  const handleDrugTap = useCallback(
    (drug: PrescriptionDrug) => sendToMap(drug.name, "drug"),
    [sendToMap],
  );

  const handleAddDrug = useCallback((drug: PrescriptionDrug) => {
    if (!drug.name?.trim()) return;
    setAddDrugModal({ drug, index: 0 });
  }, []);

  const handleTestTap = useCallback(
    (test: TestItem) => sendToMap(test.name, "test"),
    [sendToMap],
  );

  const chat = data?.success ? data.data : null;
  const role = chat?.role || "patient";
  const meta = chat?.meta || null;
  const messages = chat?.messages || [];
  const ratings = chat?.ratings || {};

  const myRating = ratings[role];
  const phase = useMemo(
    () => derivePhase(meta, !!myRating, now),
    [meta, myRating, now],
  );

  // ── Session snapshot for MiniChatPill ───────────────
  useEffect(() => {
    if (!meta) return;
    writeChatSession({
      appointmentId,
      medicName: meta.medicName,
      medicImage: meta.medicProfileImage,
      scheduledMs: meta.scheduledMs,
      endedMs: meta.endedMs,
      durationLabel: meta.durationLabel,
      isChatOpen: true,
      updatedAt: Date.now(),
    });
    return () => {
      if (Date.now() < meta.endedMs) {
        writeChatSession({
          appointmentId,
          medicName: meta.medicName,
          medicImage: meta.medicProfileImage,
          scheduledMs: meta.scheduledMs,
          endedMs: meta.endedMs,
          durationLabel: meta.durationLabel,
          isChatOpen: false,
          updatedAt: Date.now(),
        });
      } else {
        clearChatSession();
      }
    };
  }, [appointmentId, meta?.medicName, meta?.endedMs]);

  // ── Notification suppression ────────────────────────
  useEffect(() => {
    setOpenChatId(appointmentId);
    return () => setOpenChatId(null);
  }, [appointmentId]);

  // ── Chime + seen-state ──────────────────────────────
  const prevOtherMsgCountRef = useRef(0);
  useEffect(() => {
    const otherMsgs = messages.filter((m) => m.senderRole !== role).length;
    if (
      prevOtherMsgCountRef.current > 0 &&
      otherMsgs > prevOtherMsgCountRef.current
    ) {
      playMessageChime();
    }
    prevOtherMsgCountRef.current = otherMsgs;
    if (messages.length) {
      const last = messages[messages.length - 1];
      if (last?.createdAt) markChatSeen(appointmentId, last.createdAt);
    }
  }, [messages, role, appointmentId]);

  // ── Initial-scroll + auto-scroll ────────────────────
  const hasInitialScrollRef = useRef<string | null>(null);

  const contentSignature = useMemo(() => {
    const lastReal = messages.length > 0 ? messages[messages.length - 1] : null;
    const lastPending =
      pendingMessages.length > 0
        ? pendingMessages[pendingMessages.length - 1]
        : null;
    return `${messages.length}:${lastReal?.id || ""}:${
      lastReal?.editedAt || 0
    }:${pendingMessages.length}:${lastPending?.id || ""}`;
  }, [messages, pendingMessages]);

  useEffect(() => {
    const el = bodyScrollRef.current;
    if (!el) return;
    if (messages.length === 0 && pendingMessages.length === 0) return;

    const isFirstOpen = hasInitialScrollRef.current !== appointmentId;
    if (isFirstOpen) hasInitialScrollRef.current = appointmentId;

    const maxScroll = () => el.scrollHeight - el.clientHeight;

    if (isFirstOpen) {
      let attempts = 0;
      let stopped = false;
      const stop = () => {
        stopped = true;
      };
      el.addEventListener("touchstart", stop, { once: true, passive: true });
      el.addEventListener("wheel", stop, { once: true, passive: true });

      const force = () => {
        if (stopped) return;
        const m = maxScroll();
        if (m > 0) el.scrollTop = m;
        attempts++;
        if (attempts < 10) setTimeout(force, 100);
      };
      requestAnimationFrame(force);

      return () => {
        el.removeEventListener("touchstart", stop);
        el.removeEventListener("wheel", stop);
      };
    }

    const m = maxScroll();
    if (m <= 0) return;
    const distFromBottom = m - el.scrollTop;
    const isNearBottom = distFromBottom < 400;
    const justSent = pendingMessages.length > 0;
    if (isNearBottom || justSent) {
      el.scrollTo({ top: m, behavior: "smooth" });
    }
  }, [contentSignature, appointmentId]);

  const handleScroll = useCallback(() => {
    const el = bodyScrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const scrolledUp = distFromBottom > 200;
    setIsScrolledUp(scrolledUp);
    if (!scrolledUp) {
      setUnreadWhileScrolled(0);
      lastMessageCountRef.current = messages.length;
    }
  }, [messages.length]);

  useEffect(() => {
    if (isScrolledUp && messages.length > lastMessageCountRef.current) {
      const newCount = messages.length - lastMessageCountRef.current;
      setUnreadWhileScrolled((c) => c + newCount);
    }
    if (!isScrolledUp) lastMessageCountRef.current = messages.length;
  }, [messages.length, isScrolledUp]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
    setUnreadWhileScrolled(0);
    lastMessageCountRef.current = messages.length;
  };

  useEffect(() => {
    if (phase === "active" || phase === "ending") {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [phase]);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Back-button → close chat
  //
  // IMPORTANT: `onClose` is not in the dep array of the effect that
  // manipulates history. It used to be, which meant a parent re-render
  // (the appointments panel ticks `now` every 10s) re-ran the effect,
  // pushing a fresh `__chatOpen` history entry each time. After a few
  // minutes the history stack was polluted and back-nav stopped
  // working. The listener reads from a ref so it always sees the
  // current onClose without re-adding itself.
  // ─────────────────────────────────────────────────────────────
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    pushChatBackGuard();
    try {
      window.history.pushState(
        { ...window.history.state, __chatOpen: true },
        "",
      );
    } catch {}
    return () => {
      popChatBackGuard();
      try {
        if (window.history.state?.__chatOpen) {
          const nextState: Record<string, unknown> = {
            ...(window.history.state as Record<string, unknown>),
          };
          delete nextState.__chatOpen;
          window.history.replaceState(nextState, "");
        }
      } catch {}
    };
  }, []); // mount only — do NOT depend on onClose

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleBack = () => onCloseRef.current();
    window.addEventListener("popstate", handleBack);
    return () => window.removeEventListener("popstate", handleBack);
  }, []); // mount only

  // ─────────────────────────────────────────────────────────────
  // Reconcile optimistic pending bubbles with the real message list.
  //
  // Previously, after POST success we awaited `mutate()` and then
  // immediately dropped the pending bubble. If the revalidated payload
  // didn't yet contain the message (stale cache, read lag), the
  // pending bubble vanished and nothing else appeared → user sees
  // "message not sent". Now we keep the pending bubble until the real
  // message actually shows up in the revalidated list, and flip it to
  // `failed` after a timeout so the user can retry.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pendingMessages.length || !messages.length) return;
    const toRemove = new Set<string>();
    for (const p of pendingMessages) {
      if (p.status !== "sending") continue;
      const matched = messages.some(
        (m) =>
          m.senderRole === role &&
          m.text === p.text &&
          Math.abs(m.createdAt - p.createdAt) < PENDING_RECONCILE_WINDOW_MS,
      );
      if (matched) toRemove.add(p.id);
    }
    if (toRemove.size) {
      setPendingMessages((prev) => prev.filter((m) => !toRemove.has(m.id)));
    }
  }, [messages, pendingMessages, role]);

  // Timeout: any pending bubble stuck "sending" flips to "failed".
  useEffect(() => {
    if (!pendingMessages.some((p) => p.status === "sending")) return;
    const id = setInterval(() => {
      setPendingMessages((prev) => {
        let changed = false;
        const next = prev.map((p) => {
          if (
            p.status === "sending" &&
            Date.now() - p.createdAt > PENDING_FAIL_AFTER_MS
          ) {
            changed = true;
            return { ...p, status: "failed" as const };
          }
          return p;
        });
        return changed ? next : prev;
      });
    }, 3000);
    return () => clearInterval(id);
  }, [pendingMessages]);

  // ── Optimistic text send ────────────────────────────
  const postTextMessage = useCallback(
    async (tempId: string, body: string) => {
      try {
        const result = await authPost(
          `/api/appointments/${appointmentId}/messages`,
          { text: body },
        );
        if (result?.success) {
          // Kick off revalidation in the background. The pending bubble
          // is cleared by the reconciliation effect above once the real
          // message shows up in `messages`. This avoids the "message
          // appears then vanishes" bug when mutate() returns stale data.
          void mutate();
          globalMutate("/api/appointments");
        } else {
          setPendingMessages((prev) =>
            prev.map((m) =>
              m.id === tempId ? { ...m, status: "failed" as const } : m,
            ),
          );
        }
      } catch {
        setPendingMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, status: "failed" as const } : m,
          ),
        );
      }
    },
    [appointmentId, mutate],
  );

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const tempId = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setPendingMessages((prev) => [
      ...prev,
      { id: tempId, text: trimmed, createdAt: Date.now(), status: "sending" },
    ]);
    setText("");
    setError(null);
    void postTextMessage(tempId, trimmed);
  }, [text, postTextMessage]);

  const handleResend = useCallback(
    (pending: PendingMessage) => {
      if (pending.status === "sending") return;
      // Give it a fresh createdAt so the reconciliation window is measured
      // from the retry, not the original attempt.
      const fresh = {
        ...pending,
        status: "sending" as const,
        createdAt: Date.now(),
      };
      setPendingMessages((prev) =>
        prev.map((m) => (m.id === pending.id ? fresh : m)),
      );
      void postTextMessage(pending.id, pending.text);
    },
    [postTextMessage],
  );

  const handleDiscard = useCallback((id: string) => {
    setPendingMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!e.repeat) handleSend();
    }
  };

  // ── Edit existing message ───────────────────────────
  const startEdit = useCallback(
    (msg: ChatMessage) => {
      if (msg.senderRole !== role) return;
      if (msg.mediaType) return;
      if (!msg.text) return;
      setEditingId(msg.id);
      setEditingText(msg.text);
    },
    [role],
  );

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingText("");
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    const trimmed = editingText.trim();
    if (!trimmed || !data?.data) return;

    const messageIdToEdit = editingId;
    const originalData = data.data;
    const editedAt = Date.now();

    const optimistic: { success: boolean; data: ChatData } = {
      success: true,
      data: {
        ...originalData,
        messages: originalData.messages.map((m) =>
          m.id === messageIdToEdit ? { ...m, text: trimmed, editedAt } : m,
        ),
      },
    };

    void mutate(optimistic, { revalidate: false });
    setEditingId(null);
    setEditingText("");
    setSavingEditId(messageIdToEdit);
    setError(null);

    try {
      const res = await fetch(
        `/api/appointments/${appointmentId}/messages/${messageIdToEdit}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ text: trimmed }),
        },
      );
      const result = await res.json().catch(() => ({}));
      if (res.ok && result?.success) {
        await mutate();
        globalMutate("/api/appointments");
      } else {
        await mutate();
        setError(result?.error || "Could not save edit");
      }
    } catch {
      await mutate();
      setError("Network error. Try again.");
    } finally {
      setSavingEditId(null);
    }
  }, [appointmentId, editingId, editingText, data, mutate]);

  // ── Clinical pads ────────────────────────────────────
  const postClinical = async (payload: Record<string, any>) => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setClinicalSending(true);
    setError(null);
    try {
      const result = await authPost(
        `/api/appointments/${appointmentId}/messages`,
        payload,
      );
      if (!result?.success) throw new Error(result?.error || "Could not send");
      await mutate();
      globalMutate("/api/appointments");
    } finally {
      sendingRef.current = false;
      setClinicalSending(false);
    }
  };

  const handleSendPrescription = async (data: PrescriptionData) => {
    try {
      await postClinical({ mediaType: "prescription", prescriptionData: data });
      setShowPrescriptionPad(false);
    } catch (err: any) {
      setError(err?.message || "Could not send prescription");
    }
  };
  const handleSendTests = async (data: TestsData) => {
    try {
      await postClinical({ mediaType: "tests", testsData: data });
      setShowTestsPad(false);
    } catch (err: any) {
      setError(err?.message || "Could not send tests");
    }
  };
  const handleSendNotes = async (data: NoteData) => {
    try {
      await postClinical({ mediaType: "note", noteData: data });
      setShowNotesPad(false);
    } catch (err: any) {
      setError(err?.message || "Could not send note");
    }
  };

  const openImagePicker = () => {
    setShowAttachMenu(false);
    setTimeout(() => imageInputRef.current?.click(), 50);
  };
  const openPdfPicker = () => {
    setShowAttachMenu(false);
    setTimeout(() => pdfInputRef.current?.click(), 50);
  };
  const openPrescriptionPad = () => {
    setShowAttachMenu(false);
    setShowPrescriptionPad(true);
  };
  const openTestsPad = () => {
    setShowAttachMenu(false);
    setShowTestsPad(true);
  };
  const openNotesPad = () => {
    setShowAttachMenu(false);
    setShowNotesPad(true);
  };

  const handleImageSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file");
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setError(`Image too large (max ${fmtFileSize(IMAGE_MAX_BYTES)})`);
      return;
    }
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    try {
      const compressed = await fileToCompressedDataUrl(file);
      const result = await authPost(
        `/api/appointments/${appointmentId}/messages`,
        { mediaUrl: compressed, mediaType: "image" },
      );
      if (result?.success) {
        await mutate();
        globalMutate("/api/appointments");
      } else setError(result?.error || "Could not send image");
    } catch {
      setError("Could not process image");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const handlePdfSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Please choose a PDF file");
      return;
    }
    if (file.size > PDF_MAX_BYTES) {
      setError(`PDF too large (max ${fmtFileSize(PDF_MAX_BYTES)})`);
      return;
    }
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const result = await authPost(
        `/api/appointments/${appointmentId}/messages`,
        {
          mediaUrl: dataUrl,
          mediaType: "pdf",
          fileName: file.name,
          fileSize: file.size,
        },
      );
      if (result?.success) {
        await mutate();
        globalMutate("/api/appointments");
      } else setError(result?.error || "Could not send document");
    } catch {
      setError("Could not process document");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const startRecording = async () => {
    if (isRecording || sendingRef.current) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = preferred.find(
        (t) =>
          typeof MediaRecorder !== "undefined" &&
          MediaRecorder.isTypeSupported(t),
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        chunksRef.current = [];
        const durationMs = Date.now() - recordStartAt;
        if (blob.size === 0) return;
        if (blob.size > VOICE_MAX_BYTES) {
          setError(`Voice note too long (max ${fmtFileSize(VOICE_MAX_BYTES)})`);
          return;
        }
        if (sendingRef.current) return;
        sendingRef.current = true;
        setSending(true);
        try {
          const dataUrl = await fileToDataUrl(
            new File([blob], "voice.webm", { type: mimeType || "audio/webm" }),
          );
          const result = await authPost(
            `/api/appointments/${appointmentId}/messages`,
            {
              mediaUrl: dataUrl,
              mediaType: "voice",
              mediaDurationMs: durationMs,
            },
          );
          if (result?.success) {
            await mutate();
            globalMutate("/api/appointments");
          } else setError(result?.error || "Could not send voice note");
        } catch {
          setError("Network error. Try again.");
        } finally {
          sendingRef.current = false;
          setSending(false);
        }
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecordStartAt(Date.now());
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setError("Microphone access denied or unavailable");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && isRecording) {
      try {
        recorderRef.current.stop();
      } catch {}
    }
  };
  const cancelRecording = () => {
    if (recorderRef.current && isRecording) {
      try {
        recorderRef.current.ondataavailable = () => {};
        recorderRef.current.onstop = () => setIsRecording(false);
        recorderRef.current.stop();
      } catch {}
    }
  };

  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const submitRating = async () => {
    if (ratingStars < 1) {
      setError("Pick a star rating");
      return;
    }
    if (sendingRef.current) return;
    sendingRef.current = true;
    setRatingSubmitting(true);
    setError(null);
    try {
      const result = await authPost(`/api/appointments/${appointmentId}/rate`, {
        stars: ratingStars,
        comment: ratingComment.trim(),
      });
      if (result?.success) {
        await mutate();
        globalMutate("/api/appointments");
        globalMutate(
          (key) => typeof key === "string" && key.startsWith("/api/medics"),
        );
        setShowRating(false);
        clearChatSession();
      } else setError(result?.error || "Could not submit rating");
    } catch {
      setError("Network error. Try again.");
    } finally {
      sendingRef.current = false;
      setRatingSubmitting(false);
    }
  };

  const medicName = meta?.medicName || "Your medic";
  const otherName =
    role === "patient" ? medicName : meta?.patientName || "Patient";
  const otherImage =
    role === "patient"
      ? meta?.medicProfileImage || null
      : meta?.patientProfileImage || null;
  const otherInitial = (otherName || "?").charAt(0).toUpperCase();

  const timerLabel = useMemo(() => {
    if (!meta) return "";
    if (phase === "waiting") return fmtTimer(meta.scheduledMs - now);
    if (phase === "active" || phase === "ending")
      return fmtTimer(meta.endedMs - now);
    return "00:00";
  }, [meta, phase, now]);

  const timerState: "waiting" | "active" | "ending" | "ended" = useMemo(() => {
    if (phase === "waiting") return "waiting";
    if (phase === "ending") return "ending";
    if (phase === "ended" || phase === "rated") return "ended";
    return "active";
  }, [phase]);

  const canSend = phase === "active" || phase === "ending";
  const myRatingDone = !!myRating;
  const isPatient = role === "patient";
  const isMedic = role === "medic";

  // ── Render ────────────────────────────────────────
  return (
    <>
      <style>{`
        .chat-scroll { scrollbar-width: thin; scrollbar-color: rgba(5,150,105,0.25) transparent; }
        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(5,150,105,0.2); border-radius: 9999px; }
        .chat-scroll::-webkit-scrollbar-thumb:hover { background: rgba(5,150,105,0.4); }
      `}</style>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[400] bg-slate-950/60 backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-4"
        style={{ height: "100dvh" }}
      >
        <motion.div
          initial={{ y: "6%", scale: 0.99, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: "6%", scale: 0.99, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full sm:h-[90vh] sm:max-h-[900px] border border-slate-200 relative"
        >
          {/* Header */}
          <div className="shrink-0 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-2.5 px-3 sm:px-4 py-2.5">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close chat"
                className="min-h-10 min-w-10 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>

              <div
                className="w-10 h-10 rounded-[10px] bg-emerald-50 flex items-center justify-center shrink-0 overflow-hidden border border-emerald-100"
                aria-hidden
              >
                {otherImage ? (
                  <img
                    src={otherImage}
                    alt={otherName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-emerald-700">
                    {otherInitial}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate leading-tight">
                  {otherName}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Lock size={9} className="text-emerald-600 shrink-0" />
                  <p className="text-[10px] text-emerald-700 font-medium truncate">
                    Private &amp; encrypted
                  </p>
                </div>
              </div>

              {meta && (
                <div
                  className={cn(
                    "flex flex-col items-end shrink-0 tabular-nums rounded-lg px-2.5 py-1.5 min-w-[78px]",
                    timerState === "waiting" &&
                      "bg-slate-50 text-slate-700 border border-slate-200",
                    timerState === "active" &&
                      "bg-emerald-50 text-emerald-800 border border-emerald-200",
                    timerState === "ending" &&
                      "bg-rose-50 text-rose-800 border border-rose-200 animate-pulse",
                    timerState === "ended" &&
                      "bg-slate-50 text-slate-500 border border-slate-200",
                  )}
                >
                  <span className="text-[8px] font-bold uppercase tracking-wider opacity-70 leading-none">
                    {timerState === "waiting" && "Starts in"}
                    {timerState === "active" && "Time left"}
                    {timerState === "ending" && "Ending soon"}
                    {timerState === "ended" && "Ended"}
                  </span>
                  <span className="text-base font-bold leading-tight tabular-nums">
                    {timerState === "ended" ? "—" : timerLabel}
                  </span>
                </div>
              )}
            </div>

            {meta && (
              <div className="px-3 sm:px-4 py-1.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-slate-500 truncate">
                  {meta.durationLabel} session
                </span>
                <button
                  type="button"
                  disabled
                  title="Video calling coming soon"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-md px-2 py-1 cursor-not-allowed"
                >
                  <Video size={10} /> Call
                </button>
              </div>
            )}

            {phase === "ending" && (
              <div className="px-3 sm:px-4 py-2 bg-rose-50 border-t border-rose-200 flex items-center gap-2">
                <AlertCircle size={14} className="text-rose-600 shrink-0" />
                <p className="text-[11px] font-semibold text-rose-800">
                  Session ends in {timerLabel}. Wrap up your conversation.
                </p>
              </div>
            )}
          </div>

          {/* Body — bg2.png backdrop + scrollable content */}
          <div className="relative flex-1 min-h-0 overflow-hidden">
            <div
              className="absolute inset-0 bg-[url('/bg2.png')] bg-cover bg-center bg-no-repeat"
              aria-hidden
            />
            <div className="absolute inset-0 bg-white/70" aria-hidden />
            <div
              ref={bodyScrollRef}
              onScroll={handleScroll}
              className="absolute inset-0 overflow-y-auto overscroll-contain chat-scroll"
            >
              {phase === "waiting" && !messages.length && (
                <div className="h-full flex flex-col items-center justify-center text-center px-6 py-10">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                    <Clock size={26} className="text-emerald-600" />
                  </div>
                  <p className="text-base font-bold text-slate-900">
                    Session hasn&apos;t started yet
                  </p>
                  <p className="text-sm text-slate-500 mt-1 max-w-xs">
                    Your appointment with {otherName} starts in{" "}
                    <span className="font-bold text-emerald-700 tabular-nums">
                      {timerLabel}
                    </span>
                    . You&apos;ll be able to chat once it begins.
                  </p>
                </div>
              )}

              {(messages.length > 0 || pendingMessages.length > 0) && (
                <div className="px-3 sm:px-4 py-3 space-y-3 sm:space-y-2.5">
                  <div className="flex justify-center mb-2 px-2">
                    <div className="inline-flex items-start gap-1.5 text-[10px] text-slate-500 bg-white/90 border border-slate-200 rounded-2xl px-3 py-2 max-w-md text-center">
                      <ShieldCheck
                        size={11}
                        className="text-emerald-600 shrink-0 mt-0.5"
                      />
                      <span className="leading-snug text-center">
                        Messages are encrypted in transit &amp; at rest. Only
                        you and {otherName} can read them.
                      </span>
                    </div>
                  </div>

                  {messages.map((msg, idx) => {
                    const isMine = msg.senderRole === role;
                    const prev = messages[idx - 1];
                    const showSender =
                      !isMine && (!prev || prev.senderRole !== msg.senderRole);
                    const isEditing = editingId === msg.id;
                    const isSavingEdit = savingEditId === msg.id;
                    return (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        isMine={isMine}
                        showSender={showSender}
                        senderName={otherName}
                        onImageClick={(url) => setLightboxUrl(url)}
                        onPdfMaximize={(d) => setPdfLightbox(d)}
                        isEditing={isEditing}
                        isSavingEdit={isSavingEdit}
                        editingText={editingText}
                        onEditingTextChange={setEditingText}
                        onStartEdit={startEdit}
                        onCancelEdit={cancelEdit}
                        onSaveEdit={saveEdit}
                        onDrugTap={handleDrugTap}
                        onTestTap={handleTestTap}
                        onAddDrugTap={handleAddDrug}
                      />
                    );
                  })}

                  {pendingMessages.map((p) => (
                    <PendingMessageBubble
                      key={p.id}
                      message={p}
                      onResend={() => handleResend(p)}
                      onDiscard={() => handleDiscard(p.id)}
                    />
                  ))}

                  <div ref={messagesEndRef} />
                </div>
              )}

              {phase === "ended" && !myRatingDone && !showRating && (
                <div className="px-4 py-6 border-t border-slate-100 bg-white text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck size={22} className="text-slate-500" />
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    Session ended
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                    {isPatient
                      ? `This chat is now read-only. Rate your experience with ${otherName} to close out the session.`
                      : "This chat is now read-only. The patient will be able to rate the session from their side."}
                  </p>
                  {isPatient && (
                    <button
                      type="button"
                      onClick={() => setShowRating(true)}
                      className="mt-4 inline-flex items-center gap-1.5 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm min-h-11"
                    >
                      <Star size={14} /> Rate session
                    </button>
                  )}
                </div>
              )}

              {showRating && isPatient && (
                <div className="px-4 py-5 border-t border-slate-100 bg-white">
                  <div className="text-center mb-4">
                    <p className="text-sm font-bold text-slate-900">
                      Rate your session
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      With {otherName}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRatingStars(n)}
                        aria-label={`${n} star${n > 1 ? "s" : ""}`}
                        className="min-h-12 min-w-12 inline-flex items-center justify-center rounded-lg hover:bg-slate-50 active:scale-90 transition-all"
                      >
                        <Star
                          size={32}
                          className={cn(
                            "fill-current transition-colors",
                            ratingStars >= n
                              ? "text-amber-400"
                              : "text-slate-300",
                          )}
                        />
                      </button>
                    ))}
                  </div>
                  {ratingStars > 0 && (
                    <p className="text-center text-xs font-bold text-slate-700 mb-3">
                      {ratingStars}/5
                    </p>
                  )}
                  <textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    rows={2}
                    placeholder="Optional: share your thoughts"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 resize-none"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setShowRating(false)}
                      className="flex-1 min-h-12 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={submitRating}
                      disabled={ratingStars < 1 || ratingSubmitting}
                      className="flex-[2] min-h-12 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                      {ratingSubmitting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Submit rating
                    </button>
                  </div>
                </div>
              )}

              {phase === "rated" && isPatient && (
                <div className="px-4 py-8 border-t border-slate-100 bg-emerald-50 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <Check size={24} className="text-white" strokeWidth={3} />
                  </div>
                  <p className="text-sm font-bold text-emerald-900">
                    Thanks for your feedback
                  </p>
                  <p className="text-xs text-emerald-800/70 mt-1">
                    This session is archived in your appointment history.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Scroll-to-bottom */}
          <AnimatePresence>
            {isScrolledUp && (
              <motion.button
                key="scroll-bottom"
                type="button"
                onClick={scrollToBottom}
                initial={{ opacity: 0, scale: 0.6, y: 12 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  transition: { type: "spring", stiffness: 500, damping: 22 },
                }}
                exit={{ opacity: 0, scale: 0.6, y: 12 }}
                whileTap={{ scale: 0.9 }}
                className="absolute right-3 sm:right-4 bottom-[100px] z-10 min-h-11 min-w-11 inline-flex items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 border border-emerald-500 hover:bg-emerald-700 transition-colors"
                aria-label="Scroll to latest messages"
              >
                <motion.div
                  animate={{
                    y: [0, -3, 0],
                    transition: {
                      duration: 1.6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                  }}
                >
                  <ArrowDown size={18} />
                </motion.div>
                {unreadWhileScrolled > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-emerald-700 text-[10px] font-bold flex items-center justify-center border border-emerald-200 shadow">
                    {unreadWhileScrolled > 9 ? "9+" : unreadWhileScrolled}
                  </span>
                )}
              </motion.button>
            )}
          </AnimatePresence>

          {/* Attach menu */}
          <AnimatePresence>
            {showAttachMenu && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[5] bg-slate-950/30"
                onClick={() => setShowAttachMenu(false)}
              >
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-3 right-3 sm:left-4 sm:right-auto bottom-[68px] sm:w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 flex flex-col gap-1"
                >
                  {isMedic ? (
                    <>
                      <button
                        type="button"
                        onClick={openPrescriptionPad}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 active:scale-[0.98] transition-all text-left min-h-14 border border-emerald-100 bg-emerald-50/40"
                      >
                        <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
                          <ClipboardList size={18} className="text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-emerald-900">
                            Prescription
                          </p>
                          <p className="text-[11px] text-emerald-700/80">
                            Recommend drugs &amp; doses
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={openTestsPad}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 active:scale-[0.98] transition-all text-left min-h-14 border border-blue-100 bg-blue-50/40"
                      >
                        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                          <FlaskConical size={18} className="text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-blue-900">
                            Lab Tests
                          </p>
                          <p className="text-[11px] text-blue-700/80">
                            Recommend tests to run
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={openNotesPad}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-amber-50 active:scale-[0.98] transition-all text-left min-h-14 border border-amber-100 bg-amber-50/40"
                      >
                        <div className="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center shrink-0">
                          <FileText size={18} className="text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-amber-900">
                            Clinical Note
                          </p>
                          <p className="text-[11px] text-amber-700/80">
                            Diagnosis, advice, follow-up
                          </p>
                        </div>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={openImagePicker}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all text-left min-h-14"
                      >
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                          <ImageIcon size={18} className="text-emerald-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900">
                            Photo
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Up to {fmtFileSize(IMAGE_MAX_BYTES)}
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={openPdfPicker}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all text-left min-h-14"
                      >
                        <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                          <FilePlus size={18} className="text-rose-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900">
                            Document
                          </p>
                          <p className="text-[11px] text-slate-500">
                            PDF up to {fmtFileSize(PDF_MAX_BYTES)}
                          </p>
                        </div>
                      </button>
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error toast */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="shrink-0 mx-3 mb-2 mt-1 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2"
              >
                <AlertCircle
                  size={14}
                  className="text-rose-600 shrink-0 mt-0.5"
                />
                <p className="text-xs font-semibold text-rose-800 flex-1">
                  {error}
                </p>
                <button
                  onClick={() => setError(null)}
                  aria-label="Dismiss"
                  className="text-rose-500 hover:text-rose-700 min-h-6 min-w-6 inline-flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input bar */}
          <div
            className="shrink-0 border-t border-slate-200 bg-white"
            style={{
              paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
            }}
          >
            {isRecording ? (
              <div className="px-3 py-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={cancelRecording}
                  aria-label="Cancel recording"
                  className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  <X size={18} />
                </button>
                <div className="flex-1 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-sm font-bold text-rose-700">
                    Recording…
                  </span>
                  <span className="text-xs font-semibold text-slate-500 tabular-nums">
                    {fmtTimer(Date.now() - recordStartAt)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="min-h-11 px-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
                >
                  <Send size={14} /> Send
                </button>
              </div>
            ) : canSend ? (
              <div className="px-2 sm:px-3 py-2 flex items-end gap-1">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelected}
                  className="hidden"
                />
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handlePdfSelected}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowAttachMenu(true)}
                  disabled={sending}
                  aria-label="Attach"
                  className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                >
                  <Paperclip size={20} />
                </button>
                <div className="flex-1 min-w-0">
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="Type a message…"
                    disabled={sending}
                    className="w-full min-h-11 max-h-32 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 resize-none disabled:opacity-50"
                    style={{ lineHeight: "1.4" }}
                  />
                </div>
                {text.trim() ? (
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending}
                    aria-label="Send message"
                    className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {sending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={sending}
                    aria-label="Record voice note"
                    className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    <Mic size={18} />
                  </button>
                )}
              </div>
            ) : (
              <div className="px-3 py-4 text-center">
                <p className="text-xs font-semibold text-slate-500">
                  {phase === "waiting"
                    ? `Chat opens in ${timerLabel}`
                    : phase === "ended" || phase === "rated"
                      ? "Session ended — chat is read-only"
                      : ""}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        <AnimatePresence>
          {lightboxUrl && (
            <ImageLightbox
              url={lightboxUrl}
              onClose={() => setLightboxUrl(null)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {pdfLightbox && (
            <PdfLightbox
              url={pdfLightbox.url}
              fileName={pdfLightbox.fileName}
              watermarkText={pdfLightbox.watermarkText}
              onClose={() => setPdfLightbox(null)}
            />
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showPrescriptionPad && (
          <PrescriptionPad
            patientName={otherName}
            onClose={() => setShowPrescriptionPad(false)}
            onSend={handleSendPrescription}
            sending={clinicalSending}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {addDrugModal && (
          <AddDrugToCabinetModal
            drug={addDrugModal.drug}
            onClose={() => setAddDrugModal(null)}
            onAdded={() => {
              // Optional: any follow-up
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showTestsPad && (
          <TestsPad
            patientName={otherName}
            onClose={() => setShowTestsPad(false)}
            onSend={handleSendTests}
            sending={clinicalSending}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showNotesPad && (
          <NotesPad
            patientName={otherName}
            onClose={() => setShowNotesPad(false)}
            onSend={handleSendNotes}
            sending={clinicalSending}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Pending (optimistic) message bubble ─────────────
function PendingMessageBubble({
  message,
  onResend,
  onDiscard,
}: {
  message: PendingMessage;
  onResend: () => void;
  onDiscard: () => void;
}) {
  const isSending = message.status === "sending";
  return (
    <div className="flex gap-2 justify-end">
      <div className="max-w-[86%] sm:max-w-[85%] flex flex-col items-end">
        <div className="rounded-2xl shadow-sm px-3 py-2 bg-emerald-600 text-white rounded-tr-md opacity-90">
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.text}
          </p>
        </div>
        <div className="mt-0.5 px-1 flex items-center gap-1.5 text-[10px] tabular-nums text-slate-400">
          <span>{fmtMessageTime(message.createdAt)}</span>
          {isSending ? (
            <span className="inline-flex items-center gap-1 text-slate-400">
              <Loader2 size={10} className="animate-spin" /> sending…
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={onResend}
                className="inline-flex items-center gap-1 font-bold text-rose-600 hover:text-rose-700"
              >
                <RotateCcw size={10} /> Resend
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={onDiscard}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700"
              >
                <Trash2 size={10} /> Discard
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Message bubble ────────────────────────────────────
function MessageBubble({
  message,
  isMine,
  showSender,
  senderName,
  onImageClick,
  onPdfMaximize,
  isEditing,
  isSavingEdit,
  editingText,
  onEditingTextChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDrugTap,
  onTestTap,
  onAddDrugTap,
}: {
  message: ChatMessage;
  isMine: boolean;
  showSender: boolean;
  senderName: string;
  onImageClick: (url: string) => void;
  onPdfMaximize: (d: {
    url: string;
    fileName?: string | null;
    watermarkText: string;
  }) => void;
  isEditing: boolean;
  isSavingEdit: boolean;
  editingText: string;
  onEditingTextChange: (t: string) => void;
  onStartEdit: (m: ChatMessage) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDrugTap?: (drug: PrescriptionDrug) => void;
  onTestTap?: (test: TestItem) => void;
  onAddDrugTap?: (drug: PrescriptionDrug) => void;
}) {
  const isImageOnly = message.mediaType === "image" && !message.text;
  const watermarkText = `${senderName} · ${new Date(message.createdAt).toLocaleString()}`;
  const isClinical =
    message.mediaType === "prescription" ||
    message.mediaType === "tests" ||
    message.mediaType === "note";
  const editable =
    isMine && !message.mediaType && !!message.text && !isSavingEdit;

  return (
    <div className={cn("flex gap-2", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[86%] sm:max-w-[85%] flex flex-col",
          isMine ? "items-end" : "items-start",
        )}
      >
        {showSender && (
          <p className="text-[10px] font-bold text-slate-500 mb-0.5 px-1 truncate">
            {senderName}
          </p>
        )}

        {isClinical ? (
          <>
            {message.mediaType === "prescription" &&
              message.prescriptionData && (
                <PrescriptionBubble
                  data={message.prescriptionData}
                  onDrugTap={onDrugTap}
                  onAddDrugTap={onAddDrugTap}
                />
              )}
            {message.mediaType === "tests" && message.testsData && (
              <TestsBubble data={message.testsData} onTestTap={onTestTap} />
            )}
            {message.mediaType === "note" && message.noteData && (
              <NoteBubble data={message.noteData} />
            )}
          </>
        ) : (
          <div
            className={cn(
              "rounded-2xl shadow-sm transition-opacity",
              isImageOnly ? "p-1" : "px-3 py-2",
              isMine
                ? "bg-emerald-600 text-white rounded-tr-md"
                : "bg-white text-slate-900 border border-slate-200 rounded-tl-md",
              isSavingEdit && "opacity-80",
            )}
          >
            {message.mediaType === "image" && message.mediaUrl && (
              <button
                type="button"
                onClick={() => onImageClick(message.mediaUrl!)}
                aria-label="View full-size image"
                className="block rounded-xl overflow-hidden transition-transform active:scale-[0.98] cursor-zoom-in max-w-[280px] sm:max-w-[320px]"
              >
                <SecureImage
                  url={message.mediaUrl}
                  alt="Photo attachment"
                  className="w-full h-auto object-cover rounded-xl max-h-[380px] sm:max-h-[440px]"
                />
              </button>
            )}
            {message.mediaType === "pdf" && message.mediaUrl && (
              <SecurePdfViewer
                url={message.mediaUrl}
                fileName={message.fileName}
                watermarkText={watermarkText}
                maxHeightClass="max-h-[440px]"
                onMaximize={() =>
                  onPdfMaximize({
                    url: message.mediaUrl!,
                    fileName: message.fileName,
                    watermarkText,
                  })
                }
              />
            )}
            {message.mediaType === "voice" && message.mediaUrl && (
              <VoicePlayer
                src={message.mediaUrl}
                durationMs={message.mediaDurationMs}
                isMine={isMine}
              />
            )}

            {isEditing ? (
              <div className="min-w-[220px] w-full">
                <textarea
                  value={editingText}
                  onChange={(e) => onEditingTextChange(e.target.value)}
                  rows={Math.max(2, Math.ceil(editingText.length / 40))}
                  autoFocus
                  className={cn(
                    "w-full px-2.5 py-2 rounded-lg text-sm resize-none outline-none",
                    isMine
                      ? "bg-white/15 text-white placeholder:text-white/60 focus:bg-white/25"
                      : "bg-slate-50 text-slate-900 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15",
                  )}
                  style={{ maxHeight: 160 }}
                />
                <div className="flex items-center justify-end gap-1.5 mt-1.5">
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className={cn(
                      "text-[11px] font-bold px-2.5 py-1 rounded-md",
                      isMine
                        ? "text-white/80 hover:bg-white/15"
                        : "text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onSaveEdit}
                    disabled={!editingText.trim()}
                    className={cn(
                      "text-[11px] font-bold px-2.5 py-1 rounded-md inline-flex items-center gap-1",
                      isMine
                        ? "bg-white text-emerald-700 hover:bg-white/90 disabled:opacity-60"
                        : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60",
                    )}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              message.text && (
                <p
                  className={cn(
                    "text-sm leading-relaxed whitespace-pre-wrap break-words",
                    (message.mediaType === "image" ||
                      message.mediaType === "pdf") &&
                      "mt-1.5",
                  )}
                >
                  {message.text}
                </p>
              )
            )}
          </div>
        )}

        <p className="text-[9px] font-medium mt-0.5 px-1 tabular-nums text-slate-400 inline-flex items-center gap-1">
          {fmtMessageTime(message.createdAt)}
          {isSavingEdit ? (
            <span className="inline-flex items-center gap-1 font-bold text-slate-500">
              <Loader2 size={9} className="animate-spin" /> sending…
            </span>
          ) : message.editedAt ? (
            <span className="italic">· edited</span>
          ) : null}
          {editable && !isEditing && (
            <button
              type="button"
              onClick={() => onStartEdit(message)}
              aria-label="Edit message"
              className="ml-0.5 text-slate-400 hover:text-emerald-600 transition-colors"
            >
              <Pencil size={10} />
            </button>
          )}
        </p>
      </div>
    </div>
  );
}

// ─── Secure image ─────────────────────────────────────
function SecureImage({
  url,
  alt,
  className,
}: {
  url: string;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetchFile(url)
      .then((d) => {
        if (!cancelled) setSrc(d);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);
  if (error)
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-slate-100 rounded-xl min-h-[120px]",
          className,
        )}
      >
        <span className="text-[10px] font-semibold text-slate-500 px-2 text-center">
          Unable to load image
        </span>
      </div>
    );
  if (!src)
    return (
      <div
        className={cn(
          "animate-pulse bg-slate-200 rounded-xl min-h-[120px]",
          className,
        )}
      />
    );
  return <img src={src} alt={alt} loading="lazy" className={className} />;
}

// ─── Voice player ─────────────────────────────────────
function VoicePlayer({
  src: url,
  durationMs,
  isMine,
}: {
  src: string;
  durationMs?: number | null;
  isMine: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchFile(url)
      .then((d) => {
        if (!cancelled) setSrc(d);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);
  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else el.play().catch(() => {});
  };
  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <button
        type="button"
        onClick={toggle}
        disabled={!src || error}
        aria-label={playing ? "Pause" : "Play"}
        className={cn(
          "min-h-9 min-w-9 inline-flex items-center justify-center rounded-full shrink-0 transition-colors disabled:opacity-50",
          isMine
            ? "bg-white/25 text-white hover:bg-white/35"
            : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
        )}
      >
        {!src && !error ? (
          <Loader2 size={14} className="animate-spin" />
        ) : playing ? (
          <Pause size={14} />
        ) : (
          <Play size={14} className="ml-0.5" />
        )}
      </button>
      <div className="flex-1 flex items-center gap-1">
        {[0.3, 0.5, 0.7, 0.4, 0.6, 0.8, 0.5, 0.3].map((h, i) => (
          <span
            key={i}
            className={cn(
              "w-0.5 rounded-full",
              isMine ? "bg-white/60" : "bg-emerald-400/60",
            )}
            style={{ height: `${h * 20}px` }}
          />
        ))}
      </div>
      <span
        className={cn(
          "text-[10px] font-bold tabular-nums shrink-0",
          isMine ? "text-white/80" : "text-slate-500",
        )}
      >
        {error ? "Error" : fmtVoiceDuration(durationMs)}
      </span>
      {src && (
        <audio
          ref={audioRef}
          src={src}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          preload="metadata"
          className="hidden"
        />
      )}
    </div>
  );
}

// ─── Image lightbox ───────────────────────────────────
function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);
  const pinchStartDist = useRef<number>(0);
  const pinchStartScale = useRef<number>(1);

  useEffect(() => {
    let cancelled = false;
    fetchFile(url)
      .then((d) => {
        if (!cancelled) setSrc(d);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ts = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchStartDist.current = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        pinchStartScale.current = scale;
      }
    };
    const tm = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDist.current > 0) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        setScale(
          Math.min(
            Math.max(
              (dist / pinchStartDist.current) * pinchStartScale.current,
              1,
            ),
            4,
          ),
        );
      }
    };
    const te = () => {
      pinchStartDist.current = 0;
      if (scale < 1.2) setScale(1);
    };
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: true });
    el.addEventListener("touchend", te, { passive: true });
    return () => {
      el.removeEventListener("touchstart", ts);
      el.removeEventListener("touchmove", tm);
      el.removeEventListener("touchend", te);
    };
  }, [scale]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const handleTap = () => {
    const n = Date.now();
    if (n - lastTapRef.current < 300) setScale((s) => (s > 1 ? 1 : 2));
    lastTapRef.current = n;
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[500] bg-black/95 flex items-center justify-center select-none overflow-hidden"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image"
        className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-10 min-h-11 min-w-11 inline-flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 active:scale-95 transition-all"
      >
        <X size={20} />
      </button>
      {error ? (
        <div className="flex flex-col items-center justify-center px-6">
          <AlertCircle size={28} className="text-rose-400 mb-2" />
          <p className="text-sm font-semibold text-white/80 text-center">
            Unable to load image
          </p>
        </div>
      ) : !src ? (
        <div className="flex items-center justify-center px-6">
          <Loader2 size={28} className="animate-spin text-white/70" />
        </div>
      ) : (
        <motion.div
          drag={scale === 1 ? "y" : false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.3}
          onDragEnd={(_, info) => {
            if (scale === 1 && Math.abs(info.offset.y) > 120) onClose();
          }}
          onClick={(e) => e.stopPropagation()}
          className="relative touch-pan-x"
        >
          <motion.img
            src={src}
            alt="Full size"
            animate={{ scale }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={handleTap}
            draggable={false}
            className={cn(
              "max-w-[95vw] max-h-[90vh] object-contain rounded-md shadow-2xl",
              scale > 1 ? "cursor-zoom-out" : "cursor-zoom-in",
            )}
          />
        </motion.div>
      )}
      <p
        className={cn(
          "absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-10 text-[11px] font-medium text-white/70 transition-opacity duration-200",
          scale > 1 && "opacity-0",
        )}
      >
        Double-tap to zoom · Swipe down to close
      </p>
    </motion.div>
  );
}
