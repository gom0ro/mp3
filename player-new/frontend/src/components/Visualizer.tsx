import { useRef, useEffect } from 'react'

interface Props {
  analyser: AnalyserNode | null
  isPlaying: boolean
}

const COLORS = ['#1DB954', '#1AA34A', '#17A34A', '#4ADE80']
const MAX_HISTORY = 256

class Particle {
  x: number; y: number; vx: number; vy: number; size: number; alpha: number
  constructor(w: number, h: number) { this.x = Math.random() * w; this.y = Math.random() * h; this.vx = (Math.random() - 0.5) * 0.3; this.vy = -Math.random() * 0.5 - 0.1; this.size = Math.random() * 2.5 + 1; this.alpha = Math.random() * 0.4 + 0.1 }
  update(a: number, w: number, h: number) {
    this.x += this.vx; this.y += this.vy - a * 0.3; this.alpha = Math.max(0, this.alpha - 0.002)
    if (this.alpha <= 0 || this.y < -20) { this.x = Math.random() * w; this.y = h + 10; this.alpha = Math.random() * 0.4 + 0.1 }
    if (this.x < -20) this.x = w + 20; if (this.x > w + 20) this.x = -20
  }
  draw(ctx: CanvasRenderingContext2D) {
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3)
    g.addColorStop(0, `rgba(29,185,84,${this.alpha})`); g.addColorStop(1, 'rgba(29,185,84,0)')
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2); ctx.fill()
  }
}

