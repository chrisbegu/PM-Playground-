import { create } from 'zustand'

export type World = 'paper' | 'void'
export type PerformanceTier = 'low' | 'medium' | 'high'

function detectPerformanceTier(): PerformanceTier {
  const cores = navigator.hardwareConcurrency || 2
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 2
  if (cores >= 8 && memory >= 8) return 'high'
  if (cores >= 4) return 'medium'
  return 'low'
}

interface AppState {
  currentWorld: World
  isAudioStarted: boolean
  performanceTier: PerformanceTier
  isMobile: boolean
  setCurrentWorld: (world: World) => void
  setAudioStarted: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentWorld: 'paper',
  isAudioStarted: false,
  performanceTier: detectPerformanceTier(),
  isMobile: typeof window !== 'undefined' && window.innerWidth < 768,
  setCurrentWorld: (world) => set({ currentWorld: world }),
  setAudioStarted: () => set({ isAudioStarted: true }),
}))
