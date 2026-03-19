import { create } from 'zustand'

export const ROWS = 4
export const STEPS = 16

export const ROW_LABELS = ['KICK', 'SNARE', 'HAT', 'SYNTH'] as const
export const ROW_COLORS = ['#06b6d4', '#ec4899', '#84cc16', '#f97316'] as const

export type SoundPack = 'analog' | 'glitch' | 'lofi' | 'cosmic'

interface BeatState {
  grid: boolean[][]
  currentStep: number
  isPlaying: boolean
  bpm: number
  soundPack: SoundPack
  toggleCell: (row: number, step: number) => void
  setCurrentStep: (step: number) => void
  setPlaying: (playing: boolean) => void
  setBpm: (bpm: number) => void
  setSoundPack: (pack: SoundPack) => void
  clearGrid: () => void
}

const createEmptyGrid = () => Array.from({ length: ROWS }, () => Array(STEPS).fill(false) as boolean[])

export const useBeatStore = create<BeatState>((set) => ({
  grid: createEmptyGrid(),
  currentStep: -1,
  isPlaying: false,
  bpm: 120,
  soundPack: 'analog',

  toggleCell: (row, step) =>
    set((state) => {
      const newGrid = state.grid.map((r) => [...r])
      newGrid[row][step] = !newGrid[row][step]
      return { grid: newGrid }
    }),

  setCurrentStep: (step) => set({ currentStep: step }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setBpm: (bpm) => set({ bpm }),
  setSoundPack: (pack) => set({ soundPack: pack }),
  clearGrid: () => set({ grid: createEmptyGrid(), currentStep: -1 }),
}))
