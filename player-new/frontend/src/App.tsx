import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import PlayerBar from './components/PlayerBar'
import Player from './components/Player'
import Playlist from './components/Playlist'
import MediaLibrary from './components/MediaLibrary'
import Recognize from './components/Recognize'
import Profile from './components/Profile'
import BottomNav from './components/BottomNav'
import AuthModal from './components/AuthModal'
import { useAuth } from './hooks/useAuth'
import { usePlayerStore } from './store/playerStore'
import { useAudioEngine } from './hooks/useAudioEngine'
import type { Track } from './types'

type Tab = 'search' | 'player' | 'media' | 'recognize' | 'profile'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('search')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const { isAuthenticated } = useAuth()
  const hasTrack = usePlayerStore(s => s.queue.length > 0 && s.currentIndex >= 0)
  const queue = usePlayerStore(s => s.queue)
  const currentIndex = usePlayerStore(s => s.currentIndex)
  const setCurrentIndex = usePlayerStore(s => s.setCurrentIndex)

  // Register service worker for offline
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  const { toggle, skip, setVol, volume } = useAudioEngine()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'Space') { e.preventDefault(); toggle() }
      if (e.code === 'ArrowRight') { e.preventDefault(); skip(1) }
      if (e.code === 'ArrowLeft') { e.preventDefault(); skip(-1) }
      if (e.code === 'ArrowUp') { e.preventDefault(); setVol(Math.min(1, volume + 0.1)) }
      if (e.code === 'ArrowDown') { e.preventDefault(); setVol(Math.max(0, volume - 0.1)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, skip, setVol, volume])

  // Restore queue from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('queue')
      const savedIndex = localStorage.getItem('queueIndex')
      if (saved) {
        const q = JSON.parse(saved) as Track[]
        if (q.length > 0) {
          usePlayerStore.getState().setQueue(q)
          if (savedIndex) usePlayerStore.getState().setCurrentIndex(Number(savedIndex))
        }
      }
    } catch {}
  }, [])

  // Save queue to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('queue', JSON.stringify(queue))
      localStorage.setItem('queueIndex', String(currentIndex))
    } catch {}
  }, [queue, currentIndex])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Notification + document title
  useEffect(() => {
    const track = queue[currentIndex]
    if (track) {
      document.title = `${track.title} — ${track.artist}`
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(track.title, { body: track.artist })
      }
    } else {
      document.title = 'VibePlayer'
    }
  }, [currentIndex, queue])

  // Request notification permission on first user interaction
  useEffect(() => {
    const handler = () => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
    document.addEventListener('click', handler, { once: true })
    return () => document.removeEventListener('click', handler)
  }, [])

  const tabComponents: Record<Tab, JSX.Element> = {
    search: <Playlist key="search" />,
    player: <Player key="player" />,
    media: <MediaLibrary key="media" />,
    recognize: <Recognize key="recognize" />,
    profile: <Profile key="profile" />,
  }

  return (
    <div className="relative min-h-screen bg-[#121212]">
      <div className={`min-h-screen flex flex-col ${hasTrack && activeTab !== 'player' ? 'pb-[120px]' : 'pb-[56px]'} md:pb-0 md:grid md:grid-cols-[1fr_320px] md:gap-0`}>
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="max-w-2xl mx-auto"
            >
              {tabComponents[activeTab]}
            </motion.div>
          </AnimatePresence>
        </main>

        {!isMobile && (
          <aside className="hidden md:block border-l border-white/5 p-4 overflow-y-auto">
            <MediaLibrary />
          </aside>
        )}
      </div>

      <PlayerBar activeTab={activeTab} onTabChange={setActiveTab} />
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      {!isAuthenticated && <AuthModal />}
    </div>
  )
}
