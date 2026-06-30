import { useState, useEffect, type ImgHTMLAttributes } from 'react'
import type { Track } from '../types'

const cache = new Map<string, string>()

export function TrackCoverImg({ track, ...props }: { track: Track } & ImgHTMLAttributes<HTMLImageElement>) {
  const key = `${track.title} - ${track.artist}`
  const cached = cache.get(key)
  const [cover, setCover] = useState(track.cover_url || cached || `https://picsum.photos/seed/${encodeURIComponent(key)}/200/200`)

  useEffect(() => {
    if (track.cover_url || cached) return
    let cancelled = false
    fetch(
      `https://api.deezer.com/search?q=artist:"${encodeURIComponent(track.artist)}" track:"${encodeURIComponent(track.title)}"&limit=1`
    )
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        const url = data?.data?.[0]?.album?.cover_medium
        if (url) { cache.set(key, url); setCover(url) }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [track.id, key, track.cover_url, cached])

  return <img src={cover} alt="" {...props} />
}
