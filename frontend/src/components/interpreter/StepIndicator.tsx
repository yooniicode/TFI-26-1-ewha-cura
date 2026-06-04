interface StepIndicatorProps {
  current: number
  total: number
}

export default function StepIndicator({ current, total }: StepIndicatorProps) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: total }, (_, i) => i + 1).map(n => {
        const done = n < current
        const active = n === current
        return (
          <div
            key={n}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
              active
                ? 'bg-[#2592FF] text-white'
                : done
                  ? 'bg-[#f3f9ff]'
                  : 'bg-[#F7F7F7] text-[#808080]'
            }`}
          >
            {done ? (
              <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                <path d="M1 4.5L4.5 8L11 1" stroke="#2592FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : n}
          </div>
        )
      })}
    </div>
  )
}
