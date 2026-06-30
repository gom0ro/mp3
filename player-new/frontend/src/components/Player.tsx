import { useState } from 'react'
import { useAudioEngine } from '../hooks/useAudioEngine'
import { usePlayerStore } from '../store/playerStore'
import ProgressBar from './ProgressBar'
import VolumeControl from './VolumeControl'
import SleepTimer from './SleepTimer'
import { TrackCoverImg } from '../utils/cover'

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const icons: Record<string, JSX.Element> = {
    play: <path d="M8 5v14l11-7z" />,
    pause: <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>,
    prev: <><path d="M6 6h2v12H6V6zm3.5 6l8.5-6v12l-8.5-6z" /></>,
    next: <><path d="M18 6h-2v12h2V6zm-3.5 6L6 6v12l8.5-6z" /></>,
    shuffle: <><path d="M16 3h5v5" /><path d="M21 3l-7 7" /><path d="M8 21H3v-5" /><path d="M3 21l7-7" /><path d="M16 21h5v-5" /><path d="M21 21l-3.5-3.5" /><path d="M3 3l3.5 3.5" /></>,
    repeat: <><path d="M17 2l4 4-4 4" /><path d="M3 11v-1a4 4 0 014-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v1a4 4 0 01-4 4H3" /></>,
    repeatOne: <><path d="M17 2l4 4-4 4" /><path d="M3 11v-1a4 4 0 014-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v1a4 4 0 01-4 4H3" /><text x="12" y="15" textAnchor="middle" fill="currentColor" stroke="none" fontSize="8" fontWeight="bold">1</text></>,
    queue: <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>,
    queueMusic: <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /><circle cx="18" cy="16" r="2" fill="currentColor" /><circle cx="8" cy="18" r="2" fill="currentColor" /></>,
  }
  return (
    <span className="inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size} height={size} fill={['shuffle', 'repeat', 'repeatOne', 'queue', 'queueMusic'].includes(name) ? 'none' : 'currentColor'} stroke={['shuffle', 'repeat', 'repeatOne', 'queue', 'queueMusic'].includes(name) ? 'currentColor' : undefined} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="block">{icons[name] || icons.play}</svg>
    </span>
  )
}

export default function Player() {
  const {
    track, nextTrack,
    isPlaying, currentTime, duration, volume, repeatMode, shuffle, queue, currentIndex,
    toggle, seek, setVol, skip, cycleRepeat, toggleShuffle,
    setCurrentIndex,
  } = useAudioEngine()
  const removeFromQueue = usePlayerStore(s => s.removeFromQueue)
  const reorderQueue = usePlayerStore(s => s.reorderQueue)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  if (!track) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-32 h-32 rounded-xl bg-[#282828] flex items-center justify-center mb-4 shadow-xl">
          <svg viewBox="0 0 24 24" width={56} height={56} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-[#535353]"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
        </div>
        <p className="text-lg font-bold text-[#535353]">Нет активного трека</p>
        <p className="text-sm text-[#535353] mt-1">Выберите трек из списка</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 items-center">
      {/* Album art */}
      <div className="w-56 h-56 md:w-64 md:h-64 rounded-xl overflow-hidden bg-[#282828] flex items-center justify-center shadow-2xl">
        <TrackCoverImg track={track} className="w-full h-full object-cover" />
      </div>

      {/* Now playing indicator */}
      {isPlaying && (
        <div className="flex gap-1 items-center">
          <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
          <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
          <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
          <span className="text-xs text-[#535353] ml-2 font-semibold tracking-wider uppercase">Сейчас играет</span>
        </div>
      )}

      {/* Track info */}
      <div className="text-center w-full">
        <h2 className="text-2xl font-bold text-white truncate max-w-xs mx-auto">{track.title}</h2>
        <p className="text-sm text-[#b3b3b3] mt-0.5 truncate max-w-xs mx-auto">{track.artist}</p>
      </div>

      {/* Progress */}
      <div className="w-full max-w-sm">
        <ProgressBar currentTime={currentTime} duration={duration} onSeek={seek} />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 md:gap-6">
        <button onClick={toggleShuffle} className={`p-2 rounded-full transition-colors cursor-pointer ${shuffle ? 'text-green-400' : 'text-[#535353] hover:text-white'}`} title="Перемешать"><Icon name="shuffle" size={20} /></button>
        <button onClick={() => skip(-1)} className="p-2 text-white hover:text-white/70 transition-colors cursor-pointer" title="Назад"><Icon name="prev" size={24} /></button>
        <button
          onClick={toggle}
          className="w-14 h-14 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-transform cursor-pointer shadow-xl"
        >
          <Icon name={isPlaying ? 'pause' : 'play'} size={isPlaying ? 28 : 24} />
        </button>
        <button onClick={() => skip(1)} className="p-2 text-white hover:text-white/70 transition-colors cursor-pointer" title="Вперед"><Icon name="next" size={24} /></button>
        <button onClick={cycleRepeat} className={`p-2 rounded-full transition-colors cursor-pointer ${repeatMode > 0 ? 'text-green-400' : 'text-[#535353] hover:text-white'}`} title="Повтор"><Icon name={repeatMode > 0 ? 'repeatOne' : 'repeat'} size={20} /></button>
      </div>

      {/* Volume & Sleep Timer */}
      <div className="flex items-center justify-center max-w-xs mx-auto w-full">
        <VolumeControl volume={volume} onVolumeChange={setVol} />
        <SleepTimer />
      </div>

      {/* Queue */}
      <div className="mt-2 w-full">
        <h3 className="text-sm font-semibold text-[#b3b3b3] mb-3 flex items-center gap-2">
          <Icon name="queueMusic" size={16} />
          Очередь ({queue.length})
        </h3>
        <div className="space-y-0.5 max-h-[300px] overflow-y-auto scrollbar-thin">
          {queue.map((t, i) => (
            <div
              key={t.id + i}
              draggable={true}
              onDragStart={() => setDragIndex(i)}
              onDragOver={e => { e.preventDefault(); setDragOverIndex(i) }}
              onDrop={() => { if (dragIndex !== null) { reorderQueue(dragIndex, i); setDragIndex(null); setDragOverIndex(null) } }}
              onDragEnd={() => { setDragIndex(null); setDragOverIndex(null) }}
              onClick={() => setCurrentIndex(i)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${i === currentIndex ? 'bg-white/5' : 'hover:bg-white/5'} ${dragIndex === i ? 'opacity-50' : ''} ${dragOverIndex === i && dragIndex !== i ? 'border-t-2 border-green-500' : 'border-t-2 border-transparent'}`}
            >
              <span className="group-hover:opacity-100 opacity-0 transition-opacity text-[#535353] shrink-0" title="Перетащить">
                <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
              </span>
              <span className="text-sm font-semibold text-[#535353] w-6 tabular-nums text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${i === currentIndex ? 'text-green-400' : 'text-white'}`}>{t.title}</p>
                <p className="text-xs text-[#b3b3b3] truncate">{t.artist}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); removeFromQueue(t.id) }}
                className="p-1 text-[#535353] hover:text-white/70 transition-colors cursor-pointer shrink-0"
                title="Удалить из очереди"
              >
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
