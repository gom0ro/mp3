import { useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAudioEngine } from '../hooks/useAudioEngine'
import { TrackCoverImg } from '../utils/cover'

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const icons: Record<string, JSX.Element> = {
    play: <path d="M8 5v14l11-7z" />,
    pause: <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>,
    prev: <><path d="M6 6h2v12H6V6zm3.5 6l8.5-6v12l-8.5-6z" /></>,
    next: <><path d="M18 6h-2v12h2V6zm-3.5 6L6 6v12l8.5-6z" /></>,
  }
  return (
    <span className="inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className="block">{icons[name] || icons.play}</svg>
    </span>
  )
}

export default function PlayerBar({ activeTab, onTabChange }: { activeTab: string; onTabChange: (t: string) => void }) {
  const { track, isPlaying, currentTime, duration, toggle, skip, seek } = useAudioEngine()
  const barRef = useRef<HTMLDivElement>(null)

  const handleSeek = useCallback((e: React.MouseEvent) => {
    if (!duration || !barRef.current) return
    const r = barRef.current.getBoundingClientRect()
    seek(((e.clientX - r.left) / r.width) * duration)
  }, [duration, seek])

  if (!track || activeTab === 'player') return null

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="fixed left-0 right-0 z-50 bg-[#181818] border-t border-white/5 bottom-[56px] md:bottom-0">
      {/* Clickable progress bar */}
      <div
        ref={barRef}
        onClick={handleSeek}
        className="h-1 bg-white/10 w-full cursor-pointer group relative"
      >
        <div
          className="h-full rounded-full bg-white relative"
          style={{ width: `${pct}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-2 max-w-screen-xl mx-auto">
        <div onClick={() => onTabChange('player')} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
          <div className="w-10 h-10 rounded overflow-hidden bg-[#282828] shrink-0">
            <TrackCoverImg track={track} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate max-w-[160px] md:max-w-[240px]">{track.title}</p>
            <p className="text-xs text-[#b3b3b3] truncate max-w-[160px] md:max-w-[240px]">{track.artist}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={(e) => { e.stopPropagation(); skip(-1) }} className="p-1.5 text-white hover:text-white/70 transition-colors cursor-pointer hidden md:block" title="Назад"><Icon name="prev" size={16} /></button>
          <motion.button
            onClick={(e) => { e.stopPropagation(); toggle() }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-transform cursor-pointer"
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={isPlaying ? 18 : 16} />
          </motion.button>
          <button onClick={(e) => { e.stopPropagation(); skip(1) }} className="p-1.5 text-white hover:text-white/70 transition-colors cursor-pointer" title="Вперед"><Icon name="next" size={16} /></button>
        </div>
      </div>
    </div>
  )
}
