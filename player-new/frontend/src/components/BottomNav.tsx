import { motion } from 'framer-motion'

type Tab = 'search' | 'player' | 'media' | 'recognize' | 'profile'

interface Props {
  activeTab: Tab
  onTabChange: (t: Tab) => void
}

const tabs: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: 'search', label: 'Главная', icon: <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
  { id: 'player', label: 'Плеер', icon: <path d="M8 5v14l11-7z" /> },
  { id: 'media', label: 'Медиа', icon: <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /> },
  { id: 'recognize', label: 'Распозн', icon: <><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></> },
  { id: 'profile', label: 'Профиль', icon: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></> },
]

export default function BottomNav({ activeTab, onTabChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#121212] border-t border-white/5 pb-[env(safe-area-inset-bottom,0px)] flex justify-around items-center py-1 md:hidden">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onTabChange(t.id)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg cursor-pointer transition-colors ${activeTab === t.id ? 'text-white' : 'text-[#535353] hover:text-white'}`}
        >
          <span className="w-5 h-5">
            <svg viewBox="0 0 24 24" width={20} height={20} fill={t.id === 'player' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={t.id === 'player' ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
          </span>
          <span className="text-[10px] font-semibold leading-none">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
