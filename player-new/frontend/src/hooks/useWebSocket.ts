import { useEffect, useRef, useState, useCallback } from 'react'
import type { WSMessage } from '../types'

interface UseWebSocketOptions {
  url?: string
  onMessage?: (msg: WSMessage) => void
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const DEFAULT_WS = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/^http/, 'ws') + '/ws'
    : `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`
  const { url = DEFAULT_WS, onMessage } = options
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null)
  const [connected, setConnected] = useState(false)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        setLastMessage(msg)
        onMessageRef.current?.(msg)
      } catch { /* ignore malformed */ }
    }

    ws.onclose = () => {
      setConnected(false)
      wsRef.current = null
      reconnectTimeoutRef.current = setTimeout(() => connect(), 3000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [url])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])

  const send = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    wsRef.current?.close()
    wsRef.current = null
    connect()
  }, [connect])

  return { send, lastMessage, connected, reconnect }
}
