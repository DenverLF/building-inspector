'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Inspection } from '@/lib/types'

const TABS = ['All', 'Today', 'Pass', 'Fail', 'Attention'] as const
type Tab = typeof TABS[number]

const STAGE_LABEL: Record<string, string> = {
  fire_installation: 'Fire Installation',
  trench: 'Trench',
  drainage: 'Drainage',
  permission_to_use: 'Permission to Use',
  occupation: 'Occupation',
}

const STAGE_COLOR: Record<string, string> = {
  fire_installation: 'bg-red-100 text-red-700',
  trench: 'bg-yellow-100 text-yellow-700',
  drainage: 'bg-blue-100 text-blue-700',
  permission_to_use: 'bg-purple-100 text-purple-700',
  occupation: 'bg-green-100 text-green-700',
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

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('All')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDateFilter, setShowDateFilter] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('inspections')
        .select('*')
        .order('inspected_at', { ascending: false })
      setInspections((data as Inspection[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const today = new Date().toISOString().split('T')[0]

  const filtered = inspections.filter(i => {
    const matchesSearch =
      !search ||
      (i.address ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (i.inspector_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      STAGE_LABEL[i.stage]?.toLowerCase().includes(search.toLowerCase())

    const matchesTab =
      tab === 'All' ||
      (tab === 'Today' && i.inspected_at.startsWith(today)) ||
      (tab === 'Pass' && i.outcome === 'pass') ||
      (tab === 'Fail' && i.outcome === 'fail') ||
      (tab === 'Attention' && i.outcome === 'attention_required')

    const inspDate = i.inspected_at.split('T')[0]
    const matchesFrom = !dateFrom || inspDate >= dateFrom
    const matchesTo = !dateTo || inspDate <= dateTo

    return matchesSearch && matchesTab && matchesFrom && matchesTo
  })

  const dateFilterActive = !!dateFrom || !!dateTo

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1a1745] px-5 pt-10 pb-5">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl font-bold">Inspections</h1>
          <Link
            href="/dashboard/inspections/new"
            className="bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full transition-colors"
          >
            + New
          </Link>
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Search + date filter toggle */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search inspections..."
              className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-sm"
            />
          </div>
          <button
            onClick={() => {
              setShowDateFilter(v => !v)
              if (showDateFilter) { setDateFrom(''); setDateTo('') }
            }}
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border transition-colors ${
              dateFilterActive ? 'bg-[#1a1745] border-[#1a1745] text-white' : 'bg-white border-gray-200 text-gray-500'
            }`}
            title="Filter by date"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        {/* Date range inputs */}
        {showDateFilter && (
          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm mb-3 flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                max={dateTo || undefined}
                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                min={dateFrom || undefined}
                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>
        )}

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
              {t}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse h-24" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm shadow-sm">
            {inspections.length === 0
              ? 'No inspections yet — tap + New to log one'
              : 'No inspections match this filter'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(insp => (
              <Link key={insp.id} href={`/dashboard/inspections/${insp.id}`}>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STAGE_COLOR[insp.stage]}`}>
                      {STAGE_LABEL[insp.stage]}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${OUTCOME_STYLE[insp.outcome]}`}>
                      {OUTCOME_LABEL[insp.outcome]}
                    </span>
                  </div>
                  {insp.address && (
                    <p className="text-gray-800 font-semibold text-sm mb-1">{insp.address}</p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-[#1a1745] font-medium">{insp.inspector_name ?? '—'}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(insp.inspected_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
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
