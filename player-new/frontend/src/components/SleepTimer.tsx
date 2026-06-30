import { useState, useRef, useEffect, useCallback } from 'react'
import { _audio } from '../hooks/useAudioEngine'

type TimerOption = '15min' | '30min' | '45min' | '60min' | 'endOfTrack' | 'off'

interface TimerState {
  type: TimerOption
  remaining: number | null
  endOfTrack: boolean
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const options: { label: string; value: TimerOption }[] = [
  { label: '15 min', value: '15min' },
  { label: '30 min', value: '30min' },
  { label: '45 min', value: '45min' },
  { label: '60 min', value: '60min' },
  { label: 'End of track', value: 'endOfTrack' },
  { label: 'Off', value: 'off' },
]

export default function SleepTimer() {
  const [open, setOpen] = useState(false)
  const [timer, setTimer] = useState<TimerState>({ type: 'off', remaining: null, endOfTrack: false })
  const intervalRef = useRef<number | null>(null)
  const endedHandlerRef = useRef<(() => void) | null>(null)

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (endedHandlerRef.current !== null) {
      _audio.removeEventListener('ended', endedHandlerRef.current)
      endedHandlerRef.current = null
    }
  }, [])

  const setSleepTimer = useCallback((option: TimerOption) => {
    clearTimer()
    setOpen(false)

    if (option === 'off') {
      setTimer({ type: 'off', remaining: null, endOfTrack: false })
      return
    }

    if (option === 'endOfTrack') {
      const handler = () => {
        _audio.pause()
        setTimer({ type: 'off', remaining: null, endOfTrack: false })
        if (endedHandlerRef.current) {
          _audio.removeEventListener('ended', endedHandlerRef.current)
          endedHandlerRef.current = null
        }
      }
      endedHandlerRef.current = handler
      _audio.addEventListener('ended', handler)
      setTimer({ type: 'endOfTrack', remaining: null, endOfTrack: true })
      return
    }

    const minutes = parseInt(option.replace('min', ''))
    const total = minutes * 60
    setTimer({ type: option, remaining: total, endOfTrack: false })

    intervalRef.current = window.setInterval(() => {
      setTimer(prev => {
        if (prev.remaining === null || prev.remaining <= 1) {
          _audio.pause()
          clearTimer()
          return { type: 'off', remaining: null, endOfTrack: false }
        }
        return { ...prev, remaining: prev.remaining - 1 }
      })
    }, 1000)
  }, [clearTimer])

  const cancel = useCallback(() => {
    clearTimer()
    setTimer({ type: 'off', remaining: null, endOfTrack: false })
    setOpen(false)
  }, [clearTimer])

  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`p-2 rounded-full transition-colors cursor-pointer ${timer.type !== 'off' ? 'text-green-400' : 'text-[#b3b3b3] hover:text-white'}`}
        title="Sleep timer"
      >
        <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </button>

      {timer.type !== 'off' && !open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#282828] rounded-lg shadow-xl whitespace-nowrap flex items-center gap-2">
          <span className="text-xs text-[#b3b3b3]">
            {timer.endOfTrack ? 'End of track' : formatTime(timer.remaining!)}
          </span>
          <button onClick={cancel} className="text-xs text-red-400 hover:text-red-300 cursor-pointer">Cancel</button>
        </div>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-[#282828] border border-[#404040] rounded-xl shadow-2xl py-2 min-w-[160px]">
            <div className="px-3 pb-2 mb-1 border-b border-[#404040]">
              <span className="text-xs font-semibold text-[#b3b3b3] uppercase tracking-wider">Sleep Timer</span>
            </div>
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSleepTimer(opt.value)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer ${
                  timer.type === opt.value
                    ? 'text-green-400 bg-white/5'
                    : 'text-white hover:bg-white/5'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
