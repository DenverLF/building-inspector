import { createClient } from '@/lib/supabase/server'
import { INSPECTORS, getInitials, getInspectorBySlug, slugify } from '@/lib/inspectors'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Inspection, KmLog, Task } from '@/lib/types'

const GRADIENTS = [
  'from-pink-400 to-purple-600',
  'from-blue-400 to-cyan-500',
  'from-green-400 to-emerald-600',
  'from-orange-400 to-red-500',
  'from-yellow-400 to-orange-500',
  'from-violet-400 to-indigo-600',
  'from-teal-400 to-cyan-600',
]

const STAGE_LABEL: Record<string, string> = {
  fire_installation: 'Fire Installation',
  trench: 'Trench',
  drainage: 'Drainage',
  permission_to_use: 'Permission to Use',
  occupation: 'Occupation',
}

const OUTCOME_STYLE: Record<string, string> = {
  pass: 'bg-green-100 text-green-700',
  fail: 'bg-red-100 text-red-600',
  attention_required: 'bg-orange-100 text-orange-700',
  pending: 'bg-gray-100 text-gray-500',
}

const OUTCOME_LABEL: Record<string, string> = {
  pass: 'Pass',
  fail: 'Fail',
  attention_required: 'Attention',
  pending: 'Pending',
}

const PRIORITY_STYLE: Record<string, string> = {
  high: 'bg-red-100 text-red-600',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-500',
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function InspectorProfilePage({ params }: Props) {
  const { slug } = await params
  const name = getInspectorBySlug(slug)
  if (!name) notFound()

  const idx = INSPECTORS.indexOf(name)
  const gradient = GRADIENTS[idx % GRADIENTS.length]

  let inspections: Inspection[] = []
  let kmThisMonth = 0
  let kmTotal = 0
  let openTasks: Task[] = []

  try {
    const supabase = await createClient()
    const today = new Date()
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().split('T')[0]

    const [inspRes, kmMonthRes, kmTotalRes, tasksRes] = await Promise.all([
      supabase
        .from('inspections')
        .select('*')
        .eq('inspector_name', name)
        .order('inspected_at', { ascending: false })
        .limit(50),
      supabase
        .from('km_logs')
        .select('distance_km')
        .eq('inspector_name', name)
        .gte('trip_date', monthStart)
        .lt('trip_date', nextMonth),
      supabase
        .from('km_logs')
        .select('distance_km')
        .eq('inspector_name', name),
      supabase
        .from('tasks')
        .select('*')
        .eq('assigned_inspector', name)
        .neq('status', 'completed')
        .order('due_date', { ascending: true }),
    ])

    inspections = (inspRes.data as Inspection[]) ?? []
    kmThisMonth = (kmMonthRes.data ?? []).reduce((s, r) => s + Number(r.distance_km), 0)
    kmTotal = (kmTotalRes.data ?? []).reduce((s, r) => s + Number(r.distance_km), 0)
    openTasks = (tasksRes.data as Task[]) ?? []
  } catch { /* defaults */ }

  const totalInsp = inspections.length
  const passCount = inspections.filter(i => i.outcome === 'pass').length
  const failCount = inspections.filter(i => i.outcome === 'fail').length
  const attnCount = inspections.filter(i => i.outcome === 'attention_required').length
  const passRate = totalInsp > 0 ? Math.round((passCount / totalInsp) * 100) : null
  const recentInspections = inspections.slice(0, 5)
  const today = new Date().toISOString().split('T')[0]

  function fmtKm(km: number) {
    return km % 1 === 0 ? String(km) : km.toFixed(1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1a1745] px-5 pt-10 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/inspectors" className="text-purple-300 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="text-purple-300 text-sm">Inspectors</span>
        </div>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xl flex-shrink-0`}>
            {getInitials(name)}
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">{name}</h1>
            <p className="text-purple-300 text-xs mt-0.5">Building Inspector</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4 pb-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-3xl font-bold text-[#1a1745] leading-none mb-1">{totalInsp}</p>
            <p className="text-xs text-gray-500 font-medium">Total Inspections</p>
            {totalInsp > 0 && (
              <p className="text-xs text-gray-400 mt-1">{passCount}P · {failCount}F · {attnCount}A</p>
            )}
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className={`text-3xl font-bold leading-none mb-1 ${passRate === null ? 'text-gray-300' : passRate >= 70 ? 'text-green-600' : passRate >= 40 ? 'text-orange-500' : 'text-red-500'}`}>
              {passRate !== null ? `${passRate}%` : '—'}
            </p>
            <p className="text-xs text-gray-500 font-medium">Pass Rate</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-3xl font-bold text-[#1a1745] leading-none mb-1">{fmtKm(kmThisMonth)}</p>
            <p className="text-xs text-gray-500 font-medium">KM This Month</p>
            {kmTotal > 0 && kmTotal !== kmThisMonth && (
              <p className="text-xs text-gray-400 mt-1">{fmtKm(kmTotal)} km total</p>
            )}
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className={`text-3xl font-bold leading-none mb-1 ${openTasks.length > 0 ? 'text-[#1a1745]' : 'text-gray-300'}`}>
              {openTasks.length}
            </p>
            <p className="text-xs text-gray-500 font-medium">Open Tasks</p>
          </div>
        </div>

        {/* Recent Inspections */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 text-sm">Recent Inspections</h2>
            <Link href="/dashboard/inspections" className="text-xs text-purple-600 font-semibold">View all</Link>
          </div>
          {recentInspections.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No inspections yet</p>
          ) : (
            <div className="space-y-3">
              {recentInspections.map(insp => (
                <Link key={insp.id} href={`/dashboard/inspections/${insp.id}`}>
                  <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">{insp.address ?? STAGE_LABEL[insp.stage]}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {STAGE_LABEL[insp.stage]} · {new Date(insp.inspected_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${OUTCOME_STYLE[insp.outcome]}`}>
                      {OUTCOME_LABEL[insp.outcome]}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Open Tasks */}
        {openTasks.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 text-sm">Open Tasks</h2>
              <Link href="/dashboard/tasks" className="text-xs text-purple-600 font-semibold">View all</Link>
            </div>
            <div className="space-y-3">
              {openTasks.slice(0, 5).map(task => {
                const overdue = task.due_date && task.due_date < today && task.status !== 'completed'
                return (
                  <Link key={task.id} href={`/dashboard/tasks/${task.id}`}>
                    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">{task.title}</p>
                        {task.due_date && (
                          <p className={`text-xs mt-0.5 ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                            {overdue ? 'Overdue · ' : 'Due '}
                            {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 capitalize ${PRIORITY_STYLE[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
