import { create } from 'zustand'
import * as Tone from 'tone'

interface AudioState {
  masterVolume: number
  isInitialized: boolean
  synth: Tone.PolySynth | null
  reverb: Tone.Reverb | null
  delay: Tone.FeedbackDelay | null
  setMasterVolume: (vol: number) => void
  initialize: () => Promise<void>
  playNote: (frequency: number, duration?: string, velocity?: number) => void
  dispose: () => void
}

export const useAudioStore = create<AudioState>((set, get) => ({
  masterVolume: -12,
  isInitialized: false,
  synth: null,
  reverb: null,
  delay: null,

  setMasterVolume: (vol) => {
    set({ masterVolume: vol })
    Tone.getDestination().volume.value = vol
  },

  initialize: async () => {
    if (get().isInitialized) return
    await Tone.start()

    const reverb = new Tone.Reverb({ decay: 3, wet: 0.3 }).toDestination()
    const delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.2, wet: 0.15 }).connect(reverb)
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 1.2 },
      volume: -8,
    }).connect(delay)

    Tone.getDestination().volume.value = get().masterVolume

    set({ synth, reverb, delay, isInitialized: true })
  },

  playNote: (frequency, duration = '8n', velocity = 0.7) => {
    const { synth } = get()
    if (!synth) return
    synth.triggerAttackRelease(frequency, duration, undefined, velocity)
  },

  dispose: () => {
    const { synth, reverb, delay } = get()
    synth?.dispose()
    reverb?.dispose()
    delay?.dispose()
    set({ synth: null, reverb: null, delay: null, isInitialized: false })
  },
}))
