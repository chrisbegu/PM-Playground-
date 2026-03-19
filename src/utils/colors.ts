export const NEON = {
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  magenta: '#ec4899',
  lime: '#84cc16',
  orange: '#f97316',
} as const

export const NEON_ARRAY = [NEON.purple, NEON.cyan, NEON.magenta, NEON.lime, NEON.orange]

export function hslToHex(h: number, s: number, l: number): string {
  h = h % 360
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function neonFromHue(hue: number): string {
  return hslToHex(hue, 85, 60)
}

export function neonGlowCSS(color: string, intensity = 1): string {
  const s = Math.round(7 * intensity)
  const m = Math.round(15 * intensity)
  const l = Math.round(30 * intensity)
  return `0 0 ${s}px ${color}, 0 0 ${m}px ${color}, 0 0 ${l}px ${color}80`
}
