import { useRef, useCallback } from 'react'

interface Props {
  currentTime: number
  duration: number
  onSeek: (time: number) => void
}

function fmt(s: number) {
  if (!isFinite(s) || s < 0) return '0:00'
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

export default function ProgressBar({ currentTime, duration, onSeek }: Props) {
  const barRef = useRef<HTMLDivElement>(null)
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!duration || !barRef.current) return
    const r = barRef.current.getBoundingClientRect()
    onSeek(((e.clientX - r.left) / r.width) * duration)
  }, [duration, onSeek])

  return (
    <div className="flex items-center gap-2 text-[11px] font-medium text-[#b3b3b3] tabular-nums w-full select-none">
      <span className="w-8 text-right">{fmt(currentTime)}</span>
      <div
        ref={barRef}
        onClick={handleClick}
        className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer relative group"
      >
        <div
          className="h-full rounded-full bg-white relative group-hover:bg-green-400 transition-colors"
          style={{ width: `${pct}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <span className="w-8">{fmt(duration)}</span>
    </div>
  )
}
