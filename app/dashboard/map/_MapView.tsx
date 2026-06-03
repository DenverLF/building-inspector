'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { useGeolocation } from '@/hooks/useGeolocation'
import { createClient } from '@/lib/supabase/client'
import { geocodeAddress, navigateToUrl, navigateToAddressUrl } from '@/lib/geo'
import type { Task, Inspection, Notice } from '@/lib/types'

// Cape Town as default centre
const DEFAULT: [number, number] = [-33.9249, 18.4241]

type PinData = {
  id: string
  lat: number
  lng: number
  color: string
  title: string
  subtitle: string
  navUrl: string
  href: string
}

function makeIcon(L: typeof import('leaflet'), color: string, pulse = false) {
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
    html: pulse
      ? `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 0 4px ${color}44;animation:pulse 2s infinite"></div>
         <style>@keyframes pulse{0%,100%{box-shadow:0 0 0 4px ${color}44}50%{box-shadow:0 0 0 10px transparent}}</style>`
      : `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
  })
}

function navUrl(pin: { lat: number; lng: number }) {
  return `https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}&travelmode=driving`
}

export default function MapView() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [pins, setPins] = useState<PinData[]>([])
  const [selected, setSelected] = useState<PinData | null>(null)
  const [geocoding, setGeocoding] = useState(false)
  const { position } = useGeolocation()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const locationMarkerRef = useRef<any>(null)

  // Load map data
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]

      const [tasksRes, inspRes, noticesRes] = await Promise.all([
        supabase.from('tasks').select('*').neq('status', 'completed'),
        supabase.from('inspections').select('*').order('inspected_at', { ascending: false }).limit(30),
        supabase.from('notices').select('*').neq('status', 'resolved'),
      ])

      const taskData = (tasksRes.data as Task[]) ?? []
      const inspData = (inspRes.data as Inspection[]) ?? []
      const noticeData = (noticesRes.data as Notice[]) ?? []

      // Geocode tasks missing coords
      const needsGeo = taskData.filter(t => t.address && (t.lat == null || t.lng == null))
      if (needsGeo.length > 0) {
        setGeocoding(true)
        await Promise.all(needsGeo.map(async t => {
          const coords = await geocodeAddress(t.address!)
          if (coords) {
            t.lat = coords.lat; t.lng = coords.lng
            supabase.from('tasks').update({ lat: coords.lat, lng: coords.lng, geocoded_at: new Date().toISOString() }).eq('id', t.id)
          }
        }))
        setGeocoding(false)
      }

      // Geocode inspections (no stored coords — geocode on the fly)
      for (const i of inspData) {
        if (i.address && !(i as unknown as Record<string, number>)['lat']) {
          const coords = await geocodeAddress(i.address)
          if (coords) {
            ;(i as unknown as Record<string, number>)['lat'] = coords.lat
            ;(i as unknown as Record<string, number>)['lng'] = coords.lng
          }
        }
      }

      const built: PinData[] = []

      // Task pins
      const overdue = (t: Task) => t.due_date && t.due_date < today && t.status !== 'completed'
      for (const t of taskData) {
        if (t.lat == null || t.lng == null) continue
        built.push({
          id: `task-${t.id}`,
          lat: t.lat, lng: t.lng,
          color: overdue(t) ? '#ef4444' : t.priority === 'high' ? '#f97316' : '#1a1745',
          title: t.title,
          subtitle: t.address ?? '',
          navUrl: navUrl({ lat: t.lat, lng: t.lng }),
          href: `/dashboard/tasks/${t.id}`,
        })
      }

      // Inspection pins
      for (const i of inspData) {
        const lat = (i as unknown as Record<string, number>)['lat']
        const lng = (i as unknown as Record<string, number>)['lng']
        if (!lat || !lng) continue
        const color = i.outcome === 'pass' ? '#22c55e' : i.outcome === 'fail' ? '#ef4444' : '#f97316'
        built.push({
          id: `insp-${i.id}`,
          lat, lng,
          color,
          title: `${i.outcome.replace('_', ' ').toUpperCase()} — ${i.stage.replace('_', ' ')}`,
          subtitle: i.address ?? '',
          navUrl: navUrl({ lat, lng }),
          href: `/dashboard/inspections/${i.id}`,
        })
      }

      // Notice pins
      for (const n of noticeData) {
        const coords = await geocodeAddress(n.site_address)
        if (!coords) continue
        built.push({
          id: `notice-${n.id}`,
          lat: coords.lat, lng: coords.lng,
          color: '#eab308',
          title: `Notice: ${n.reference_number}`,
          subtitle: n.site_address,
          navUrl: navUrl(coords),
          href: `/dashboard/notices/${n.id}`,
        })
      }

      setPins(built)
    }
    load()
  }, [])

  // Init Leaflet map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    import('leaflet').then(L => {
      leafletRef.current = L
      const map = L.map(mapRef.current!, { zoomControl: false })
        .setView(DEFAULT, 12)
      L.control.zoom({ position: 'bottomright' }).addTo(map)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)
      mapInstanceRef.current = map
    })
    return () => {
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Add/refresh pins
  useEffect(() => {
    const L = leafletRef.current
    const map = mapInstanceRef.current
    if (!L || !map || pins.length === 0) return

    // Clear old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    pins.forEach(pin => {
      const marker = L.marker([pin.lat, pin.lng], { icon: makeIcon(L, pin.color) })
        .addTo(map)
        .on('click', () => setSelected(pin))
      markersRef.current.push(marker)
    })

    // Fit bounds to all pins
    if (pins.length > 0) {
      const bounds = L.latLngBounds(pins.map(p => [p.lat, p.lng]))
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [pins])

  // Current location marker
  useEffect(() => {
    const L = leafletRef.current
    const map = mapInstanceRef.current
    if (!L || !map || !position) return

    locationMarkerRef.current?.remove()
    locationMarkerRef.current = L.marker([position.lat, position.lng], {
      icon: makeIcon(L, '#3b82f6', true),
      zIndexOffset: 1000,
    }).addTo(map)
      .bindPopup('<b>You are here</b>')

    // Pan to location if no pins yet
    if (pins.length === 0) {
      map.setView([position.lat, position.lng], 14)
    }
  }, [position, pins.length])

  return (
    <div className="relative w-full h-full">
      {/* Map */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Geocoding indicator */}
      {geocoding && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur rounded-full px-4 py-2 shadow text-xs font-medium text-gray-700 flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          Locating addresses…
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur rounded-2xl px-3 py-2 shadow text-xs space-y-1">
        {[
          { color: '#1a1745', label: 'Task' },
          { color: '#f97316', label: 'High priority' },
          { color: '#ef4444', label: 'Overdue / Fail' },
          { color: '#22c55e', label: 'Passed' },
          { color: '#eab308', label: 'Notice' },
          { color: '#3b82f6', label: 'You' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color }} />
            <span className="text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Selected pin panel */}
      {selected && (
        <div className="absolute bottom-0 inset-x-0 z-[1000] bg-white rounded-t-3xl shadow-2xl p-5 pb-8">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm leading-snug">{selected.title}</p>
              {selected.subtitle && <p className="text-gray-500 text-xs mt-0.5">{selected.subtitle}</p>}
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex gap-3">
            <a href={selected.navUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1a1745] text-white rounded-xl text-sm font-semibold">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Navigate
            </a>
            <a href={selected.href}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold">
              View Details
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
