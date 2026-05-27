import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'
import type { Profile } from '@/lib/types'

const stats = [
  { label: 'Tasks Due Today', value: '—', color: 'bg-blue-50 text-blue-700', icon: '📋' },
  { label: 'Overdue Tasks', value: '—', color: 'bg-red-50 text-red-700', icon: '⚠️' },
  { label: 'Inspections This Month', value: '—', color: 'bg-green-50 text-green-700', icon: '🏗️' },
  { label: 'km This Month', value: '—', color: 'bg-purple-50 text-purple-700', icon: '🚗' },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  return (
    <>
      <Header profile={profile as Profile | null} title="Dashboard" />

      <main className="flex-1 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{stat.icon}</span>
                <span className={`text-2xl font-bold ${stat.color} px-2 py-0.5 rounded-lg`}>
                  {stat.value}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Recent Tasks</h3>
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Tasks will appear here — coming in Phase 2
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Recent Inspections</h3>
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Inspections will appear here — coming in Phase 3
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
