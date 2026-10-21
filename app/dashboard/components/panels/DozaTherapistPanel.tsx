"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Send,
  Loader2,
  Phone,
  MessageCircle,
  Lock,
  Star,
  CheckCheck,
} from "lucide-react";
import { useDashboard } from "../../DashboardContext";
import { useUserContext } from "../../UserContext";
import { cn } from "@/app/utils/utils";

interface Therapist {
  id: string;
  name: string;
  specialty: string;
  status: "online" | "away" | "offline";
  bio: string;
  rating: number;
  reviews: number;
  image: string;
  initial: string;
}

const THERAPISTS: Therapist[] = [
  {
    id: "th-001",
    name: "Dr. Ada Nkemdirim",
    specialty: "Mental Health & Wellness",
    status: "online",
    bio: "Specialist in mood disorders, anxiety, and stress management.",
    rating: 4.9,
    reviews: 128,
    image:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=500&h=650&q=80",
    initial: "A",
  },
  {
    id: "th-002",
    name: "Dr. Chinedu Eze",
    specialty: "General Medicine",
    status: "online",
    bio: "General practitioner focused on holistic health and lifestyle.",
    rating: 4.8,
    reviews: 95,
    image:
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=500&h=650&q=80",
    initial: "C",
  },
  {
    id: "th-003",
    name: "Dr. Fatima Yusuf",
    specialty: "Counseling & Therapy",
    status: "away",
    bio: "Licensed counselor. Cognitive behavioral therapy background.",
    rating: 4.7,
    reviews: 210,
    image:
      "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=500&h=650&q=80",
    initial: "F",
  },
  {
    id: "th-004",
    name: "Dr. Tunde Bakare",
    specialty: "Cardiology",
    status: "online",
    bio: "Cardiologist with 10+ years helping patients manage heart health.",
    rating: 4.9,
    reviews: 156,
    image:
      "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=500&h=650&q=80",
    initial: "T",
  },
  {
    id: "th-005",
    name: "Dr. Ngozi Okafor",
    specialty: "Pediatrics",
    status: "offline",
    bio: "Pediatric specialist focused on child wellness and development.",
    rating: 4.8,
    reviews: 87,
    image:
      "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&w=500&h=650&q=80",
    initial: "N",
  },
];

interface Message {
  id: string;
  role: "user" | "therapist";
  text: string;
  ts: number;
}

const STATUS_DOT: Record<Therapist["status"], string> = {
  online: "bg-emerald-500",
  away: "bg-emerald-300",
  offline: "bg-slate-400",
};

const STATUS_LABEL: Record<Therapist["status"], string> = {
  online: "Online",
  away: "Away",
  offline: "Offline",
};