export default function Visualizer({ analyser, isPlaying }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modeRef = useRef<'bars' | 'wave' | 'spectrogram'>('bars')
  const particlesRef = useRef<Particle[]>([])
  const historyRef = useRef<Uint8Array[]>([])

  useEffect(() => {
    particlesRef.current = Array.from({ length: 60 }, () => new Particle(800, 450))
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let id: number

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      canvas.width = r.width * devicePixelRatio; canvas.height = r.height * devicePixelRatio
    }
    resize(); window.addEventListener('resize', resize)

    const data = new Uint8Array(analyser?.frequencyBinCount || 128)

    function bg(w: number, h: number, a: number) {
      const g = ctx!.createRadialGradient(w/2, h*0.3, 0, w/2, h*0.3, h*0.9)
      g.addColorStop(0, a > 0.05 ? `rgba(10,50,20,${0.4 + a * 0.6})` : '#0a0a0a')
      g.addColorStop(0.5, a > 0.05 ? `rgba(8,30,15,${0.6 + a * 0.4})` : '#080808')
      g.addColorStop(1, '#060606'); ctx!.fillStyle = g; ctx!.fillRect(0, 0, w, h)
    }
    function glow(x: number, y: number, r: number, c: string, a: number) {
      const g = ctx!.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(0.4, `rgba(${c},${a * 0.3})`); g.addColorStop(1, `rgba(${c},0)`)
      ctx!.fillStyle = g; ctx!.beginPath(); ctx!.arc(x, y, r, 0, Math.PI * 2); ctx!.fill()
    }

    function draw() {
      const w = canvas!.width / devicePixelRatio, h = canvas!.height / devicePixelRatio
      if (analyser) analyser.getByteFrequencyData(data)
      const avg = data.reduce((a, b) => a + b, 0) / data.length / 255
      const mode = modeRef.current

      if (mode === 'spectrogram') {
        historyRef.current.push(new Uint8Array(data))
        if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift()
      }

      ctx!.clearRect(0, 0, w, h)

      if (mode === 'bars') {
        bg(w, h, avg)
        if (avg > 0.05) { glow(w/2, h, h * 0.25 * avg, '29,185,84', 0.12 * avg); glow(w/2, h * 0.7, h * 0.15 * avg, '29,185,84', 0.06 * avg) }
        const bars = data.length, bw = (w / bars) * 0.85, gap = (w / bars) * 0.15
        for (let i = 0; i < bars; i++) {
          const val = data[i] / 255, bh = Math.max(val * h * 0.88, 2), x = i * (bw + gap) + gap / 2, y = h - bh
          const ci = (i / bars) * COLORS.length, c1 = COLORS[Math.floor(ci) % COLORS.length], c2 = COLORS[Math.min(Math.floor(ci) + 1, COLORS.length - 1)]
          const g = ctx!.createLinearGradient(0, y, 0, h); g.addColorStop(0, c1); g.addColorStop(1, c2)
          ctx!.fillStyle = g; const r = Math.min(bw / 3, 4)
          ctx!.beginPath(); ctx!.moveTo(x + r, y); ctx!.lineTo(x + bw - r, y); ctx!.quadraticCurveTo(x + bw, y, x + bw, y + r)
          ctx!.lineTo(x + bw, h); ctx!.lineTo(x, h); ctx!.lineTo(x, y + r); ctx!.quadraticCurveTo(x, y, x + r, y); ctx!.closePath(); ctx!.fill()
          if (val > 0.3) {
            ctx!.save(); ctx!.globalAlpha = val * 0.3
            const gg = ctx!.createRadialGradient(x + bw/2, y, 0, x + bw/2, y, bw * 1.5)
            gg.addColorStop(0, c1); gg.addColorStop(1, 'transparent'); ctx!.fillStyle = gg
            ctx!.fillRect(x - bw, y - bw * 0.5, bw * 3, bh + bw); ctx!.restore()
          }
        }
        particlesRef.current.forEach(p => { p.update(avg, w, h); p.draw(ctx!) })
      } else if (mode === 'wave') {
        bg(w, h, avg); glow(w/2, h/2, h * 0.2, '29,185,84', 0.08)
        ctx!.beginPath()
        for (let i = 0; i < data.length; i++) { const x = (i / data.length) * w, v = (data[i] / 255) * 2 - 1, y = h/2 + v * h * 0.35; i === 0 ? ctx!.moveTo(x, y) : ctx!.lineTo(x, y) }
        ctx!.strokeStyle = '#1DB954'; ctx!.lineWidth = 2.5; ctx!.shadowColor = 'rgba(29,185,84,0.6)'; ctx!.shadowBlur = 16; ctx!.stroke(); ctx!.shadowBlur = 0
        ctx!.beginPath()
        for (let i = 0; i < data.length; i++) { const x = (i / data.length) * w, v = (data[i] / 255) * 2 - 1, y = h/2 - v * h * 0.35; i === 0 ? ctx!.moveTo(x, y) : ctx!.lineTo(x, y) }
        ctx!.strokeStyle = 'rgba(74,222,128,0.5)'; ctx!.lineWidth = 1.5; ctx!.shadowColor = 'rgba(74,222,128,0.3)'; ctx!.shadowBlur = 10; ctx!.stroke(); ctx!.shadowBlur = 0
        ctx!.fillStyle = `rgba(29,185,84,${0.03 + avg * 0.04})`; ctx!.beginPath(); ctx!.arc(w/2, h/2, w * 0.08, 0, Math.PI * 2); ctx!.fill()
        particlesRef.current.forEach(p => { p.update(avg, w, h); p.draw(ctx!) })
      } else if (mode === 'spectrogram') {
        bg(w, h, avg)
        if (historyRef.current.length > 1) {
          const cw = w / MAX_HISTORY, rows = historyRef.current[0].length, rh = h / rows
          for (let t = 0; t < historyRef.current.length; t++) {
            const frame = historyRef.current[t]
            for (let f = 0; f < frame.length; f++) {
              const val = frame[f] / 255; if (val < 0.03) continue
              ctx!.fillStyle = `rgba(${Math.round(20 + val * 40)},${Math.round(180 - val * 60)},${Math.round(80 - val * 30)},${0.5 + val * 0.5})`
              ctx!.fillRect(Math.round(w - (historyRef.current.length - t) * cw), Math.round(h - (f + 1) * rh), Math.ceil(cw) + 1, Math.ceil(rh) + 1)
            }
          }
        }
        ctx!.strokeStyle = 'rgba(255,255,255,0.03)'; ctx!.lineWidth = 1
        for (let f = 0; f < 4; f++) { const y = h * (1 - (f + 1) / 5); ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke() }
        if (avg > 0.05) glow(w/2, h, h * 0.15, '29,185,84', 0.06 * avg)
      }
      id = requestAnimationFrame(draw)
    }
    id = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [analyser])

  return (
    <div className="relative rounded-lg overflow-hidden bg-black/20 aspect-video">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  )
}
