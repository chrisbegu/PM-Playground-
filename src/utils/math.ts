export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max)
export const mapRange = (val: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
  outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin)

export const frequencyFromPosition = (y: number, height: number, minFreq = 100, maxFreq = 1200) =>
  mapRange(clamp(y, 0, height), 0, height, maxFreq, minFreq)

export const hueFromPosition = (x: number, width: number) =>
  mapRange(clamp(x, 0, width), 0, width, 260, 360 + 120) % 360

export function simplex2D(x: number, y: number): number {
  const dot = (g: number[], x: number, y: number) => g[0] * x + g[1] * y
  const grad = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]]
  const F2 = 0.5 * (Math.sqrt(3) - 1)
  const G2 = (3 - Math.sqrt(3)) / 6
  const s = (x + y) * F2
  const i = Math.floor(x + s)
  const j = Math.floor(y + s)
  const t = (i + j) * G2
  const x0 = x - (i - t)
  const y0 = y - (j - t)
  const [i1, j1] = x0 > y0 ? [1, 0] : [0, 1]
  const x1 = x0 - i1 + G2
  const y1 = y0 - j1 + G2
  const x2 = x0 - 1 + 2 * G2
  const y2 = y0 - 1 + 2 * G2
  const perm = (n: number) => ((n * 1103515245 + 12345) & 0x7fffffff) % 256
  const gi0 = perm(i + perm(j)) % 8
  const gi1 = perm(i + i1 + perm(j + j1)) % 8
  const gi2 = perm(i + 1 + perm(j + 1)) % 8
  let n0 = 0, n1 = 0, n2 = 0
  let t0 = 0.5 - x0 * x0 - y0 * y0
  if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * dot(grad[gi0], x0, y0) }
  let t1 = 0.5 - x1 * x1 - y1 * y1
  if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * dot(grad[gi1], x1, y1) }
  let t2 = 0.5 - x2 * x2 - y2 * y2
  if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * dot(grad[gi2], x2, y2) }
  return 70 * (n0 + n1 + n2)
}
