import { Calendar, UserCheck } from "lucide-react";

interface RequestCardProps {
  request: {
    id: string;
    challengeId: string;
    userId: string;
    name: string;
    photo?: string;
    challengeName: string;
    requestedAt: number;
  };
  onApprove: () => void;
}

export function RequestCard({ request, onApprove }: RequestCardProps) {
  return (
    <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs hover:border-slate-300/80 transition-all flex items-center justify-between gap-4 group">
      <div className="flex items-center gap-3 min-w-0">
        {/* User Identity Avatar Profile */}
        <div className="relative shrink-0">
          {request.photo ? (
            <img
              src={request.photo}
              alt={request.name}
              className="w-9 h-9 rounded-xl object-cover ring-2 ring-slate-100"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center shadow-3xs uppercase">
              {request.name?.charAt(0) || "?"}
            </div>
          )}
        </div>

        {/* Narrative Flow Meta Description */}
        <div className="min-w-0 flex flex-col">
          <p className="text-xs font-bold text-slate-800 truncate leading-snug">
            {request.name}
          </p>
          <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
            Wants to join{" "}
            <span className="font-bold text-slate-600">
              &ldquo;{request.challengeName}&rdquo;
            </span>
          </p>
          <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-slate-400 tracking-wider uppercase">
            <Calendar className="w-2.5 h-2.5 text-slate-300" />
            <span>
              {new Date(request.requestedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Verification Interaction Trigger */}
      <button
        onClick={onApprove}
        className="flex items-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200/50 hover:border-transparent text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-3xs shrink-0 active:scale-95"
      >
        <UserCheck className="w-3 h-3" />
        <span>Approve</span>
      </button>
    </div>
  );
}
