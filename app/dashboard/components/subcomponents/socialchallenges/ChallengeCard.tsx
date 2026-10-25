// app/dashboard/components/subcomponents/socialchallenges/ChallengeCard.tsx
import { motion } from "framer-motion";
import { Trophy, Globe, Lock, Target, Users, Flame } from "lucide-react";
import { activityOptions } from "@/app/types/challengeConstant";
import { getChallengeImage } from "./challengeImages";
import { cn } from "@/app/utils/utils";

export function ChallengeCard({
  challenge,
  user,
  isCreator,
  isParticipant,
  onJoin,
  onView,
}: any) {
  const start = new Date(challenge.startDate);
  const end = new Date(challenge.endDate);
  const now = new Date();
  const isActive = now >= start && now <= end;

  const daysLeft = Math.max(
    0,
    Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24)),
  );

  const rawProgress = challenge.participants?.[user?.id || ""]?.progress;
  const userProgress = typeof rawProgress === "number" ? rawProgress : 0;
  const percent =
    typeof rawProgress === "number"
      ? Math.min(100, (rawProgress / challenge.targetValue) * 100)
      : 0;

  const activity = activityOptions.find((a) => a.value === challenge.activity);
  const image = getChallengeImage(challenge);

  const statusBadge = isActive ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white px-2.5 py-1 rounded-full shadow-md backdrop-blur-md">
      <Flame className="w-3 h-3" />
      {daysLeft}d left
    </span>
  ) : now < start ? (
    <span className="text-[10px] font-black uppercase tracking-wider bg-sky-500 text-white px-2.5 py-1 rounded-full shadow-md backdrop-blur-md">
      Starts soon
    </span>
  ) : (
    <span className="text-[10px] font-black uppercase tracking-wider bg-slate-700/90 text-white px-2.5 py-1 rounded-full shadow-md backdrop-blur-md">
      Ended
    </span>
  );

  return (
    <motion.div
      layout
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onClick={onView}
      className="group cursor-pointer bg-white border border-slate-200/80 rounded-[28px] shadow-sm hover:shadow-xl hover:border-emerald-500/30 transition-all overflow-hidden flex flex-col"
    >
      {/* ─── HERO IMAGE (Tinder-style) ─────────────────────────── */}
      <div className="relative w-full aspect-[16/11] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950">
        <img
          src={image}
          alt={challenge.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {/* Cinematic gradient overlay for legible text */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

        {/* Top row — status + privacy */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {statusBadge}
            {isCreator && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-1 rounded-full backdrop-blur-md">
                Creator
              </span>
            )}
            {isParticipant && !isCreator && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 px-2 py-1 rounded-full backdrop-blur-md">
                Joined
              </span>
            )}
          </div>
          <div className="shrink-0 w-8 h-8 bg-white/95 backdrop-blur-md rounded-full shadow-md flex items-center justify-center">
            {challenge.isPublic ? (
              <Globe className="w-4 h-4 text-emerald-600" />
            ) : (
              <Lock className="w-4 h-4 text-slate-700" />
            )}
          </div>
        </div>

        {/* Bottom overlay — activity, title, description */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 space-y-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-200 bg-emerald-500/25 border border-emerald-400/40 backdrop-blur-md px-2 py-0.5 rounded-md">
            {activity?.label || challenge.activity}
          </span>
          <h3 className="text-lg sm:text-xl font-bold text-white leading-tight line-clamp-1">
            {challenge.name}
          </h3>
          <p className="text-xs text-white/80 line-clamp-2 leading-relaxed">
            {challenge.description}
          </p>
        </div>
      </div>

      {/* ─── BODY ──────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
        {/* Compact stat row */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <Target className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-bold text-slate-900">
              {challenge.targetValue}
            </span>
            <span className="text-slate-500 truncate">
              {challenge.targetUnit}
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 shrink-0" />
          <div className="flex items-center gap-1.5 min-w-0">
            <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-bold text-slate-900">
              {challenge.participantCount}
            </span>
            <span className="text-slate-500 truncate">joined</span>
          </div>
        </div>

        {/* Progress bar — only when joined and progress is numeric */}
        {isParticipant && typeof rawProgress === "number" && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-slate-600">Your progress</span>
              <span className="text-emerald-700">
                {userProgress} / {challenge.targetValue}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="bg-emerald-500 h-full rounded-full"
              />
            </div>
          </div>
        )}

        {/* Footer — creator + CTA */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
          <div className="flex items-center gap-1.5 text-xs min-w-0">
            <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <Trophy className="w-3 h-3 text-emerald-600" />
            </div>
            <span className="text-slate-500 truncate">
              by{" "}
              <span className="font-bold text-slate-800">
                {challenge.creatorName}
              </span>
            </span>
          </div>

          {!isCreator && !isParticipant && challenge.isPublic && isActive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onJoin();
              }}
              className={cn(
                "shrink-0 px-4 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl active:scale-95 transition-all shadow-md hover:shadow-lg",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2",
              )}
            >
              Join
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
