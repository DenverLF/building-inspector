'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { INSPECTORS } from '@/lib/inspectors'
import { logActivity } from '@/lib/activity'
import type { InspectionStage } from '@/lib/types'

const STAGES: { value: InspectionStage; label: string }[] = [
  { value: 'fire_installation', label: 'Fire Installation' },
  { value: 'trench', label: 'Trench' },
  { value: 'drainage', label: 'Drainage' },
  { value: 'permission_to_use', label: 'Permission to Use' },
  { value: 'occupation', label: 'Occupation' },
]

function generateRef() {
  const year = new Date().getFullYear()
  const random = Math.floor(1000 + Math.random() * 9000)
  return `NCN-${year}-${random}`
}

export default function NewNoticePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    reference_number: generateRef(),
    site_address: '',
    property_owner_name: '',
    property_owner_email: '',
    inspector_name: '',
    inspection_date: new Date().toISOString().split('T')[0],
    stage: '' as InspectionStage | '',
    non_compliance_details: '',
    corrective_actions: '',
    remedy_deadline: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.site_address || !form.non_compliance_details || !form.corrective_actions) {
      setError('Site address, non-compliance details, and corrective actions are required.')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: inserted, error: err } = await supabase.from('notices').insert({
      reference_number: form.reference_number,
      site_address: form.site_address,
      property_owner_name: form.property_owner_name || null,
      property_owner_email: form.property_owner_email || null,
      inspector_name: form.inspector_name || null,
      inspection_date: form.inspection_date || null,
      stage: form.stage || null,
      non_compliance_details: form.non_compliance_details,
      corrective_actions: form.corrective_actions,
      remedy_deadline: form.remedy_deadline || null,
      status: 'draft',
      created_by: user?.id ?? null,
    }).select('id').single()

    if (err || !inserted) {
      setError(err?.message ?? 'Failed to create notice.')
      setLoading(false)
      return
    }

    await logActivity({
      entity_type: 'task',
      entity_id: inserted.id,
      entity_title: `Notice ${form.reference_number} — ${form.site_address}`,
      action: 'created',
      description: `Non-compliance notice created: ${form.reference_number}`,
      performed_by_name: form.inspector_name || null,
    })

    router.push(`/dashboard/notices/${inserted.id}`)
    router.refresh()
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
            <h1 className="text-white text-xl font-bold">New Notice</h1>
          </div>
          <button form="notice-form" type="submit" disabled={loading} className="text-purple-200 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      </div>

      <form id="notice-form" onSubmit={handleSubmit} className="px-4 pt-4 space-y-4 pb-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Reference */}
        <div className="bg-purple-50 rounded-2xl px-4 py-3">
          <p className="text-xs text-purple-600 font-semibold">Reference Number</p>
          <p className="text-lg font-mono font-bold text-[#1a1745]">{form.reference_number}</p>
        </div>

        {/* Property */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Property</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site Address <span className="text-red-500">*</span></label>
              <input type="text" value={form.site_address} onChange={e => set('site_address', e.target.value)}
                placeholder="e.g. 123 Main Street, Cape Town"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Owner Name</label>
              <input type="text" value={form.property_owner_name} onChange={e => set('property_owner_name', e.target.value)}
                placeholder="e.g. John Smith"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Owner Email</label>
              <input type="email" value={form.property_owner_email} onChange={e => set('property_owner_email', e.target.value)}
                placeholder="owner@example.com"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
          </div>
        </div>

        {/* Inspection details */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Inspection Details</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inspector</label>
              <select value={form.inspector_name} onChange={e => set('inspector_name', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                <option value="">— Select inspector —</option>
                {INSPECTORS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inspection Date</label>
              <input type="date" value={form.inspection_date} onChange={e => set('inspection_date', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
              <select value={form.stage} onChange={e => set('stage', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                <option value="">— Select stage —</option>
                {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Non-compliance */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Non-Compliance</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Details <span className="text-red-500">*</span></label>
              <textarea value={form.non_compliance_details} onChange={e => set('non_compliance_details', e.target.value)}
                placeholder="Describe the non-compliance found during inspection..."
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Required Corrective Actions <span className="text-red-500">*</span></label>
              <textarea value={form.corrective_actions} onChange={e => set('corrective_actions', e.target.value)}
                placeholder="List the actions the owner must take to remedy the non-compliance..."
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remedy Deadline</label>
              <input type="date" value={form.remedy_deadline} onChange={e => set('remedy_deadline', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3.5 bg-[#1a1745] hover:bg-[#2d1f7a] disabled:opacity-60 text-white font-semibold rounded-2xl text-sm transition-colors shadow-lg">
          {loading ? 'Creating notice…' : 'Create Notice'}
        </button>
      </form>
    </div>
  )
}
