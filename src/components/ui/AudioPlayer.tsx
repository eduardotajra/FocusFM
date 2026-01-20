import { useAudio } from '../../hooks/useAudio'
import { motion } from 'framer-motion'
import { Play, Pause, Volume2, CloudRain, Radio } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'

const BAR_COUNT = 16

export const AudioPlayer = () => {
  const { isPlaying, audioType, volume, play, pause, setAudioType, setVolume } = useAudio()
  const { getBorderRadiusClass } = useTheme()
  const borderRadiusClass = getBorderRadiusClass()
  const [barHeights, setBarHeights] = useState<number[]>([])

  // Inicializa alturas aleatórias das barras
  useEffect(() => {
    setBarHeights(Array.from({ length: BAR_COUNT }, () => Math.random() * 0.2 + 0.05))
  }, [])

  // Anima as barras aleatoriamente quando está tocando
  useEffect(() => {
    if (!isPlaying) {
      // Quando pausado, reduz as barras gradualmente
      const interval = setInterval(() => {
        setBarHeights((prev) =>
          prev.map((h) => Math.max(0.03, h * 0.92))
        )
      }, 50)
      return () => clearInterval(interval)
    }

    // Quando tocando, anima as barras com padrão mais suave
    const interval = setInterval(() => {
      setBarHeights((prev) =>
        prev.map((_, i) => {
          // Cria um padrão de onda mais suave
          const wave = Math.sin((Date.now() / 200) + (i * 0.5)) * 0.3 + 0.5
          const random = Math.random() * 0.3
          return Math.min(0.95, Math.max(0.1, wave * random + 0.2))
        })
      )
    }, 80)

    return () => clearInterval(interval)
  }, [isPlaying])

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ willChange: 'transform, opacity' }}
      className={`glass border-2 border-skin-border ${borderRadiusClass} p-2.5 sm:p-3 md:p-4 shadow-theme max-w-2xl mx-auto w-full`}
    >
      {/* Layout principal - Responsivo */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 md:gap-4">
        {/* Primeira linha em mobile: Play/Pause + Visualizador */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto sm:flex-1">
          {/* Botão Play/Pause - Responsivo */}
          <motion.button
            onClick={isPlaying ? pause : play}
            className={`p-2 sm:p-2.5 md:p-3 bg-skin-accent text-skin-accent-text ${borderRadiusClass} flex-shrink-0 shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2`}
            aria-label={isPlaying ? 'Pausar' : 'Tocar'}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ 
              willChange: 'transform',
              boxShadow: isPlaying 
                ? '0 0 20px rgba(var(--color-primary-rgb, 99, 102, 241), 0.5)' 
                : '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            ) : (
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 ml-0.5" />
            )}
          </motion.button>

          {/* Visualizador de áudio - Responsivo */}
          <div className="flex items-end justify-center gap-0.5 sm:gap-1 h-8 sm:h-10 md:h-12 flex-1 min-w-0 px-1 sm:px-2">
            {barHeights.map((height, index) => {
              const isCenter = Math.abs(index - BAR_COUNT / 2) < 2
              const barColor = isPlaying 
                ? (isCenter ? 'var(--accent)' : 'var(--accent)')
                : 'var(--text-secondary)'
              
              return (
                <motion.div
                  key={index}
                  className="rounded-full flex-1"
                  animate={{
                    height: `${height * 100}%`,
                    opacity: isPlaying ? 1 : 0.4,
                  }}
                  transition={{
                    duration: 0.2,
                    ease: 'easeOut',
                  }}
                  style={{
                    minHeight: '2px',
                    maxWidth: '4px',
                    background: isPlaying
                      ? `linear-gradient(to top, ${barColor}, ${barColor}dd)`
                      : barColor,
                    boxShadow: isPlaying && height > 0.5
                      ? `0 0 6px ${barColor}40`
                      : 'none',
                  }}
                />
              )
            })}
          </div>
        </div>

        {/* Segunda linha em mobile: Seletor de tipo + Volume */}
        <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 w-full sm:w-auto justify-between sm:justify-start">
          {/* Seletor de tipo - Responsivo */}
          <div className="flex gap-1 sm:gap-1.5 flex-shrink-0">
            <motion.button
              onClick={() => setAudioType('white-noise')}
              className={`
                p-1.5 sm:p-2 md:p-2.5 ${borderRadiusClass} border-2 border-skin-border outline-none focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2
                ${
                  audioType === 'white-noise'
                    ? 'border-skin-accent bg-skin-accent/20 text-skin-accent shadow-lg'
                    : 'bg-skin-card text-skin-muted'
                }
              `}
              style={{ 
                willChange: 'transform',
                borderColor: audioType === 'white-noise' ? 'var(--accent)' : 'var(--border-color)',
                boxShadow: audioType === 'white-noise'
                  ? '0 0 12px var(--accent)'
                  : 'none',
              }}
              aria-label="White Noise"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </motion.button>
            <motion.button
              onClick={() => setAudioType('rain')}
              className={`
                p-1.5 sm:p-2 md:p-2.5 ${borderRadiusClass} border-2 border-skin-border outline-none focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2
                ${
                  audioType === 'rain'
                    ? 'border-skin-accent bg-skin-accent/20 text-skin-accent shadow-lg'
                    : 'bg-skin-card text-skin-muted'
                }
              `}
              style={{ 
                willChange: 'transform',
                borderColor: audioType === 'rain' ? 'var(--color-primary)' : 'var(--color-border)',
                boxShadow: audioType === 'rain'
                  ? '0 0 12px rgba(var(--color-primary-rgb, 99, 102, 241), 0.3)'
                  : 'none',
              }}
              aria-label="Chuva"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <CloudRain className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </motion.button>
          </div>

          {/* Controle de volume - Responsivo */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial sm:min-w-[100px] md:min-w-[140px] max-w-full sm:max-w-none">
            <Volume2 
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 flex-shrink-0 ${
                volume > 0 ? 'text-skin-accent' : 'text-skin-muted'
              }`}
            />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="flex-1 h-1.5 sm:h-2 bg-border rounded-full appearance-none cursor-pointer min-w-[40px] sm:min-w-[60px] slider-custom"
              style={{
                background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${volume * 100}%, var(--border-color) ${volume * 100}%, var(--border-color) 100%)`,
              }}
              aria-label="Volume"
            />
            <span className={`text-[10px] sm:text-xs md:text-sm font-semibold w-8 sm:w-10 md:w-12 text-right flex-shrink-0 ${
              volume > 0 ? 'text-skin-accent' : 'text-skin-muted'
            }`}>
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Estilos customizados para o slider - Responsivo */}
      <style>{`
        .slider-custom::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
          border: 2px solid var(--bg-card);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }
        
        @media (min-width: 640px) {
          .slider-custom::-webkit-slider-thumb {
            width: 14px;
            height: 14px;
          }
        }
        
        @media (min-width: 768px) {
          .slider-custom::-webkit-slider-thumb {
            width: 16px;
            height: 16px;
          }
        }
        
        .slider-custom::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 12px var(--accent);
        }
        
        .slider-custom::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
          border: 2px solid var(--bg-card);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }
        
        @media (min-width: 640px) {
          .slider-custom::-moz-range-thumb {
            width: 14px;
            height: 14px;
          }
        }
        
        @media (min-width: 768px) {
          .slider-custom::-moz-range-thumb {
            width: 16px;
            height: 16px;
          }
        }
        
        .slider-custom::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 12px var(--accent);
        }
      `}</style>
    </motion.div>
  )
}
