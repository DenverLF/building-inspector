import { createClient } from '@/lib/supabase/server'
import { INSPECTORS, getInitials, slugify } from '@/lib/inspectors'
import Link from 'next/link'

const GRADIENTS = [
  'from-pink-400 to-purple-600',
  'from-blue-400 to-cyan-500',
  'from-green-400 to-emerald-600',
  'from-orange-400 to-red-500',
  'from-yellow-400 to-orange-500',
  'from-violet-400 to-indigo-600',
  'from-teal-400 to-cyan-600',
]

export default async function InspectorsPage() {
  const stats: Record<string, { total: number; pass: number; km: number }> = {}

  try {
    const supabase = await createClient()
    const today = new Date()
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().split('T')[0]

    const [inspRes, kmRes] = await Promise.all([
      supabase.from('inspections').select('inspector_name, outcome'),
      supabase.from('km_logs').select('inspector_name, distance_km').gte('trip_date', monthStart).lt('trip_date', nextMonth),
    ])

    for (const i of inspRes.data ?? []) {
      const n = i.inspector_name ?? ''
      if (!stats[n]) stats[n] = { total: 0, pass: 0, km: 0 }
      stats[n].total++
      if (i.outcome === 'pass') stats[n].pass++
    }
    for (const k of kmRes.data ?? []) {
      const n = k.inspector_name ?? ''
      if (!stats[n]) stats[n] = { total: 0, pass: 0, km: 0 }
      stats[n].km += Number(k.distance_km)
    }
  } catch { /* defaults */ }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1a1745] px-5 pt-10 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/more" className="text-purple-300 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-white text-xl font-bold">Inspectors</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3 pb-8">
        {INSPECTORS.map((name, idx) => {
          const s = stats[name] ?? { total: 0, pass: 0, km: 0 }
          const passRate = s.total > 0 ? Math.round((s.pass / s.total) * 100) : null
          const gradient = GRADIENTS[idx % GRADIENTS.length]
          return (
            <Link key={name} href={`/dashboard/inspectors/${slugify(name)}`}>
              <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                  {getInitials(name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-semibold text-sm">{name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">{s.total} inspection{s.total !== 1 ? 's' : ''}</span>
                    {passRate !== null && (
                      <span className={`text-xs font-semibold ${passRate >= 70 ? 'text-green-600' : passRate >= 40 ? 'text-orange-500' : 'text-red-500'}`}>
                        {passRate}% pass
                      </span>
                    )}
                    {s.km > 0 && (
                      <span className="text-xs text-gray-400">{s.km % 1 === 0 ? s.km : s.km.toFixed(1)} km this month</span>
                    )}
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
