export function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="bg-white/50 backdrop-blur-md p-8 text-center rounded-[24px] border border-slate-200/60 shadow-sm flex flex-col items-center justify-center max-w-lg mx-auto">
      <div className="w-14 h-14 bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200/50 rounded-2xl flex items-center justify-center shadow-2xs text-slate-400 mb-4 ring-4 ring-slate-100/40">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-slate-800 tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-xs text-slate-400 font-medium max-w-sm mb-5 leading-relaxed">
        {description}
      </p>
      {action && (
        <button
          onClick={action}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold uppercase tracking-wider text-[10px] shadow-md shadow-slate-900/5 transition-all active:scale-98"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
