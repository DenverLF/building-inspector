'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

  const active = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const cls = (href: string) =>
    `flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${active(href) ? 'text-[#1a1745]' : 'text-gray-400'}`

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="max-w-sm mx-auto flex items-center justify-around px-2 py-1">

        <Link href="/dashboard" className={cls('/dashboard')}>
          <svg className="w-5 h-5" fill={active('/dashboard') ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active('/dashboard') ? 0 : 2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-medium">Dashboard</span>
        </Link>

        <Link href="/dashboard/inspections" className={cls('/dashboard/inspections')}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active('/dashboard/inspections') ? 2.5 : 2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-[10px] font-medium">Inspections</span>
        </Link>

        {/* FAB */}
        <Link href="/dashboard/inspections/new" className="flex flex-col items-center -mt-5">
          <div className="w-13 h-13 w-[52px] h-[52px] rounded-full bg-[#1a1745] flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </Link>

        <Link href="/dashboard/map" className={cls('/dashboard/map')}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active('/dashboard/map') ? 2.5 : 2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="text-[10px] font-medium">Map</span>
        </Link>

        <Link href="/dashboard/more" className={cls('/dashboard/more')}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active('/dashboard/more') ? 2.5 : 2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-[10px] font-medium">More</span>
        </Link>

      </div>
    </nav>
  )
}
