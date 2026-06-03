'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/lib/types'
import { useGeolocation } from '@/hooks/useGeolocation'
import { distanceKm, formatDist, optimiseRoute, mapsRouteUrl, geocodeAddress } from '@/lib/geo'

type RouteTask = Task & { dist: number }

const PRIORITY_COLOR: Record<string, string> = {
  high: 'bg-red-100 text-red-600',
  medium: 'bg-orange-100 text-orange-700',
  low: 'bg-gray-100 text-gray-500',
}

const STAGE_LABEL: Record<string, string> = {
  fire_installation: 'Fire Installation',
  trench: 'Trench',
  drainage: 'Drainage',
  permission_to_use: 'Permission to Use',
  occupation: 'Occupation',
}

export default function RoutePage() {
  const { position, loading: gpsLoading, error: gpsError } = useGeolocation()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [geocoding, setGeocoding] = useState(false)
  const [route, setRoute] = useState<RouteTask[]>([])
  const [totalKm, setTotalKm] = useState(0)
  const [routeUrl, setRouteUrl] = useState('')
  const today = new Date().toISOString().split('T')[0]

  // Load today's open tasks
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .neq('status', 'completed')
        .lte('due_date', today)
        .order('due_date', { ascending: true })
      setTasks((data as Task[]) ?? [])
      setLoading(false)
    }
    load()
  }, [today])

  // Geocode any tasks missing coordinates
  useEffect(() => {
    if (!tasks.length) return
    const missing = tasks.filter(t => t.address && (t.lat == null || t.lng == null))
    if (!missing.length) return

    setGeocoding(true)
    Promise.all(
      missing.map(async t => {
        const coords = await geocodeAddress(t.address!)
        if (coords) {
          const supabase = createClient()
          await supabase.from('tasks').update({
            lat: coords.lat, lng: coords.lng, geocoded_at: new Date().toISOString(),
          }).eq('id', t.id)
          return { ...t, ...coords }
        }
        return t
      })
    ).then(updated => {
      setTasks(prev => prev.map(t => {
        const u = updated.find(x => x.id === t.id)
        return u ? { ...t, lat: u.lat, lng: u.lng } : t
      }))
      setGeocoding(false)
    })
  }, [tasks.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Build optimised route when we have position + tasks with coords
  useEffect(() => {
    if (!position || tasks.length === 0) return

    const geocoded = tasks.filter(t => t.lat != null && t.lng != null) as (Task & { lat: number; lng: number })[]
    if (geocoded.length === 0) return

    const optimised = optimiseRoute(position, geocoded)

    // Calculate cumulative distances
    let prev = position
    let total = 0
    const withDist: RouteTask[] = optimised.map(t => {
      const d = distanceKm(prev.lat, prev.lng, t.lat!, t.lng!)
      total += d
      prev = { lat: t.lat!, lng: t.lng! }
      const result = { ...t, dist: d }
      return result
    })

    setRoute(withDist)
    setTotalKm(total)

    // Build Google Maps multi-stop URL
    const stops = optimised.map(t => ({ lat: t.lat!, lng: t.lng! }))
    setRouteUrl(mapsRouteUrl(position, stops))
  }, [position, tasks])

  const ungeocodedCount = tasks.filter(t => t.address && t.lat == null).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1a1745] px-5 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/dashboard/more" className="text-purple-300 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-white text-xl font-bold">Today's Route</h1>
            <p className="text-purple-300 text-xs mt-0.5">
              {new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>

        {/* Summary bar */}
        {route.length > 0 && (
          <div className="flex items-center gap-4 bg-white/10 rounded-2xl px-4 py-3">
            <div className="text-center">
              <p className="text-white text-xl font-bold">{route.length}</p>
              <p className="text-purple-300 text-xs">stops</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <p className="text-white text-xl font-bold">{totalKm < 1 ? `${Math.round(totalKm * 1000)} m` : `${totalKm.toFixed(1)} km`}</p>
              <p className="text-purple-300 text-xs">total distance</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <p className="text-white text-xl font-bold">~{Math.round(totalKm / 40 * 60)}m</p>
              <p className="text-purple-300 text-xs">est. drive</p>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pt-4 space-y-4 pb-8">
        {/* GPS status */}
        {gpsLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700 flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            Getting your location…
          </div>
        )}
        {gpsError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-xs text-yellow-700">
            ⚠️ Location unavailable — allow GPS access to optimise your route.
          </div>
        )}
        {geocoding && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-xs text-purple-700 flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            Locating {ungeocodedCount} address{ungeocodedCount !== 1 ? 'es' : ''}…
          </div>
        )}

        {/* Loading skeleton */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse h-24" />)}
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-gray-700 font-semibold text-sm">No tasks due today</p>
            <p className="text-gray-400 text-xs mt-1">All caught up!</p>
          </div>
        ) : route.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <p className="text-gray-500 text-sm">
              {gpsLoading
                ? 'Waiting for GPS to optimise your route…'
                : 'Add addresses to tasks to enable route optimisation.'}
            </p>
            {tasks.length > 0 && (
              <p className="text-gray-400 text-xs mt-2">{tasks.length} task{tasks.length !== 1 ? 's' : ''} due today</p>
            )}
          </div>
        ) : (
          <>
            {/* Start Route button */}
            {routeUrl && (
              <a
                href={routeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 bg-[#1a1745] hover:bg-[#2d1f7a] text-white font-bold rounded-2xl text-sm shadow-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Start Full Route in Google Maps
              </a>
            )}

            {/* Optimised stop list */}
            <div className="space-y-0">
              {route.map((task, idx) => (
                <div key={task.id} className="relative">
                  {/* Connector line */}
                  {idx < route.length - 1 && (
                    <div className="absolute left-[27px] top-[52px] bottom-0 w-0.5 bg-gray-200 z-0" />
                  )}
                  <div className="relative flex gap-3 bg-white rounded-2xl p-4 shadow-sm mb-2 z-10">
                    {/* Step number */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                      idx === 0 ? 'bg-green-500' : idx === route.length - 1 ? 'bg-red-500' : 'bg-[#1a1745]'
                    }`}>
                      {idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/dashboard/tasks/${task.id}`} className="flex-1 min-w-0">
                          <p className="text-gray-900 font-bold text-sm leading-tight">{task.title}</p>
                          {task.address && (
                            <p className="text-gray-500 text-xs mt-0.5 truncate">{task.address}</p>
                          )}
                        </Link>
                        {/* Navigate button for this stop */}
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${task.lat},${task.lng}&travelmode=driving`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex-shrink-0 bg-[#1a1745] text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                          Go
                        </a>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        {idx > 0 && (
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-semibold">
                            +{formatDist(task.dist)}
                          </span>
                        )}
                        {idx === 0 && position && (
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-semibold">
                            {formatDist(task.dist)} from you
                          </span>
                        )}
                        {task.priority && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PRIORITY_COLOR[task.priority]}`}>
                            {task.priority}
                          </span>
                        )}
                        {task.inspection_stage && (
                          <span className="text-xs text-gray-400">{STAGE_LABEL[task.inspection_stage]}</span>
                        )}
                        {task.assigned_inspector && (
                          <span className="text-xs text-[#1a1745] font-medium truncate">{task.assigned_inspector}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tasks without addresses */}
            {tasks.filter(t => !t.address).length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                <p className="text-xs font-semibold text-yellow-700 mb-2">Not included in route (no address):</p>
                <div className="space-y-1">
                  {tasks.filter(t => !t.address).map(t => (
                    <Link key={t.id} href={`/dashboard/tasks/${t.id}`} className="block">
                      <p className="text-xs text-yellow-700 hover:underline">• {t.title}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
