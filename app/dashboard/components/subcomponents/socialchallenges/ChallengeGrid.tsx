// app/dashboard/components/subcomponents/socialchallenges/ChallengeGrid.tsx
import { ChallengeCard } from "./ChallengeCard";
import { SkeletonChallengeCard } from "./SkeletonCard";
import { Inbox } from "lucide-react";
import { Challenge } from "@/app/types/challengetype";

interface ChallengeGridProps {
  challenges:
    | {
        ongoing: Challenge[];
        ended: Challenge[];
      }
    | null
    | undefined;
  user: any;
  isCreator: (challenge: Challenge) => boolean;
  isParticipant: (challenge: Challenge) => boolean;
  onJoin: (id: string, isPublic: boolean) => void;
  onView: (challenge: Challenge) => void;
  onLeave: (id: string) => void;
}

export function ChallengeGrid({
  challenges,
  user,
  isCreator,
  isParticipant,
  onJoin,
  onView,
  onLeave,
}: ChallengeGridProps) {
  /* ─── Skeleton ─────────────────────────────────────────── */
  if (!challenges) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-32 bg-emerald-100 animate-pulse rounded" />
          <div className="h-4 w-8 bg-emerald-50 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {[...Array(3)].map((_, i) => (
            <SkeletonChallengeCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const hasOngoing = challenges.ongoing?.length > 0;
  const hasEnded = challenges.ended?.length > 0;

  /* ─── Empty ────────────────────────────────────────────── */
  if (!hasOngoing && !hasEnded) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 px-4 bg-white border border-dashed border-emerald-200 rounded-2xl">
        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-3 text-emerald-500">
          <Inbox size={22} />
        </div>
        <h3 className="text-sm font-bold text-slate-900">
          No challenges found
        </h3>
        <p className="text-xs text-emerald-700/70 mt-1 max-w-[260px] leading-relaxed">
          We couldn't find matches for your filters. Try adjusting your search.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ongoing */}
      {hasOngoing && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">
              Ongoing Challenges
            </h2>
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
              {challenges.ongoing.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {challenges.ongoing.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                user={user}
                isCreator={isCreator(challenge)}
                isParticipant={isParticipant(challenge)}
                onJoin={() => onJoin(challenge.id, challenge.isPublic)}
                onView={() => onView(challenge)}
                onLeave={() => onLeave(challenge.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Ended */}
      {hasEnded && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-emerald-700/80">
              Ended Challenges
            </h2>
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">
              {challenges.ended.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 opacity-75 hover:opacity-100 transition-opacity duration-200">
            {challenges.ended.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                user={user}
                isCreator={isCreator(challenge)}
                isParticipant={isParticipant(challenge)}
                onJoin={() => onJoin(challenge.id, challenge.isPublic)}
                onView={() => onView(challenge)}
                onLeave={() => onLeave(challenge.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
