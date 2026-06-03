'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { INSPECTORS } from '@/lib/inspectors'
import { logActivity } from '@/lib/activity'
import type { Inspection, InspectionPhoto, InspectionStage, ActivityLog } from '@/lib/types'
import MicButton from '@/components/MicButton'
import NavigateButton from '@/components/NavigateButton'

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

const STAGES: { value: InspectionStage; label: string }[] = [
  { value: 'fire_installation', label: 'Fire Installation' },
  { value: 'trench', label: 'Trench' },
  { value: 'drainage', label: 'Drainage' },
  { value: 'permission_to_use', label: 'Permission to Use' },
  { value: 'occupation', label: 'Occupation' },
]

const OUTCOME_STYLE: Record<string, string> = {
  pass: 'bg-green-500 text-white',
  fail: 'bg-red-500 text-white',
  attention_required: 'bg-orange-500 text-white',
  pending: 'bg-gray-200 text-gray-600',
}

const OUTCOME_LABEL: Record<string, string> = {
  pass: '✓ Pass',
  fail: '✗ Fail',
  attention_required: '⚠ Attention Required',
  pending: 'Pending',
}

export default function InspectionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [photos, setPhotos] = useState<InspectionPhoto[]>([])
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [history, setHistory] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  const [form, setForm] = useState({
    stage: '' as InspectionStage | '',
    outcome: 'pending',
    address: '',
    inspector_name: '',
    inspected_at: '',
    notes: '',
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
      const { data, error: err } = await supabase
        .from('inspections')
        .select('*')
        .eq('id', id)
        .single()

      if (err || !data) {
        setError('Inspection not found.')
        setLoading(false)
        return
      }

      const insp = data as Inspection
      setInspection(insp)
      setForm({
        stage: insp.stage,
        outcome: insp.outcome,
        address: insp.address ?? '',
        inspector_name: insp.inspector_name ?? '',
        inspected_at: insp.inspected_at.slice(0, 16),
        notes: insp.notes ?? '',
      })

      // Load photos
      const { data: photoData } = await supabase
        .from('inspection_photos')
        .select('*')
        .eq('inspection_id', id)
        .order('created_at', { ascending: true })

      if (photoData && photoData.length > 0) {
        setPhotos(photoData as InspectionPhoto[])
        const urls = (photoData as InspectionPhoto[]).map(p => {
          const { data: urlData } = supabase.storage
            .from('inspection-photos')
            .getPublicUrl(p.storage_path)
          return urlData.publicUrl
        })
        setPhotoUrls(urls)
      }

      setLoading(false)
    }
    load()
    loadHistory()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function setField(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.stage) {
      setError('Please select a stage.')
      return
    }
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from('inspections').update({
      stage: form.stage,
      outcome: form.outcome,
      address: form.address || null,
      inspector_name: form.inspector_name || null,
      notes: form.notes || null,
      inspected_at: new Date(form.inspected_at).toISOString(),
    }).eq('id', id)

    if (err) {
      setError(err.message)
    } else {
      const changes: string[] = []
      if (inspection) {
        if (form.outcome !== inspection.outcome) {
          const labels: Record<string, string> = { pass: 'Pass', fail: 'Fail', attention_required: 'Attention Required', pending: 'Pending' }
          changes.push(`outcome → ${labels[form.outcome]}`)
        }
        if (form.stage !== inspection.stage) changes.push(`stage → ${STAGE_LABEL[form.stage]}`)
        if (form.inspector_name !== (inspection.inspector_name ?? '')) changes.push(`inspector → ${form.inspector_name || 'unassigned'}`)
        if (form.address !== (inspection.address ?? '')) changes.push('address')
      }
      await logActivity({
        entity_type: 'inspection',
        entity_id: id,
        entity_title: `${STAGE_LABEL[form.stage]}${form.address ? ` at ${form.address}` : ''}`,
        action: changes.some(c => c.startsWith('outcome')) ? 'outcome_changed' : 'updated',
        description: changes.length > 0 ? `Updated: ${changes.join(', ')}` : 'Inspection details updated',
        performed_by_name: form.inspector_name || null,
      })
      setEditing(false)
      const { data } = await supabase.from('inspections').select('*').eq('id', id).single()
      if (data) setInspection(data as Inspection)
      await loadHistory()
    }
    setSaving(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await logActivity({
      entity_type: 'inspection',
      entity_id: id,
      entity_title: inspection ? `${STAGE_LABEL[inspection.stage]}${inspection.address ? ` at ${inspection.address}` : ''}` : '',
      action: 'deleted',
      description: 'Inspection deleted',
      performed_by_name: inspection?.inspector_name ?? null,
    })
    const supabase = createClient()
    for (const p of photos) {
      await supabase.storage.from('inspection-photos').remove([p.storage_path])
    }
    await supabase.from('inspections').delete().eq('id', id)
    router.push('/dashboard/inspections')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-[#1a1745] px-5 pt-10 pb-5">
          <div className="h-7 w-40 bg-white/20 rounded animate-pulse" />
        </div>
        <div className="px-4 pt-4 space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse h-24" />)}
        </div>
      </div>
    )
  }

  if (error && !inspection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <Link href="/dashboard/inspections" className="text-[#1a1745] font-semibold text-sm">← Back</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1a1745] px-5 pt-10 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/inspections" className="text-purple-300 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-white text-xl font-bold">Inspection</h1>
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

        {editing ? (
          <>
            {/* Edit: Stage */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Stage</p>
              <div className="grid grid-cols-1 gap-2">
                {STAGES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setField('stage', s.value)}
                    className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold border text-left transition-all ${
                      form.stage === s.value
                        ? STAGE_COLOR[s.value] + ' border-current'
                        : 'bg-white text-gray-500 border-gray-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Edit: Outcome */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Outcome</p>
              <div className="flex gap-2">
                {[
                  { value: 'pass', label: 'Pass', icon: '✓', active: 'bg-green-500 text-white border-green-500' },
                  { value: 'fail', label: 'Fail', icon: '✗', active: 'bg-red-500 text-white border-red-500' },
                  { value: 'attention_required', label: 'Attention', icon: '⚠', active: 'bg-orange-500 text-white border-orange-500' },
                ].map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setField('outcome', o.value)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                      form.outcome === o.value ? o.active : 'bg-white text-gray-500 border-gray-200'
                    }`}
                  >
                    <span className="block text-base leading-none mb-0.5">{o.icon}</span>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Edit: Details */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Details</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site Address</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={e => setField('address', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inspector</label>
                  <select
                    value={form.inspector_name}
                    onChange={e => setField('inspector_name', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                  >
                    <option value="">— Select inspector —</option>
                    {INSPECTORS.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    value={form.inspected_at}
                    onChange={e => setField('inspected_at', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Notes</label>
                    <MicButton onText={t => setField('notes', (form.notes ? form.notes + ' ' : '') + t)} />
                  </div>
                  <textarea
                    value={form.notes}
                    onChange={e => setField('notes', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3.5 bg-[#1a1745] hover:bg-[#2d1f7a] disabled:opacity-60 text-white font-semibold rounded-2xl text-sm transition-colors shadow-lg"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        ) : (
          <>
            {/* View: Outcome banner */}
            <div className={`rounded-2xl p-5 text-center ${OUTCOME_STYLE[inspection?.outcome ?? 'pending']}`}>
              <p className="text-2xl font-bold">{OUTCOME_LABEL[inspection?.outcome ?? 'pending']}</p>
            </div>

            {/* View: Stage + details */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Details</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Stage</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STAGE_COLOR[inspection?.stage ?? '']}`}>
                    {STAGE_LABEL[inspection?.stage ?? '']}
                  </span>
                </div>
                {inspection?.address && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm text-gray-700">{inspection.address}</span>
                    </div>
                    <NavigateButton address={inspection.address} compact />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Inspector</span>
                  <span className="text-sm font-semibold text-[#1a1745]">{inspection?.inspector_name ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Date &amp; Time</span>
                  <span className="text-sm text-gray-700">
                    {inspection?.inspected_at
                      ? new Date(inspection.inspected_at).toLocaleString('en-ZA', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* View: Notes */}
            {inspection?.notes && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{inspection.notes}</p>
              </div>
            )}

            {/* View: Photos */}
            {photoUrls.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Photos ({photoUrls.length})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {photoUrls.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightboxIdx(i)}
                      className="aspect-square rounded-xl overflow-hidden bg-gray-100"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* View: History */}
            {history.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">History</p>
                <div className="space-y-3">
                  {history.map(entry => (
                    <div key={entry.id} className="flex items-start gap-3">
                      <span className="text-gray-400 text-sm w-4 flex-shrink-0 mt-0.5">
                        {entry.action === 'created' ? '✦' : entry.action === 'deleted' ? '✕' : '✎'}
                      </span>
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

            {/* View: Logged */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Logged</p>
              <p className="text-sm text-gray-600">
                {inspection?.created_at
                  ? new Date(inspection.created_at).toLocaleString('en-ZA', {
                      day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })
                  : '—'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 px-4"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            className="absolute top-5 right-5 text-white/70 hover:text-white"
            onClick={() => setLightboxIdx(null)}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {lightboxIdx > 0 && (
            <button
              className="absolute left-4 text-white/70 hover:text-white"
              onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null ? i - 1 : null) }}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrls[lightboxIdx]}
            alt="Photo"
            className="max-w-full max-h-[80vh] rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          {lightboxIdx < photoUrls.length - 1 && (
            <button
              className="absolute right-4 text-white/70 hover:text-white"
              onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null ? i + 1 : null) }}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          <p className="absolute bottom-6 text-white/50 text-sm">
            {lightboxIdx + 1} / {photoUrls.length}
          </p>
        </div>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-8">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Delete Inspection?</h3>
            <p className="text-gray-500 text-sm mb-6">This will permanently delete the inspection record and all photos.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
