import { Skeleton, SkeletonLine } from "./Skeleton";

export function SidebarSkeleton() {
  return (
    <aside className="w-72 bg-neutral-950 border-r border-white/5 flex flex-col animate-pulse">
      <div className="p-4 border-b border-white/5">
        <Skeleton className="h-10 rounded-xl w-full" />
      </div>
      <div className="px-3 pt-3 space-y-1">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 rounded-lg w-full" />
        ))}
      </div>
      <div className="flex-1 px-3 py-2 space-y-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-2.5 px-3 py-2.5">
            <Skeleton className="w-3.5 h-3.5 rounded" />
            <SkeletonLine width="w-3/4" />
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-white/5">
        <Skeleton className="h-10 rounded-lg w-full" />
      </div>
    </aside>
  );
}

export function ChatMessagesSkeleton() {
  return (
    <div className="flex-1 flex flex-col bg-neutral-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-7 h-7 rounded-lg" />
          <div className="space-y-1">
            <SkeletonLine width="w-24" />
            <SkeletonLine width="w-12" />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden px-4 sm:px-6 py-6">
        <div className="space-y-6">
          {/* AI message skeleton */}
          <div className="flex items-start gap-3">
            <Skeleton className="w-8 h-8 rounded-xl flex-shrink-0" />
            <div className="space-y-2 max-w-[65%]">
              <Skeleton className="h-24 rounded-2xl rounded-bl-md w-full" />
              <SkeletonLine width="w-16" />
            </div>
          </div>

          {/* User message skeleton */}
          <div className="flex items-start gap-3 justify-end">
            <div className="space-y-2 max-w-[65%]">
              <Skeleton className="h-12 rounded-2xl rounded-br-md w-full" />
              <SkeletonLine width="w-16" />
            </div>
            <Skeleton className="w-8 h-8 rounded-xl flex-shrink-0" />
          </div>

          {/* Typing skeleton */}
          <div className="flex items-start gap-3">
            <Skeleton className="w-8 h-8 rounded-xl flex-shrink-0" />
            <Skeleton className="h-10 rounded-2xl rounded-bl-md w-20" />
          </div>
        </div>
      </div>

      {/* Input skeleton */}
      <div className="px-4 sm:px-6 py-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 rounded-2xl w-full" />
        </div>
      </div>
    </div>
  );
}

export function ChatPageSkeleton() {
  return (
    <div className="flex h-[calc(100vh-4rem)] pt-16 bg-neutral-950">
      <SidebarSkeleton />
      <ChatMessagesSkeleton />
    </div>
  );
}
