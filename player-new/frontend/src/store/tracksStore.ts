import { create } from 'zustand'
import type { Track } from '../types'

interface TracksStore {
  tracks: Track[]
  setTracks: (tracks: Track[]) => void
  addTrack: (track: Track) => void
  removeTrack: (id: string) => void
  updateTrack: (id: string, data: Partial<Track>) => void
}

export const useTracksStore = create<TracksStore>((set) => ({
  tracks: [],
  setTracks: (tracks) => set({ tracks }),
  addTrack: (track) => set(s => ({ tracks: [...s.tracks.filter(t => t.id !== track.id), track] })),
  removeTrack: (id) => set(s => ({ tracks: s.tracks.filter(t => t.id !== id) })),
  updateTrack: (id, data) => set(s => ({ tracks: s.tracks.map(t => t.id === id ? { ...t, ...data } : t) })),
}))
