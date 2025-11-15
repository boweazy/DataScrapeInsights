// Beautiful loading skeletons with SFS theme
export function CardSkeleton() {
  return (
    <div className="bg-[#0D0D0D]/80 border border-[#FFD700]/20 rounded-lg p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-[#3B2F2F] rounded"></div>
        <div className="h-8 w-8 bg-[#3B2F2F] rounded-full"></div>
      </div>
      <div className="h-8 w-32 bg-[#FFD700]/20 rounded mb-2"></div>
      <div className="h-3 w-48 bg-[#3B2F2F] rounded"></div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-[#0D0D0D]/80 border border-[#FFD700]/20 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#3B2F2F] p-4 flex gap-4">
        <div className="h-4 w-32 bg-[#FFD700]/20 rounded"></div>
        <div className="h-4 w-24 bg-[#3B2F2F] rounded"></div>
        <div className="h-4 w-40 bg-[#3B2F2F] rounded"></div>
        <div className="h-4 w-20 bg-[#3B2F2F] rounded"></div>
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-[#3B2F2F]/50 p-4 flex gap-4 animate-pulse">
          <div className="h-3 w-32 bg-[#3B2F2F] rounded"></div>
          <div className="h-3 w-24 bg-[#3B2F2F] rounded"></div>
          <div className="h-3 w-40 bg-[#3B2F2F] rounded"></div>
          <div className="h-3 w-20 bg-[#3B2F2F] rounded"></div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-[#0D0D0D]/80 border border-[#FFD700]/20 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="h-5 w-40 bg-[#FFD700]/20 rounded animate-pulse"></div>
        <div className="flex gap-2">
          <div className="h-8 w-16 bg-[#3B2F2F] rounded animate-pulse"></div>
          <div className="h-8 w-16 bg-[#3B2F2F] rounded animate-pulse"></div>
        </div>
      </div>

      {/* Chart bars */}
      <div className="flex items-end justify-between h-64 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-gradient-to-t from-[#FFD700]/30 to-[#FFD700]/10 rounded-t animate-pulse"
            style={{
              height: `${Math.random() * 60 + 40}%`,
              animationDelay: `${i * 0.1}s`,
            }}
          ></div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="bg-[#0D0D0D]/60 border border-[#3B2F2F]/50 rounded-lg p-4 flex gap-4 animate-pulse"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <div className="h-12 w-12 bg-[#FFD700]/20 rounded-full flex-shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-[#3B2F2F] rounded"></div>
            <div className="h-3 w-1/2 bg-[#3B2F2F]/60 rounded"></div>
          </div>
          <div className="h-6 w-20 bg-[#3B2F2F] rounded"></div>
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
