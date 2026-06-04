'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [message, setMessage] = useState('Signing you in…')

  useEffect(() => {
    const supabase = createSupabaseClient(
      'https://ivsvmldcounkzmbdayth.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2c3ZtbGRjb3Vua3ptYmRheXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTAwNjcsImV4cCI6MjA5NTQ2NjA2N30.aVwmHz5GL-y_M_NQRUSvZlZrQUMjicZ9gp99frIn12I',
      { auth: { persistSession: true, detectSessionInUrl: true } }
    )

    async function handleCallback() {
      try {
        // Handle PKCE code flow (?code=xxx)
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error) {
            router.replace('/dashboard')
            return
          }
          setMessage('Link expired. Please request a new one.')
          setTimeout(() => router.replace('/login'), 2000)
          return
        }

        // Handle implicit / hash flow (#access_token=xxx)
        const hash = window.location.hash
        if (hash && hash.includes('access_token')) {
          // Let Supabase pick up the hash tokens automatically
          const { data: { session }, error } = await supabase.auth.getSession()
          if (session && !error) {
            router.replace('/dashboard')
            return
          }
        }

        // Listen for auth state change (covers all flows)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
            subscription.unsubscribe()
            router.replace('/dashboard')
          }
        })

        // If nothing happened after 5s, send back to login
        setTimeout(() => {
          subscription.unsubscribe()
          setMessage('Link expired. Redirecting to login…')
          setTimeout(() => router.replace('/login'), 1500)
        }, 5000)

      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Sign in failed')
        setTimeout(() => router.replace('/login'), 2000)
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a1745] px-6">
      <div className="text-center">
        <div className="w-12 h-12 border-3 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-6"
          style={{ borderWidth: '3px' }} />
        <p className="text-white font-semibold text-lg">{message}</p>
        <p className="text-purple-300 text-sm mt-2">Please wait…</p>
      </div>
    </div>
  )
}
