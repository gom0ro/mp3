import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayerStore } from '../store/playerStore'
import { useTracksStore } from '../store/tracksStore'
import { usePlaylistsStore } from '../store/playlistsStore'
import { tracksApi } from '../api/tracks'
import { TrackCoverImg } from '../utils/cover'
import { playTrack } from '../hooks/useAudioEngine'
import { useLikedTracks } from '../hooks/useLikedTracks'
import type { Playlist } from '../types'

function fmt(s: number) { if (!isFinite(s) || s < 0) return '--:--'; return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}` }

export default function MediaLibrary() {
  const [playlistSearch, setPlaylistSearch] = useState('')
  const [swipedId, setSwipedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const editRef = useRef<HTMLInputElement>(null)
  const tracks = useTracksStore(s => s.tracks)
  const { playlists, fetch: fetchPlaylists, create: createPlaylist, update: updatePlaylist, remove: removePlaylist, addTrack: addTrackToPlaylist, removeTrack: removeTrackFromPlaylist } = usePlaylistsStore()
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [showNewPlaylist, setShowNewPlaylist] = useState(false)
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [coverPlaylistId, setCoverPlaylistId] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const { liked } = useLikedTracks()

  const queue = usePlayerStore(s => s.queue)
  const currentIndex = usePlayerStore(s => s.currentIndex)
  const isPlaying = usePlayerStore(s => s.isPlaying)
  const setCurrentIndex = usePlayerStore(s => s.setCurrentIndex)
  const addToQueue = usePlayerStore(s => s.addToQueue)

  useEffect(() => {
    tracksApi.list().then(res => useTracksStore.getState().setTracks(res.data.tracks || [])).catch(() => {})
    fetchPlaylists()
  }, [fetchPlaylists])

  useEffect(() => {
    if (!swipedId) return
    const close = () => setSwipedId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [swipedId])

  const activeId = queue[currentIndex]?.id

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return
    await createPlaylist(newPlaylistName.trim())
    setNewPlaylistName(''); setShowNewPlaylist(false)
  }

  const filteredPlaylists = playlists.filter(p =>
    p.name.toLowerCase().includes(playlistSearch.toLowerCase())
  )

  const isLikesPlaylist = selectedPlaylist?.id === 'likes'
  const selectedTracks = selectedPlaylist
    ? tracks.filter(t => selectedPlaylist.track_ids.includes(t.id))
    : []

  const handleDragStart = (_e: React.DragEvent, playlistId: string) => {
    setDragId(playlistId)
  }

  const handleDragOver = (e: React.DragEvent, playlistId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(playlistId)
  }

  const handleDrop = (playlistId: string) => {
    if (!dragId || dragId === playlistId) {
      setDragId(null); setDragOverId(null); return
    }
    const filtered = filteredPlaylists
    const fromIdx = filtered.findIndex(p => p.id === dragId)
    const toIdx = filtered.findIndex(p => p.id === playlistId)
    if (fromIdx === -1 || toIdx === -1) {
      setDragId(null); setDragOverId(null); return
    }
    const reordered = [...filtered]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)

    const currentPlaylists = usePlaylistsStore.getState().playlists
    const reorderedIds = new Set(reordered.map(p => p.id))
    usePlaylistsStore.setState({
      playlists: currentPlaylists.map(p =>
        reorderedIds.has(p.id) ? reordered.find(r => r.id === p.id)! : p
      )
    })

    setDragId(null); setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDragId(null); setDragOverId(null)
  }

  const getCover = (playlistId: string) =>
    localStorage.getItem('playlist_cover_' + playlistId)

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-white">Медиатека</h2>

      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (!file || !coverPlaylistId) return
          const reader = new FileReader()
          reader.onload = () => {
            if (reader.result) {
              localStorage.setItem('playlist_cover_' + coverPlaylistId, reader.result as string)
              setSwipedId(null)
              setCoverPlaylistId(null)
            }
          }
          reader.readAsDataURL(file)
          e.target.value = ''
        }}
      />

      <AnimatePresence mode="wait">
        {selectedPlaylist ? (
          <motion.div key={selectedPlaylist.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setSelectedPlaylist(null)}
                className="text-[#b3b3b3] hover:text-white transition-colors p-1 cursor-pointer shrink-0"
              >
                <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <h3 className="text-base font-bold text-white truncate">{selectedPlaylist.name}</h3>
              <span className="text-xs text-[#b3b3b3] ml-auto shrink-0">{selectedPlaylist.track_count} треков</span>
              {!isLikesPlaylist && (
                <button 
                  onClick={() => {
                    const url = `${window.location.origin}/playlists/${selectedPlaylist.id}`
                    navigator.clipboard.writeText(url)
                    alert('Ссылка на плейлист скопирована!')
                  }}
                  className="text-[#b3b3b3] hover:text-white transition-colors p-1 cursor-pointer shrink-0 ml-1"
                  title="Поделиться"
                >
                  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-0.5 scrollbar-thin">
              {selectedTracks.length === 0 && (
                <div className="text-center py-8 text-[#535353] text-sm">Плейлист пуст</div>
              )}
              <AnimatePresence>
                {selectedTracks.map(t => (
                  <motion.div key={t.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                    onClick={() => { const idx = queue.findIndex(q => q.id === t.id); if (idx >= 0) { setCurrentIndex(idx); playTrack(t) } else { addToQueue(t); setCurrentIndex(queue.length); playTrack(t) } }}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors group ${t.id === activeId ? 'bg-white/5' : 'hover:bg-white/5'}`}
                  >
                  <div className="w-8 h-8 rounded overflow-hidden bg-[#282828] shrink-0">
                    <TrackCoverImg track={t} className="w-full h-full object-cover" />
                  </div>
                  {t.id === activeId && isPlaying && (
                    <span className="flex gap-[2px] items-end h-3 shrink-0">
                      <span className="w-0.5 bg-green-400 rounded-full animate-pulse" style={{ height: '60%' }} />
                      <span className="w-0.5 bg-green-400 rounded-full animate-pulse" style={{ height: '100%', animationDelay: '200ms' }} />
                      <span className="w-0.5 bg-green-400 rounded-full animate-pulse" style={{ height: '40%' }} />
                    </span>
                  )}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold truncate ${t.id === activeId ? 'text-green-400' : 'text-white'}`}>{t.title}</div>
                      <div className="text-xs text-[#b3b3b3] truncate">{t.artist}</div>
                    </div>
                    {!isLikesPlaylist && (
                      <button onClick={async e => { e.stopPropagation(); await removeTrackFromPlaylist(selectedPlaylist.id, t.id); setSelectedPlaylist({ ...selectedPlaylist, track_ids: selectedPlaylist.track_ids.filter(id => id !== t.id), track_count: selectedPlaylist.track_count - 1 }) }}
                        className="text-[#535353] hover:text-white opacity-0 group-hover:opacity-100 transition-all p-0.5 rounded cursor-pointer"
                      >
                        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2">
            <button onClick={() => setShowNewPlaylist(true)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed border-[#333] text-[#b3b3b3] hover:text-white hover:border-white/20 transition-all text-sm font-medium cursor-pointer"
            >
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Новый плейлист
            </button>

            <AnimatePresence>
              {showNewPlaylist && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex gap-2 overflow-hidden">
                  <input type="text" value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreatePlaylist()} placeholder="Название" autoFocus
                    className="flex-1 px-3 py-2 rounded-md bg-[#242424] text-sm text-white outline-none border border-transparent focus:border-white/10 placeholder:text-[#535353]"
                  />
                  <button onClick={handleCreatePlaylist} className="px-4 py-2 bg-white text-black rounded-md text-sm font-semibold cursor-pointer hover:scale-105 transition-transform">Создать</button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative mt-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#535353]">
                <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </span>
              <input type="text" value={playlistSearch} onChange={e => setPlaylistSearch(e.target.value)} placeholder="Поиск" className="w-full pl-8 pr-2.5 py-1.5 rounded-md bg-[#242424] text-sm text-white outline-none border border-transparent focus:border-white/10 placeholder:text-[#535353]" />
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-1 scrollbar-thin">
              {/* Liked Tracks Virtual Playlist */}
              {!playlistSearch && (
                <div
                  onClick={() => setSelectedPlaylist({ id: 'likes', name: 'Мне нравится', track_ids: [...liked], track_count: liked.size } as Playlist)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer group mb-1"
                >
                  <div className="w-10 h-10 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
                    <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">Мне нравится</div>
                    <div className="text-xs text-[#b3b3b3]">{liked.size} треков</div>
                  </div>
                </div>
              )}

              {filteredPlaylists.length === 0 && playlistSearch && (
                <div className="text-center py-8 text-[#535353] text-sm">Нет плейлистов</div>
              )}
              <AnimatePresence>
                {filteredPlaylists.map(p => {
                  const coverUrl = getCover(p.id)
                  return (
                    <div key={p.id} className="relative overflow-hidden rounded-lg">
                      {/* Telegram-style action buttons behind */}
                      <div className="absolute right-0 top-0 bottom-0 flex items-stretch rounded-l-xl overflow-hidden">
                        <button onClick={async e => { e.stopPropagation(); setEditingId(p.id); setEditName(p.name); setSwipedId(null); setTimeout(() => editRef.current?.focus(), 50) }}
                          className="w-16 flex items-center justify-center bg-[#3a3a3a] text-white cursor-pointer active:brightness-125 transition-all"
                        >
                          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                        </button>
                        <div className="w-px bg-black/20" />
                        <button onClick={e => { e.stopPropagation(); setCoverPlaylistId(p.id); coverInputRef.current?.click() }}
                          className="w-16 flex items-center justify-center bg-[#3a3a3a] text-white cursor-pointer active:brightness-125 transition-all"
                        >
                          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" /><polyline points="21 15 16 10 5 21" /></svg>
                        </button>
                        <div className="w-px bg-black/20" />
                        <button onClick={async e => { e.stopPropagation(); await removePlaylist(p.id); setSwipedId(null) }}
                          className="w-16 flex items-center justify-center bg-[#e74c3c] text-white cursor-pointer active:brightness-125 transition-all"
                        >
                          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </div>

                      {/* Swipeable card - follows finger like Telegram */}
                      <motion.div
                        drag="x"
                        dragConstraints={{ left: -192, right: 0 }}
                        dragElastic={0.08}
                        onDragEnd={(_, info) => {
                          if (info.offset.x < -40) setSwipedId(p.id)
                          else setSwipedId(null)
                        }}
                        animate={{ x: swipedId === p.id ? -192 : 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                        className={`relative z-10 bg-[#121212] rounded-lg ${dragId === p.id ? 'opacity-50' : ''}`}
                      >
                        <div
                          onClick={() => { if (editingId === p.id) return; if (swipedId === p.id) { setSwipedId(null); return }; setSelectedPlaylist(p) }}
                          draggable={editingId !== p.id}
                          onDragStart={e => handleDragStart(e, p.id)}
                          onDragOver={e => handleDragOver(e, p.id)}
                          onDrop={e => { e.preventDefault(); handleDrop(p.id) }}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer group ${dragOverId === p.id ? 'border-t-2 border-green-500' : ''}`}
                        >
                          <span className="w-5 flex items-center justify-center text-[#535353] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-grab active:cursor-grabbing">
                            <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor">
                              <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                              <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                              <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
                            </svg>
                          </span>
                          {coverUrl ? (
                            <div className="w-10 h-10 rounded bg-cover bg-center shrink-0" style={{ backgroundImage: `url(${coverUrl})` }} />
                          ) : (
                            <div className="w-10 h-10 rounded bg-[#282828] flex items-center justify-center text-[#b3b3b3] shrink-0">
                              <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {editingId === p.id ? (
                              <input
                                ref={editRef}
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                onKeyDown={async e => {
                                  if (e.key === 'Enter') { await updatePlaylist(p.id, { name: editName }); setEditingId(null) }
                                  if (e.key === 'Escape') setEditingId(null)
                                }}
                                onBlur={async () => { await updatePlaylist(p.id, { name: editName }); setEditingId(null) }}
                                onClick={e => e.stopPropagation()}
                                className="w-full bg-[#242424] text-sm text-white px-2 py-0.5 rounded outline-none border border-white/10"
                              />
                            ) : (
                              <div className="text-sm font-semibold text-white truncate">{p.name}</div>
                            )}
                            <div className="text-xs text-[#b3b3b3]">{p.track_count} треков</div>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
