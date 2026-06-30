import { useRef, useCallback, useEffect } from 'react'

interface Props {
  volume: number
  onVolumeChange: (v: number) => void
}

function Icon({ vol }: { vol: number }) {
  const v = 20
  return (
    <svg viewBox="0 0 24 24" width={v} height={v} fill="none" stroke="currentColor" strokeWidth={2} className="block">
      {vol === 0 ? (
        <>
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1={23} y1={9} x2={17} y2={15} /><line x1={17} y1={9} x2={23} y2={15} />
        </>
      ) : (
        <>
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 010 14.14" /><path d="M15.54 8.46a5 5 0 010 7.07" />
        </>
      )}
    </svg>
  )
}

export default function VolumeControl({ volume, onVolumeChange }: Props) {
  const sliderRef = useRef<HTMLInputElement>(null)

  const updateFill = useCallback((v: number) => {
    if (sliderRef.current) sliderRef.current.style.background = `linear-gradient(90deg, #ffffff ${v * 100}%, rgba(255,255,255,0.07) ${v * 100}%)`
  }, [])

  useEffect(() => { updateFill(volume) }, [volume, updateFill])

  const toggle = useCallback(() => {
    if (volume > 0) { onVolumeChange(0) }
    else { onVolumeChange(0.7) }
  }, [volume, onVolumeChange])

  return (
    <div className="flex items-center gap-2.5 px-1">
      <button onClick={toggle} className="text-[#b3b3b3] hover:text-white transition-colors cursor-pointer p-0.5">
        <Icon vol={volume} />
      </button>
      <input
        ref={sliderRef}
        type="range"
        min={0} max={1} step={0.01}
        value={volume}
        onChange={e => onVolumeChange(+e.target.value)}
        className="flex-1 h-1 appearance-none bg-white/5 rounded-full outline-none cursor-pointer transition-all hover:h-1.5
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
      />
    </div>
  )
}
