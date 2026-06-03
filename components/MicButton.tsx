'use client'

import { useRef, useState } from 'react'

interface Props {
  onText: (transcript: string) => void
  lang?: string
}

// Minimal type shim for browsers that don't include SpeechRecognition in TS lib
type SR = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onresult: ((e: any) => void) | null
  onend: (() => void) | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onerror: ((e: any) => void) | null
}

function getSR(): (new () => SR) | null {
  if (typeof window === 'undefined') return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null
}

export default function MicButton({ onText, lang = 'en-ZA' }: Props) {
  const [listening, setListening] = useState(false)
  const [unsupported, setUnsupported] = useState(false)
  const srRef = useRef<SR | null>(null)

  function toggle() {
    if (listening) {
      srRef.current?.stop()
      setListening(false)
      return
    }

    const SR = getSR()
    if (!SR) {
      setUnsupported(true)
      return
    }

    const sr = new SR()
    sr.lang = lang
    sr.continuous = true
    sr.interimResults = false

    sr.onresult = (e) => {
      // Collect all new final results from this event
      const newText = Array.from({ length: e.results.length }, (_: unknown, i: number) => e.results[i])
        .filter((r: { isFinal: boolean }) => r.isFinal)
        .map((r: { [key: number]: { transcript: string } }) => r[0].transcript)
        .join(' ')
        .trim()
      if (newText) onText(newText)
    }

    sr.onend = () => setListening(false)
    sr.onerror = () => setListening(false)

    srRef.current = sr
    sr.start()
    setListening(true)
  }

  if (unsupported) return null

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? 'Stop recording' : 'Speak to fill this field'}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
        listening
          ? 'bg-red-500 text-white shadow-md'
          : 'bg-gray-100 text-gray-500 hover:bg-purple-50 hover:text-purple-600'
      }`}
    >
      {listening ? (
        <>
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          Listening…
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          Speak
        </>
      )}
    </button>
  )
}
