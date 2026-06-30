import { create } from 'zustand'
import type { Track, PlaybackState } from '../types'

interface PlayerStore extends PlaybackState {
  queue: Track[]
  currentIndex: number
  setQueue: (tracks: Track[]) => void
  addToQueue: (track: Track) => void
  removeFromQueue: (id: string) => void
  reorderQueue: (fromIndex: number, toIndex: number) => void
  setCurrentIndex: (i: number) => void
  setIsPlaying: (v: boolean) => void
  setCurrentTime: (v: number) => void
  setDuration: (v: number) => void
  setVolume: (v: number) => void
  setRepeatMode: (m: 0|1|2) => void
  setShuffle: (v: boolean) => void
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.7,
  repeatMode: 0,
  shuffle: false,
  queue: [],
  currentIndex: -1,
  setQueue: (queue) => set({ queue, currentIndex: queue.length > 0 ? 0 : -1 }),
  addToQueue: (track) => set(s => ({ queue: [...s.queue, track] })),
  removeFromQueue: (id) => set(s => {
    const idx = s.queue.findIndex(t => t.id === id)
    if (idx < 0) return s
    const newQueue = s.queue.filter(t => t.id !== id)
    let newIndex = s.currentIndex
    if (idx < s.currentIndex) newIndex--
    else if (idx === s.currentIndex && s.currentIndex >= newQueue.length) newIndex = newQueue.length - 1
    return { queue: newQueue, currentIndex: newIndex }
  }),
  reorderQueue: (fromIndex, toIndex) => set(s => {
    if (fromIndex === toIndex) return s
    const newQueue = [...s.queue]
    const [moved] = newQueue.splice(fromIndex, 1)
    newQueue.splice(toIndex, 0, moved)
    let newIndex = s.currentIndex
    if (newIndex === fromIndex) {
      newIndex = toIndex
    } else if (fromIndex < newIndex && toIndex >= newIndex) {
      newIndex--
    } else if (fromIndex > newIndex && toIndex <= newIndex) {
      newIndex++
    }
    return { queue: newQueue, currentIndex: newIndex }
  }),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setRepeatMode: (repeatMode) => set({ repeatMode }),
  setShuffle: (shuffle) => set({ shuffle }),
}))
