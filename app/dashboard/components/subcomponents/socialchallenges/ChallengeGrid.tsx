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
  // 1. Loading Skeleton State
  if (!challenges) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="h-4 w-36 bg-slate-200 animate-pulse rounded-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <SkeletonChallengeCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasOngoing = challenges.ongoing?.length > 0;
  const hasEnded = challenges.ended?.length > 0;

  // 2. Empty Filter/Search Results State
  if (!hasOngoing && !hasEnded) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-12 bg-slate-50/50 border border-dashed border-slate-200 rounded-[24px]">
        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 mb-3 text-slate-400">
          <Inbox size={24} />
        </div>
        <h3 className="text-sm font-bold text-slate-800">
          No challenges found
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-[260px]">
          We couldn't find matches matching your criteria. Try adjusting your
          search filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Ongoing Section */}
      {hasOngoing && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 tracking-wide flex items-center gap-2 uppercase">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            Ongoing Challenges
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
        </div>
      )}

      {/* Ended Section */}
      {hasEnded && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-500 tracking-wide flex items-center gap-2 uppercase">
            <span className="w-1.5 h-4 bg-slate-300 rounded-full" />
            Ended Challenges
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 opacity-70 filter grayscale-[20%] hover:opacity-90 transition-opacity duration-300">
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
        </div>
      )}
    </div>
  );
}
