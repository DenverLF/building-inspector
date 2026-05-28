'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { INSPECTORS } from '@/lib/inspectors'
import type { Inspection, KmLog } from '@/lib/types'

type ReportType = 'inspections' | 'km_log'

function monthOptions() {
  const opts = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
    opts.push({ value, label })
  }
  return opts
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('inspections')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Inspections filters
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [inspectorFilter, setInspectorFilter] = useState('')

  // KM log filters
  const months = monthOptions()
  const [selectedMonth, setSelectedMonth] = useState(months[0].value)
  const [kmInspectorFilter, setKmInspectorFilter] = useState('')

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()

      if (reportType === 'inspections') {
        let query = supabase
          .from('inspections')
          .select('*')
          .gte('inspected_at', dateFrom + 'T00:00:00')
          .lte('inspected_at', dateTo + 'T23:59:59')
          .order('inspected_at', { ascending: true })

        if (inspectorFilter) query = query.eq('inspector_name', inspectorFilter)

        const { data, error: err } = await query
        if (err) throw new Error(err.message)

        const inspections = (data as Inspection[]) ?? []
        if (inspections.length === 0) {
          setError('No inspections found for the selected filters.')
          setGenerating(false)
          return
        }

        const { generateInspectionsReport } = await import('@/lib/pdf')
        await generateInspectionsReport(inspections, dateFrom, dateTo, inspectorFilter)

      } else {
        const [yyyy, mm] = selectedMonth.split('-').map(Number)
        const from = `${selectedMonth}-01`
        const to = new Date(yyyy, mm, 1).toISOString().split('T')[0]
        const monthLabel = new Date(yyyy, mm - 1, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })

        let query = supabase
          .from('km_logs')
          .select('*')
          .gte('trip_date', from)
          .lt('trip_date', to)
          .order('trip_date', { ascending: true })

        if (kmInspectorFilter) query = query.eq('inspector_name', kmInspectorFilter)

        const { data, error: err } = await query
        if (err) throw new Error(err.message)

        const logs = (data as KmLog[]) ?? []
        if (logs.length === 0) {
          setError('No km log entries found for the selected filters.')
          setGenerating(false)
          return
        }

        const { generateKmReport } = await import('@/lib/pdf')
        await generateKmReport(logs, monthLabel, kmInspectorFilter)
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report.')
    }

    setGenerating(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1a1745] px-5 pt-10 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/more" className="text-purple-300 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-white text-xl font-bold">Reports</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4 pb-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            PDF downloaded successfully.
          </div>
        )}

        {/* Report type */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Report Type</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: 'inspections', label: 'Inspections', icon: '📋' },
              { value: 'km_log', label: 'Kilometre Log', icon: '🚗' },
            ] as const).map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setReportType(r.value)}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  reportType === r.value
                    ? 'bg-[#1a1745] text-white border-[#1a1745]'
                    : 'bg-white text-gray-500 border-gray-100'
                }`}
              >
                <span className="block text-xl mb-1">{r.icon}</span>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        {reportType === 'inspections' ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filters</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  max={dateTo}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  min={dateFrom}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inspector (optional)</label>
                <select
                  value={inspectorFilter}
                  onChange={e => setInspectorFilter(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                >
                  <option value="">— All inspectors —</option>
                  {INSPECTORS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filters</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                >
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inspector (optional)</label>
                <select
                  value={kmInspectorFilter}
                  onChange={e => setKmInspectorFilter(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                >
                  <option value="">— All inspectors —</option>
                  {INSPECTORS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* What's included note */}
        <div className="bg-purple-50 rounded-2xl p-4">
          <p className="text-xs font-semibold text-purple-700 mb-1">
            {reportType === 'inspections' ? 'Inspections report includes:' : 'KM log report includes:'}
          </p>
          {reportType === 'inspections' ? (
            <ul className="text-xs text-purple-600 space-y-0.5">
              <li>• Stage, outcome, address, inspector, date</li>
              <li>• Notes for each inspection</li>
              <li>• Summary totals (Pass / Fail / Attention)</li>
            </ul>
          ) : (
            <ul className="text-xs text-purple-600 space-y-0.5">
              <li>• All trips: date, inspector, from → to, distance</li>
              <li>• Purpose of each trip</li>
              <li>• Total kilometres at the bottom</li>
            </ul>
          )}
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-3.5 bg-[#1a1745] hover:bg-[#2d1f7a] disabled:opacity-60 text-white font-semibold rounded-2xl text-sm transition-colors shadow-lg flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating PDF…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF
            </>
          )}
        </button>
      </div>
    </div>
  )
}
