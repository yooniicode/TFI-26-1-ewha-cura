// 전체 화면 중앙 고정 로딩 스피너 — cura.svg + 브랜드 색상 그라디언트 아크 링

export default function CuraSpinner({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-[#F5F5F5]">
      <div className="relative w-[72px] h-[72px] flex items-center justify-center">
        {/* 배경 트랙 링 */}
        <svg className="absolute inset-0" viewBox="0 0 72 72" fill="none">
          <circle cx="36" cy="36" r="30" stroke="#E5E5E5" strokeWidth="3" />
        </svg>

        {/* 회전하는 그라디언트 아크 */}
        <svg
          className="absolute inset-0 animate-spin"
          viewBox="0 0 72 72"
          fill="none"
          style={{ animationDuration: '1.1s', animationTimingFunction: 'linear' }}
        >
          <defs>
            <linearGradient id="curaArcGrad" x1="0" y1="0" x2="72" y2="72" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2592FF" />
              <stop offset="100%" stopColor="#30C100" />
            </linearGradient>
          </defs>
          {/* 원둘레 ≈ 188.5, 28%만 표시 */}
          <circle
            cx="36" cy="36" r="30"
            stroke="url(#curaArcGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="53 136"
          />
        </svg>

        {/* cura 로고 */}
        <img
          src="/icons/cura.svg"
          alt=""
          width={48}
          height={48}
          className="relative z-10 rounded-[12px]"
        />
      </div>

      {message && (
        <p className="text-[14px] text-[#808080]">{message}</p>
      )}
    </div>
  )
}
