import { motion } from "framer-motion";
import {
  Trophy,
  Globe,
  Lock,
  Activity,
  Target,
  Users,
  Calendar,
} from "lucide-react";
import { activityOptions } from "@/app/types/challengeConstant";
import { cn } from "@/app/utils/utils";

export function ChallengeCard({
  challenge,
  user,
  isCreator,
  isParticipant,
  onJoin,
  onView,
  onLeave,
}: any) {
  const start = new Date(challenge.startDate);
  const end = new Date(challenge.endDate);
  const now = new Date();
  const isActive = now >= start && now <= end;

  const daysLeft = Math.ceil(
    (end.getTime() - now.getTime()) / (1000 * 3600 * 24),
  );

  const rawProgress = challenge.participants?.[user?.id || ""]?.progress;
  const userProgress = typeof rawProgress === "number" ? rawProgress : 0;
  const percent =
    typeof rawProgress === "number"
      ? Math.min(100, (rawProgress / challenge.targetValue) * 100)
      : 0;
  const activity = activityOptions.find((a) => a.value === challenge.activity);

  return (
    <motion.div
      layout
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
      className="bg-white border border-slate-200/60 rounded-[24px] shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer flex flex-col group relative"
      onClick={onView}
    >
      {/* CARD BANNER CONTAINER */}
      <div className="h-32 w-full overflow-hidden relative bg-slate-100">
        {challenge.imageUrl ? (
          <img
            src={challenge.imageUrl}
            alt={challenge.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <Trophy className="w-9 h-9 text-white/20 animate-pulse" />
          </div>
        )}

        {/* TOP STATUS OVERLAYS */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="flex gap-1.5">
            {isActive ? (
              <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500 text-white px-2.5 py-1 rounded-lg backdrop-blur-md shadow-sm">
                {daysLeft}d left
              </span>
            ) : now < start ? (
              <span className="text-[9px] font-black uppercase tracking-widest bg-blue-500 text-white px-2.5 py-1 rounded-lg backdrop-blur-md shadow-sm">
                Starts soon
              </span>
            ) : (
              <span className="text-[9px] font-black uppercase tracking-widest bg-slate-600 text-white px-2.5 py-1 rounded-lg backdrop-blur-md shadow-sm">
                Ended
              </span>
            )}

            {isCreator && (
              <span className="text-[9px] font-black uppercase tracking-widest bg-purple-600 text-white px-2.5 py-1 rounded-lg shadow-sm">
                Creator
              </span>
            )}
            {isParticipant && !isCreator && (
              <span className="text-[9px] font-black uppercase tracking-widest bg-teal-600 text-white px-2.5 py-1 rounded-lg shadow-sm">
                Joined
              </span>
            )}
          </div>

          <div className="p-1.5 bg-white/90 backdrop-blur-md rounded-lg shadow-sm flex items-center justify-center">
            {challenge.isPublic ? (
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-600" />
            )}
          </div>
        </div>
      </div>

      {/* BODY CONTENT */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[9px] font-bold text-slate-500 uppercase tracking-tight">
              {activity?.label || challenge.activity}
            </span>
          </div>

          <h3 className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-emerald-600 transition-colors mb-1">
            {challenge.name}
          </h3>

          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
            {challenge.description}
          </p>
        </div>

        <div>
          {/* STATS MATRIX SECTION */}
          <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50/80 rounded-xl border border-slate-100/50 mb-3 text-[10px] text-slate-600 font-medium">
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate">
                <b className="text-slate-900">{challenge.targetValue}</b>{" "}
                {challenge.targetUnit}
              </span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>
                <b className="text-slate-900">{challenge.participantCount}</b>{" "}
                entered
              </span>
            </div>
          </div>

          {/* PROGRESS SLIDER OVERLAY */}
          {isParticipant && typeof rawProgress === "number" && (
            <div className="mb-4 bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100/30">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-tight mb-1">
                <span className="text-slate-500">Your Progress</span>
                <span className="text-emerald-700">
                  {userProgress}/{challenge.targetValue}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="bg-emerald-500 h-full rounded-full"
                />
              </div>
            </div>
          )}

          {/* FOOTER CREATOR FLAG & MAIN CTA ACTIONS */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
            <span className="text-[10px] font-medium text-slate-400 truncate">
              by{" "}
              <span className="font-semibold text-slate-700">
                {challenge.creatorName}
              </span>
            </span>

            {!isCreator && !isParticipant && challenge.isPublic && isActive && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJoin();
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-95 transition-all shadow-sm"
              >
                Join Team
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
