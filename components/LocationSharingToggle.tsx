'use client'

import { useLocationSharing } from '@/hooks/useLocationSharing'

interface Props {
  fullName: string | null
}

export default function LocationSharingToggle({ fullName }: Props) {
  const { sharing, error, start, stop } = useLocationSharing(fullName)

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-xs font-semibold">Share my location</p>
          <p className="text-purple-300 text-xs mt-0.5">
            {sharing ? 'Visible to management · updates every minute' : 'Off · management cannot see you'}
          </p>
          {error && <p className="text-red-300 text-xs mt-0.5">{error}</p>}
        </div>
        <button
          onClick={sharing ? stop : start}
          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${sharing ? 'bg-green-400' : 'bg-white/20'}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${sharing ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
      </div>
      {sharing && (
        <div className="flex items-center gap-1.5 mt-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-300 text-xs font-medium">Sharing live location</span>
        </div>
      )}
    </div>
  )
}
