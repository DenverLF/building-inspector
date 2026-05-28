'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { INSPECTORS } from '@/lib/inspectors'
import type { KmLog } from '@/lib/types'

export default function KmLogDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [log, setLog] = useState<KmLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [form, setForm] = useState({
    trip_date: '',
    inspector_name: '',
    start_location: '',
    end_location: '',
    distance_km: '',
    purpose: '',
    notes: '',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data, error: err } = await supabase.from('km_logs').select('*').eq('id', id).single()
      if (err || !data) { setError('Trip not found.'); setLoading(false); return }
      const l = data as KmLog
      setLog(l)
      setForm({
        trip_date: l.trip_date,
        inspector_name: l.inspector_name ?? '',
        start_location: l.start_location,
        end_location: l.end_location,
        distance_km: String(l.distance_km),
        purpose: l.purpose ?? '',
        notes: l.notes ?? '',
      })
      setLoading(false)
    }
    load()
  }, [id])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    const km = parseFloat(form.distance_km)
    if (!form.start_location || !form.end_location || isNaN(km) || km <= 0) {
      setError('Start location, end location, and a valid distance are required.')
      return
    }
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from('km_logs').update({
      trip_date: form.trip_date,
      inspector_name: form.inspector_name || null,
      start_location: form.start_location,
      end_location: form.end_location,
      distance_km: km,
      purpose: form.purpose || null,
      notes: form.notes || null,
    }).eq('id', id)
    if (err) { setError(err.message) }
    else {
      setEditing(false)
      const { data } = await createClient().from('km_logs').select('*').eq('id', id).single()
      if (data) setLog(data as KmLog)
    }
    setSaving(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await createClient().from('km_logs').delete().eq('id', id)
    router.push('/dashboard/km-log')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-[#1a1745] px-5 pt-10 pb-5">
          <div className="h-7 w-32 bg-white/20 rounded animate-pulse" />
        </div>
        <div className="px-4 pt-4 space-y-4">
          {[1, 2].map(i => <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse h-28" />)}
        </div>
      </div>
    )
  }

  if (error && !log) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <Link href="/dashboard/km-log" className="text-[#1a1745] font-semibold text-sm">← Back</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1a1745] px-5 pt-10 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/km-log" className="text-purple-300 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-white text-xl font-bold">Trip Detail</h1>
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
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Trip Details</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={form.trip_date} onChange={e => set('trip_date', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inspector</label>
                  <select value={form.inspector_name} onChange={e => set('inspector_name', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                    <option value="">— Select inspector —</option>
                    {INSPECTORS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                  <input type="text" value={form.start_location} onChange={e => set('start_location', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                  <input type="text" value={form.end_location} onChange={e => set('end_location', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Distance (km)</label>
                  <input type="number" inputMode="decimal" step="0.1" min="0.1" value={form.distance_km}
                    onChange={e => set('distance_km', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                  <input type="text" value={form.purpose} onChange={e => set('purpose', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
                </div>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="w-full py-3.5 bg-[#1a1745] hover:bg-[#2d1f7a] disabled:opacity-60 text-white font-semibold rounded-2xl text-sm transition-colors shadow-lg">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        ) : (
          <>
            {/* Distance banner */}
            <div className="bg-[#1a1745] rounded-2xl p-5 text-center">
              <p className="text-5xl font-bold text-white leading-none">{log?.distance_km}</p>
              <p className="text-purple-300 text-sm mt-1">kilometres</p>
            </div>

            {/* Route */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Route</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">From</p>
                    <p className="text-sm font-semibold text-gray-800">{log?.start_location}</p>
                  </div>
                </div>
                <div className="ml-1 w-px h-4 bg-gray-200" />
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">To</p>
                    <p className="text-sm font-semibold text-gray-800">{log?.end_location}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Details</p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Date</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {log?.trip_date
                      ? new Date(log.trip_date + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
                      : '—'}
                  </span>
                </div>
                {log?.inspector_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Inspector</span>
                    <span className="text-sm font-semibold text-[#1a1745]">{log.inspector_name}</span>
                  </div>
                )}
                {log?.purpose && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Purpose</span>
                    <span className="text-sm text-gray-700">{log.purpose}</span>
                  </div>
                )}
                {log?.notes && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Notes</p>
                    <p className="text-sm text-gray-700">{log.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-8">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Delete Trip?</h3>
            <p className="text-gray-500 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm">
                Cancel
              </button>
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
