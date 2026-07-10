import { usePlayerStore } from '../store/playerStore'
import { eqBands } from '../hooks/useAudioEngine'
import { useEffect, useState } from 'react'

export default function Equalizer() {
  const { eqEnabled, setEqEnabled, eqBands: storeBands, setEqBand } = usePlayerStore()
  
  // Format frequency for display
  const formatFreq = (freq: number) => {
    if (freq >= 1000) return `${freq / 1000}k`;
    return `${freq}`;
  }

  return (
    <div className="bg-[#181818] rounded-xl p-4 md:p-6 w-full max-w-2xl mx-auto shadow-2xl border border-white/5">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
              <path d="M4 12v8" /><path d="M4 4v4" /><path d="M12 16v4" /><path d="M12 4v8" /><path d="M20 8v12" /><path d="M20 4v0" /><path d="M2 12h4" /><path d="M10 16h4" /><path d="M18 8h4" />
            </svg>
            Эквалайзер
          </h3>
          <p className="text-xs text-[#b3b3b3] mt-1">Точная настройка звучания (Web Audio API)</p>
        </div>
        
        <button 
          onClick={() => setEqEnabled(!eqEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${eqEnabled ? 'bg-green-500' : 'bg-[#535353]'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${eqEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className={`flex justify-between items-end gap-1 md:gap-2 h-48 mt-4 transition-opacity duration-300 ${eqEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        {eqBands.map((freq, i) => (
          <div key={freq} className="flex flex-col items-center flex-1 group">
            <span className="text-[10px] text-green-400 font-mono mb-2 h-4 opacity-0 group-hover:opacity-100 transition-opacity">
              {storeBands[i] > 0 ? '+' : ''}{storeBands[i].toFixed(1)}
            </span>
            <div className="relative h-32 flex items-center justify-center w-full">
              {/* Range slider wrapped to be vertical */}
              <input
                type="range"
                min="-12"
                max="12"
                step="0.1"
                value={storeBands[i]}
                onChange={(e) => setEqBand(i, parseFloat(e.target.value))}
                className="w-32 h-1 bg-[#333] rounded-lg appearance-none cursor-pointer -rotate-90 absolute"
                style={{
                  background: `linear-gradient(to right, #535353 0%, #535353 ${(storeBands[i] + 12) / 24 * 100}%, #333 ${(storeBands[i] + 12) / 24 * 100}%, #333 100%)`
                }}
              />
            </div>
            <span className="text-[10px] text-[#b3b3b3] font-semibold mt-2">{formatFreq(freq)}</span>
          </div>
        ))}
      </div>
      
      <div className="flex justify-center gap-4 mt-6">
        <button 
          onClick={() => {
            eqBands.forEach((_, i) => setEqBand(i, 0))
          }}
          className={`text-xs px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/10 transition-colors cursor-pointer ${!eqEnabled ? 'opacity-50 pointer-events-none' : ''}`}
        >
          Сбросить
        </button>
        <button 
          onClick={() => {
            const rock = [4, 3, 0, -2, -3, -1, 1, 3, 4, 4]
            rock.forEach((val, i) => setEqBand(i, val))
          }}
          className={`text-xs px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/10 transition-colors cursor-pointer ${!eqEnabled ? 'opacity-50 pointer-events-none' : ''}`}
        >
          Рок
        </button>
        <button 
          onClick={() => {
            const pop = [-2, -1, 2, 3, 4, 3, 1, 0, -1, -2]
            pop.forEach((val, i) => setEqBand(i, val))
          }}
          className={`text-xs px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/10 transition-colors cursor-pointer ${!eqEnabled ? 'opacity-50 pointer-events-none' : ''}`}
        >
          Поп
        </button>
        <button 
          onClick={() => {
            const bass = [6, 5, 4, 2, 0, 0, 0, 0, 0, 0]
            bass.forEach((val, i) => setEqBand(i, val))
          }}
          className={`text-xs px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/10 transition-colors cursor-pointer ${!eqEnabled ? 'opacity-50 pointer-events-none' : ''}`}
        >
          Бас
        </button>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #4ADE80;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
        }
        input[type=range]::-moz-range-thumb {
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #4ADE80;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
        }
      `}} />
    </div>
  )
}
