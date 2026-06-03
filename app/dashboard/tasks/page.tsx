'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/lib/types'
import { useGeolocation } from '@/hooks/useGeolocation'
import { distanceKm, formatDist } from '@/lib/geo'

const TABS = ['All', 'My Tasks', 'Due Today', 'Overdue', 'Near Me'] as const
type Tab = typeof TABS[number]

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
}
const PRIORITY_STYLE: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-orange-100 text-orange-700',
  high: 'bg-red-100 text-red-600',
}
const STAGE_LABEL: Record<string, string> = {
  fire_installation: 'Fire Installation',
  trench: 'Trench',
  drainage: 'Drainage',
  permission_to_use: 'Permission to Use',
  occupation: 'Occupation',
}

function isOverdue(task: Task) {
  if (!task.due_date || task.status === 'completed') return false
  return new Date(task.due_date) < new Date(new Date().toDateString())
}
function isDueToday(task: Task) {
  if (!task.due_date || task.status === 'completed') return false
  return task.due_date === new Date().toISOString().split('T')[0]
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('All')
  const [search, setSearch] = useState('')
  const [userFullName, setUserFullName] = useState<string | null>(null)
  const { position } = useGeolocation()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        setUserFullName(profile?.full_name ?? null)
      }
      const { data } = await supabase.from('tasks').select('*').order('due_date', { ascending: true, nullsFirst: false })
      setTasks((data as Task[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // Calculate distances for tasks that have coordinates
  function taskDistance(task: Task): number | null {
    if (!position || task.lat == null || task.lng == null) return null
    return distanceKm(position.lat, position.lng, task.lat, task.lng)
  }

  const filtered = tasks
    .filter(t => {
      const matchesSearch = !search ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.address ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (t.assigned_inspector ?? '').toLowerCase().includes(search.toLowerCase())

      const matchesTab =
        tab === 'All' ||
        (tab === 'My Tasks' && t.assigned_inspector === userFullName) ||
        (tab === 'Due Today' && isDueToday(t)) ||
        (tab === 'Overdue' && isOverdue(t)) ||
        (tab === 'Near Me' && t.lat != null && t.lng != null)

      return matchesSearch && matchesTab && t.status !== 'completed'
    })
    .sort((a, b) => {
      // Sort by distance when on Near Me tab and we have position
      if (tab === 'Near Me' && position) {
        const da = taskDistance(a) ?? Infinity
        const db = taskDistance(b) ?? Infinity
        return da - db
      }
      return 0
    })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1a1745] px-5 pt-10 pb-5">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl font-bold">Tasks</h1>
          <Link href="/dashboard/tasks/new" className="bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full transition-colors">
            + New
          </Link>
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-sm"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
                tab === t ? 'bg-[#1a1745] text-white' : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {t === 'Near Me' ? '📍 Near Me' : t}
            </button>
          ))}
        </div>

        {tab === 'Near Me' && !position && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-xs text-yellow-700 mb-3">
            Allow location access to see tasks sorted by distance.
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse h-20" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm shadow-sm">
            {tasks.length === 0 ? 'No tasks yet — tap + New to create one' : 'No tasks match this filter'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(task => {
              const overdue = isOverdue(task)
              const dist = taskDistance(task)
              return (
                <Link key={task.id} href={`/dashboard/tasks/${task.id}`}>
                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-gray-900 font-bold text-sm leading-tight flex-1">{task.title}</p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {dist != null && (
                          <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            {formatDist(dist)}
                          </span>
                        )}
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${overdue ? 'bg-red-100 text-red-600' : STATUS_STYLE[task.status]}`}>
                          {overdue ? 'Overdue' : STATUS_LABEL[task.status]}
                        </span>
                      </div>
                    </div>
                    {task.address && (
                      <p className="text-gray-500 text-xs mb-1.5 flex items-center gap-1">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {task.address}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        {task.inspection_stage && (
                          <span className="text-xs text-gray-400">{STAGE_LABEL[task.inspection_stage]}</span>
                        )}
                        {task.assigned_inspector && (
                          <span className="text-xs text-[#1a1745] font-medium">{task.assigned_inspector}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PRIORITY_STYLE[task.priority]}`}>
                          {task.priority}
                        </span>
                        {task.due_date && (
                          <span className={`text-xs font-medium ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                            {new Date(task.due_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
