'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { INSPECTORS } from '@/lib/inspectors'
import { logActivity } from '@/lib/activity'
import type { Task, ActivityLog } from '@/lib/types'
import { geocodeAddress } from '@/lib/geo'
import NavigateButton from '@/components/NavigateButton'

const STAGES = [
  { value: 'fire_installation', label: 'Fire Installation' },
  { value: 'trench', label: 'Trench' },
  { value: 'drainage', label: 'Drainage' },
  { value: 'permission_to_use', label: 'Permission to Use' },
  { value: 'occupation', label: 'Occupation' },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
}

const ACTION_ICON: Record<string, string> = {
  created: '✦',
  updated: '✎',
  status_changed: '⇄',
  outcome_changed: '⇄',
  deleted: '✕',
}

export default function TaskDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [task, setTask] = useState<Task | null>(null)
  const [history, setHistory] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [form, setForm] = useState({
    title: '',
    address: '',
    assigned_inspector: '',
    due_date: '',
    priority: 'medium',
    inspection_stage: '',
    description: '',
    status: 'pending',
  })

  async function loadHistory() {
    const supabase = createClient()
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('entity_id', id)
      .order('created_at', { ascending: false })
      .limit(10)
    setHistory((data as ActivityLog[]) ?? [])
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data, error: err } = await supabase.from('tasks').select('*').eq('id', id).single()
      if (err || !data) {
        setError('Task not found.')
      } else {
        setTask(data as Task)
        setForm({
          title: data.title,
          address: data.address ?? '',
          assigned_inspector: data.assigned_inspector ?? '',
          due_date: data.due_date ?? '',
          priority: data.priority,
          inspection_stage: data.inspection_stage ?? '',
          description: data.description ?? '',
          status: data.status,
        })
      }
      setLoading(false)
    }
    load()
    loadHistory()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.title || !form.due_date) {
      setError('Title and due date are required.')
      return
    }
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from('tasks').update({
      title: form.title,
      address: form.address || null,
      assigned_inspector: form.assigned_inspector || null,
      due_date: form.due_date,
      priority: form.priority,
      inspection_stage: form.inspection_stage || null,
      description: form.description || null,
      status: form.status,
    }).eq('id', id)

    if (err) {
      setError(err.message)
    } else {
      // Build change description
      const changes: string[] = []
      if (task) {
        if (form.title !== task.title) changes.push('title')
        if (form.address !== (task.address ?? '')) changes.push('address')
        if (form.assigned_inspector !== (task.assigned_inspector ?? '')) changes.push(`inspector → ${form.assigned_inspector || 'unassigned'}`)
        if (form.due_date !== (task.due_date ?? '')) changes.push('due date')
        if (form.priority !== task.priority) changes.push(`priority → ${form.priority}`)
        if (form.status !== task.status) changes.push(`status → ${form.status.replace('_', ' ')}`)
      }
      await logActivity({
        entity_type: 'task',
        entity_id: id,
        entity_title: form.title,
        action: 'updated',
        description: changes.length > 0 ? `Updated: ${changes.join(', ')}` : 'Task details updated',
        performed_by_name: form.assigned_inspector || null,
      })
      // Re-geocode if address changed
      if (form.address && form.address !== (task?.address ?? '')) {
        geocodeAddress(form.address).then(coords => {
          if (coords) {
            createClient().from('tasks').update({
              lat: coords.lat, lng: coords.lng, geocoded_at: new Date().toISOString(),
            }).eq('id', id)
          }
        })
      }
      setEditing(false)
      const { data } = await createClient().from('tasks').select('*').eq('id', id).single()
      if (data) setTask(data as Task)
      await loadHistory()
    }
    setSaving(false)
  }

  async function handleStatusChange(status: string) {
    const oldStatus = task?.status ?? 'pending'
    if (status === oldStatus) return
    const supabase = createClient()
    await supabase.from('tasks').update({ status }).eq('id', id)
    setTask(t => t ? { ...t, status: status as Task['status'] } : t)
    setForm(f => ({ ...f, status }))

    const labelMap: Record<string, string> = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' }
    await logActivity({
      entity_type: 'task',
      entity_id: id,
      entity_title: task?.title ?? '',
      action: 'status_changed',
      description: `Status: ${labelMap[oldStatus]} → ${labelMap[status]}`,
      performed_by_name: task?.assigned_inspector ?? null,
    })
    await loadHistory()
  }

  async function handleDelete() {
    setDeleting(true)
    await logActivity({
      entity_type: 'task',
      entity_id: id,
      entity_title: task?.title ?? '',
      action: 'deleted',
      description: `Task deleted`,
      performed_by_name: task?.assigned_inspector ?? null,
    })
    const supabase = createClient()
    await supabase.from('tasks').delete().eq('id', id)
    router.push('/dashboard/tasks')
    router.refresh()
  }

  function isOverdue() {
    if (!task?.due_date || task.status === 'completed') return false
    return new Date(task.due_date) < new Date(new Date().toDateString())
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-[#1a1745] px-5 pt-10 pb-5">
          <div className="h-7 w-32 bg-white/20 rounded animate-pulse" />
        </div>
        <div className="px-4 pt-4 space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse h-24" />)}
        </div>
      </div>
    )
  }

  if (error && !task) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <Link href="/dashboard/tasks" className="text-[#1a1745] font-semibold text-sm">← Back to Tasks</Link>
        </div>
      </div>
    )
  }

  const overdue = isOverdue()
  const stageLabel = STAGES.find(s => s.value === task?.inspection_stage)?.label

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
            <h1 className="text-white text-xl font-bold truncate max-w-[200px]">{task?.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            {editing ? (
              <button onClick={handleSave} disabled={saving} className="text-purple-200 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            ) : (
              <button onClick={() => setEditing(true)} className="text-purple-200 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            <button onClick={() => setShowDeleteConfirm(true)} className="text-red-300 hover:text-red-100 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4 pb-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Status quick-change */}
        {!editing && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Status</p>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleStatusChange(s.value)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                    task?.status === s.value
                      ? STATUS_STYLE[s.value]
                      : 'bg-white text-gray-400 border-gray-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {overdue && (
              <p className="text-red-500 text-xs font-semibold mt-2 text-center">⚠ Overdue</p>
            )}
          </div>
        )}

        {editing ? (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Task Details</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                  <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site Address</label>
                  <input type="text" value={form.address} onChange={e => set('address', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Assignment</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                  <select value={form.assigned_inspector} onChange={e => set('assigned_inspector', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                    <option value="">— Select inspector —</option>
                    {INSPECTORS.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date <span className="text-red-500">*</span></label>
                  <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Status</p>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Priority</p>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map(p => (
                  <button key={p} type="button" onClick={() => set('priority', p)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-colors border ${
                      form.priority === p
                        ? p === 'low' ? 'bg-gray-700 text-white border-gray-700'
                          : p === 'medium' ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-red-500 text-white border-red-500'
                        : 'bg-white text-gray-500 border-gray-200'
                    }`}>{p}</button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Inspection Stage</p>
              <select value={form.inspection_stage} onChange={e => set('inspection_stage', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                <option value="">— Select stage —</option>
                {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <button onClick={handleSave} disabled={saving}
              className="w-full py-3.5 bg-[#1a1745] hover:bg-[#2d1f7a] disabled:opacity-60 text-white font-semibold rounded-2xl text-sm transition-colors shadow-lg">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        ) : (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Task Details</p>
              <div className="space-y-3">
                {task?.address && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm text-gray-700">{task.address}</span>
                    </div>
                    <NavigateButton lat={task.lat} lng={task.lng} address={task.address} compact />
                  </div>
                )}
                {task?.description && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Notes</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
                  </div>
                )}
                {!task?.address && !task?.description && (
                  <p className="text-sm text-gray-400 italic">No additional details.</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Assignment</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Inspector</span>
                  <span className="text-sm font-semibold text-[#1a1745]">{task?.assigned_inspector ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Due Date</span>
                  <span className={`text-sm font-semibold ${overdue ? 'text-red-500' : 'text-gray-700'}`}>
                    {task?.due_date
                      ? new Date(task.due_date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
                      : '—'}
                  </span>
                </div>
                {stageLabel && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Stage</span>
                    <span className="text-sm text-gray-700">{stageLabel}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Priority</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                    task?.priority === 'high' ? 'bg-red-100 text-red-600'
                      : task?.priority === 'medium' ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>{task?.priority}</span>
                </div>
              </div>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">History</p>
                <div className="space-y-3">
                  {history.map(entry => (
                    <div key={entry.id} className="flex items-start gap-3">
                      <span className="text-gray-400 text-sm w-4 flex-shrink-0 mt-0.5">{ACTION_ICON[entry.action]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700">{entry.description}</p>
                        {entry.performed_by_name && (
                          <p className="text-xs text-[#1a1745] font-medium">{entry.performed_by_name}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(entry.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Created</p>
              <p className="text-sm text-gray-600">
                {task?.created_at
                  ? new Date(task.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </p>
            </div>
          </>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-8">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Delete Task?</h3>
            <p className="text-gray-500 text-sm mb-6">This action cannot be undone. The task will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm disabled:opacity-60">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
