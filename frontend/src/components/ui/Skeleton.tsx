import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-sm ${className}`} />;
}

export function BoardSkeleton() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-4">
      {[1, 2, 3, 4].map((col) => (
        <div
          key={col}
          className="w-[272px] shrink-0 rounded-sm bg-surface-column p-2"
        >
          <Skeleton className="mb-3 h-4 w-28" />
          <div className="space-y-2">
            {[1, 2, 3].map((card) => (
              <div
                key={card}
                className="rounded-sm bg-surface p-3 shadow-raised"
              >
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-3 w-2/3" />
                <div className="mt-3 flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
