import { createClient } from '@/lib/supabase/server'
import { getInitials } from '@/lib/inspectors'
import Link from 'next/link'
import type { Profile } from '@/lib/types'

export default async function DashboardPage() {
  let p: Profile | null = null
  let todayCount = 0
  let weekCount = 0
  let overdueCount = 0
  let pendingCount = 0

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      p = data as Profile | null
    }

    const today = new Date().toISOString().split('T')[0]
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekStartStr = weekStart.toISOString().split('T')[0]

    const { data: tasks } = await supabase
      .from('tasks')
      .select('due_date, status')
      .neq('status', 'completed')

    if (tasks) {
      for (const t of tasks) {
        if (t.status !== 'completed') pendingCount++
        if (t.due_date === today) todayCount++
        if (t.due_date && t.due_date >= weekStartStr && t.due_date <= today) weekCount++
        if (t.due_date && t.due_date < today) overdueCount++
      }
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
          <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/dashboard/tasks?tab=Due+Today">
            <div className="bg-blue-50 rounded-2xl p-4 h-full">
              <div className="flex items-start justify-between mb-2">
                <span className="text-3xl font-bold text-blue-700 leading-none">{todayCount}</span>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-blue-600 text-xs font-semibold">Due Today</p>
            </div>
          </Link>

          <Link href="/dashboard/tasks">
            <div className="bg-green-50 rounded-2xl p-4 h-full">
              <div className="flex items-start justify-between mb-2">
                <span className="text-3xl font-bold text-green-700 leading-none">{pendingCount}</span>
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <p className="text-green-600 text-xs font-semibold">Open Tasks</p>
            </div>
          </Link>

          <Link href="/dashboard/tasks">
            <div className="bg-orange-50 rounded-2xl p-4 h-full">
              <div className="flex items-start justify-between mb-2">
                <span className="text-3xl font-bold text-orange-700 leading-none">{weekCount}</span>
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <p className="text-orange-600 text-xs font-semibold">This Week</p>
            </div>
          </Link>

          <Link href="/dashboard/tasks?tab=Overdue">
            <div className="bg-red-50 rounded-2xl p-4 h-full">
              <div className="flex items-start justify-between mb-2">
                <span className="text-3xl font-bold text-red-600 leading-none">{overdueCount}</span>
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <p className="text-red-500 text-xs font-semibold">Overdue</p>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-900 text-sm mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/dashboard/tasks/new" className="flex items-center gap-2 p-3 bg-[#1a1745] text-white rounded-xl">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-xs font-semibold">New Task</span>
            </Link>
            <Link href="/dashboard/tasks" className="flex items-center gap-2 p-3 bg-gray-50 text-gray-700 rounded-xl border border-gray-100">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-xs font-semibold">All Tasks</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
