'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const SB_URL = 'https://ivsvmldcounkzmbdayth.supabase.co'
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2c3ZtbGRjb3Vua3ptYmRheXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTAwNjcsImV4cCI6MjA5NTQ2NjA2N30.aVwmHz5GL-y_M_NQRUSvZlZrQUMjicZ9gp99frIn12I'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient(SB_URL, SB_KEY)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = '/login'
      } else {
        setReady(true)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
        window.location.href = '/login'
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1745]">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
