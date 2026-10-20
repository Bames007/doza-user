"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Send,
  Loader2,
  Shield,
  AlertCircle,
  Phone,
  MessageCircle,
  Clock,
} from "lucide-react";
import { useDashboard } from "../../DashboardContext";
import { useUserContext } from "../../UserContext";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";

interface Therapist {
  id: string;
  name: string;
  specialty: string;
  status: "online" | "away" | "offline";
  bio: string;
  initial: string;
}

const THERAPISTS: Therapist[] = [
  {
    id: "th-001",
    name: "Dr. Ada Nkemdirim",
    specialty: "Mental Health & Wellness",
    status: "online",
    bio: "Specialist in mood disorders, anxiety, and stress management.",
    initial: "A",
  },
  {
    id: "th-002",
    name: "Dr. Chinedu Eze",
    specialty: "General Medicine",
    status: "online",
    bio: "General practitioner focused on holistic health and lifestyle.",
    initial: "C",
  },
  {
    id: "th-003",
    name: "Dr. Fatima Yusuf",
    specialty: "Counseling & Therapy",
    status: "away",
    bio: "Licensed counselor. Cognitive behavioral therapy background.",
    initial: "F",
  },
];

interface Message {
  id: string;
  role: "user" | "therapist" | "system";
  text: string;
  ts: number;
}

const STATUS_COLORS: Record<Therapist["status"], string> = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  offline: "bg-slate-400",
};

const STATUS_LABELS: Record<Therapist["status"], string> = {
  online: "Available now",
  away: "Away · responds in ~10 min",
  offline: "Offline",
};

export default function DozaTherapistPanel() {
  const user = useUserContext();
  const { setActivePanel } = useDashboard();
  const [selected, setSelected] = useState<Therapist | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const startChat = (t: Therapist) => {
    setSelected(t);
    const firstName = user?.fullName?.split(" ")[0] || "there";
    setMessages([
      {
        id: "sys-1",
        role: "system",
        text: `Connected with ${t.name}. Anything shared here is private.`,
        ts: Date.now(),
      },
      {
        id: "msg-1",
        role: "therapist",
        text: `Hi ${firstName}, I'm ${t.name.replace("Dr. ", "")}. I'm here to listen — how are you feeling today?`,
        ts: Date.now() + 500,
      },
    ]);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selected || sending) return;
    const text = input.trim();
    setInput("");
    setMessages((m) => [
      ...m,
      { id: `u-${Date.now()}`, role: "user", text, ts: Date.now() },
    ]);
    setSending(true);
    // Placeholder therapist reply — wire to your chat backend later
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: `t-${Date.now()}`,
          role: "therapist",
          text: "Thank you for sharing that. Sometimes just naming what's going on helps. Can you tell me a bit more about when you first noticed this feeling?",
          ts: Date.now(),
        },
      ]);
      setSending(false);
    }, 1400);
  };

  const back = () => {
    if (selected) {
      setSelected(null);
      setMessages([]);
    } else {
      setActivePanel("dashboard");
    }
  };

  return (
    <div
      className={cn(
        "min-h-screen bg-[#F8FAFC] pb-24 flex flex-col",
        poppins.className,
      )}
    >
      {/* Emergency disclaimer — always visible */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
        <AlertCircle size={14} className="text-amber-700 shrink-0" />
        <p className="text-[11px] text-amber-900 font-medium">
          If this is an emergency, call{" "}
          <a href="tel:112" className="font-bold underline">
            112
          </a>{" "}
          immediately.
        </p>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={back}
            aria-label="Back"
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors shrink-0"
          >
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <div className="min-w-0 flex-1">
            <h1
              className={cn(
                "text-lg font-bold text-slate-900 truncate",
                bebasNeue.className,
              )}
            >
              {selected ? selected.name : "Talk to a Doza Medic"}
            </h1>
            <p className="text-xs text-slate-600 truncate">
              {selected
                ? selected.specialty
                : "Confidential · No judgment · Available now"}
            </p>
          </div>
          {selected && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full shrink-0">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  STATUS_COLORS[selected.status],
                )}
              />
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                {selected.status}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-4">
        {!selected ? (
          <TherapistList onSelect={startChat} />
        ) : (
          <ChatView
            therapist={selected}
            messages={messages}
            input={input}
            sending={sending}
            onInput={setInput}
            onSend={sendMessage}
            scrollRef={scrollRef}
          />
        )}
      </div>
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────

function TherapistList({ onSelect }: { onSelect: (t: Therapist) => void }) {
  return (
    <div className="space-y-3">
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
          <Shield size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-900">
            Private & confidential
          </p>
          <p className="text-xs text-emerald-800/80 mt-0.5">
            Your conversation is end-to-end encrypted. Nothing is shared without
            your consent.
          </p>
        </div>
      </div>

      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1 pt-2">
        Available Doza Medics
      </p>

      {THERAPISTS.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t)}
          className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-3 hover:border-emerald-300 hover:shadow-sm active:scale-[0.99] transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700 font-bold text-lg">
            {t.initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <p className="text-sm font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                {t.name}
              </p>
              <span
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  STATUS_COLORS[t.status],
                )}
              />
            </div>
            <p className="text-xs font-semibold text-emerald-700">
              {t.specialty}
            </p>
            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{t.bio}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1.5 flex items-center gap-1">
              <Clock size={10} />
              {STATUS_LABELS[t.status]}
            </p>
          </div>
        </button>
      ))}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mt-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle size={16} className="text-slate-600" />
          <p className="text-sm font-bold text-slate-900">Prefer a call?</p>
        </div>
        <p className="text-xs text-slate-600 mb-3">
          Our helpline is open 24/7. A Doza medic will answer.
        </p>
        <a
          href="tel:+2348000000000"
          className="inline-flex items-center justify-center gap-2 w-full min-h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm transition-colors"
        >
          <Phone size={16} />
          Call Doza Helpline
        </a>
      </div>
    </div>
  );
}

function ChatView({
  therapist,
  messages,
  input,
  sending,
  onInput,
  onSend,
  scrollRef,
}: {
  therapist: Therapist;
  messages: Message[];
  input: string;
  sending: boolean;
  onInput: (v: string) => void;
  onSend: (e: React.FormEvent) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex flex-col h-[calc(100vh-220px)] bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {m.role === "system" ? (
                <div className="mx-auto max-w-[85%] text-center">
                  <p className="text-[11px] text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full inline-block">
                    {m.text}
                  </p>
                </div>
              ) : (
                <div
                  className={cn(
                    "max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-emerald-600 text-white rounded-br-sm"
                      : "bg-slate-100 text-slate-900 rounded-bl-sm",
                  )}
                >
                  {m.text}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {sending && (
          <div className="flex justify-start">
            <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-sm inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={onSend}
        className="border-t border-slate-200 p-3 flex items-end gap-2 bg-white"
      >
        <textarea
          value={input}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend(e);
            }
          }}
          rows={1}
          placeholder="Type your message…"
          className="flex-1 resize-none px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition max-h-32 min-h-11"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          aria-label="Send message"
          className="min-h-11 min-w-11 inline-flex items-center justify-center bg-emerald-600 disabled:bg-slate-200 text-white rounded-xl active:scale-95 transition-all"
        >
          {sending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </form>
    </div>
  );
}
