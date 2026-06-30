export interface User { id: string; email: string; username: string; avatar_url?: string }
export interface Track { id: string; title: string; artist: string; file_url: string; cover_url?: string; duration: number; file_size: number; mime_type: string; fingerprint_hash?: string; created_at: string }
export interface PlaybackState { isPlaying: boolean; currentTime: number; duration: number; volume: number; repeatMode: 0|1|2; shuffle: boolean }
export interface WSMessage { type: string; payload: any }
export interface AuthTokens { access_token: string; token_type: string }
export interface RecognitionResult { track_id?: string; title?: string; artist?: string; confidence?: number; status: 'listening'|'processing'|'found'|'not_found' }
export interface Playlist { id: string; name: string; track_ids: string[]; track_count: number; created_at: string; updated_at: string }
