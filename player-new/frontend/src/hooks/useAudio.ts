import { useRef, useState, useCallback, useEffect } from 'react'
import { usePlayerStore } from '../store/playerStore'
import type { Track } from '../types'

export function useAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const {
    isPlaying, currentTime, duration, volume,
    setIsPlaying, setCurrentTime, setDuration, setVolume: setStoreVolume,
  } = usePlayerStore()

  if (!audioRef.current) {
    audioRef.current = new Audio()
    audioRef.current.preload = 'auto'
  }

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
  }, [setCurrentTime])

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) setDuration(audioRef.current.duration)
  }, [setDuration])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
  }, [setIsPlaying, setCurrentTime])

  const handlePlay = useCallback(() => setIsPlaying(true), [setIsPlaying])
  const handlePause = useCallback(() => setIsPlaying(false), [setIsPlaying])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.addEventListener('timeupdate', handleTimeUpdate)
    el.addEventListener('loadedmetadata', handleLoadedMetadata)
    el.addEventListener('ended', handleEnded)
    el.addEventListener('play', handlePlay)
    el.addEventListener('pause', handlePause)
    return () => {
      el.removeEventListener('timeupdate', handleTimeUpdate)
      el.removeEventListener('loadedmetadata', handleLoadedMetadata)
      el.removeEventListener('ended', handleEnded)
      el.removeEventListener('play', handlePlay)
      el.removeEventListener('pause', handlePause)
    }
  }, [handleTimeUpdate, handleLoadedMetadata, handleEnded, handlePlay, handlePause])

  const play = useCallback(async (track: Track) => {
    const el = audioRef.current
    if (!el) return
    if (currentTrack?.id !== track.id) {
      el.src = track.file_url
      setCurrentTrack(track)
    }
    el.volume = volume
    await el.play()
  }, [currentTrack, volume])

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const toggle = useCallback(() => {
    if (isPlaying) pause()
    else if (currentTrack) play(currentTrack)
  }, [isPlaying, currentTrack, pause, play])

  const seek = useCallback((time: number) => {
    const el = audioRef.current
    if (!el) return
    el.currentTime = Math.max(0, Math.min(time, el.duration || 0))
  }, [])

  const setVolume = useCallback((v: number) => {
    const el = audioRef.current
    if (!el) return
    const clamped = Math.max(0, Math.min(1, v))
    el.volume = clamped
    setStoreVolume(clamped)
  }, [setStoreVolume])

  const skip = useCallback((seconds: number) => {
    const el = audioRef.current
    if (!el) return
    el.currentTime = Math.max(0, Math.min(el.currentTime + seconds, el.duration || 0))
  }, [])

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    currentTrack,
    play,
    pause,
    toggle,
    seek,
    setVolume,
    skip,
  }
}
