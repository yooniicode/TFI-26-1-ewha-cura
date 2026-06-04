import Link from 'next/link'

interface CenterSummary {
  id: string
  name: string
  address?: string | null
}

async function fetchCenters(): Promise<CenterSummary[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
    const res = await fetch(`${apiUrl}/api/v1/centers?page=0&size=100`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.payload ?? []) as CenterSummary[]
  } catch {
    return []
  }
}

export default async function LandingPage() {
  const centers = await fetchCenters()

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-lg mx-auto">

      {/* 상단 헤더 */}
      <header className="px-6 pt-10 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#2592FF] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <span className="text-xl font-bold text-[#161616]">LinkUs</span>
        </div>
        <Link
          href="/login"
          className="text-sm font-semibold text-[#2592FF] hover:underline"
        >
          로그인
        </Link>
      </header>

      {/* 히어로 */}
      <section className="px-6 pt-8 pb-10">
        <p className="text-sm font-medium text-[#2592FF] mb-2">진료 통역 기록 지원</p>
        <h1 className="text-[32px] font-bold text-[#161616] leading-[1.3] mb-3">
          진료 전후에 필요한 내용을<br />
          <span className="text-[#2592FF]">간단하게 정리</span>해요
        </h1>
        <p className="text-base text-[#808080] leading-relaxed">
          이주민은 진료 기록과 의료 대본을 확인하고,<br />
          통번역가는 메모와 보고서를 남길 수 있어요.
        </p>
      </section>

      {/* 역할 카드 */}
      <section className="px-6 pb-8 space-y-3">
        <p className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-3">사용 유형을 선택해주세요</p>

        <Link href="/login" className="flex items-center gap-4 bg-[#F3F9FF] border border-[#D1E8FF] rounded-2xl px-5 py-5 hover:bg-[#e8f4ff] active:bg-[#dceeff] transition-colors">
          <div className="w-12 h-12 rounded-xl bg-[#2592FF] flex items-center justify-center shrink-0">
            <img src="/icons/immigrant/home/의료통번역.svg" alt="" width={22} height={22} style={{ filter: 'brightness(0) invert(1)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-[#161616]">이주민</p>
            <p className="text-sm text-[#808080] mt-0.5">진료 기록 · 의료 대본 · 긴급 전화 · 채팅</p>
          </div>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="shrink-0">
            <path d="M1 1l6 6-6 6" stroke="#2592FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <Link href="/login" className="flex items-center gap-4 bg-[#F5F5F5] border border-[#EEEEEE] rounded-2xl px-5 py-5 hover:bg-[#ececec] active:bg-[#e4e4e4] transition-colors">
          <div className="w-12 h-12 rounded-xl bg-[#494949] flex items-center justify-center shrink-0">
            <img src="/icons/interpreter/home/실시간메모작성.svg" alt="" width={20} height={20} style={{ filter: 'brightness(0) invert(1)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-[#161616]">통번역가</p>
            <p className="text-sm text-[#808080] mt-0.5">실시간 메모 · 보고서 · 담당 환자 · 일정</p>
          </div>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="shrink-0">
            <path d="M1 1l6 6-6 6" stroke="#494949" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </section>

      {/* 참여 센터 */}
      {centers.length > 0 && (
        <section className="px-6 pb-8">
          <p className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-3">참여 센터</p>
          <div className="space-y-2">
            {centers.map(center => (
              <div key={center.id} className="flex items-center gap-3 bg-[#F5F5F5] rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-[#DEE2FF] flex items-center justify-center text-sm font-bold text-indigo-700 shrink-0">
                  {center.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#161616] truncate">{center.name}</p>
                  {center.address && <p className="text-xs text-[#A0A0A0] truncate">{center.address}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA 버튼 */}
      <div className="px-6 pb-12 mt-auto">
        <Link
          href="/login"
          className="flex items-center justify-center w-full h-[60px] bg-[#2592FF] rounded-2xl text-lg font-bold text-white hover:bg-[#1a7ee6] active:bg-[#1568c7] transition-colors"
        >
          로그인 또는 회원가입
        </Link>
        <p className="text-center text-xs text-[#A0A0A0] mt-3">
          이주민 또는 통번역가 계정으로 이용할 수 있어요
        </p>
      </div>

      {/* 푸터 */}
      <footer className="border-t border-[#EEEEEE] py-5 text-center text-xs text-[#C0C0C0]">
        © 2026 LinkUs 진료 통역 기록 서비스
      </footer>
    </div>
  )
}
