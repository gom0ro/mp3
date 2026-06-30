import client from './client'
export const playlistsApi = {
  list: () => client.get('/playlists'),
  create: (name: string) => client.post('/playlists', { name }),
  get: (id: string) => client.get(`/playlists/${id}`),
  update: (id: string, data: { name?: string; track_ids?: string[] }) => client.put(`/playlists/${id}`, data),
  delete: (id: string) => client.delete(`/playlists/${id}`),
  addTrack: (playlistId: string, trackId: string) => client.post(`/playlists/${playlistId}/tracks/${trackId}`),
  removeTrack: (playlistId: string, trackId: string) => client.delete(`/playlists/${playlistId}/tracks/${trackId}`),
}
