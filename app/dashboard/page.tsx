import { createClient } from '@/lib/supabase/server'
import { getInitials } from '@/lib/inspectors'
import type { Profile } from '@/lib/types'

const schedule = [
  { time: '09:00', address: '123 Main Street', type: 'Residential • Foundation' },
  { time: '11:00', address: '456 Oak Avenue', type: 'Commercial • Electrical' },
  { time: '14:00', address: '789 Pine Road', type: 'Residential • Final' },
]

export default async function DashboardPage() {
  let p: Profile | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      p = data as Profile | null
    }
  } catch { /* show page with defaults if Supabase unavailable */ }

  const initials = getInitials(p?.full_name)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1a1745] px-5 pt-10 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Welcome, {p?.full_name ?? 'Inspector'}</p>
              <p className="text-purple-300 text-xs capitalize">{p?.role ?? 'Inspector'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-purple-200 hover:bg-white/20 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-2xl p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-3xl font-bold text-blue-700 leading-none">5</span>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
            </div>
            <p className="text-blue-600 text-xs font-semibold">Today&apos;s Inspections</p>
          </div>

          <div className="bg-green-50 rounded-2xl p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-3xl font-bold text-green-700 leading-none">12</span>
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-green-600 text-xs font-semibold">This Week</p>
          </div>

          <div className="bg-orange-50 rounded-2xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="leading-none">
                <span className="text-2xl font-bold text-orange-700">320</span>
                <span className="text-base font-bold text-orange-600"> km</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-orange-600 text-xs font-semibold">This Month</p>
          </div>

          <div className="bg-red-50 rounded-2xl p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-3xl font-bold text-red-600 leading-none">3</span>
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <p className="text-red-500 text-xs font-semibold">Overdue</p>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-gray-900 text-sm">Today&apos;s Schedule</h2>
            <button className="text-[#1a1745] text-xs font-semibold">View All</button>
          </div>

          <div className="space-y-4">
            {schedule.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-[#1a1745] font-bold text-sm w-11 flex-shrink-0 pt-0.5">{item.time}</span>
                <div className="w-px self-stretch bg-gray-100" />
                <div>
                  <p className="text-gray-900 font-semibold text-sm">{item.address}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{item.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
