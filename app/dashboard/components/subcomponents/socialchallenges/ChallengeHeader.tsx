// app/dashboard/components/subcomponents/socialchallenges/ChallengeHeader.tsx
import { HelpCircle } from "lucide-react";
import { cn } from "@/app/utils/utils";

interface ChallengeHeaderProps {
  onHelp: () => void;
}

export function ChallengeHeader({ onHelp }: ChallengeHeaderProps) {
  return (
    <header className="pt-1 lg:pt-2 flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
            Social Challenges
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md">
            Join groups, compete with friends, and stay active together.
          </p>
        </div>

        <button
          onClick={onHelp}
          className={cn(
            "inline-flex items-center justify-center gap-2 min-h-11 px-4 bg-white text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-all shrink-0",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2",
          )}
          aria-label="Help and Documentation"
        >
          <HelpCircle size={15} />
          <span>Help</span>
        </button>
      </div>
    </header>
  );
}
