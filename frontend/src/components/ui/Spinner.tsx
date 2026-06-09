export default function Spinner() {
  return (
    <div className="flex justify-center items-center py-16">
      <div className="relative w-[60px] h-[60px] flex items-center justify-center">
        <svg className="absolute inset-0" viewBox="0 0 60 60" fill="none">
          <circle cx="30" cy="30" r="25" stroke="#E5E5E5" strokeWidth="3" />
        </svg>
        <svg
          className="absolute inset-0 animate-spin"
          viewBox="0 0 60 60"
          fill="none"
          style={{ animationDuration: '1.1s', animationTimingFunction: 'linear' }}
        >
          <defs>
            <linearGradient id="spinnerGrad" x1="0" y1="0" x2="60" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2592FF" />
              <stop offset="100%" stopColor="#30C100" />
            </linearGradient>
          </defs>
          {/* 원둘레 ≈ 157, 28%만 표시 */}
          <circle
            cx="30" cy="30" r="25"
            stroke="url(#spinnerGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="44 113"
          />
        </svg>
        <img src="/icons/cura.svg" alt="" width={38} height={38} className="relative z-10 rounded-[9px]" />
      </div>
    </div>
  )
}
