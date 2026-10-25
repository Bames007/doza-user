// app/dashboard/components/subcomponents/socialchallenges/ChallengeDetail.tsx
import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Trophy,
  Globe,
  Lock,
  Calendar,
  Target,
  Users,
  Award,
  Share2,
  BarChart3,
  MessageCircle,
  Send,
  X,
  Trash2,
  Edit3,
  Copy,
  Check,
  Flame,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/app/utils/utils";
import { commentSchema, CommentForm } from "@/app/types/schemas";
import { badges } from "@/app/types/challengeConstant";
import { getChallengeImage } from "./challengeImages";
import type {
  Challenge,
  Participant,
  Comment,
} from "@/app/types/challengetype";
import { UserInfo } from "@/app/dashboard/hooks/useProfile";
import { useChallengeSharing } from "@/app/dashboard/hooks/useChallengeSharing";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

interface Props {
  challenge: Challenge;
  user: UserInfo;
  isCreator: boolean;
  isParticipant: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onProgressUpdate: (challengeId: string, progress: number) => Promise<void>;
  onAddComment: (challengeId: string, data: CommentForm) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

export function ChallengeDetail({
  challenge,
  user,
  isCreator,
  isParticipant,
  onJoin,
  onLeave,
  onProgressUpdate,
  onAddComment,
  onDelete,
  onClose,
}: Props) {
  const [showProgressInput, setShowProgressInput] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const badgeRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentForm>({
    resolver: zodResolver(commentSchema),
  });

  const rawProgress = challenge.participants?.[user.id]?.progress;
  const userProgress = typeof rawProgress === "number" ? rawProgress : 0;
  const percent =
    challenge.targetValue > 0
      ? (userProgress / challenge.targetValue) * 100
      : 0;
  const points = Math.floor(userProgress * 10);
  const now = new Date();
  const start = new Date(challenge.startDate);
  const end = new Date(challenge.endDate);
  const isActive = now >= start && now <= end;
  const daysLeft = Math.max(
    0,
    Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24)),
  );

  const participants = useMemo(() => {
    const seen = new Set<string>();
    return Object.entries(challenge.participants || {})
      .map(([uid, data]) => ({ uid, ...(data as Participant) }))
      .filter((p) => {
        if (seen.has(p.uid)) return false;
        seen.add(p.uid);
        return true;
      })
      .sort((a, b) => {
        const aVal = typeof a.progress === "number" ? a.progress : 0;
        const bVal = typeof b.progress === "number" ? b.progress : 0;
        return bVal - aVal;
      });
  }, [challenge.participants]);

  const { copied, shareViaWebShare, copyToClipboard } = useChallengeSharing();

  const comments = useMemo(
    () =>
      Object.values(challenge.comments || {}).sort(
        (a, b) => (b as Comment).timestamp - (a as Comment).timestamp,
      ),
    [challenge.comments],
  );

  const chartData = useMemo(() => {
    if (typeof userProgress !== "number") return [];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        date: d.toLocaleDateString(undefined, { weekday: "short" }),
        progress: Math.floor(Math.random() * userProgress),
      };
    });
  }, [userProgress]);

  const earnedBadges = badges.filter((b) => percent >= b.threshold);
  const heroImage = getChallengeImage(challenge);

  const shareBadge = async () => {
    if (!badgeRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const jsPDF = (await import("jspdf")).default;
    const canvas = await html2canvas(badgeRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    pdf.addImage(imgData, "PNG", 10, 10, 180, 100);
    pdf.save("doza-badge.pdf");
  };

  const onCommentSubmit = async (data: CommentForm) => {
    await onAddComment(challenge.id, data);
    reset();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "8%", scale: 0.98, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: "8%", scale: 0.98, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="bg-white rounded-t-[28px] sm:rounded-[32px] max-w-2xl w-full max-h-[94dvh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-emerald-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div
          className="sm:hidden flex justify-center pt-3 shrink-0"
          aria-hidden
        >
          <div className="w-10 h-1 rounded-full bg-emerald-200" />
        </div>

        {/* ─── HERO BANNER ──────────────────────────────────────── */}
        <div className="relative shrink-0 aspect-[16/10] sm:aspect-[2/1] overflow-hidden bg-emerald-700">
          <img
            src={heroImage}
            alt={challenge.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

          {/* Floating close */}
          <button
            onClick={onClose}
            aria-label="Close"
            className={cn(
              "absolute top-3 right-3 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-emerald-700 hover:bg-emerald-50 active:scale-95 transition-all",
              FOCUS,
            )}
          >
            <X className="w-4 h-4" />
          </button>

          {/* Top-left status chips */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pr-12">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white px-2.5 py-1 rounded-full shadow-md">
              {challenge.activity}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white text-emerald-700 px-2.5 py-1 rounded-full shadow-md inline-flex items-center gap-1">
              {challenge.isPublic ? (
                <>
                  <Globe className="w-3 h-3" /> Public
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3" /> Private
                </>
              )}
            </span>
            {isActive ? (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white px-2.5 py-1 rounded-full shadow-md inline-flex items-center gap-1">
                <Flame className="w-3 h-3" /> {daysLeft}d left
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-800 text-white px-2.5 py-1 rounded-full shadow-md">
                {now < start ? "Starts soon" : "Ended"}
              </span>
            )}
          </div>

          {/* Bottom overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight line-clamp-2 tracking-tight">
              {challenge.name}
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-white/85 font-medium">
              <Calendar className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>
                {start.toLocaleDateString(undefined, { dateStyle: "medium" })}
              </span>
              <span className="text-white/40">→</span>
              <span>
                {end.toLocaleDateString(undefined, { dateStyle: "medium" })}
              </span>
            </div>
          </div>
        </div>

        {/* ─── SCROLLABLE BODY ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-emerald-scrollbar">
          <div className="p-4 sm:p-6 space-y-5">
            {/* Invite code (private, creator) */}
            {isCreator && !challenge.isPublic && (challenge as any).code && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    Invite Code
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white px-4 py-3 rounded-xl text-base font-mono font-bold text-emerald-700 border border-emerald-200 tracking-widest text-center">
                    {(challenge as any).code}
                  </code>
                  <button
                    onClick={() => copyToClipboard((challenge as any).code)}
                    className={cn(
                      "p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors flex items-center justify-center active:scale-95",
                      FOCUS,
                    )}
                    aria-label="Copy invite code"
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <button
                  onClick={() =>
                    shareViaWebShare(
                      challenge.name,
                      challenge.id,
                      (challenge as any).code,
                    )
                  }
                  className={cn(
                    "w-full min-h-10 bg-white hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2 border border-emerald-200",
                    FOCUS,
                  )}
                >
                  <Share2 className="w-3.5 h-3.5" /> Share Invite
                </button>
              </div>
            )}

            {/* Public share (creator) */}
            {isCreator && challenge.isPublic && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    Public Challenge
                  </span>
                </div>
                <button
                  onClick={() => shareViaWebShare(challenge.name, challenge.id)}
                  className={cn(
                    "w-full min-h-10 bg-white hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2 border border-emerald-200",
                    FOCUS,
                  )}
                >
                  <Share2 className="w-3.5 h-3.5" /> Share Link
                </button>
              </div>
            )}

            {/* About */}
            <section className="space-y-2">
              <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                About Challenge
              </h4>
              <p className="text-xs sm:text-sm text-emerald-900/80 leading-relaxed bg-emerald-50 p-3.5 rounded-xl border border-emerald-100 font-medium">
                {challenge.description}
              </p>
            </section>

            {/* Target + Progress — hero emerald card */}
            <div className="bg-emerald-600 text-white rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/20">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/15 rounded-lg">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-50">
                    Objective
                  </span>
                </div>
                <span className="text-base font-bold text-white">
                  {challenge.targetValue}{" "}
                  <span className="text-xs font-semibold text-emerald-100">
                    {challenge.targetUnit}
                  </span>
                </span>
              </div>

              {isParticipant && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-emerald-100 font-medium">
                      Your standing
                    </span>
                    <span className="text-white">
                      {userProgress} / {challenge.targetValue}{" "}
                      <span className="text-[10px] text-emerald-100 font-semibold">
                        {challenge.targetUnit}
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, percent)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="bg-white h-full rounded-full"
                    />
                  </div>

                  {isActive && (
                    <div className="pt-2">
                      {!showProgressInput ? (
                        <button
                          onClick={() => setShowProgressInput(true)}
                          className={cn(
                            "w-full min-h-11 bg-white text-emerald-700 text-[11px] font-bold uppercase tracking-wider rounded-xl hover:bg-emerald-50 transition-all active:scale-95",
                            FOCUS,
                          )}
                        >
                          Log Progress
                        </button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-col sm:flex-row gap-2"
                        >
                          <input
                            type="number"
                            value={progressValue}
                            onChange={(e) =>
                              setProgressValue(parseFloat(e.target.value) || 0)
                            }
                            className="flex-1 min-h-11 px-4 text-base sm:text-sm bg-white/15 border border-white/30 rounded-xl text-white placeholder:text-emerald-100/70 focus:outline-none focus:bg-white/25 focus:border-white transition-colors"
                            placeholder="Enter value…"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                await onProgressUpdate(
                                  challenge.id,
                                  progressValue,
                                );
                                setShowProgressInput(false);
                              }}
                              className={cn(
                                "flex-1 sm:flex-initial min-h-11 px-4 bg-white text-emerald-700 font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all active:scale-95 hover:bg-emerald-50",
                                FOCUS,
                              )}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setShowProgressInput(false)}
                              className={cn(
                                "flex-1 sm:flex-initial min-h-11 px-4 bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all",
                                FOCUS,
                              )}
                            >
                              Cancel
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Badges */}
            {isParticipant && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" /> Earned Rewards
                  </h3>
                  <span className="text-[11px] font-bold text-emerald-800 bg-white border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                    {points} pts
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {badges.map((badge) => {
                    const earned = percent >= badge.threshold;
                    const Icon = badge.icon;
                    return (
                      <div
                        key={badge.name}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border",
                          earned
                            ? "bg-white text-emerald-700 border-emerald-200"
                            : "bg-emerald-50/50 text-emerald-400 border-emerald-100/60 opacity-60",
                        )}
                      >
                        <Icon className="w-3 h-3" /> {badge.name}
                      </div>
                    );
                  })}
                </div>

                {earnedBadges.length > 0 && (
                  <button
                    onClick={shareBadge}
                    className={cn(
                      "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 hover:text-emerald-900 transition-colors pt-2 border-t border-emerald-200 w-fit",
                      FOCUS,
                    )}
                  >
                    <Share2 className="w-3 h-3" /> Export PDF Badge
                  </button>
                )}

                <div ref={badgeRef} className="hidden">
                  <div className="w-[340px] p-6 bg-emerald-600 rounded-3xl text-white shadow-2xl space-y-4">
                    <div className="flex items-center gap-3">
                      <Trophy className="w-12 h-12 text-emerald-200" />
                      <div>
                        <h2 className="text-2xl font-bold tracking-wide">
                          {user.fullName}
                        </h2>
                        <p className="text-xs text-emerald-100">
                          Accomplished Leaderboard Goal
                        </p>
                      </div>
                    </div>
                    <div className="p-3 bg-white/15 rounded-xl space-y-1 text-xs">
                      <p>
                        🎯 Score:{" "}
                        <b>
                          {userProgress} / {challenge.targetValue}
                        </b>
                      </p>
                      <p>
                        ⭐ Earned: <b>{points} points</b>
                      </p>
                    </div>
                    <p className="text-[9px] text-white/60 tracking-wider uppercase text-center">
                      Verified via Doza Health Platform
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Chart */}
            {isParticipant && chartData.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" /> 7‑Day Performance
                </h3>
                <div className="h-44 w-full bg-white p-3 rounded-xl border border-emerald-100">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                      <XAxis
                        dataKey="date"
                        tick={{
                          fontSize: 10,
                          fill: "#059669",
                          fontWeight: 600,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{
                          fontSize: 10,
                          fill: "#059669",
                          fontWeight: 600,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#059669",
                          borderRadius: "10px",
                          color: "#fff",
                          fontSize: "11px",
                          border: "none",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="progress"
                        stroke="#059669"
                        strokeWidth={3}
                        dot={{ r: 3, fill: "#059669" }}
                        activeDot={{ r: 5, fill: "#10b981" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Participants */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Challengers (
                {participants.length})
              </h3>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-emerald-scrollbar">
                {participants.map((p) => {
                  const pct = challenge.targetValue
                    ? (Number(p.progress || 0) / challenge.targetValue) * 100
                    : 0;
                  return (
                    <div
                      key={p.uid}
                      className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-emerald-100"
                    >
                      {p.photo ? (
                        <img
                          src={p.photo}
                          alt={p.name}
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-200 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {p.name?.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-emerald-900 truncate">
                          {p.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                            {typeof p.progress === "number"
                              ? `${p.progress}/${challenge.targetValue}`
                              : "multi"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-2 pt-3 border-t border-emerald-100">
              <h3 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" /> Discussion
              </h3>

              {isParticipant && isActive && (
                <form
                  onSubmit={handleSubmit(onCommentSubmit)}
                  className="flex gap-2"
                >
                  <input
                    {...register("text")}
                    placeholder="Share an update…"
                    className={cn(
                      "flex-1 min-h-11 px-3.5 text-base sm:text-sm bg-emerald-50/60 border border-emerald-100 rounded-xl focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all text-emerald-900 placeholder:text-emerald-400",
                      errors.text && "border-emerald-500 bg-emerald-50",
                      FOCUS,
                    )}
                  />
                  <button
                    type="submit"
                    aria-label="Send comment"
                    className={cn(
                      "min-h-11 min-w-11 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all flex items-center justify-center active:scale-95 shrink-0",
                      FOCUS,
                    )}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 pt-1 custom-emerald-scrollbar">
                {comments.length === 0 ? (
                  <p className="text-xs text-emerald-600/70 italic text-center py-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    No discussions yet.
                  </p>
                ) : (
                  comments.map((c: any) => (
                    <div
                      key={c.timestamp}
                      className="flex gap-2.5 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100"
                    >
                      {c.authorImage ? (
                        <img
                          src={c.authorImage}
                          alt={c.authorName}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                          {c.authorName?.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5 gap-2">
                          <span className="text-xs font-bold text-emerald-900 truncate">
                            {c.authorName}
                          </span>
                          <span className="text-[10px] text-emerald-600/70 font-medium shrink-0">
                            {new Date(c.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-900/80 leading-relaxed">
                          {c.text}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── STICKY FOOTER ACTIONS ────────────────────────────── */}
        <div className="shrink-0 border-t border-emerald-100 bg-white px-4 sm:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex gap-2">
            {isCreator ? (
              <>
                <button
                  className={cn(
                    "flex-1 min-h-11 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-emerald-200",
                    FOCUS,
                  )}
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                {onDelete && (
                  <button
                    onClick={onDelete}
                    className={cn(
                      "flex-1 min-h-11 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-colors",
                      FOCUS,
                    )}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Close
                  </button>
                )}
              </>
            ) : isParticipant ? (
              <button
                onClick={onLeave}
                className={cn(
                  "flex-1 min-h-11 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all active:scale-95 border border-emerald-200",
                  FOCUS,
                )}
              >
                Leave Challenge
              </button>
            ) : isActive ? (
              <button
                onClick={onJoin}
                className={cn(
                  "flex-1 min-h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-sm shadow-emerald-600/25",
                  FOCUS,
                )}
              >
                {challenge.isPublic
                  ? "Accept & Join Challenge"
                  : "Submit Entry Request"}
              </button>
            ) : null}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
