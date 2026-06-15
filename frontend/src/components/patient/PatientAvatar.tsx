import Image from 'next/image'
import type { Gender } from '@/lib/types'

type Size = 'sm' | 'md' | 'lg'

const SIZE_MAP: Record<Size, { px: number; iconSuffix: 'small' | 'big' }> = {
  sm: { px: 20, iconSuffix: 'small' },
  md: { px: 36, iconSuffix: 'small' },
  lg: { px: 56, iconSuffix: 'big' },
}

interface Props {
  avatarUrl?: string | null
  gender?: Gender | null
  size?: Size
  className?: string
}

export default function PatientAvatar({ avatarUrl, gender, size = 'md', className = '' }: Props) {
  const { px, iconSuffix } = SIZE_MAP[size]

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={px}
        height={px}
        className={`rounded-full object-cover ${className}`}
        unoptimized
        style={{ width: px, height: px }}
      />
    )
  }

  const genderIcon = gender === 'FEMALE'
    ? `/icons/common/gender/${iconSuffix}-여성-배경o.svg`
    : `/icons/common/gender/${iconSuffix}-남성-배경o.svg`

  return (
    <Image
      src={genderIcon}
      alt=""
      width={px}
      height={px}
      className={className}
    />
  )
}
