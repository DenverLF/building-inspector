'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { INSPECTORS } from '@/lib/inspectors'

const STAGES = [
  { value: 'fire_installation', label: 'Fire Installation' },
  { value: 'trench', label: 'Trench' },
  { value: 'drainage', label: 'Drainage' },
  { value: 'permission_to_use', label: 'Permission to Use' },
  { value: 'occupation', label: 'Occupation' },
]

export default function NewTaskPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    address: '',
    assigned_inspector: '',
    due_date: '',
    priority: 'medium',
    inspection_stage: '',
    description: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.due_date) {
      setError('Title and due date are required.')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error: err } = await supabase.from('tasks').insert({
      title: form.title,
      address: form.address || null,
      assigned_inspector: form.assigned_inspector || null,
      created_by: user?.id ?? null,
      due_date: form.due_date,
      priority: form.priority,
      inspection_stage: form.inspection_stage || null,
      description: form.description || null,
      status: 'pending',
    })

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      router.push('/dashboard/tasks')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1a1745] px-5 pt-10 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/tasks" className="text-purple-300 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-white text-xl font-bold">New Task</h1>
          </div>
          <button
            form="task-form"
            type="submit"
            disabled={loading}
            className="text-purple-200 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      </div>

      <form id="task-form" onSubmit={handleSubmit} className="px-4 pt-4 space-y-4 pb-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Title */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Task Details</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Foundation inspection at 123 Main St"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site Address</label>
              <input
                type="text"
                value={form.address}
                onChange={e => set('address', e.target.value)}
                placeholder="e.g. 123 Main Street, Cape Town"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Add any notes or instructions..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Assignment */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Assignment</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
              <select
                value={form.assigned_inspector}
                onChange={e => set('assigned_inspector', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
              >
                <option value="">— Select inspector —</option>
                {INSPECTORS.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => set('due_date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>
        </div>

        {/* Priority */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Priority</p>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => set('priority', p)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-colors border ${
                  form.priority === p
                    ? p === 'low' ? 'bg-gray-700 text-white border-gray-700'
                      : p === 'medium' ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Inspection Stage */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Inspection Stage</p>
          <select
            value={form.inspection_stage}
            onChange={e => set('inspection_stage', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
          >
            <option value="">— Select stage —</option>
            {STAGES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-[#1a1745] hover:bg-[#2d1f7a] disabled:opacity-60 text-white font-semibold rounded-2xl text-sm transition-colors shadow-lg"
        >
          {loading ? 'Creating task…' : 'Create Task'}
        </button>
      </form>
    </div>
  )
}
