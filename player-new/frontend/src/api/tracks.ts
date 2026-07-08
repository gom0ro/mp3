import client from './client'
export const tracksApi = {
  list: (search?: string) => client.get('/tracks', { params: { search } }),
  get: (id: string) => client.get(`/tracks/${id}`),
  upload: (file: File) => { const fd = new FormData(); fd.append('file', file); return client.post('/tracks/upload', fd) },
  delete: (id: string) => client.delete(`/tracks/${id}`),
  fingerprint: (id: string) => client.post(`/tracks/${id}/fingerprint`),
  recognize: (blob: Blob) => { const fd = new FormData(); fd.append('file', blob); return client.post('/recognize', fd) },
  recognizeStatus: (taskId: string) => client.get(`/recognize/status/${taskId}`),
}
