import { HelpCircle, Sparkles } from "lucide-react";
import { cn } from "@/app/utils/utils";
import { bebasNeue } from "@/app/constants";

interface ChallengeHeaderProps {
  onHelp: () => void;
}

export function ChallengeHeader({ onHelp }: ChallengeHeaderProps) {
  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50/80 to-emerald-50/30 backdrop-blur-xl p-6 md:p-8 rounded-[32px] border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.02)] transition-all">
      {/* Subtle Ambient Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-extrabold text-emerald-700 uppercase tracking-[0.2em]">
              <Sparkles size={10} className="text-emerald-500 animate-pulse" />
              Challenge Sync Active
            </span>
          </div>

          <h1
            className={cn(
              "text-4xl md:text-5xl text-slate-900 tracking-tight leading-tight",
              bebasNeue.className,
            )}
          >
            Social{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 drop-shadow-sm">
              Challenges
            </span>
          </h1>
        </div>

        <button
          onClick={onHelp}
          className="group relative h-12 w-12 flex items-center justify-center bg-white hover:bg-emerald-500 rounded-2xl text-slate-500 hover:text-white transition-all duration-300 border border-slate-200/80 hover:border-emerald-500 shadow-sm hover:shadow-md hover:shadow-emerald-500/20 active:scale-95"
          aria-label="Help and Documentation"
        >
          <HelpCircle
            size={20}
            className="stroke-[2.25] transition-transform duration-300 group-hover:rotate-12"
          />
        </button>
      </div>
    </header>
  );
}
