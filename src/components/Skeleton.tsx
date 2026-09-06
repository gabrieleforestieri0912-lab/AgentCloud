type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-neutral-800/50 rounded-lg ${className}`}
    />
  );
}

export function SkeletonCircle({ size = "w-8 h-8" }: { size?: string }) {
  return <Skeleton className={`rounded-full ${size}`} />;
}

export function SkeletonLine({ width = "w-full" }: { width?: string }) {
  return <Skeleton className={`h-3 ${width}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-neutral-900 border border-white/5 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2 flex-1">
          <SkeletonLine width="w-1/3" />
          <SkeletonLine width="w-1/2" />
        </div>
      </div>
      <SkeletonLine />
      <SkeletonLine width="w-3/4" />
      <SkeletonLine width="w-1/2" />
    </div>
  );
}
