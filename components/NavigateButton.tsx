'use client'

import { navigateToUrl, navigateToAddressUrl } from '@/lib/geo'

interface Props {
  lat?: number | null
  lng?: number | null
  address?: string | null
  compact?: boolean
}

export default function NavigateButton({ lat, lng, address, compact = false }: Props) {
  const url =
    lat != null && lng != null
      ? navigateToUrl(lat, lng)
      : address
      ? navigateToAddressUrl(address)
      : null

  if (!url) return null

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className={`inline-flex items-center gap-1.5 bg-[#1a1745] hover:bg-[#2d1f7a] text-white font-semibold rounded-xl transition-colors ${
        compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'
      }`}
    >
      <svg
        className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
        />
      </svg>
      Navigate
    </a>
  )
}
