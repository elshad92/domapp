export function SkeletonCard() {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 bg-gray-200 rounded" />
        <div className="w-16 h-5 bg-gray-200 rounded-full" />
      </div>
      <div className="w-12 h-8 bg-gray-200 rounded mt-2" />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
      <div className="bg-gray-50 px-4 py-3 border-b">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded flex-1" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-4 border-t">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-4 bg-gray-100 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonList({ rows = 3 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white p-4 rounded-xl shadow-sm">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-2/3" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonLine({ width = '100%', height = 'h-4' }) {
  return (
    <div className={`${height} bg-gray-200 rounded animate-pulse`} style={{ width }} />
  )
}
