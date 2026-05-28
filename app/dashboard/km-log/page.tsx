'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { KmLog } from '@/lib/types'

function monthLabel(yyyy: number, mm: number) {
  return new Date(yyyy, mm - 1, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
}

export default function KmLogPage() {
  const [logs, setLogs] = useState<KmLog[]>([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const from = `${year}-${String(month).padStart(2, '0')}-01`
      const to = new Date(year, month, 1).toISOString().split('T')[0]
      const { data } = await supabase
        .from('km_logs')
        .select('*')
        .gte('trip_date', from)
        .lt('trip_date', to)
        .order('trip_date', { ascending: false })
      setLogs((data as KmLog[]) ?? [])
      setLoading(false)
    }
    load()
  }, [year, month])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    const n = new Date()
    if (year > n.getFullYear() || (year === n.getFullYear() && month >= n.getMonth() + 1)) return
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const totalKm = logs.reduce((sum, l) => sum + Number(l.distance_km), 0)
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1a1745] px-5 pt-10 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/more" className="text-purple-300 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-white text-xl font-bold">Kilometre Log</h1>
          </div>
          <Link
            href="/dashboard/km-log/new"
            className="bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full transition-colors"
          >
            + New
          </Link>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4 pb-8">
        {/* Month selector + total */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <p className="text-gray-900 font-bold text-sm">{monthLabel(year, month)}</p>
            <button
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 disabled:opacity-30"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-[#1a1745] leading-none">
              {totalKm % 1 === 0 ? totalKm : totalKm.toFixed(1)}
            </p>
            <p className="text-gray-400 text-sm mt-1">km this month</p>
          </div>
          {logs.length > 0 && (
            <p className="text-center text-xs text-gray-400 mt-2">{logs.length} trip{logs.length !== 1 ? 's' : ''}</p>
          )}
        </div>

        {/* Entries */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse h-20" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm shadow-sm">
            No trips logged for {monthLabel(year, month)}
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <Link key={log.id} href={`/dashboard/km-log/${log.id}`}>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-gray-700 text-sm font-semibold truncate">{log.start_location}</span>
                        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        <span className="text-gray-700 text-sm font-semibold truncate">{log.end_location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.inspector_name && (
                          <span className="text-xs text-[#1a1745] font-medium">{log.inspector_name}</span>
                        )}
                        {log.purpose && (
                          <span className="text-xs text-gray-400 truncate">{log.purpose}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-[#1a1745] font-bold text-base leading-none">{log.distance_km} km</p>
                      <p className="text-gray-400 text-xs mt-1">
                        {new Date(log.trip_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
