import client from './client'
export const authApi = {
  login: (email: string, password: string) => client.post('/auth/login', { email, password }),
  register: (email: string, username: string, password: string) => client.post('/auth/register', { email, username, password }),
  googleLogin: (token: string) => client.post('/auth/google', { token }),
  appleLogin: (token: string) => client.post('/auth/apple', { token }),
  getMe: () => client.get('/auth/me'),
  getLikes: () => client.get<string[]>('/auth/me/likes'),
  addLike: (trackId: string) => client.post<string[]>(`/auth/me/likes/${trackId}`),
  removeLike: (trackId: string) => client.delete<string[]>(`/auth/me/likes/${trackId}`),
}
