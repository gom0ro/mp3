import { useState, useEffect, type ImgHTMLAttributes } from 'react'
import type { Track } from '../types'

const BASE = (import.meta as any).env?.VITE_API_URL || '/api/v1'
const cache = new Map<string, string>()

export function TrackCoverImg({ track, ...props }: { track: Track } & ImgHTMLAttributes<HTMLImageElement>) {
  const key = `${track.title} - ${track.artist}`
  const cached = cache.get(key)
  const [cover, setCover] = useState(track.cover_url || cached || `https://picsum.photos/seed/${encodeURIComponent(key)}/200/200`)

  useEffect(() => {
    if (track.cover_url || cached) return
    let cancelled = false
    fetch(`${BASE}/cover/search?artist=${encodeURIComponent(track.artist)}&track=${encodeURIComponent(track.title)}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        const url = data?.cover_url
        if (url) { cache.set(key, url); setCover(url) }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [track.id, key, track.cover_url, cached])

  return <img src={cover} alt="" {...props} />
}
