'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import 'leaflet/dist/leaflet.css'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/inspectors'

interface InspectorLocation {
  id: string
  inspector_name: string
  lat: number
  lng: number
  accuracy: number
  recorded_at: string
}

// Distinct colours for up to 13 inspectors
const COLOURS = [
  '#1a1745','#7c3aed','#0891b2','#059669','#d97706',
  '#dc2626','#db2777','#65a30d','#0284c7','#9333ea',
  '#ea580c','#16a34a','#0d9488',
]

function minsAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'just now'
  if (diff === 1) return '1 min ago'
  if (diff < 60) return `${diff} mins ago`
  const h = Math.floor(diff / 60)
  return `${h}h ${diff % 60}m ago`
}

function isRecent(iso: string) {
  return Date.now() - new Date(iso).getTime() < 10 * 60 * 1000 // within 10 min
}

function makeIcon(L: typeof import('leaflet'), color: string, label: string) {
  return L.divIcon({
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
    html: `
      <div style="width:36px;height:36px;border-radius:50%;background:${color};border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;
        color:white;font-size:11px;font-weight:700;font-family:sans-serif;">
        ${label}
      </div>`,
  })
}

export default function TrackingView() {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Record<string, any>>({})

  const [locations, setLocations] = useState<InspectorLocation[]>([])
  const [selected, setSelected] = useState<InspectorLocation | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Load latest location per inspector
  const loadLocations = useCallback(async () => {
    const supabase = createClient()
    // Get most recent record per inspector using a simple query + client-side dedup
    const { data } = await supabase
      .from('inspector_locations')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(200)

    if (!data) return

    // Keep only most recent per inspector
    const seen = new Set<string>()
    const latest: InspectorLocation[] = []
    for (const row of data as InspectorLocation[]) {
      if (!seen.has(row.inspector_name)) {
        seen.add(row.inspector_name)
        latest.push(row)
      }
    }
    setLocations(latest)
    setLastRefresh(new Date())
  }, [])

  useEffect(() => {
    loadLocations()
    // Refresh every 30 seconds
    const timer = setInterval(loadLocations, 30_000)
    return () => clearInterval(timer)
  }, [loadLocations])

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    import('leaflet').then(L => {
      leafletRef.current = L
      const map = L.map(mapRef.current!, { zoomControl: false })
        .setView([-33.9249, 18.4241], 11)
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

  // Update markers when locations change
  useEffect(() => {
    const L = leafletRef.current
    const map = mapInstanceRef.current
    if (!L || !map || locations.length === 0) return

    const seen = new Set<string>()

    locations.forEach((loc, idx) => {
      seen.add(loc.inspector_name)
      const color = COLOURS[idx % COLOURS.length]
      const initials = getInitials(loc.inspector_name)
      const icon = makeIcon(L, isRecent(loc.recorded_at) ? color : '#9ca3af', initials)

      if (markersRef.current[loc.inspector_name]) {
        markersRef.current[loc.inspector_name]
          .setLatLng([loc.lat, loc.lng])
          .setIcon(icon)
      } else {
        markersRef.current[loc.inspector_name] = L.marker([loc.lat, loc.lng], { icon })
          .addTo(map)
          .on('click', () => setSelected(loc))
      }
    })

    // Remove markers for inspectors no longer in list
    Object.keys(markersRef.current).forEach(name => {
      if (!seen.has(name)) {
        markersRef.current[name].remove()
        delete markersRef.current[name]
      }
    })

    // Fit bounds
    const coords = locations.map(l => [l.lat, l.lng] as [number, number])
    if (coords.length > 0) {
      map.fitBounds(L.latLngBounds(coords), { padding: [50, 50], maxZoom: 14 })
    }
  }, [locations])

  // Update selected when locations refresh
  useEffect(() => {
    if (!selected) return
    const updated = locations.find(l => l.inspector_name === selected.inspector_name)
    if (updated) setSelected(updated)
  }, [locations]) // eslint-disable-line react-hooks/exhaustive-deps

  const active = locations.filter(l => isRecent(l.recorded_at))

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Status bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur rounded-full px-4 py-2 shadow text-xs font-medium text-gray-700 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${active.length > 0 ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`} />
        {active.length} of {locations.length} inspectors active · refreshes every 30s
      </div>

      {/* Inspector list panel */}
      {locations.length > 0 && !selected && (
        <div className="absolute bottom-0 inset-x-0 z-[1000] bg-white rounded-t-3xl shadow-2xl max-h-64 overflow-y-auto">
          <div className="px-5 pt-4 pb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Inspector Locations · updated {minsAgo(lastRefresh.toISOString())}
            </p>
            <div className="space-y-2 pb-4">
              {locations.map((loc, idx) => (
                <button
                  key={loc.inspector_name}
                  onClick={() => {
                    setSelected(loc)
                    mapInstanceRef.current?.setView([loc.lat, loc.lng], 15)
                  }}
                  className="w-full flex items-center gap-3 py-2 text-left"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: isRecent(loc.recorded_at) ? COLOURS[idx % COLOURS.length] : '#9ca3af' }}
                  >
                    {getInitials(loc.inspector_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{loc.inspector_name}</p>
                    <p className={`text-xs ${isRecent(loc.recorded_at) ? 'text-green-600' : 'text-gray-400'}`}>
                      {isRecent(loc.recorded_at) ? '● ' : '○ '}{minsAgo(loc.recorded_at)}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selected inspector detail */}
      {selected && (
        <div className="absolute bottom-0 inset-x-0 z-[1000] bg-white rounded-t-3xl shadow-2xl p-5 pb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ background: isRecent(selected.recorded_at) ? COLOURS[locations.findIndex(l => l.inspector_name === selected.inspector_name) % COLOURS.length] : '#9ca3af' }}
              >
                {getInitials(selected.inspector_name)}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{selected.inspector_name}</p>
                <p className={`text-xs ${isRecent(selected.recorded_at) ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  {isRecent(selected.recorded_at) ? '● Active · ' : '● Last seen '}
                  {minsAgo(selected.recorded_at)}
                </p>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 bg-[#1a1745] text-white rounded-xl text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              View on Map
            </a>
            <a
              href={`/dashboard/inspectors/${selected.inspector_name.toLowerCase().replace(/\s+/g, '-')}`}
              className="flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold"
            >
              View Profile
            </a>
          </div>
        </div>
      )}

      {locations.length === 0 && (
        <div className="absolute inset-0 flex items-end justify-center z-[1000] pb-16 pointer-events-none">
          <div className="bg-white/90 backdrop-blur rounded-2xl px-6 py-4 shadow text-center pointer-events-auto">
            <p className="text-gray-700 font-semibold text-sm">No inspectors sharing location</p>
            <p className="text-gray-400 text-xs mt-1">Inspectors enable this in More → Share my location</p>
          </div>
        </div>
      )}
    </div>
  )
}
