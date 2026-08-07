import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Trophy,
  Globe,
  Lock,
  Calendar,
  Activity,
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
import { bebasNeue } from "@/app/constants";
import { commentSchema, CommentForm } from "@/app/types/schemas";
import { badges } from "@/app/types/challengeConstant";
import type {
  Challenge,
  Participant,
  Comment,
} from "@/app/types/challengetype";
import { UserInfo } from "@/app/dashboard/hooks/useProfile";
import { useChallengeSharing } from "@/app/dashboard/hooks/useChallengeSharing";

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
  const isActive =
    now >= new Date(challenge.startDate) && now <= new Date(challenge.endDate);

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
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-white rounded-[32px] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl border border-slate-100 flex flex-col space-y-7 scrollbar-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-start justify-between pb-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            {challenge.imageUrl ? (
              <img
                src={challenge.imageUrl}
                alt={challenge.name}
                className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center shadow-md">
                <Trophy className="w-7 h-7 text-emerald-400" />
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100/60 text-[10px] font-extrabold uppercase tracking-wider rounded-md">
                  {challenge.activity}
                </span>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  {challenge.isPublic ? (
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <span>
                    {challenge.isPublic ? "Public Group" : "Private Session"}
                  </span>
                </div>
              </div>
              <h2
                className={cn(
                  "text-2xl md:text-3xl font-black text-slate-900 tracking-tight",
                  bebasNeue.className,
                )}
              >
                {challenge.name}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {new Date(challenge.startDate).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}
                </span>
                <span className="text-slate-300 font-bold">→</span>
                <span>
                  {new Date(challenge.endDate).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 bg-slate-100 hover:bg-slate-200 active:scale-90 rounded-full transition-all flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 🔒 INVITE CODE SECTION (for private challenges created by this user) */}
        {isCreator && !challenge.isPublic && (challenge as any).code && (
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest">
                Invite Code
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white px-4 py-3 rounded-xl text-base font-mono font-bold text-amber-700 border border-amber-200 tracking-widest text-center shadow-inner">
                {(challenge as any).code}
              </code>
              <button
                onClick={() => copyToClipboard((challenge as any).code)}
                className="p-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors flex items-center justify-center shadow-sm"
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
              className="w-full py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" /> Share Challenge Invite
            </button>
          </div>
        )}

        {/* 🌍 PUBLIC SHARE (for public challenges created by this user) */}
        {isCreator && challenge.isPublic && (
          <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">
                Public Challenge Link
              </span>
            </div>
            <button
              onClick={() => shareViaWebShare(challenge.name, challenge.id)}
              className="w-full py-2.5 bg-emerald-100/80 hover:bg-emerald-200 text-emerald-800 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" /> Share Challenge Link
            </button>
          </div>
        )}

        {/* ABOUT */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            About Challenge
          </h4>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 font-medium">
            {challenge.description}
          </p>
        </div>

        {/* TARGET & PROGRESS */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                <Target className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Objective Milestone
              </span>
            </div>
            <span className="text-base font-black text-emerald-400">
              {challenge.targetValue}{" "}
              <span className="text-xs font-semibold text-slate-400">
                {challenge.targetUnit}
              </span>
            </span>
          </div>

          {isParticipant && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400 font-medium">
                  Your Current Standing
                </span>
                <span className="text-white">
                  {userProgress} / {challenge.targetValue}{" "}
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {challenge.targetUnit}
                  </span>
                </span>
              </div>
              <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="bg-emerald-500 h-full rounded-full"
                />
              </div>

              {isActive && (
                <div className="pt-2">
                  {!showProgressInput ? (
                    <button
                      onClick={() => setShowProgressInput(true)}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                    >
                      Log Progress Entry
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2"
                    >
                      <input
                        type="number"
                        value={progressValue}
                        onChange={(e) =>
                          setProgressValue(parseFloat(e.target.value) || 0)
                        }
                        className="flex-1 px-4 py-2.5 text-xs bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:border-emerald-400 placeholder:text-slate-500"
                        placeholder="Type raw update value..."
                      />
                      <button
                        onClick={async () => {
                          await onProgressUpdate(challenge.id, progressValue);
                          setShowProgressInput(false);
                        }}
                        className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-sm transition-all"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setShowProgressInput(false)}
                        className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ACHIEVEMENTS / BADGES */}
        {isParticipant && (
          <div className="bg-gradient-to-br from-amber-50/50 via-white to-emerald-50/40 rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" /> Earned Vault
                Rewards
              </h3>
              <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-xl shadow-sm">
                {points} pts
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => {
                const earned = percent >= badge.threshold;
                const Icon = badge.icon;
                return (
                  <div
                    key={badge.name}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-sm transition-all border",
                      earned
                        ? `${badge.bg} ${badge.color} border-emerald-200/60 shadow-md`
                        : "bg-slate-50 text-slate-400 border-slate-200/60 opacity-60",
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" /> {badge.name}
                  </div>
                );
              })}
            </div>

            {earnedBadges.length > 0 && (
              <button
                onClick={shareBadge}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-700 hover:text-emerald-900 transition-colors pt-2 border-t border-slate-100 w-fit"
              >
                <Share2 className="w-3.5 h-3.5" /> Export PDF Certification
                Badge
              </button>
            )}

            <div ref={badgeRef} className="hidden">
              <div className="w-[340px] p-6 bg-emerald-600 rounded-3xl text-white shadow-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <Trophy className="w-12 h-12 text-emerald-200" />
                  <div>
                    <h2
                      style={{ fontFamily: bebasNeue.style.fontFamily }}
                      className="text-2xl font-black tracking-wide"
                    >
                      {user.fullName}
                    </h2>
                    <p className="text-xs text-emerald-100">
                      Accomplished Leaderboard Goal
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-white/10 rounded-xl space-y-1 text-xs">
                  <p>
                    🎯 Dynamic Score:{" "}
                    <b>
                      {userProgress} / {challenge.targetValue}
                    </b>
                  </p>
                  <p>
                    ⭐ Earned Weight Metrics: <b>{points} points</b>
                  </p>
                </div>
                <p className="text-[9px] text-white/50 tracking-wider uppercase text-center">
                  Verified via Doza Health Platform
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CHART */}
        {isParticipant && chartData.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" /> 7-Day
              Performance Stream
            </h3>
            <div className="h-44 w-full bg-slate-50/80 p-4 rounded-2xl border border-slate-100 shadow-sm">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "11px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="progress"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "#10b981" }}
                    activeDot={{ r: 5, fill: "#059669" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* PARTICIPANTS */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" /> Verified Challengers
            ({participants.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {participants.map((p) => {
              const pct = challenge.targetValue
                ? (Number(p.progress || 0) / challenge.targetValue) * 100
                : 0;
              return (
                <div
                  key={p.uid}
                  className="flex items-center gap-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100/80 shadow-sm"
                >
                  {p.photo ? (
                    <img
                      src={p.photo}
                      alt={p.name}
                      className="w-8 h-8 rounded-full object-cover border border-white ring-2 ring-emerald-500/20"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black shadow-inner">
                      {p.name?.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {p.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex-1 h-2 bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 whitespace-nowrap">
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

        {/* COMMENTS */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-500" /> Discussion
            Hub
          </h3>

          {isParticipant && isActive && (
            <form
              onSubmit={handleSubmit(onCommentSubmit)}
              className="flex gap-2"
            >
              <input
                {...register("text")}
                placeholder="Share advice or update the squad..."
                className="flex-1 px-4 py-3 text-xs bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-slate-900 shadow-sm"
              />
              <button
                type="submit"
                className="px-4 py-3 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl transition-all flex items-center justify-center active:scale-95 shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 pt-1">
            {comments.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                No discussions recorded yet.
              </p>
            ) : (
              comments.map((c: any) => (
                <div
                  key={c.timestamp}
                  className="flex gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 shadow-sm"
                >
                  {c.authorImage ? (
                    <img
                      src={c.authorImage}
                      alt={c.authorName}
                      className="w-7 h-7 rounded-full object-cover shadow-sm"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold shadow-inner">
                      {c.authorName?.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {c.authorName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(c.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {c.text}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex gap-3 pt-5 border-t border-slate-100">
          {isCreator ? (
            <>
              <button className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm">
                <Edit3 className="w-3.5 h-3.5 text-slate-600" /> Edit Challenge
              </button>
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="flex-1 py-3.5 bg-rose-50 text-rose-600 hover:bg-rose-100 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Close Event
                </button>
              )}
            </>
          ) : isParticipant ? (
            <button
              onClick={onLeave}
              className="flex-1 py-3.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-sm"
            >
              Leave Challenge
            </button>
          ) : (
            isActive && (
              <button
                onClick={onJoin}
                className="flex-1 py-4 bg-slate-900 hover:bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-md hover:shadow-lg"
              >
                {challenge.isPublic
                  ? "Accept Challenge & Join"
                  : "Submit Entry Request"}
              </button>
            )
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
