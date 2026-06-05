'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const SB_URL = 'https://ivsvmldcounkzmbdayth.supabase.co'
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2c3ZtbGRjb3Vua3ptYmRheXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTAwNjcsImV4cCI6MjA5NTQ2NjA2N30.aVwmHz5GL-y_M_NQRUSvZlZrQUMjicZ9gp99frIn12I'

type Step = 'email' | 'code'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<Step>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function getClient() {
    return createBrowserClient(SB_URL, SB_KEY)
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setError(null)
    setLoading(true)
    try {
      const { error: err } = await getClient().auth.signInWithOtp({ email })
      if (err) { setError(err.message) }
      else { setStep('code') }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    if (!code) return
    setError(null)
    setLoading(true)
    try {
      const { error: err } = await getClient().auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'email',
      })
      if (err) {
        setError(err.message)
      } else {
        // Hard reload so middleware picks up the session cookie
        window.location.href = '/dashboard'
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a1745] px-6 py-10">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-700 flex items-center justify-center shadow-xl mb-5">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white text-center">
            Building Inspection<br />Management
          </h1>
          <p className="text-purple-300 text-sm mt-2">Municipality of Excellence</p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-purple-200 text-sm font-medium mb-1.5">Email address</label>
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
            {error && <div className="rounded-xl bg-red-500/20 border border-red-400/30 px-4 py-3 text-sm text-red-200">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-[#2d1f7a] hover:bg-[#3d2d9e] disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors shadow-lg">
              {loading ? 'Sending…' : 'Send code'}
            </button>
            <p className="text-purple-400/80 text-xs text-center">We'll email you a 6-digit code — no password needed</p>
          </form>

        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="text-center mb-2">
              <p className="text-white font-semibold">Check your email</p>
              <p className="text-purple-300 text-sm mt-1">Enter the 6-digit code sent to</p>
              <p className="text-white text-sm font-bold mt-0.5">{email}</p>
            </div>
            <div>
              <input
                type="number"
                required
                autoComplete="one-time-code"
                inputMode="numeric"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white text-center text-2xl font-bold tracking-[0.5em] placeholder-purple-300/40 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            {error && <div className="rounded-xl bg-red-500/20 border border-red-400/30 px-4 py-3 text-sm text-red-200">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-[#2d1f7a] hover:bg-[#3d2d9e] disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors shadow-lg">
              {loading ? 'Verifying…' : 'Sign In'}
            </button>
            <button type="button" onClick={() => { setStep('email'); setCode(''); setError(null) }}
              className="w-full text-purple-400 text-sm">
              ← Use a different email
            </button>
          </form>
        )}

        <p className="text-purple-400/60 text-xs text-center mt-10">v1.0.0</p>
      </div>
    </div>
  )
}
