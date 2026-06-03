'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { INSPECTORS } from '@/lib/inspectors'
import { logActivity } from '@/lib/activity'
import type { InspectionStage } from '@/lib/types'
import MicButton from '@/components/MicButton'

const STAGES: { value: InspectionStage; label: string; color: string }[] = [
  { value: 'fire_installation', label: 'Fire Installation', color: 'bg-red-50 border-red-200 text-red-700' },
  { value: 'trench', label: 'Trench', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  { value: 'drainage', label: 'Drainage', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: 'permission_to_use', label: 'Permission to Use', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { value: 'occupation', label: 'Occupation', color: 'bg-green-50 border-green-200 text-green-700' },
]

const OUTCOMES = [
  { value: 'pass', label: 'Pass', icon: '✓', active: 'bg-green-500 text-white border-green-500', inactive: 'bg-white text-gray-500 border-gray-200' },
  { value: 'fail', label: 'Fail', icon: '✗', active: 'bg-red-500 text-white border-red-500', inactive: 'bg-white text-gray-500 border-gray-200' },
  { value: 'attention_required', label: 'Attention', icon: '⚠', active: 'bg-orange-500 text-white border-orange-500', inactive: 'bg-white text-gray-500 border-gray-200' },
]

export default function NewInspectionPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

  const [form, setForm] = useState({
    stage: '' as InspectionStage | '',
    outcome: 'pending',
    address: '',
    inspector_name: '',
    inspected_at: new Date().toISOString().slice(0, 16),
    notes: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setPhotos(prev => [...prev, ...files])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        setPhotoPreviews(prev => [...prev, ev.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
    // Reset input so same file can be picked again
    e.target.value = ''
  }

  function removePhoto(index: number) {
    setPhotos(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.stage) {
      setError('Please select an inspection stage.')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Insert inspection record
    const { data: inserted, error: insertErr } = await supabase
      .from('inspections')
      .insert({
        stage: form.stage,
        outcome: form.outcome,
        address: form.address || null,
        inspector_name: form.inspector_name || null,
        created_by: user?.id ?? null,
        notes: form.notes || null,
        inspected_at: new Date(form.inspected_at).toISOString(),
      })
      .select('id')
      .single()

    if (insertErr || !inserted) {
      setError(insertErr?.message ?? 'Failed to save inspection.')
      setLoading(false)
      return
    }

    const inspectionId = inserted.id

    // Upload photos if any
    if (photos.length > 0) {
      for (const photo of photos) {
        const ext = photo.name.split('.').pop() ?? 'jpg'
        const path = `${inspectionId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('inspection-photos')
          .upload(path, photo, { contentType: photo.type })

        if (!uploadErr) {
          await supabase.from('inspection_photos').insert({
            inspection_id: inspectionId,
            storage_path: path,
          })
        }
      }
    }

    const stageLabel = STAGES.find(s => s.value === form.stage)?.label ?? form.stage
    await logActivity({
      entity_type: 'inspection',
      entity_id: inspectionId,
      entity_title: `${stageLabel}${form.address ? ` at ${form.address}` : ''}`,
      action: 'created',
      description: `Inspection created: ${stageLabel}${form.address ? ` at ${form.address}` : ''}`,
      performed_by_name: form.inspector_name || null,
    })

    router.push(`/dashboard/inspections/${inspectionId}`)
    router.refresh()
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
            <h1 className="text-white text-xl font-bold">New Inspection</h1>
          </div>
          <button
            form="inspection-form"
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

      <form id="inspection-form" onSubmit={handleSubmit} className="px-4 pt-4 space-y-4 pb-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Stage selection */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Inspection Stage <span className="text-red-500">*</span>
          </p>
          <div className="grid grid-cols-1 gap-2">
            {STAGES.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => set('stage', s.value)}
                className={`w-full py-3 px-4 rounded-xl text-sm font-semibold border-2 text-left transition-all ${
                  form.stage === s.value
                    ? s.color + ' border-current shadow-sm'
                    : 'bg-white text-gray-500 border-gray-100'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Outcome */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Outcome</p>
          <div className="flex gap-2">
            {OUTCOMES.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => set('outcome', o.value)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                  form.outcome === o.value ? o.active : o.inactive
                }`}
              >
                <span className="block text-base leading-none mb-0.5">{o.icon}</span>
                <span className="text-xs">{o.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Details</p>
          <div className="space-y-3">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Inspector</label>
              <select
                value={form.inspector_name}
                onChange={e => set('inspector_name', e.target.value)}
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
                onChange={e => set('inspected_at', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <MicButton onText={t => set('notes', (form.notes ? form.notes + ' ' : '') + t)} />
              </div>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Observations, issues found, actions required..."
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Photos</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handlePhotoSelect}
            className="hidden"
          />

          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {photoPreviews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-xs leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-medium flex items-center justify-center gap-2 hover:border-purple-300 hover:text-purple-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {photoPreviews.length === 0 ? 'Add Photos' : 'Add More Photos'}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-[#1a1745] hover:bg-[#2d1f7a] disabled:opacity-60 text-white font-semibold rounded-2xl text-sm transition-colors shadow-lg"
        >
          {loading ? 'Saving inspection…' : 'Save Inspection'}
        </button>
      </form>
    </div>
  )
}
