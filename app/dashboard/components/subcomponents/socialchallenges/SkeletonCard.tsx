export function SkeletonChallengeCard() {
  return (
    <div className="bg-white/80 border border-slate-200/60 rounded-[24px] shadow-2xs overflow-hidden flex flex-col h-[280px]">
      {/* Simulation Banner Asset Header */}
      <div className="h-24 bg-gradient-to-r from-slate-100 via-slate-200/70 to-slate-100 animate-pulse border-b border-slate-100 shrink-0" />

      {/* Content Meta Body Elements */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-2.5">
          <div className="flex justify-between items-start gap-4">
            <div className="h-4 w-3/4 bg-slate-200 animate-pulse rounded-md" />
            <div className="h-4 w-4 bg-slate-200 animate-pulse rounded-md shrink-0" />
          </div>
          <div className="space-y-1.5">
            <div className="h-2.5 w-full bg-slate-100 animate-pulse rounded-sm" />
            <div className="h-2.5 w-5/6 bg-slate-100 animate-pulse rounded-sm" />
          </div>
          {/* Simulation Badges Group Array */}
          <div className="flex gap-1.5 pt-1">
            <div className="h-5 w-14 bg-slate-100 animate-pulse rounded-lg" />
            <div className="h-5 w-16 bg-slate-100 animate-pulse rounded-lg" />
          </div>
        </div>

        {/* Lower Metadata Metric Row */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100/60">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 bg-slate-200 animate-pulse rounded-lg" />
            <div className="h-2.5 w-12 bg-slate-200 animate-pulse rounded-sm" />
          </div>
          <div className="h-6 w-16 bg-slate-100 animate-pulse rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/40 space-y-3.5 flex flex-col items-center md:items-start w-full">
      {/* Simulation Dynamic Icon Holder */}
      <div className="p-1.5 bg-white rounded-lg border border-slate-100 shadow-3xs w-7 h-7 animate-pulse flex items-center justify-center">
        <div className="w-full h-full bg-slate-200 rounded-sm" />
      </div>
      {/* Text Label Simulation Blocks */}
      <div className="space-y-1.5 w-full flex flex-col items-center md:items-start">
        <div className="h-2 w-10 bg-slate-200/80 animate-pulse rounded-xs" />
        <div className="h-5 w-14 bg-slate-300 animate-pulse rounded-md" />
      </div>
    </div>
  );
}
