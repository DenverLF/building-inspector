'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { INSPECTORS } from '@/lib/inspectors'
import { logActivity } from '@/lib/activity'
import type { Notice, InspectionStage } from '@/lib/types'

const STAGES: { value: InspectionStage; label: string }[] = [
  { value: 'fire_installation', label: 'Fire Installation' },
  { value: 'trench', label: 'Trench' },
  { value: 'drainage', label: 'Drainage' },
  { value: 'permission_to_use', label: 'Permission to Use' },
  { value: 'occupation', label: 'Occupation' },
]

const STAGE_LABEL: Record<string, string> = Object.fromEntries(STAGES.map(s => [s.value, s.label]))

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
}

export default function NoticeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const [form, setForm] = useState({
    site_address: '',
    property_owner_name: '',
    property_owner_email: '',
    inspector_name: '',
    inspection_date: '',
    stage: '' as InspectionStage | '',
    non_compliance_details: '',
    corrective_actions: '',
    remedy_deadline: '',
  })

  async function reload() {
    const supabase = createClient()
    const { data } = await supabase.from('notices').select('*').eq('id', id).single()
    if (data) setNotice(data as Notice)
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data, error: err } = await supabase.from('notices').select('*').eq('id', id).single()
      if (err || !data) { setError('Notice not found.'); setLoading(false); return }
      const n = data as Notice
      setNotice(n)
      setForm({
        site_address: n.site_address,
        property_owner_name: n.property_owner_name ?? '',
        property_owner_email: n.property_owner_email ?? '',
        inspector_name: n.inspector_name ?? '',
        inspection_date: n.inspection_date ?? '',
        stage: n.stage ?? '',
        non_compliance_details: n.non_compliance_details,
        corrective_actions: n.corrective_actions,
        remedy_deadline: n.remedy_deadline ?? '',
      })
      setLoading(false)
    }
    load()
  }, [id])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.site_address || !form.non_compliance_details || !form.corrective_actions) {
      setError('Site address, non-compliance details, and corrective actions are required.')
      return
    }
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from('notices').update({
      site_address: form.site_address,
      property_owner_name: form.property_owner_name || null,
      property_owner_email: form.property_owner_email || null,
      inspector_name: form.inspector_name || null,
      inspection_date: form.inspection_date || null,
      stage: form.stage || null,
      non_compliance_details: form.non_compliance_details,
      corrective_actions: form.corrective_actions,
      remedy_deadline: form.remedy_deadline || null,
    }).eq('id', id)
    if (err) { setError(err.message) }
    else {
      await logActivity({
        entity_type: 'task',
        entity_id: id,
        entity_title: `Notice ${notice?.reference_number}`,
        action: 'updated',
        description: 'Notice details updated',
        performed_by_name: form.inspector_name || null,
      })
      setEditing(false)
      await reload()
    }
    setSaving(false)
  }

  async function markSent() {
    const supabase = createClient()
    await supabase.from('notices').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id)
    await logActivity({
      entity_type: 'task',
      entity_id: id,
      entity_title: `Notice ${notice?.reference_number}`,
      action: 'status_changed',
      description: 'Notice marked as sent',
      performed_by_name: notice?.inspector_name ?? null,
    })
    await reload()
  }

  async function markResolved() {
    const supabase = createClient()
    await supabase.from('notices').update({ status: 'resolved' }).eq('id', id)
    await logActivity({
      entity_type: 'task',
      entity_id: id,
      entity_title: `Notice ${notice?.reference_number}`,
      action: 'status_changed',
      description: 'Notice marked as resolved',
      performed_by_name: notice?.inspector_name ?? null,
    })
    await reload()
  }

  async function handleDownloadPdf() {
    if (!notice) return
    setPdfLoading(true)
    const { generateNotice } = await import('@/lib/pdf')
    await generateNotice(notice)
    setPdfLoading(false)
  }

  function handleEmail() {
    if (!notice) return
    const subject = encodeURIComponent(`Non-Compliance Notice — Ref: ${notice.reference_number}`)
    const body = encodeURIComponent(
`NON-COMPLIANCE NOTICE
Reference: ${notice.reference_number}
Issued by: Municipality of Excellence — Building Inspectorate

Site Address: ${notice.site_address}
${notice.inspector_name ? `Inspector: ${notice.inspector_name}` : ''}
${notice.inspection_date ? `Date of Inspection: ${new Date(notice.inspection_date + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
${notice.stage ? `Stage: ${STAGE_LABEL[notice.stage]}` : ''}

NON-COMPLIANCE DETAILS:
${notice.non_compliance_details}

REQUIRED CORRECTIVE ACTIONS:
${notice.corrective_actions}
${notice.remedy_deadline ? `\nREMEDY DEADLINE: ${new Date(notice.remedy_deadline + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}

Please ensure that all corrective actions are completed by the specified deadline. Failure to comply may result in further enforcement action.

Municipality of Excellence
Building Inspectorate`
    )
    const to = notice.property_owner_email ? encodeURIComponent(notice.property_owner_email) : ''
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`
  }

  async function handleDelete() {
    setDeleting(true)
    await logActivity({
      entity_type: 'task',
      entity_id: id,
      entity_title: `Notice ${notice?.reference_number}`,
      action: 'deleted',
      description: 'Notice deleted',
      performed_by_name: notice?.inspector_name ?? null,
    })
    await createClient().from('notices').delete().eq('id', id)
    router.push('/dashboard/notices')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-[#1a1745] px-5 pt-10 pb-5"><div className="h-7 w-32 bg-white/20 rounded animate-pulse" /></div>
        <div className="px-4 pt-4 space-y-4">{[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse h-24" />)}</div>
      </div>
    )
  }

  if (error && !notice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <Link href="/dashboard/notices" className="text-[#1a1745] font-semibold text-sm">← Back</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1a1745] px-5 pt-10 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/notices" className="text-purple-300 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-white text-lg font-bold leading-tight">Notice</h1>
              <p className="text-purple-300 text-xs font-mono">{notice?.reference_number}</p>
            </div>
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
        {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

        {!editing && (
          <>
            {/* Status + actions */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-bold px-3 py-1 rounded-full capitalize ${STATUS_STYLE[notice?.status ?? 'draft']}`}>
                  {notice?.status}
                </span>
                {notice?.sent_at && (
                  <span className="text-xs text-gray-400">
                    Sent {new Date(notice.sent_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleDownloadPdf} disabled={pdfLoading}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1a1745] text-white text-xs font-semibold disabled:opacity-60">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {pdfLoading ? 'Generating…' : 'Download PDF'}
                </button>
                <button onClick={handleEmail}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-500 text-white text-xs font-semibold">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email Notice
                </button>
              </div>
              {notice?.status === 'draft' && (
                <button onClick={markSent}
                  className="w-full mt-2 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold">
                  Mark as Sent
                </button>
              )}
              {notice?.status === 'sent' && (
                <button onClick={markResolved}
                  className="w-full mt-2 py-2.5 rounded-xl border border-green-200 bg-green-50 text-green-700 text-xs font-semibold">
                  Mark as Resolved
                </button>
              )}
            </div>

            {/* Notice content */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Property</p>
              <p className="text-sm font-bold text-gray-900 mb-1">{notice?.site_address}</p>
              {notice?.property_owner_name && <p className="text-sm text-gray-700">{notice.property_owner_name}</p>}
              {notice?.property_owner_email && <p className="text-xs text-blue-600">{notice.property_owner_email}</p>}
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Inspection</p>
              <div className="space-y-2">
                {notice?.inspector_name && (
                  <div className="flex justify-between"><span className="text-xs text-gray-400">Inspector</span><span className="text-sm font-semibold text-[#1a1745]">{notice.inspector_name}</span></div>
                )}
                {notice?.inspection_date && (
                  <div className="flex justify-between"><span className="text-xs text-gray-400">Date</span>
                    <span className="text-sm text-gray-700">{new Date(notice.inspection_date + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
                {notice?.stage && (
                  <div className="flex justify-between"><span className="text-xs text-gray-400">Stage</span><span className="text-sm text-gray-700">{STAGE_LABEL[notice.stage]}</span></div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Non-Compliance Details</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{notice?.non_compliance_details}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Required Corrective Actions</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{notice?.corrective_actions}</p>
            </div>

            {notice?.remedy_deadline && (
              <div className="bg-red-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Remedy Deadline</p>
                <p className="text-sm font-bold text-red-700">
                  {new Date(notice.remedy_deadline + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}
          </>
        )}

        {editing && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Property</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site Address <span className="text-red-500">*</span></label>
                  <input type="text" value={form.site_address} onChange={e => set('site_address', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
                  <input type="text" value={form.property_owner_name} onChange={e => set('property_owner_name', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner Email</label>
                  <input type="email" value={form.property_owner_email} onChange={e => set('property_owner_email', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Inspection</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inspector</label>
                  <select value={form.inspector_name} onChange={e => set('inspector_name', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                    <option value="">— Select —</option>
                    {INSPECTORS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inspection Date</label>
                  <input type="date" value={form.inspection_date} onChange={e => set('inspection_date', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                  <select value={form.stage} onChange={e => set('stage', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                    <option value="">— Select —</option>
                    {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Content</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Non-Compliance Details</label>
                  <textarea value={form.non_compliance_details} onChange={e => set('non_compliance_details', e.target.value)} rows={4}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Corrective Actions</label>
                  <textarea value={form.corrective_actions} onChange={e => set('corrective_actions', e.target.value)} rows={4}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remedy Deadline</label>
                  <input type="date" value={form.remedy_deadline} onChange={e => set('remedy_deadline', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>
            </div>

            <button onClick={handleSave} disabled={saving}
              className="w-full py-3.5 bg-[#1a1745] hover:bg-[#2d1f7a] disabled:opacity-60 text-white font-semibold rounded-2xl text-sm transition-colors shadow-lg">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-8">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Delete Notice?</h3>
            <p className="text-gray-500 text-sm mb-6">This will permanently delete the notice and cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm disabled:opacity-60">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
