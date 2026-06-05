'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [message, setMessage] = useState('Signing you in…')

  useEffect(() => {
    // Use the SSR browser client so the session is stored in cookies
    // which the middleware can read
    const supabase = createBrowserClient(
      'https://ivsvmldcounkzmbdayth.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2c3ZtbGRjb3Vua3ptYmRheXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTAwNjcsImV4cCI6MjA5NTQ2NjA2N30.aVwmHz5GL-y_M_NQRUSvZlZrQUMjicZ9gp99frIn12I',
      { auth: { flowType: 'implicit' } }
    )

    async function handleCallback() {
      try {
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error) {
            // Hard reload so the middleware picks up the new cookie session
            window.location.href = '/dashboard'
            return
          }
        }

        // Handle hash-based implicit flow (#access_token=xxx)
        if (window.location.hash.includes('access_token')) {
          // Give Supabase a moment to process the hash and store the session
          await new Promise(r => setTimeout(r, 1000))
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            window.location.href = '/dashboard'
            return
          }
        }

        // Wait for auth state change (fallback)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (session) {
            subscription.unsubscribe()
            window.location.href = '/dashboard'
          }
        })

        setTimeout(() => {
          subscription.unsubscribe()
          setMessage('Link expired — request a new one')
          setTimeout(() => { window.location.href = '/login' }, 2000)
        }, 8000)

      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Sign in failed')
        setTimeout(() => { window.location.href = '/login' }, 2000)
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a1745] px-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-700 flex items-center justify-center shadow-xl mx-auto mb-6">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white font-semibold text-lg">{message}</p>
        <p className="text-purple-300 text-sm mt-2">Please wait…</p>
      </div>
    </div>
  )
}
