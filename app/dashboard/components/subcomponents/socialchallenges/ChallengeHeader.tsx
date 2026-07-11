import { HelpCircle } from "lucide-react";
import { cn } from "@/app/utils/utils";
import { bebasNeue } from "@/app/constants";

interface ChallengeHeaderProps {
  onHelp: () => void;
}

export function ChallengeHeader({ onHelp }: ChallengeHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 backdrop-blur-md p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-slate-200/60 shadow-sm transition-all">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.25em]">
            Challenge Sync Active
          </p>
        </div>
        <h1
          className={cn(
            "text-4xl md:text-5xl text-slate-900 tracking-tight leading-tight",
            bebasNeue.className,
          )}
        >
          Social{" "}
          <span className="text-emerald-600 drop-shadow-sm">Challenges</span>
        </h1>
      </div>

      <button
        onClick={onHelp}
        className="h-12 w-12 flex items-center justify-center bg-slate-50 hover:bg-emerald-50 rounded-2xl text-slate-400 hover:text-emerald-600 transition-all duration-200 border border-slate-100 active:scale-95"
        aria-label="Help and Documentation"
      >
        <HelpCircle size={20} className="stroke-[2.25]" />
      </button>
    </header>
  );
}