const CARD_ASPECTS = [
  "aspect-[3/4]",
  "aspect-[4/5]",
  "aspect-[5/6]",
  "aspect-[4/5]",
  "aspect-[3/4]",
];

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

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
        id: "msg-1",
        role: "therapist",
        text: `Hi ${firstName}, I'm ${t.name.replace("Dr. ", "")}. I'm here to listen — how are you feeling today?`,
        ts: Date.now(),
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
    <div className="h-[100dvh] flex flex-col bg-white overflow-hidden pt-2">
      {/* Panel header */}
      <header className="bg-white border-b border-slate-200 shrink-0">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2.5 flex items-center gap-2.5">
          <button
            onClick={back}
            aria-label="Back"
            className="min-h-10 min-w-10 inline-flex items-center justify-center rounded-xl hover:bg-emerald-50 active:scale-95 transition-all shrink-0"
          >
            <ArrowLeft size={19} className="text-slate-700" />
          </button>

          {/* Squircle DP with white border + status indicator */}
          {selected && (
            <div className="relative shrink-0">
              <img
                src={selected.image}
                alt={selected.name}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border-2 border-white ring-1 ring-emerald-200/70 shadow-sm"
              />
              <span
                className={cn(
                  "absolute -top-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-white shadow-sm",
                  STATUS_DOT[selected.status],
                )}
                aria-label={STATUS_LABEL[selected.status]}
              />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="text-[15px] sm:text-base font-bold text-slate-900 truncate leading-tight">
              {selected ? selected.name : "Talk to a Doza Medic"}
            </h1>
            <p className="text-[11px] text-slate-600 truncate leading-tight mt-0.5">
              {selected ? selected.specialty : "Confidential · Available now"}
            </p>
          </div>
        </div>
      </header>

      {/* GRID VIEW */}
      {!selected ? (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl w-full mx-auto px-3 py-3 pb-28">
            <TherapistGrid onSelect={startChat} />
          </div>
        </div>
      ) : (
        /* CHAT VIEW */
        <div className="flex-1 flex flex-col min-h-0 pb-28">
          <div className="max-w-3xl w-full mx-auto px-3 pt-3 flex-1 flex flex-col min-h-0">
            <ChatView
              therapist={selected}
              messages={messages}
              input={input}
              sending={sending}
              onInput={setInput}
              onSend={sendMessage}
              scrollRef={scrollRef}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Therapist grid ──────────────────────────────────────────
function TherapistGrid({ onSelect }: { onSelect: (t: Therapist) => void }) {
  return (
    <div className="space-y-3">
      {/* End-to-end Encryption Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 flex items-start gap-2.5 shadow-xs">
        <Lock size={14} className="text-emerald-700 mt-0.5 shrink-0" />
        <p className="text-[11px] text-emerald-900 leading-snug">
          <span className="font-bold">Private & confidential.</span> Your
          conversations are end-to-end encrypted. Nothing is shared without your
          consent.
        </p>
      </div>

      <div className="px-1 pt-1">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          {THERAPISTS.length} Doza Medics Available
        </p>
      </div>

      {/* Masonry Layout Grid */}
      <div className="columns-2 sm:columns-3 gap-2.5 [column-fill:_balance]">
        {THERAPISTS.map((t, i) => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className={cn(
              "break-inside-avoid mb-2.5 w-full block group relative overflow-hidden rounded-2xl bg-slate-200 text-left",
              "ring-1 ring-slate-200/80 hover:ring-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500",
              "transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]",
              CARD_ASPECTS[i % CARD_ASPECTS.length],
            )}
          >
            <img
              src={t.image}
              alt={t.name}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/30 to-slate-900/20" />

            {/* Rating Tag */}
            <div className="absolute top-2 right-2 inline-flex items-center gap-1 bg-slate-900/60 backdrop-blur-md rounded-full px-2 py-0.5 shadow-xs">
              <Star size={10} className="text-white fill-white" />
              <span className="text-[10px] font-bold text-white">
                {t.rating.toFixed(1)}
              </span>
            </div>

            {/* Status Dot */}
            <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-slate-900/60 backdrop-blur-md rounded-full px-2 py-0.5 shadow-xs">
              <span
                className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[t.status])}
              />
              <span className="text-[9px] font-bold text-white uppercase tracking-wider">
                {STATUS_LABEL[t.status]}
              </span>
            </div>

            {/* Details Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
              <p className="text-[12.5px] font-bold leading-tight truncate">
                {t.name}
              </p>
              <p className="text-[10px] text-white/75 leading-tight truncate mt-0.5">
                {t.specialty}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[9.5px] text-white/60">
                  {t.reviews} reviews
                </span>
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm group-hover:bg-emerald-500 transition-colors">
                  <MessageCircle size={11} className="text-white" />
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Helpline Contact Card */}
      <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3.5 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle size={14} className="text-emerald-700" />
          <p className="text-[13px] font-bold text-slate-900">Prefer a call?</p>
        </div>
        <p className="text-[11px] text-slate-600 mb-3">
          Our helpline is open 24/7. A Doza medic will answer.
        </p>
        <a
          href="tel:+2348000000000"
          className="inline-flex items-center justify-center gap-2 w-full min-h-10 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-semibold text-[13px] transition-all shadow-xs"
        >
          <Phone size={14} />
          Call Doza Helpline
        </a>
      </div>
    </div>
  );
}

// ─── Chat View Component ──────────────────────────────────────
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
    <div className="flex-1 flex flex-col min-h-0 bg-emerald-50/60 rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Scrollable Chat Area */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2"
      >
        <div className="flex justify-center pb-1">
          <div className="max-w-[92%] bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5 shadow-xs">
            <Lock size={11} className="text-emerald-700 mt-0.5 shrink-0" />
            <p className="text-[10.5px] text-emerald-900 leading-snug">
              <span className="font-bold">Private & secure.</span> End-to-end
              encrypted. Only you and {therapist.name} can see this chat.
            </p>
          </div>
        </div>

        <div className="flex justify-center pb-1">
          <div className="text-[10px] text-slate-600 bg-white px-2.5 py-0.5 rounded-full font-medium border border-slate-200 shadow-xs">
            Today
          </div>
        </div>

        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={cn("flex", isUser ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] px-3 py-2 shadow-xs relative",
                    isUser
                      ? "bg-emerald-600 text-white rounded-2xl rounded-tr-xs"
                      : "bg-white text-slate-900 rounded-2xl rounded-tl-xs border border-slate-100",
                  )}
                >
                  <p className="text-[13px] leading-snug pr-10 whitespace-pre-wrap break-words">
                    {m.text}
                  </p>
                  <span
                    className={cn(
                      "absolute bottom-1.5 right-2.5 inline-flex items-center gap-0.5 text-[9.5px] leading-none",
                      isUser ? "text-emerald-100" : "text-slate-400",
                    )}
                  >
                    {formatTime(m.ts)}
                    {isUser && (
                      <CheckCheck
                        size={11}
                        className="text-emerald-100 ml-0.5 shrink-0"
                      />
                    )}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {sending && (
          <div className="flex justify-start">
            <div className="bg-white px-3 py-2 rounded-2xl rounded-tl-xs shadow-xs border border-slate-100 inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
            </div>
          </div>
        )}
      </div>

      {/* Input Form Bar */}
      <form
        onSubmit={onSend}
        className="shrink-0 border-t border-emerald-100 bg-white px-2.5 py-2 flex items-end gap-2"
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
          className="flex-1 resize-none px-3.5 py-2.5 bg-emerald-50/60 border border-transparent rounded-2xl text-[13px] text-slate-900 placeholder:text-slate-500 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition max-h-28 min-h-10"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          aria-label="Send message"
          className="min-h-10 min-w-10 inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-full active:scale-95 transition-all shrink-0 shadow-xs"
        >
          {sending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </form>
    </div>
  );
}
