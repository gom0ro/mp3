import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { tracksApi } from '../api/tracks'
import { usePlayerStore } from '../store/playerStore'
import { useTracksStore } from '../store/tracksStore'
import { playTrack } from '../hooks/useAudioEngine'
import type { RecognitionResult } from '../types'

export default function Recognize() {
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'found' | 'not_found'>('idle')
  const [result, setResult] = useState<RecognitionResult | null>(null)
  const [active, setActive] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const addToQueue = usePlayerStore(s => s.addToQueue)
  const setCurrentIndex = usePlayerStore(s => s.setCurrentIndex)
  const setQueue = usePlayerStore(s => s.setQueue)
  const queue = usePlayerStore(s => s.queue)
  const addTrack = useTracksStore(s => s.addTrack)
  const activeRef = useRef(false)

  const start = useCallback(async () => {
    if (activeRef.current) return
    activeRef.current = true
    setActive(true)
    setStatus('listening')

    let stream: MediaStream
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) }
    catch { setStatus('not_found'); setResult({ status: 'not_found' }); activeRef.current = false; return }

    const recorder = new MediaRecorder(stream)
    const chunks: Blob[] = []
    recorder.ondataavailable = e => chunks.push(e.data)
    recorder.start()
    await new Promise(r => setTimeout(r, 4000))
    recorder.stop()
    stream.getTracks().forEach(t => t.stop())

    if (!activeRef.current) return
    setStatus('processing')

    try {
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
      const { data } = await tracksApi.recognize(blob)
      const taskId = data.task_id

      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 1000))
        if (!activeRef.current) return
        const { data: res } = await tracksApi.recognizeStatus(taskId)
        if (res.status === 'completed') {
          if (res.result?.match) {
            setResult({ ...res.result.match, confidence: res.result.confidence, status: 'found' })
            setStatus('found')
          } else {
            setStatus('not_found')
          }
          return
        } else if (res.status === 'error') {
          setStatus('not_found')
          return
        }
      }
      setStatus('not_found')
    } catch {
      setStatus('not_found')
      setResult({ status: 'not_found' })
    }
    activeRef.current = false
  }, [])

  const playFound = useCallback(async () => {
    if (!result?.track_id) return
    const existing = queue.findIndex(t => t.id === result.track_id)
    if (existing >= 0) {
      setCurrentIndex(existing)
      const t = queue[existing]
      if (t) playTrack(t)
    } else {
      try {
        const { data } = await tracksApi.get(result.track_id)
        addTrack(data)
        addToQueue(data)
        setCurrentIndex(queue.length)
        playTrack(data)
      } catch { }
    }
    setStatus('idle')
    setResult(null)
    setActive(false)
    activeRef.current = false
  }, [result, queue, setCurrentIndex, addToQueue, addTrack])

  const reset = useCallback(() => {
    activeRef.current = false
    setActive(false)
    setStatus('idle')
    setResult(null)
  }, [])

  const infoItems = [
    { icon: <><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>, text: 'Определяет по отпечатку аудио' },
    { icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />, text: 'Сравнивает с загруженными треками' },
    { icon: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>, text: 'Занимает около 4 секунд' },
  ]

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-10 text-center min-h-[350px] relative">
      {/* ? button top-right */}
      <div className="absolute top-0 right-0">
        <button onClick={() => setShowInfo(!showInfo)} className="w-8 h-8 flex items-center justify-center rounded-full text-[#535353] hover:text-white hover:bg-white/5 transition-all cursor-pointer relative">
          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
        </button>
        <AnimatePresence>
          {showInfo && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-10 right-0 bg-[#242424] border border-white/5 rounded-xl p-3 min-w-[220px] shadow-xl z-20"
            >
              {infoItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs text-[#b3b3b3] text-left py-1.5">
                  <span className="shrink-0"><svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg></span>
                  <span>{item.text}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-center gap-2.5">
        <span className="text-[#535353]"><svg viewBox="0 0 24 24" width={48} height={48} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg></span>
        <h2 className="text-xl font-extrabold tracking-tight text-white">Распознавание музыки</h2>
        <p className="text-sm text-[#b3b3b3] max-w-xs leading-relaxed">Нажми на кнопку и дай плееру послушать трек через микрофон</p>
      </div>

      <motion.button
        onClick={start}
        disabled={status === 'listening' || status === 'processing'}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="relative w-24 h-24 rounded-full bg-green-400 border-none cursor-pointer flex items-center justify-center shadow-xl shadow-green-500/40 disabled:opacity-60 disabled:cursor-default z-10"
      >
        <motion.span
          className="absolute inset-[-6px] rounded-full border-2 border-green-500/30"
          animate={status === 'listening' ? { scale: [1, 1.1, 1], opacity: [0.6, 0.15, 0.6] } : {}}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="text-black"><svg viewBox="0 0 24 24" width={40} height={40} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg></span>
      </motion.button>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-sm font-semibold transition-colors ${status === 'found' ? 'text-green-400' : status === 'not_found' ? 'text-red-400' : status !== 'idle' ? 'text-white' : 'text-[#535353]'}`}>
        {status === 'idle' && 'Нажми для начала'}
        {status === 'listening' && 'Слушаю...'}
        {status === 'processing' && 'Анализирую...'}
        {status === 'found' && 'Трек найден!'}
        {status === 'not_found' && 'Не найдено'}
      </motion.div>

      <AnimatePresence>
        {status === 'found' && result && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center gap-1.5 bg-[#181818] rounded-lg p-4 min-w-[240px]">
            <div className="text-xs text-green-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
              Трек найден
            </div>
            <div className="text-lg font-extrabold tracking-tight text-white">{result.title}</div>
            <div className="text-sm text-[#b3b3b3] font-medium">{result.artist}</div>
            {result.confidence && <div className="text-[11px] text-[#535353] font-semibold mt-0.5">Совпадение: ~{result.confidence}%</div>}
            <motion.button onClick={playFound} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} className="mt-2.5 bg-green-400 text-black rounded-md px-6 py-2.5 text-sm font-semibold shadow-lg cursor-pointer flex items-center gap-2">
              <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              Слушать
            </motion.button>
          </motion.div>
        )}
        {status === 'not_found' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 0.9 }} className="text-center">
            <div className="text-xs text-red-400 font-bold uppercase tracking-wider flex items-center gap-1.5 justify-center mb-1">
              <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              Совпадений нет
            </div>
            <p className="text-sm text-[#535353]">Попробуй другой фрагмент</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
