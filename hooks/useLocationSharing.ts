'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const INTERVAL_MS = 60_000 // push location every 60 s

export function useLocationSharing(inspectorName: string | null | undefined) {
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const watchRef = useRef<number | null>(null)
  const latestPos = useRef<{ lat: number; lng: number; accuracy: number } | null>(null)

  async function push() {
    if (!latestPos.current || !inspectorName) return
    try {
      const supabase = createClient()
      await supabase.from('inspector_locations').insert({
        inspector_name: inspectorName,
        lat: latestPos.current.lat,
        lng: latestPos.current.lng,
        accuracy: latestPos.current.accuracy,
        recorded_at: new Date().toISOString(),
      })
    } catch { /* silent — don't interrupt the inspector's workflow */ }
  }

  function start() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('GPS not supported')
      return
    }
    setError(null)
    setSharing(true)

    // Watch position
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        latestPos.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }
      },
      () => { /* ignore individual watch errors */ },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )

    // Push immediately then every 60 s
    push()
    intervalRef.current = setInterval(push, INTERVAL_MS)
  }

  function stop() {
    setSharing(false)
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    if (intervalRef.current !== null) clearInterval(intervalRef.current)
    watchRef.current = null
    intervalRef.current = null
    latestPos.current = null
  }

  // Cleanup on unmount
  useEffect(() => () => stop(), []) // eslint-disable-line react-hooks/exhaustive-deps

  return { sharing, error, start, stop }
}
