'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Task, Inspection, Notice } from '@/lib/types'

interface SiteItem {
  id: string
  type: 'task' | 'inspection' | 'notice'
  label: string
  address: string
  meta: string
  href: string
  urgent?: boolean
}

const STAGE_LABEL: Record<string, string> = {
  fire_installation: 'Fire Installation',
  trench: 'Trench',
  drainage: 'Drainage',
  permission_to_use: 'Permission to Use',
  occupation: 'Occupation',
}

const TYPE_BADGE: Record<SiteItem['type'], string> = {
  task: 'bg-blue-100 text-blue-700',
  inspection: 'bg-purple-100 text-purple-700',
  notice: 'bg-red-100 text-red-600',
}

const TYPE_LABEL: Record<SiteItem['type'], string> = {
  task: 'Task',
  inspection: 'Inspection',
  notice: 'Notice',
}

function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

export default function MapPage() {
  const [items, setItems] = useState<SiteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]

      const [tasksRes, inspRes, noticesRes] = await Promise.all([
        supabase.from('tasks').select('*').neq('status', 'completed').not('address', 'is', null),
        supabase.from('inspections').select('*').order('inspected_at', { ascending: false }).limit(20),
        supabase.from('notices').select('*').neq('status', 'resolved'),
      ])

      const all: SiteItem[] = []

      for (const t of (tasksRes.data as Task[]) ?? []) {
        if (!t.address) continue
        const overdue = t.due_date && t.due_date < today
        all.push({
          id: t.id,
          type: 'task',
          label: t.title,
          address: t.address,
          meta: t.due_date
            ? `${overdue ? 'Overdue · ' : 'Due '}${new Date(t.due_date + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}${t.assigned_inspector ? ` · ${t.assigned_inspector}` : ''}`
            : t.assigned_inspector ?? '',
          href: `/dashboard/tasks/${t.id}`,
          urgent: !!overdue || t.due_date === today,
        })
      }

      for (const i of (inspRes.data as Inspection[]) ?? []) {
        if (!i.address) continue
        all.push({
          id: i.id,
          type: 'inspection',
          label: STAGE_LABEL[i.stage] ?? i.stage,
          address: i.address,
          meta: `${i.outcome.replace('_', ' ')} · ${new Date(i.inspected_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}`,
          href: `/dashboard/inspections/${i.id}`,
        })
      }

      for (const n of (noticesRes.data as Notice[]) ?? []) {
        const overdue = n.remedy_deadline && n.remedy_deadline < today
        all.push({
          id: n.id,
          type: 'notice',
          label: n.reference_number,
          address: n.site_address,
          meta: n.remedy_deadline
            ? `${overdue ? 'Deadline passed · ' : 'Due '}${new Date(n.remedy_deadline + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`
            : n.status,
          href: `/dashboard/notices/${n.id}`,
          urgent: !!overdue,
        })
      }

      setItems(all)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = items.filter(i =>
    !search ||
    i.address.toLowerCase().includes(search.toLowerCase()) ||
    i.label.toLowerCase().includes(search.toLowerCase())
  )

  // Sort: urgent first, then tasks, then inspections, then notices
  const sorted = [...filtered].sort((a, b) => {
    if (a.urgent && !b.urgent) return -1
    if (!a.urgent && b.urgent) return 1
    const order = { task: 0, notice: 1, inspection: 2 }
    return order[a.type] - order[b.type]
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1a1745] px-5 pt-10 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/more" className="text-purple-300 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-white text-xl font-bold">Sites</h1>
        </div>
      </div>

      <div className="px-4 pt-4 pb-8">
        {/* Search */}
        <div className="relative mb-4">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by address or name..."
            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-sm"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse h-20" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm shadow-sm">
            {items.length === 0 ? 'No sites with addresses yet' : 'No sites match this search'}
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map(item => (
              <div key={`${item.type}-${item.id}`} className={`bg-white rounded-2xl p-4 shadow-sm ${item.urgent ? 'border border-red-100' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[item.type]}`}>
                        {TYPE_LABEL[item.type]}
                      </span>
                      <span className="text-xs font-semibold text-gray-700 truncate">{item.label}</span>
                    </div>
                    <Link href={item.href}>
                      <p className="text-sm font-bold text-gray-900 leading-snug mb-1">{item.address}</p>
                    </Link>
                    {item.meta && (
                      <p className={`text-xs capitalize ${item.urgent ? 'text-red-500 font-medium' : 'text-gray-400'}`}>{item.meta}</p>
                    )}
                  </div>
                  <a
                    href={mapsUrl(item.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 flex flex-col items-center gap-0.5 bg-[#1a1745] hover:bg-[#2d1f7a] text-white rounded-xl px-3 py-2 transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-[10px] font-semibold">Maps</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
