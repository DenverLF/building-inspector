'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { ActivityLog } from '@/lib/types'

const ACTION_COLOR: Record<string, string> = {
  created: 'bg-green-100 text-green-700',
  updated: 'bg-blue-100 text-blue-700',
  status_changed: 'bg-purple-100 text-purple-700',
  outcome_changed: 'bg-orange-100 text-orange-700',
  deleted: 'bg-red-100 text-red-600',
}

const ACTION_LABEL: Record<string, string> = {
  created: 'Created',
  updated: 'Updated',
  status_changed: 'Status',
  outcome_changed: 'Outcome',
  deleted: 'Deleted',
}

const ENTITY_HREF: Record<string, string> = {
  task: '/dashboard/tasks',
  inspection: '/dashboard/inspections',
  km_log: '/dashboard/km-log',
}

function groupByDate(logs: ActivityLog[]) {
  const groups: Record<string, ActivityLog[]> = {}
  for (const log of logs) {
    const date = new Date(log.created_at).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (!groups[date]) groups[date] = []
    groups[date].push(log)
  }
  return groups
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const PAGE_SIZE = 30

  async function load(pageNum: number) {
    const supabase = createClient()
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, pageNum * PAGE_SIZE + PAGE_SIZE - 1)

    const rows = (data as ActivityLog[]) ?? []
    if (pageNum === 0) setLogs(rows)
    else setLogs(prev => [...prev, ...rows])
    setHasMore(rows.length === PAGE_SIZE)
    setLoading(false)
  }

  useEffect(() => { load(0) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function loadMore() {
    const next = page + 1
    setPage(next)
    load(next)
  }

  const groups = groupByDate(logs)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1a1745] px-5 pt-10 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/more" className="text-purple-300 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-white text-xl font-bold">Audit Trail</h1>
        </div>
      </div>

      <div className="px-4 pt-4 pb-8 space-y-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse h-16" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm shadow-sm">
            No activity recorded yet. Changes to tasks and inspections will appear here.
          </div>
        ) : (
          <>
            {Object.entries(groups).map(([date, entries]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">{date}</p>
                <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
                  {entries.map(entry => (
                    <Link
                      key={entry.id}
                      href={entry.action !== 'deleted' ? `${ENTITY_HREF[entry.entity_type]}/${entry.entity_id}` : `${ENTITY_HREF[entry.entity_type]}`}
                    >
                      <div className="px-4 py-3 flex items-start gap-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${ACTION_COLOR[entry.action]}`}>
                          {ACTION_LABEL[entry.action]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 font-medium leading-snug">{entry.description}</p>
                          {entry.entity_title && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">{entry.entity_title}</p>
                          )}
                          {entry.performed_by_name && (
                            <p className="text-xs text-[#1a1745] font-medium mt-0.5">{entry.performed_by_name}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {new Date(entry.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {hasMore && (
              <button
                onClick={loadMore}
                className="w-full py-3 rounded-2xl border border-gray-200 bg-white text-gray-500 text-sm font-semibold shadow-sm"
              >
                Load more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
