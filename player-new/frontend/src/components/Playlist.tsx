import { useCallback, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { usePlayerStore } from '../store/playerStore'
import { useTracksStore } from '../store/tracksStore'
import { usePlaylistsStore } from '../store/playlistsStore'
import { tracksApi } from '../api/tracks'
import { useLikedTracks } from '../hooks/useLikedTracks'
import { TrackCoverImg } from '../utils/cover'
import { playTrack } from '../hooks/useAudioEngine'

function fmt(s: number) { if (!isFinite(s) || s < 0) return '--:--'; return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}` }

export default function Playlist() {
  const [search, setSearch] = useState('')
  const [menuTrackId, setMenuTrackId] = useState<string | null>(null)
  const tracks = useTracksStore(s => s.tracks)
  const addTrack = useTracksStore(s => s.addTrack)
  const queue = usePlayerStore(s => s.queue)
  const hasTrack = queue.length > 0
  const currentIndex = usePlayerStore(s => s.currentIndex)
  const isPlaying = usePlayerStore(s => s.isPlaying)
  const setQueue = usePlayerStore(s => s.setQueue)
  const setCurrentIndex = usePlayerStore(s => s.setCurrentIndex)
  const addToQueue = usePlayerStore(s => s.addToQueue)
  const { playlists, fetch: fetchPlaylists, addTrack: addTrackToPlaylist, removeTrack: removeTrackFromPlaylist } = usePlaylistsStore()
  const { toggle: toggleLike, isLiked } = useLikedTracks()
  const [contextMenu, setContextMenu] = useState<{ track: Track; x: number; y: number } | null>(null)

  const playNext = useCallback((track: Track) => {
    const newQueue = [...queue]
    const insertAt = currentIndex >= 0 ? currentIndex + 1 : queue.length
    newQueue.splice(insertAt, 0, track)
    const newIndex = currentIndex >= 0 ? currentIndex : 0
    usePlayerStore.setState({ queue: newQueue, currentIndex: newIndex })
  }, [queue, currentIndex])

  // Close context menu on click outside or Escape
  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setContextMenu(null) }
    document.addEventListener('click', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [contextMenu])

  const onDrop = useCallback(async (files: File[]) => {
    const audioFiles = files.filter(f => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|aac|m4a|wma)$/i.test(f.name))
    for (const f of audioFiles) {
      try {
        const { data } = await tracksApi.upload(f)
        addTrack(data)
        addToQueue(data)
      } catch { }
    }
  }, [addToQueue, addTrack])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'audio/*': ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma'] }, multiple: true })

  useEffect(() => {
    tracksApi.list().then(res => useTracksStore.getState().setTracks(res.data.tracks || [])).catch(() => {})
    fetchPlaylists()
  }, [fetchPlaylists])

  const removeTrack = async (id: string) => {
    try { await tracksApi.delete(id); useTracksStore.getState().removeTrack(id) } catch { }
  }

  const filtered = tracks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.artist.toLowerCase().includes(search.toLowerCase()))
  const activeId = queue[currentIndex]?.id

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-white">Треки</h1>
        {tracks.length > 0 && (
          <div className="flex gap-1.5">
            <button onClick={() => { setQueue(filtered); if (filtered[0]) playTrack(filtered[0]) }}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-full transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" width={12} height={12} fill="currentColor"><polygon points="8,5 8,19 19,12" /></svg>
              Play all
            </button>
            <button onClick={() => { const shuffled = [...filtered].sort(() => Math.random() - 0.5); setQueue(shuffled); if (shuffled[0]) playTrack(shuffled[0]) }}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-full transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M16 3h5v5" /><path d="M21 3l-7 7" /><path d="M8 21H3v-5" /><path d="M3 21l7-7" /><path d="M16 21h5v-5" /><path d="M21 21l-3.5-3.5" /><path d="M3 3l3.5 3.5" /></svg>
              Shuffle
            </button>
          </div>
        )}
      </div>

      <div className="relative mb-2">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#535353]">
          <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </span>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Что хочешь послушать?" className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#242424] border border-transparent text-sm font-medium text-white outline-none transition-all focus:border-white/10 focus:bg-[#2a2a2a] placeholder:text-[#535353]" />
      </div>

      <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all mb-2 ${isDragActive ? 'border-green-400 bg-green-500/10' : 'border-[#333] hover:border-white/20 hover:bg-white/[0.02]'}`}>
        <input {...getInputProps()} />
        <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor" className="inline-block text-[#535353] mb-1"><circle cx="6" cy="18" r="3" /><circle cx="16" cy="17" r="3" /><path d="M9 18V5l12-2v13" /></svg>
        <p className="text-sm text-[#b3b3b3] font-medium">Перетащи файлы сюда</p>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[200px] space-y-0.5 scrollbar-thin">
        <AnimatePresence>
          {filtered.map((t, i) => (
            <motion.div key={t.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }}
              onContextMenu={e => { e.preventDefault(); setContextMenu({ track: t, x: e.clientX, y: e.clientY }) }}
              onClick={() => { const idx = queue.findIndex(q => q.id === t.id); if (idx >= 0) { setCurrentIndex(idx); playTrack(t) } else { addToQueue(t); setCurrentIndex(queue.length); playTrack(t) } }}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer transition-colors group ${t.id === activeId ? 'bg-white/5' : 'hover:bg-white/5'}`}
            >
              <div className="w-8 h-8 rounded overflow-hidden bg-[#282828] shrink-0">
                <TrackCoverImg track={t} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold truncate ${t.id === activeId ? 'text-green-400' : 'text-white'}`}>{t.title}</div>
                <div className="text-xs text-[#b3b3b3] truncate">{t.artist}</div>
              </div>
              <span className="text-xs text-[#b3b3b3] font-semibold shrink-0 tabular-nums">{fmt(t.duration)}</span>

              {playlists.length > 0 && (
                <button onClick={e => { e.stopPropagation(); setMenuTrackId(menuTrackId === t.id ? null : t.id) }}
                  className="text-[#535353] hover:text-white p-1 rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
                </button>
              )}

              <button onClick={e => { e.stopPropagation(); toggleLike(t.id) }} className={`p-1 rounded cursor-pointer transition-all opacity-0 group-hover:opacity-100 ${isLiked(t.id) ? 'text-green-400' : 'text-[#535353] hover:text-white'}`}>
                <svg viewBox="0 0 24 24" width={14} height={14} fill={isLiked(t.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
              </button>

              <button onClick={e => { e.stopPropagation(); removeTrack(t.id) }} className="text-[#535353] hover:text-white opacity-0 group-hover:opacity-100 transition-all p-1 rounded cursor-pointer">
                <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {tracks.length > 0 && (
        <div className="flex justify-between items-center py-3 text-xs text-[#535353] font-medium border-t border-white/5 mt-1">
          <span>{tracks.length} треков</span>
          <button onClick={() => { useTracksStore.getState().setTracks([]); setQueue([]) }} className="hover:text-white transition-colors cursor-pointer">Очистить</button>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-[#282828] rounded-lg shadow-2xl border border-white/10 py-1 min-w-[180px]"
            style={{ left: Math.min(contextMenu.x, window.innerWidth - 190), top: Math.min(contextMenu.y, window.innerHeight - 180) }}
          >
            <button onClick={() => { playNext(contextMenu.track); setContextMenu(null) }}
              className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Play next
            </button>
            <button onClick={() => { addToQueue(contextMenu.track); setContextMenu(null) }}
              className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Add to queue
            </button>
            <button onClick={() => { setMenuTrackId(contextMenu.track.id); setContextMenu(null) }}
              className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Add to playlist
            </button>
            <div className="border-t border-white/5 my-1" />
            <button onClick={() => { toggleLike(contextMenu.track.id); setContextMenu(null) }}
              className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              {isLiked(contextMenu.track.id) ? 'Unlike' : 'Like'}
            </button>
          </div>
        </>
      )}

      {/* Playlist picker modal */}
      <AnimatePresence>
        {menuTrackId && playlists.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuTrackId(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-72 bg-[#282828] rounded-xl overflow-hidden shadow-2xl border border-white/5"
            >
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-sm text-[#b3b3b3] font-semibold">Добавить в плейлист</p>
              </div>
              <div className="max-h-[280px] overflow-y-auto scrollbar-thin">
                {playlists.map(p => {
                  const inPlaylist = p.track_ids.includes(menuTrackId)
                  return (
                    <button key={p.id} onClick={async () => {
                      if (inPlaylist) await removeTrackFromPlaylist(p.id, menuTrackId)
                      else await addTrackToPlaylist(p.id, menuTrackId)
                      setMenuTrackId(null)
                    }}
                      className={`flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm transition-colors ${inPlaylist ? 'text-green-400 hover:bg-white/5' : 'text-white hover:bg-white/5'}`}
                    >
                      <span className="flex-1 truncate">{p.name}</span>
                      {inPlaylist && (
                        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
                      )}
                    </button>
                  )
                })}
              </div>
              <button onClick={() => setMenuTrackId(null)} className="w-full px-4 py-2.5 text-sm font-semibold text-[#b3b3b3] hover:text-white border-t border-white/5 transition-colors">
                Отмена
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
