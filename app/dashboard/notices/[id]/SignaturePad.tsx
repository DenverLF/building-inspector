'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  noticeId: string
  signatureType: 'owner_signature_path' | 'inspector_signature_path'
  label: string
  existingPath: string | null
  onSaved: (path: string) => void
}

function toPos(
  e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement
) {
  const rect = canvas.getBoundingClientRect()
  const sx = canvas.width / rect.width
  const sy = canvas.height / rect.height
  if ('touches' in e) {
    return { x: (e.touches[0].clientX - rect.left) * sx, y: (e.touches[0].clientY - rect.top) * sy }
  }
  return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy }
}

export default function SignaturePad({ noticeId, signatureType, label, existingPath, onSaved }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [empty, setEmpty] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [resigning, setResigning] = useState(false)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const existingUrl = existingPath
    ? `${supabaseUrl}/storage/v1/object/public/notice-files/${existingPath}?t=${Date.now()}`
    : null

  function startDraw(e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    setDrawing(true)
    setEmpty(false)
    lastPos.current = toPos(e, canvas)
  }

  function draw(e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = toPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1a1745'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
  }

  function stopDraw() {
    setDrawing(false)
    lastPos.current = null
  }

  function clear() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setEmpty(true)
    setConfirmed(false)
  }

  async function save() {
    const canvas = canvasRef.current
    if (!canvas || empty) return
    setSaving(true)
    canvas.toBlob(async (blob) => {
      if (!blob) { setSaving(false); return }
      const supabase = createClient()
      const path = `notices/${noticeId}/${signatureType}.png`
      const { error } = await supabase.storage
        .from('notice-files')
        .upload(path, blob, { contentType: 'image/png', upsert: true })
      if (!error) {
        await supabase.from('notices').update({ [signatureType]: path }).eq('id', noticeId)
        onSaved(path)
        setConfirmed(true)
      }
      setSaving(false)
    }, 'image/png')
  }

  const showPad = !existingUrl || resigning

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      {!showPad && existingUrl ? (
        <div className="relative border border-gray-200 rounded-xl overflow-hidden bg-white">
          <img src={existingUrl} alt={label} className="w-full h-24 object-contain p-2" />
          <button
            onClick={() => { setResigning(true); clear() }}
            className="absolute top-2 right-2 text-xs text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-lg"
          >
            Re-sign
          </button>
        </div>
      ) : (
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={600}
            height={160}
            className="w-full h-24 border-2 border-dashed border-gray-300 rounded-xl bg-white cursor-crosshair touch-none"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
          {empty && (
            <p className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm pointer-events-none select-none">
              Sign here with your finger
            </p>
          )}
        </div>
      )}

      {showPad && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={clear}
            disabled={empty}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-500 text-xs font-semibold disabled:opacity-40"
          >
            Clear
          </button>
          {confirmed ? (
            <div className="flex-1 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-semibold text-center">✓ Saved</div>
          ) : (
            <button
              onClick={save}
              disabled={empty || saving}
              className="flex-1 py-2 rounded-xl bg-[#1a1745] text-white text-xs font-semibold disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save Signature'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
