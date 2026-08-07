import { motion } from "framer-motion";
import { Trophy, Globe, Lock, Target, Users } from "lucide-react";
import { activityOptions } from "@/app/types/challengeConstant";
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
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="bg-white border border-slate-200/80 rounded-[28px] shadow-sm hover:shadow-xl hover:border-emerald-500/30 transition-all overflow-hidden cursor-pointer flex flex-col group relative"
      onClick={onView}
    >
      {/* CARD BANNER CONTAINER */}
      <div className="h-40 w-full overflow-hidden relative bg-slate-900">
        {challenge.imageUrl ? (
          <img
            src={challenge.imageUrl}
            alt={challenge.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-emerald-500/30" />
          </div>
        )}

        {/* SUBTLE GRADIENT OVERLAY */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/20" />

        {/* TOP STATUS OVERLAYS */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2">
            {isActive ? (
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white px-3 py-1 rounded-full shadow-md backdrop-blur-md">
                {daysLeft}d left
              </span>
            ) : now < start ? (
              <span className="text-[10px] font-black uppercase tracking-wider bg-sky-500 text-white px-3 py-1 rounded-full shadow-md backdrop-blur-md">
                Starts soon
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-wider bg-slate-700 text-white px-3 py-1 rounded-full shadow-md backdrop-blur-md">
                Ended
              </span>
            )}

            {isCreator && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full backdrop-blur-md">
                Creator
              </span>
            )}
            {isParticipant && !isCreator && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full backdrop-blur-md">
                Joined
              </span>
            )}
          </div>

          <div className="w-8 h-8 bg-white/90 backdrop-blur-md rounded-full shadow-md flex items-center justify-center">
            {challenge.isPublic ? (
              <Globe className="w-4 h-4 text-emerald-600" />
            ) : (
              <Lock className="w-4 h-4 text-slate-700" />
            )}
          </div>
        </div>
      </div>

      {/* BODY CONTENT */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100/60 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
              {activity?.label || challenge.activity}
            </span>
          </div>

          <h3 className="font-bold text-slate-900 text-lg line-clamp-1 group-hover:text-emerald-600 transition-colors">
            {challenge.name}
          </h3>

          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
            {challenge.description}
          </p>
        </div>

        <div className="space-y-4">
          {/* STATS MATRIX SECTION */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-200/60 text-emerald-600">
                <Target className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">
                <strong className="text-slate-900 font-bold">
                  {challenge.targetValue}
                </strong>{" "}
                <span className="text-[10px] text-slate-400 font-semibold">
                  {challenge.targetUnit}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-200/60 text-emerald-600">
                <Users className="w-3.5 h-3.5" />
              </div>
              <span>
                <strong className="text-slate-900 font-bold">
                  {challenge.participantCount}
                </strong>{" "}
                <span className="text-[10px] text-slate-400 font-semibold">
                  entered
                </span>
              </span>
            </div>
          </div>

          {/* PROGRESS SLIDER OVERLAY */}
          {isParticipant && typeof rawProgress === "number" && (
            <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100/60 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Your Progress</span>
                <span className="text-emerald-700">
                  {userProgress} / {challenge.targetValue}
                </span>
              </div>
              <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
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
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium truncate">
              <span>by</span>
              <span className="font-bold text-slate-700 truncate">
                {challenge.creatorName}
              </span>
            </div>

            {!isCreator && !isParticipant && challenge.isPublic && isActive && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJoin();
                }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl active:scale-95 transition-all shadow-md hover:shadow-lg"
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
