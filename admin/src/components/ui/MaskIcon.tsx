import clsx from 'clsx'

/**
 * Figma 아이콘 SVG 를 mask 로 그려 글자색(currentColor)을 따르게 한다.
 * 활성/비활성 색을 아이콘 파일 하나로 표현하기 위함.
 */
export default function MaskIcon({ src, size = 20, flip, rotate, className }: {
  src: string
  size?: number
  /** Figma 원본이 좌우 반전된 아이콘 */
  flip?: boolean
  /** Figma 원본이 90° 회전된 아이콘 */
  rotate?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={clsx('block shrink-0 bg-current', flip && '-scale-x-100', rotate && 'rotate-90', className)}
      style={{
        width: size,
        height: size,
        WebkitMaskImage: `url("${src}")`,
        maskImage: `url("${src}")`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskSize: '100% 100%',
        maskSize: '100% 100%',
      }}
    />
  )
}
