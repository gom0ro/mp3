import { useRef, useEffect, useCallback } from 'react'
import { usePlayerStore } from '../store/playerStore'
import { useTracksStore } from '../store/tracksStore'
import type { Track } from '../types'

export const _audio = new Audio()
let _audioCtx: AudioContext | null = null
let _analyser: AnalyserNode | null = null
let _source: MediaElementAudioSourceNode | null = null
let _currentTrackId: string | null = null

function ensureAudioCtx() {
  if (!_audioCtx) {
    _audioCtx = new AudioContext()
    _source = _audioCtx.createMediaElementSource(_audio)
    _analyser = _audioCtx.createAnalyser()
    _analyser.fftSize = 256
    _analyser.smoothingTimeConstant = 0.85
    _source.connect(_analyser)
    _analyser.connect(_audioCtx.destination)
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume()
}

function resolveFileUrl(fileUrl: string): string {
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl
  const apiBase = import.meta.env.VITE_API_URL || '/api/v1'
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    const origin = new URL(apiBase).origin
    return `${origin}${fileUrl}`
  }
  return fileUrl
}

// Call directly from click handlers to play during user gesture
export function playTrack(track: Track) {
  if (_currentTrackId === track.id && !_audio.paused) return
  ensureAudioCtx()
  _currentTrackId = track.id
  _audio.src = resolveFileUrl(track.file_url)
  _audio.load()
  _audio.play().catch(() => {})
}

export function useAudioEngine() {
  const audioRef = useRef(_audio)
  const audioCtxRef = useRef(_audioCtx)
  const analyserRef = useRef(_analyser)
  const sourceRef = useRef(_source)

  const {
    isPlaying, currentTime, duration, volume, repeatMode, shuffle, queue, currentIndex,
    setIsPlaying, setCurrentTime, setDuration, setVolume, setRepeatMode, setShuffle, setCurrentIndex
  } = usePlayerStore()

  const initAudio = useCallback(() => {
    ensureAudioCtx()
    audioCtxRef.current = _audioCtx
    analyserRef.current = _analyser
    sourceRef.current = _source
  }, [])

  const play = useCallback((track: Track) => {
    if (_currentTrackId === track.id && !audioRef.current.paused) return
    initAudio()
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume()
    _currentTrackId = track.id
    audioRef.current.src = resolveFileUrl(track.file_url)
    audioRef.current.load()
    audioRef.current.play().catch(() => {})
  }, [initAudio])

  const toggle = useCallback(() => {
    initAudio()
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume()
    if (audioRef.current.src) { audioRef.current.paused ? audioRef.current.play() : audioRef.current.pause() }
    else if (queue.length > 0) play(queue[0])
  }, [queue, play, initAudio])

  const seek = useCallback((t: number) => { audioRef.current.currentTime = t }, [])
  const setVol = useCallback((v: number) => { audioRef.current.volume = v; setVolume(v) }, [setVolume])

  const skip = useCallback((dir: -1 | 1) => {
    if (queue.length === 0) return
    if (dir === -1 && audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return }
    let idx = currentIndex + dir
    if (shuffle) { do { idx = Math.floor(Math.random() * queue.length) } while (idx === currentIndex && queue.length > 1) }
    if (idx < 0) idx = queue.length - 1
    if (idx >= queue.length) idx = 0
    setCurrentIndex(idx)
    play(queue[idx])
  }, [currentIndex, queue, shuffle, play, setCurrentIndex])

  const cycleRepeat = () => setRepeatMode(((repeatMode + 1) % 3) as 0 | 1 | 2)
  const toggleShuffle = () => setShuffle(!shuffle)

  useEffect(() => {
    const a = audioRef.current
    const onTime = () => { setCurrentTime(a.currentTime) }
    const onEnd = () => { if (repeatMode === 2) { a.currentTime = 0; a.play() } else if (currentIndex < queue.length - 1 || repeatMode > 0) { setCurrentIndex((currentIndex + 1) % queue.length) } }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onLoad = () => {
      if (isFinite(a.duration) && a.duration > 0) {
        setDuration(a.duration)
        const id = queue[currentIndex]?.id
        if (id) useTracksStore.getState().updateTrack(id, { duration: Math.round(a.duration) })
      }
    }
    const onError = () => { setIsPlaying(false) }
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('ended', onEnd)
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('loadedmetadata', onLoad)
    a.addEventListener('error', onError)
    return () => { a.removeEventListener('timeupdate', onTime); a.removeEventListener('ended', onEnd); a.removeEventListener('play', onPlay); a.removeEventListener('pause', onPause); a.removeEventListener('loadedmetadata', onLoad); a.removeEventListener('error', onError) }
  }, [currentIndex, queue.length, repeatMode, setCurrentIndex, setCurrentTime, setDuration, setIsPlaying])

  useEffect(() => {
    if (queue.length > 0 && currentIndex >= 0 && currentIndex < queue.length) {
      const currentTrack = queue[currentIndex]
      if (_currentTrackId !== currentTrack.id) {
        play(currentTrack)
      }
    }
  }, [currentIndex, queue, play])

  const track = queue[currentIndex] || null
  const nextTrack = queue[currentIndex + 1] || (repeatMode > 0 ? queue[0] : null)

  return {
    audioRef, audioCtxRef, analyserRef,
    track, nextTrack,
    isPlaying, currentTime, duration, volume, repeatMode, shuffle, queue, currentIndex,
    play, toggle, seek, setVol, skip, cycleRepeat, toggleShuffle,
    initAudio,
  }
}
