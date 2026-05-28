'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Notice } from '@/lib/types'

const TABS = ['All', 'Draft', 'Sent', 'Resolved'] as const
type Tab = typeof TABS[number]

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
}

const STAGE_LABEL: Record<string, string> = {
  fire_installation: 'Fire Installation',
  trench: 'Trench',
  drainage: 'Drainage',
  permission_to_use: 'Permission to Use',
  occupation: 'Occupation',
}

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false })
      setNotices((data as Notice[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = notices.filter(n => {
    const matchesSearch = !search ||
      n.reference_number.toLowerCase().includes(search.toLowerCase()) ||
      n.site_address.toLowerCase().includes(search.toLowerCase()) ||
      (n.property_owner_name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesTab =
      tab === 'All' ||
      (tab === 'Draft' && n.status === 'draft') ||
      (tab === 'Sent' && n.status === 'sent') ||
      (tab === 'Resolved' && n.status === 'resolved')
    return matchesSearch && matchesTab
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1a1745] px-5 pt-10 pb-5">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl font-bold">Notices</h1>
          <Link href="/dashboard/notices/new"
            className="bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full transition-colors">
            + New
          </Link>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="relative mb-3">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by address, owner, or ref..."
            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-sm" />
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
                tab === t ? 'bg-[#1a1745] text-white' : 'bg-white text-gray-500 border border-gray-200'
              }`}>{t}</button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse h-24" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm shadow-sm">
            {notices.length === 0 ? 'No notices yet — tap + New to create one' : 'No notices match this filter'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(notice => (
              <Link key={notice.id} href={`/dashboard/notices/${notice.id}`}>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-mono text-gray-400">{notice.reference_number}</p>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 capitalize ${STATUS_STYLE[notice.status]}`}>
                      {notice.status}
                    </span>
                  </div>
                  <p className="text-gray-900 font-bold text-sm mb-1">{notice.site_address}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {notice.property_owner_name && (
                        <span className="text-xs text-gray-500">{notice.property_owner_name}</span>
                      )}
                      {notice.stage && (
                        <span className="text-xs text-[#1a1745] font-medium">{STAGE_LABEL[notice.stage]}</span>
                      )}
                    </div>
                    {notice.remedy_deadline && (
                      <span className="text-xs text-red-500 font-medium">
                        Due {new Date(notice.remedy_deadline + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
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
