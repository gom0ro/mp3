import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'

export default function AuthModal() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, register, googleLogin, appleLogin } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, username, password)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Ошибка подключения к серверу')
    }
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
      >
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ type: 'spring', damping: 25 }}
          className="w-full max-w-sm bg-[#181818] rounded-xl p-6 shadow-2xl"
        >
          <div className="flex items-center justify-center mb-2">
            <svg viewBox="0 0 24 24" width={40} height={40} fill="none" stroke="#1DB954" strokeWidth={1.5}>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 010 14.14" /><path d="M15.54 8.46a5 5 0 010 7.07" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-center mb-1">{mode === 'login' ? 'Войти' : 'Регистрация'}</h2>
          <p className="text-sm text-[#b3b3b3] text-center mb-5">{mode === 'login' ? 'Войди, чтобы продолжить' : 'Создай аккаунт'}</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required
              className="w-full px-4 py-2.5 bg-[#242424] border border-transparent rounded-md text-sm text-white outline-none focus:border-white/10 placeholder:text-[#535353] transition-all" />
            {mode === 'register' && (
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Имя" required
                className="w-full px-4 py-2.5 bg-[#242424] border border-transparent rounded-md text-sm text-white outline-none focus:border-white/10 placeholder:text-[#535353] transition-all" />
            )}
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль" required
              className="w-full px-4 py-2.5 bg-[#242424] border border-transparent rounded-md text-sm text-white outline-none focus:border-white/10 placeholder:text-[#535353] transition-all" />
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
            <motion.button type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="w-full py-2.5 bg-green-400 text-black rounded-md text-sm font-semibold cursor-pointer hover:bg-green-500 transition-colors">
              {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </motion.button>
          </form>

          <div className="flex items-center gap-3 my-4"><div className="flex-1 h-px bg-white/5" /><span className="text-xs text-[#535353]">или</span><div className="flex-1 h-px bg-white/5" /></div>

          <div className="flex flex-col gap-2">
            <motion.button onClick={() => googleLogin('fake_google_token')} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 rounded-md text-sm font-medium text-white cursor-pointer hover:bg-white/10 transition-colors">
              <svg viewBox="0 0 24 24" width={18} height={18}><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </motion.button>
            <motion.button onClick={() => appleLogin('fake_apple_token')} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 rounded-md text-sm font-medium text-white cursor-pointer hover:bg-white/10 transition-colors">
              <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              Apple
            </motion.button>
          </div>

          <p className="text-xs text-[#535353] text-center mt-4">
            {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
            <button onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError('') }} className="text-green-400 hover:underline cursor-pointer bg-none border-none text-xs font-medium">
              {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
