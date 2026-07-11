import { motion } from "framer-motion";
import { cn } from "@/app/utils/utils";
import { bebasNeue } from "@/app/constants";
import { Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { useState } from "react";

export function JoinCodeModal({
  code,
  onCodeChange,
  onJoin,
  onClose,
}: {
  code: string;
  onCodeChange: (v: string) => void;
  onJoin: () => Promise<boolean>;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleJoinSubmit = async () => {
    setLoading(true);
    try {
      await onJoin();
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        transition={{ type: "spring", damping: 25 }}
        className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.15)] border border-slate-200/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dynamic Context Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl border border-amber-100/50 flex items-center justify-center shadow-3xs text-amber-600 mb-3">
            <Lock className="w-5 h-5 stroke-[2.5]" />
          </div>
          <h2
            className={cn(
              "text-2xl font-bold text-slate-800 tracking-wide",
              bebasNeue.className,
            )}
          >
            Access Private Arena
          </h2>
          <p className="text-xs text-slate-400 font-medium max-w-[240px] mt-1 leading-normal">
            Input the direct synchronization passcode issued by the campaign
            manager.
          </p>
        </div>

        {/* Input Controller Frame */}
        <div className="relative mb-4 group">
          <input
            type="text"
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="PRO-CHALLENGE"
            className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none font-black uppercase tracking-widest text-center text-slate-800 placeholder:text-slate-300 placeholder:font-semibold"
          />
        </div>

        {/* Action Panel Button Split */}
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleJoinSubmit}
            disabled={loading || !code.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm active:scale-98"
          >
            <span>Authenticate</span>
            <ArrowRight className="w-3 h-3 stroke-[2.5]" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
