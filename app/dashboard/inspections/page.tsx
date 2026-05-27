'use client'

import { useState } from 'react'
import Link from 'next/link'

const TABS = ['All', 'Assigned', 'Completed', 'Overdue'] as const
type Tab = typeof TABS[number]

const STATUS_STYLE: Record<string, string> = {
  Scheduled: 'bg-blue-100 text-blue-700',
  Pending: 'bg-amber-100 text-amber-700',
  Overdue: 'bg-red-100 text-red-600',
  Completed: 'bg-green-100 text-green-700',
}

const SAMPLE = [
  { address: '123 Main Street', type: 'Residential', subtype: 'Foundation', status: 'Scheduled', date: 'Today 09:00', assigned: true },
  { address: '456 Oak Avenue', type: 'Commercial', subtype: 'Electrical', status: 'Scheduled', date: 'Today 11:00', assigned: true },
  { address: '789 Pine Road', type: 'Residential', subtype: 'Final', status: 'Scheduled', date: 'Today 14:00', assigned: true },
  { address: '321 Cedar Lane', type: 'Residential', subtype: 'Plumbing', status: 'Pending', date: 'Tomorrow 09:00', assigned: false },
  { address: '654 Maple Drive', type: 'Commercial', subtype: 'Structural', status: 'Overdue', date: 'Tomorrow 11:00', assigned: false },
]

export default function InspectionsPage() {
  const [tab, setTab] = useState<Tab>('All')
  const [search, setSearch] = useState('')

  const filtered = SAMPLE.filter(item => {
    const matchesTab =
      tab === 'All' ||
      (tab === 'Assigned' && item.assigned) ||
      (tab === 'Completed' && item.status === 'Completed') ||
      (tab === 'Overdue' && item.status === 'Overdue')
    const matchesSearch =
      item.address.toLowerCase().includes(search.toLowerCase()) ||
      item.type.toLowerCase().includes(search.toLowerCase())
    return matchesTab && matchesSearch
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search inspections..."
            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-10 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-sm"
          />
          <button className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
                tab === t
                  ? 'bg-[#1a1745] text-white'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm shadow-sm">
              No inspections found
            </div>
          )}
          {filtered.map((item, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1a1745]/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#1a1745]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 font-bold text-sm truncate">{item.address}</p>
                <p className="text-gray-400 text-xs mt-0.5">{item.type} • {item.subtype}</p>
                <div className="flex items-center gap-1 mt-1">
                  <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-400 text-xs">{item.date}</p>
                  {item.assigned && (
                    <>
                      <svg className="w-3 h-3 text-gray-400 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <p className="text-gray-400 text-xs">Assigned</p>
                    </>
                  )}
                </div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_STYLE[item.status]}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
