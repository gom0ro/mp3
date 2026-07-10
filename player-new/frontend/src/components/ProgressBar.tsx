import { useRef, useCallback, useEffect, useState } from 'react'

interface Props {
  currentTime: number
  duration: number
  waveform?: number[]
  onSeek: (time: number) => void
}

function fmt(s: number) {
  if (!isFinite(s) || s < 0) return '0:00'
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

export default function ProgressBar({ currentTime, duration, waveform, onSeek }: Props) {
  const barRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [dragPct, setDragPct] = useState(0)

  const getTimeFromEvent = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!duration || !barRef.current) return 0
    const r = barRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * duration
  }, [duration])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!duration) return
    setDragging(true)
    const t = getTimeFromEvent(e)
    setDragPct(duration > 0 ? (t / duration) * 100 : 0)
    onSeek(t)

    const onMove = (ev: MouseEvent) => {
      const t2 = getTimeFromEvent(ev)
      setDragPct(duration > 0 ? (t2 / duration) * 100 : 0)
      onSeek(t2)
    }
    const onUp = () => {
      setDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [duration, onSeek, getTimeFromEvent])

  useEffect(() => {
    return () => {
      setDragging(false)
    }
  }, [])

  const pct = dragging ? dragPct : (duration > 0 ? (currentTime / duration) * 100 : 0)
  const hasWaveform = waveform && waveform.length > 0

  return (
    <div className="flex items-center gap-2 text-[11px] font-medium text-[#b3b3b3] tabular-nums w-full select-none">
      <span className="w-8 text-right">{fmt(currentTime)}</span>
      <div
        ref={barRef}
        onMouseDown={handleMouseDown}
        className={`flex-1 cursor-pointer relative group flex items-center ${hasWaveform ? 'h-10' : 'h-1 bg-white/10 rounded-full'}`}
      >
        {hasWaveform ? (
          <div className="w-full h-full flex items-center justify-between gap-[1px] md:gap-[2px]">
            {waveform.map((val, i) => {
              const isActive = (i / waveform.length) * 100 <= pct;
              return (
                <div 
                  key={i} 
                  className={`flex-1 rounded-full transition-colors ${isActive ? (dragging ? 'bg-green-400' : 'bg-white group-hover:bg-green-400') : 'bg-white/20'}`} 
                  style={{ height: `${Math.max(10, val * 100)}%` }} 
                />
              )
            })}
          </div>
        ) : (
          <div
            className="h-full rounded-full bg-white relative group-hover:bg-green-400 transition-colors"
            style={{ width: `${pct}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" style={dragging ? { opacity: 1 } : undefined} />
          </div>
        )}
      </div>
      <span className="w-8">{fmt(duration)}</span>
    </div>
  )
}
