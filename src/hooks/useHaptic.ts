import { useCallback } from 'react'

export function useHaptic() {
  const vibrate = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }, [])

  return {
    tap: () => vibrate(10),
    heavyTap: () => vibrate(30),
    pattern: (durations: number[]) => vibrate(durations),
  }
}
