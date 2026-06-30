import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { usePlayerStore } from '../store/playerStore'

export default function Profile() {
  const { user, logout } = useAuth()
  const queue = usePlayerStore(s => s.queue)

  const totalTime = queue.reduce((acc, t) => acc + (t.duration || 0), 0)
  const fmt = (s: number) => { if (!isFinite(s) || s < 0) return '0:00'; return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}` }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="w-[100px] h-[100px] rounded-full bg-[#242424] flex items-center justify-center">
        <svg viewBox="0 0 24 24" width={64} height={64} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-[#535353]">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      </div>

      <h2 className="text-2xl font-extrabold tracking-tight text-white">{user?.username || 'Слушатель'}</h2>
      <p className="text-sm text-[#b3b3b3] -mt-2.5">Локальный плеер</p>

      <div className="flex gap-6 my-2">
        {[
          { value: queue.length, label: 'Треков' },
          { value: fmt(totalTime), label: 'Всего' },
          { value: '0', label: 'Распознано' },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center gap-1">
            <span className="text-2xl font-extrabold text-white tracking-tight">{s.value}</span>
            <span className="text-[11px] text-[#535353] uppercase tracking-wider font-semibold">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="w-full max-w-xs flex flex-col gap-px mt-2 bg-[#181818] rounded-lg overflow-hidden">
        {[
          { icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />, text: 'Версия 1.0' },
            { icon: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>, text: 'VibePlayer + Shazam' },
        ].map((r, i) => (
          <div key={i} className="flex items-center gap-2.5 px-4 py-3 text-sm text-[#b3b3b3] font-medium border-b border-white/5 last:border-0">
            <span className="text-[#535353] shrink-0"><svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{r.icon}</svg></span>
            <span>{r.text}</span>
          </div>
        ))}
      </div>

      <motion.button
        onClick={logout}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="mt-4 px-6 py-2.5 bg-white/5 rounded-md text-sm font-semibold text-white cursor-pointer hover:bg-white/10 transition-colors flex items-center gap-2"
      >
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
        Выйти
      </motion.button>
    </motion.div>
  )
}
