import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'likedTracks'

function loadLiked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}

function saveLiked(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}

export function useLikedTracks() {
  const [liked, setLiked] = useState<Set<string>>(loadLiked)

  useEffect(() => { saveLiked(liked) }, [liked])

  const toggle = useCallback((id: string) => {
    setLiked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const isLiked = useCallback((id: string) => liked.has(id), [liked])

  return { liked, toggle, isLiked }
}
