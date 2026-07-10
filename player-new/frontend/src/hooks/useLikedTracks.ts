import { useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/auth'
import { useAuth } from './useAuth'

export function useLikedTracks() {
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const isAuthenticated = useAuth(s => s.isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) {
      authApi.getLikes().then(res => setLiked(new Set(res.data))).catch(() => {})
    } else {
      setLiked(new Set())
    }
  }, [isAuthenticated])

  const toggle = useCallback(async (id: string) => {
    if (!isAuthenticated) return
    const isCurrentlyLiked = liked.has(id)
    
    // Optimistic UI update
    setLiked(prev => {
      const next = new Set(prev)
      if (isCurrentlyLiked) next.delete(id)
      else next.add(id)
      return next
    })

    try {
      if (isCurrentlyLiked) {
        await authApi.removeLike(id)
      } else {
        await authApi.addLike(id)
      }
    } catch {
      // Revert on failure
      setLiked(prev => {
        const next = new Set(prev)
        if (isCurrentlyLiked) next.add(id)
        else next.delete(id)
        return next
      })
    }
  }, [liked, isAuthenticated])

  const isLiked = useCallback((id: string) => liked.has(id), [liked])

  return { liked, toggle, isLiked }
}
