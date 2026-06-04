'use client'

import { useState } from 'react'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

type Step = 'email' | 'sent'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<Step>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setError(null)
    setLoading(true)
    try {
      const supabase = createSupabaseClient(
        'https://ivsvmldcounkzmbdayth.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2c3ZtbGRjb3Vua3ptYmRheXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTAwNjcsImV4cCI6MjA5NTQ2NjA2N30.aVwmHz5GL-y_M_NQRUSvZlZrQUMjicZ9gp99frIn12I'
      )
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (err) {
        setError(err.message)
      } else {
        setStep('sent')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a1745] px-6 py-10">
      <div className="w-full max-w-sm">

        {/* Icon + title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-700 flex items-center justify-center shadow-xl mb-5">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white text-center leading-tight">
            Building Inspection<br />Management
          </h1>
          <p className="text-purple-300 text-sm mt-2 text-center">
            Municipality of Excellence
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-purple-200 text-sm font-medium mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="inspector@municipality.gov.za"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-purple-300/70 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/20 border border-red-400/30 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#2d1f7a] hover:bg-[#3d2d9e] disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors shadow-lg mt-2"
            >
              {loading ? 'Sending link…' : 'Send login link'}
            </button>

            <p className="text-purple-400/80 text-xs text-center mt-2">
              No password needed — we email you a login link
            </p>
          </form>

        ) : (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-lg">Check your email</p>
              <p className="text-purple-300 text-sm mt-2">
                We sent a login link to
              </p>
              <p className="text-white font-semibold text-sm mt-1">{email}</p>
              <p className="text-purple-300 text-sm mt-3">
                Open the email and tap the link to sign in. The link works for 1 hour.
              </p>
            </div>
            <button
              onClick={() => { setStep('email'); setError(null) }}
              className="text-purple-400 text-sm underline"
            >
              Use a different email
            </button>
          </div>
        )}

        <p className="text-purple-400/60 text-xs text-center mt-10">v1.0.0</p>
      </div>
    </div>
  )
}
