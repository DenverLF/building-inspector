// Geo utilities — geocoding, distance, navigation, route optimisation

/** Haversine straight-line distance between two coordinates (km) */
export function distanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Human-readable distance string */
export function formatDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

/** Google Maps turn-by-turn navigation URL from coordinates */
export function navigateToUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
}

/** Google Maps turn-by-turn navigation URL from address string (fallback) */
export function navigateToAddressUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address + ', South Africa')}&travelmode=driving`
}

/** Google Maps URL for a full multi-stop route (up to 9 waypoints) */
export function mapsRouteUrl(
  origin: { lat: number; lng: number },
  stops: { lat: number; lng: number }[]
): string {
  if (stops.length === 0) return ''
  const dest = stops[stops.length - 1]
  const waypoints = stops.slice(0, -1).map(s => `${s.lat},${s.lng}`).join('|')
  const base = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}&travelmode=driving`
  return waypoints ? `${base}&waypoints=${encodeURIComponent(waypoints)}` : base
}

/** Geocode a South African address using OpenStreetMap Nominatim (free, no key) */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(address + ', South Africa')
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&countrycodes=za`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MunicipalityBuildingInspector/1.0' },
    })
    if (!res.ok) return null
    const data: { lat: string; lon: string }[] = await res.json()
    if (!data.length) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

/** Nearest-neighbour route optimisation — O(n²), instant for n ≤ 50 */
export function optimiseRoute<T extends { lat: number; lng: number }>(
  origin: { lat: number; lng: number },
  points: T[]
): T[] {
  const unvisited = [...points]
  const route: T[] = []
  let current = origin

  while (unvisited.length > 0) {
    let nearestIdx = 0
    let nearestDist = Infinity
    for (let i = 0; i < unvisited.length; i++) {
      const d = distanceKm(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng)
      if (d < nearestDist) { nearestDist = d; nearestIdx = i }
    }
    route.push(unvisited[nearestIdx])
    current = unvisited[nearestIdx]
    unvisited.splice(nearestIdx, 1)
  }

  return route
}
