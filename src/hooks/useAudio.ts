import { useState, useEffect, useRef, useCallback } from 'react'

export type AudioType = 'white-noise' | 'rain'

interface UseAudioReturn {
  isPlaying: boolean
  audioType: AudioType
  volume: number
  play: () => void
  pause: () => void
  setAudioType: (type: AudioType) => void
  setVolume: (volume: number) => void
}

export const useAudio = (): UseAudioReturn => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioType, setAudioType] = useState<AudioType>('white-noise')
  const [volume, setVolume] = useState(0.3) // Volume padrão mais baixo

  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)

  // Inicializa o AudioContext
  useEffect(() => {
    if (!audioContextRef.current) {
      // Type assertion segura para webkitAudioContext (compatibilidade Safari)
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioContextRef.current = new AudioContextClass()
      gainNodeRef.current = audioContextRef.current.createGain()
      gainNodeRef.current.connect(audioContextRef.current.destination)
      gainNodeRef.current.gain.value = volume
    }
  }, [])

  // Atualiza o volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume
    }
  }, [volume])

  const pause = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop()
      } catch (e) {
        // Ignora erro se já foi parado
      }
      sourceNodeRef.current.disconnect()
      sourceNodeRef.current = null
    }
    setIsPlaying(false)
  }, [])

  const play = useCallback(async () => {
    // Inicializa AudioContext se não existir
    if (!audioContextRef.current) {
      // Type assertion segura para webkitAudioContext (compatibilidade Safari)
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioContextRef.current = new AudioContextClass()
      gainNodeRef.current = audioContextRef.current.createGain()
      gainNodeRef.current.connect(audioContextRef.current.destination)
      gainNodeRef.current.gain.value = volume
    }

    // Garante que o gainNode existe
    if (!gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current = audioContextRef.current.createGain()
      gainNodeRef.current.connect(audioContextRef.current.destination)
      gainNodeRef.current.gain.value = volume
    }

    // Resume se estiver suspenso (de forma assíncrona)
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume()
      } catch {
        return
      }
    }

    // Para qualquer som anterior
    pause()

    if (!audioContextRef.current || !gainNodeRef.current) {
      return
    }

    // Garante que o volume está configurado (com redução adicional para suavidade)
    gainNodeRef.current.gain.value = volume * 0.7 // Redução adicional para evitar clipping

    // Cria buffer de áudio baseado no tipo
    const sampleRate = audioContextRef.current.sampleRate
    const duration = 2 // 2 segundos de buffer para melhor qualidade
    const bufferSize = sampleRate * duration
    const buffer = audioContextRef.current.createBuffer(1, bufferSize, sampleRate)
    const data = buffer.getChannelData(0)

    if (audioType === 'white-noise') {
      // Gera white noise suave com filtro passa-baixa aplicado
      // Primeiro gera o ruído bruto
      const rawNoise: number[] = []
      for (let i = 0; i < bufferSize; i++) {
        rawNoise[i] = (Math.random() * 2 - 1) * 0.3 // Amplitude reduzida
      }
      
      // Aplica filtro passa-baixa simples (média móvel) para suavizar
      const filterSize = 10
      for (let i = 0; i < bufferSize; i++) {
        let sum = 0
        let count = 0
        for (let j = Math.max(0, i - filterSize); j <= Math.min(bufferSize - 1, i + filterSize); j++) {
          sum += rawNoise[j]
          count++
        }
        data[i] = sum / count
      }
    } else if (audioType === 'rain') {
      // Gera som de chuva realista com múltiplas camadas
      for (let i = 0; i < bufferSize; i++) {
        const t = i / sampleRate
        
        // Camada 1: Gotas individuais (alta frequência, esporádicas)
        const dropPattern = Math.random() < 0.02 ? 1 : 0 // 2% de chance de gota
        const dropFreq = 800 + Math.random() * 400 // 800-1200 Hz
        const drop = dropPattern * Math.sin(t * 2 * Math.PI * dropFreq) * 0.15
        
        // Camada 2: Ruído de fundo suave (frequências médias)
        const backgroundNoise = (Math.random() * 2 - 1) * 0.12
        
        // Camada 3: Rumor constante (frequências baixas filtradas)
        const rumble = Math.sin(t * 2 * Math.PI * 60) * 0.08
        
        // Camada 4: Variação temporal (simula intensidade variável)
        const intensity = 0.7 + Math.sin(t * 0.5) * 0.3
        
        // Combina todas as camadas
        data[i] = (drop + backgroundNoise + rumble) * intensity
        
        // Aplica filtro passa-baixa suave para suavizar transições
        if (i > 0) {
          data[i] = data[i] * 0.7 + data[i - 1] * 0.3
        }
      }
    }

    // Cria e toca o buffer em loop
    try {
      const source = audioContextRef.current.createBufferSource()
      source.buffer = buffer
      source.loop = true
      source.connect(gainNodeRef.current)
      source.start(0)
      
      sourceNodeRef.current = source
      audioBufferRef.current = buffer
      setIsPlaying(true)
    } catch {
      // Erro ao tocar áudio - falha silenciosa
    }
  }, [audioType, pause, volume])

  // Para e recria quando o tipo muda (se estiver tocando)
  useEffect(() => {
    if (isPlaying) {
      play()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioType])

  return {
    isPlaying,
    audioType,
    volume,
    play,
    pause,
    setAudioType,
    setVolume,
  }
}
