import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      // Figma 디자인 토큰 (뽀용뽀용 · 관리자)
      colors: {
        brand: {
          blue: '#2592FF',
          green: '#30C100',
          'blue-bg': '#F3F9FF',
        },
        ink: {
          DEFAULT: '#161616',
          grey: '#494949',
          grey2: '#808080',
        },
        line: {
          DEFAULT: '#EEEEEE',
          grey2: '#A1A1A1',
          input: '#E0E5EB',
        },
        surface: {
          sidebar: '#F9FBFF',
          card: '#F5F6F8',
          muted: '#F7F7F7',
          'nav-active': '#DCEDFF',
        },
        // 컴포넌트관리 › 상태 뱃지
        status: {
          'orange-bg': '#FFF3E0', orange: '#E65100',
          'red-bg': '#FDE8E8',    red: '#C0392B',
          'sky-bg': '#E8F4FD',    sky: '#1A6A9A',
          'teal-bg': '#E1F5EE',   teal: '#0F6E56',
          'indigo-bg': '#EEF2FF', indigo: '#3730A3',
        },
        pagination: {
          text: '#666E7A',
        },
        // 매칭관리 › 툴바 · 표 · 모달
        chip: { bg: '#E8F5FF', text: '#1C70D9' },
        table: { name: '#1A1F26' },
        modal: {
          title: '#171C26',
          sub: '#737A87',
          label: '#99A1AB',
          value: '#262B33',
          button: '#59616E',
        },
        danger: { bg: '#FFE5E5', text: '#E72D2D' },
        toast: { bg: '#F6FFF3', danger: '#FFECEC' },
        // 보고서 › 반려 버튼 · 기간 드롭다운 · 탭
        point: { red: '#FF1515' },
        'button-bluegrey': '#F0F1F5',
        period: {
          divider: '#EBEDF2',
          label: '#808791',
          'input-bg': '#F7F9FA',
          'input-text': '#404752',
        },
      },
      keyframes: {
        toast: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '10%':  { opacity: '1', transform: 'translateY(0)' },
          '85%':  { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(0)' },
        },
      },
      animation: {
        toast: 'toast 3s ease-out forwards',
      },
      boxShadow: {
        modal: '0px 12px 32px 0px rgba(13,15,20,0.18)',
        toast: '0px 0px 10px 0px #E6EEFA',
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
