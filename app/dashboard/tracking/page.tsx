'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'

const TrackingView = dynamic(() => import('./_TrackingView'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#1a1745] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading tracker…</p>
      </div>
    </div>
  ),
})

export default function TrackingPage() {
  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      <div className="bg-[#1a1745] px-5 pt-10 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/more" className="text-purple-300 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-white text-xl font-bold">Inspector Tracking</h1>
              <p className="text-purple-300 text-xs mt-0.5">Live positions · refreshes every 30 s</p>
            </div>
          </div>
          <Link href="/dashboard/map" className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors">
            Sites Map
          </Link>
        </div>
      </div>

      <div className="flex-1 relative">
        <TrackingView />
      </div>
    </div>
  )
}
