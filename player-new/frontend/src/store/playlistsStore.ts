import { create } from 'zustand'
import type { Playlist } from '../types'
import { playlistsApi } from '../api/playlists'

interface PlaylistsStore {
  playlists: Playlist[]
  loading: boolean
  fetch: () => Promise<void>
  create: (name: string) => Promise<void>
  update: (id: string, data: { name?: string }) => Promise<void>
  remove: (id: string) => Promise<void>
  addTrack: (playlistId: string, trackId: string) => Promise<void>
  removeTrack: (playlistId: string, trackId: string) => Promise<void>
}

export const usePlaylistsStore = create<PlaylistsStore>((set, get) => ({
  playlists: [],
  loading: false,
  fetch: async () => {
    set({ loading: true })
    try {
      const { data } = await playlistsApi.list()
      set({ playlists: data.playlists || [], loading: false })
    } catch {
      set({ loading: false })
    }
  },
  create: async (name) => {
    const { data } = await playlistsApi.create(name)
    set(s => ({ playlists: [...s.playlists, data] }))
  },
  update: async (id, data) => {
    const res = await playlistsApi.update(id, data)
    set(s => ({ playlists: s.playlists.map(p => p.id === id ? res.data : p) }))
  },
  remove: async (id) => {
    await playlistsApi.delete(id)
    set(s => ({ playlists: s.playlists.filter(p => p.id !== id) }))
  },
  addTrack: async (playlistId, trackId) => {
    const { data } = await playlistsApi.addTrack(playlistId, trackId)
    set(s => ({ playlists: s.playlists.map(p => p.id === playlistId ? data : p) }))
  },
  removeTrack: async (playlistId, trackId) => {
    const { data } = await playlistsApi.removeTrack(playlistId, trackId)
    set(s => ({ playlists: s.playlists.map(p => p.id === playlistId ? data : p) }))
  },
}))
