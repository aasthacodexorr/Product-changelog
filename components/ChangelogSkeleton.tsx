interface Props {
  withActions?: boolean;
  monthCount?: number;
  cardsPerMonth?: number;
}

export function ChangelogSkeleton({
  withActions = false,
  monthCount = 2,
  cardsPerMonth = 2,
}: Props) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading updates">
      {Array.from({ length: monthCount }).map((_, mIdx) => (
        <section key={mIdx} className="mb-4">
          {/* Month Section Header Skeleton */}
          <div className="flex w-full items-center gap-2 border-b border-gray-300 py-2">
            <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
            <div
              className="h-6 rounded bg-gray-200 animate-pulse"
              style={{ width: mIdx === 0 ? '140px' : '160px' }}
            />
            <div className="ml-auto h-4 w-16 rounded bg-gray-200 animate-pulse" />
          </div>

          {/* Cards within Month */}
          <div className="mt-3 space-y-3">
            {Array.from({ length: cardsPerMonth }).map((_, cIdx) => (
              <div key={cIdx} className="rounded-lg border border-gray-200 bg-white p-4">
                {/* Date + Badges */}
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
                  <div className="h-4 w-24 rounded-full bg-gray-200 animate-pulse" />
                  {withActions && (
                    <div className="h-4 w-16 rounded-full bg-gray-200 animate-pulse" />
                  )}
                </div>

                {/* Title */}
                <div
                  className="mb-2 h-5 rounded bg-gray-200 animate-pulse"
                  style={{ width: cIdx % 2 === 0 ? '60%' : '75%' }}
                />

                {/* Product & Module Metadata */}
                <div
                  className="mb-3 h-3.5 rounded bg-gray-200 animate-pulse"
                  style={{ width: cIdx % 2 === 0 ? '40%' : '48%' }}
                />

                {/* Description lines */}
                <div className="space-y-1.5">
                  <div className="h-3.5 w-full rounded bg-gray-200 animate-pulse" />
                  <div className="h-3.5 w-5/6 rounded bg-gray-200 animate-pulse" />
                  <div className="h-3.5 w-2/3 rounded bg-gray-200 animate-pulse" />
                </div>

                {/* Action buttons (for Panel) or link */}
                {withActions ? (
                  <div className="mt-4 flex gap-2 pt-1 border-t border-gray-200">
                    <div className="h-7 w-16 rounded bg-gray-200 animate-pulse" />
                    <div className="h-7 w-12 rounded bg-gray-200 animate-pulse" />
                    <div className="h-7 w-14 rounded bg-gray-200 animate-pulse" />
                  </div>
                ) : (
                  <div className="mt-3">
                    <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
