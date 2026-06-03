'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  onCapture: (file: File) => void
  onClose: () => void
}

export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    startCamera()
    return () => stopStream()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startCamera() {
    setError(null)
    setReady(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => setReady(true)
      }
    } catch {
      setError('Camera access was denied.\nPlease allow camera access in your browser settings and try again.')
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  function capture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    setPreview(canvas.toDataURL('image/jpeg', 0.92))
    stopStream()
  }

  function retake() {
    setPreview(null)
    startCamera()
  }

  function accept() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
      onCapture(file)
      stopStream()
      onClose()
    }, 'image/jpeg', 0.92)
  }

  function handleClose() {
    stopStream()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {error ? (
        /* Error state */
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-2">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
          </div>
          <p className="text-white text-sm whitespace-pre-line">{error}</p>
          <button onClick={handleClose}
            className="mt-2 bg-white text-gray-900 px-8 py-3 rounded-2xl font-semibold text-sm">
            Close
          </button>
        </div>

      ) : !preview ? (
        /* Live viewfinder */
        <>
          <div className="relative flex-1 overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Top bar */}
            <div className="absolute top-0 inset-x-0 flex items-center justify-between px-5 pt-12 pb-4 bg-gradient-to-b from-black/60 to-transparent">
              <button onClick={handleClose} className="text-white flex items-center gap-2 text-sm font-medium">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
              <p className="text-white text-sm font-medium opacity-80">Tap the button to capture</p>
              <div className="w-16" />
            </div>
            {/* Loading overlay */}
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          {/* Shutter bar */}
          <div className="flex items-center justify-center gap-8 py-8 bg-black">
            <div className="w-16" />
            <button
              onClick={capture}
              disabled={!ready}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
            >
              <div className="w-14 h-14 rounded-full bg-white" />
            </button>
            <div className="w-16" />
          </div>
        </>

      ) : (
        /* Preview */
        <>
          <div className="relative flex-1 overflow-hidden">
            <img src={preview} alt="Captured photo" className="w-full h-full object-contain bg-black" />
            <div className="absolute top-0 inset-x-0 flex items-center px-5 pt-12 pb-4 bg-gradient-to-b from-black/60 to-transparent">
              <p className="text-white text-sm font-medium">Photo preview</p>
            </div>
          </div>
          <div className="flex gap-4 px-6 py-6 pb-10 bg-black">
            <button onClick={retake}
              className="flex-1 py-4 rounded-2xl border-2 border-white/60 text-white font-semibold text-sm active:opacity-80">
              Retake
            </button>
            <button onClick={accept}
              className="flex-1 py-4 rounded-2xl bg-white text-gray-900 font-bold text-sm active:opacity-80">
              Use Photo
            </button>
          </div>
        </>
      )}
    </div>
  )
}
