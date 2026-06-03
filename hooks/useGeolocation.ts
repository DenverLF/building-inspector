'use client'

import { useEffect, useState } from 'react'

export interface GeoPosition {
  lat: number
  lng: number
  accuracy?: number
}

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('GPS not supported on this device')
      setLoading(false)
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      pos => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
        setLoading(false)
        setError(null)
      },
      err => {
        setError(err.message)
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  return { position, error, loading }
}
