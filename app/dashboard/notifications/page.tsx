'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Task, Notice } from '@/lib/types'

interface AlertItem {
  id: string
  type: 'overdue_task' | 'due_today' | 'overdue_notice' | 'stale_draft'
  title: string
  subtitle: string
  href: string
}

const TYPE_CONFIG = {
  overdue_task: {
    label: 'Overdue Task',
    color: 'bg-red-100 text-red-700',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    bg: 'bg-red-50',
  },
  due_today: {
    label: 'Due Today',
    color: 'bg-blue-100 text-blue-700',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    bg: 'bg-blue-50',
  },
  overdue_notice: {
    label: 'Deadline Passed',
    color: 'bg-orange-100 text-orange-700',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bg: 'bg-orange-50',
  },
  stale_draft: {
    label: 'Unsent Draft',
    color: 'bg-yellow-100 text-yellow-700',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    bg: 'bg-yellow-50',
  },
}

const SECTION_ORDER: AlertItem['type'][] = ['overdue_task', 'overdue_notice', 'due_today', 'stale_draft']
const SECTION_TITLE: Record<AlertItem['type'], string> = {
  overdue_task: 'Overdue Tasks',
  due_today: 'Due Today',
  overdue_notice: 'Notice Deadlines Passed',
  stale_draft: 'Unsent Draft Notices (7+ days)',
}

export default function NotificationsPage() {
  const [items, setItems] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]
      const staleDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [tasksRes, noticesRes] = await Promise.all([
        supabase.from('tasks').select('*').neq('status', 'completed'),
        supabase.from('notices').select('*').neq('status', 'resolved'),
      ])

      const all: AlertItem[] = []

      for (const t of (tasksRes.data as Task[]) ?? []) {
        if (!t.due_date) continue
        if (t.due_date < today) {
          all.push({
            id: t.id,
            type: 'overdue_task',
            title: t.title,
            subtitle: `Due ${new Date(t.due_date + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}${t.assigned_inspector ? ` · ${t.assigned_inspector}` : ''}`,
            href: `/dashboard/tasks/${t.id}`,
          })
        } else if (t.due_date === today) {
          all.push({
            id: t.id,
            type: 'due_today',
            title: t.title,
            subtitle: t.assigned_inspector ?? 'Unassigned',
            href: `/dashboard/tasks/${t.id}`,
          })
        }
      }

      for (const n of (noticesRes.data as Notice[]) ?? []) {
        if (n.remedy_deadline && n.remedy_deadline < today) {
          all.push({
            id: n.id,
            type: 'overdue_notice',
            title: n.site_address,
            subtitle: `${n.reference_number} · Deadline ${new Date(n.remedy_deadline + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}`,
            href: `/dashboard/notices/${n.id}`,
          })
        } else if (n.status === 'draft' && n.created_at < staleDate) {
          all.push({
            id: n.id,
            type: 'stale_draft',
            title: n.site_address,
            subtitle: `${n.reference_number} · Created ${new Date(n.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}`,
            href: `/dashboard/notices/${n.id}`,
          })
        }
      }

      setItems(all)
      setLoading(false)
    }
    load()
  }, [])

  const grouped = SECTION_ORDER.reduce<Record<string, AlertItem[]>>((acc, type) => {
    acc[type] = items.filter(i => i.type === type)
    return acc
  }, {} as Record<string, AlertItem[]>)

  const hasAny = items.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1a1745] px-5 pt-10 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-purple-300 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-white text-xl font-bold">Notifications</h1>
          {!loading && hasAny && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5 pb-8">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse h-16" />)}
          </div>
        ) : !hasAny ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-700 font-semibold text-sm">All clear</p>
            <p className="text-gray-400 text-xs mt-1">No tasks overdue, no missed deadlines</p>
          </div>
        ) : (
          SECTION_ORDER.map(type => {
            const section = grouped[type]
            if (!section.length) return null
            const cfg = TYPE_CONFIG[type]
            return (
              <div key={type}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{SECTION_TITLE[type]}</p>
                <div className="space-y-2">
                  {section.map(item => (
                    <Link key={item.id} href={item.href}>
                      <div className={`rounded-2xl p-4 shadow-sm flex items-center gap-3 ${cfg.bg}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 font-semibold text-sm truncate">{item.title}</p>
                          <p className="text-gray-500 text-xs mt-0.5 truncate">{item.subtitle}</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
