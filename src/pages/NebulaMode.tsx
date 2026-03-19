import { useEffect, useRef, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import * as Tone from 'tone'
import { useAppStore } from '../stores/useAppStore'
import { useHaptic } from '../hooks/useHaptic'
import { frequencyFromPosition, hueFromPosition } from '../utils/math'
import { neonFromHue, neonGlowCSS } from '../utils/colors'

interface NebulaDot {
  x: number
  y: number
  radius: number
  color: string
  opacity: number
  birth: number
  vx: number
  vy: number
}

interface TrailPoint {
  x: number
  y: number
  color: string
  opacity: number
  radius: number
}

export default function NebulaMode() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dotsRef = useRef<NebulaDot[]>([])
  const trailsRef = useRef<TrailPoint[]>([])
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)
  const animRef = useRef<number>(0)
  const setCurrentWorld = useAppStore((s) => s.setCurrentWorld)
  const haptic = useHaptic()
  const [showHint, setShowHint] = useState(true)

  const synthRef = useRef<Tone.PolySynth | null>(null)
  const reverbRef = useRef<Tone.Reverb | null>(null)

  useEffect(() => { setCurrentWorld('void') }, [setCurrentWorld])

  useEffect(() => {
    const rev = new Tone.Reverb({ decay: 4, wet: 0.4 }).toDestination()
    reverbRef.current = rev
    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.1, decay: 0.5, sustain: 0.3, release: 2 },
      volume: -10,
    }).connect(rev)

    return () => {
      synthRef.current?.dispose()
      rev.dispose()
    }
  }, [])

  // Ambient dust particles
  useEffect(() => {
    const dust: NebulaDot[] = []
    for (let i = 0; i < 60; i++) {
      dust.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: 1 + Math.random() * 2,
        color: '#ffffff',
        opacity: 0.05 + Math.random() * 0.1,
        birth: Date.now() - Math.random() * 10000,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.1 - Math.random() * 0.3,
      })
    }
    dotsRef.current = dust
  }, [])

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.clientWidth * dpr
    canvas.height = canvas.clientHeight * dpr
    ctx.scale(dpr, dpr)
    const w = canvas.clientWidth
    const h = canvas.clientHeight

    // Dark background
    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, w, h)

    const now = Date.now()

    // Update & draw dots (nebula clouds + ambient dust)
    dotsRef.current = dotsRef.current.filter((d) => {
      const age = (now - d.birth) / 1000
      if (d.radius > 5 && age > 6) return false // nebula clouds fade
      return d.opacity > 0.005
    })

    dotsRef.current.forEach((dot) => {
      dot.x += dot.vx
      dot.y += dot.vy

      // Wrap dust
      if (dot.radius < 5) {
        if (dot.y < -10) dot.y = h + 10
        if (dot.x < -10) dot.x = w + 10
        if (dot.x > w + 10) dot.x = -10
      }

      const age = (now - dot.birth) / 1000
      let alpha = dot.opacity
      if (dot.radius > 5) {
        // Nebula cloud: fade in then out
        if (age < 0.3) alpha *= age / 0.3
        else if (age > 4) alpha *= Math.max(0, 1 - (age - 4) / 2)
      }

      // Draw glow
      const gradient = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, dot.radius * 3)
      gradient.addColorStop(0, dot.color + Math.round(alpha * 255).toString(16).padStart(2, '0'))
      gradient.addColorStop(0.4, dot.color + Math.round(alpha * 128).toString(16).padStart(2, '0'))
      gradient.addColorStop(1, dot.color + '00')

      ctx.beginPath()
      ctx.arc(dot.x, dot.y, dot.radius * 3, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()

      // Core
      ctx.beginPath()
      ctx.arc(dot.x, dot.y, dot.radius * 0.5, 0, Math.PI * 2)
      ctx.fillStyle = dot.color + Math.round(alpha * 200).toString(16).padStart(2, '0')
      ctx.fill()
    })

    // Draw trails
    trailsRef.current = trailsRef.current.filter((t) => t.opacity > 0.01)
    trailsRef.current.forEach((trail) => {
      trail.opacity *= 0.97
      trail.radius *= 0.998

      const gradient = ctx.createRadialGradient(trail.x, trail.y, 0, trail.x, trail.y, trail.radius * 2)
      gradient.addColorStop(0, trail.color + Math.round(trail.opacity * 200).toString(16).padStart(2, '0'))
      gradient.addColorStop(1, trail.color + '00')

      ctx.beginPath()
      ctx.arc(trail.x, trail.y, trail.radius * 2, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
    })

    animRef.current = requestAnimationFrame(drawScene)
  }, [])

  useEffect(() => {
    animRef.current = requestAnimationFrame(drawScene)
    return () => cancelAnimationFrame(animRef.current)
  }, [drawScene])

  const getPos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    isDrawingRef.current = true
    setShowHint(false)
    const pos = getPos(e)
    lastPosRef.current = pos
    haptic.tap()
    Tone.start()

    const canvas = canvasRef.current!
    const hue = hueFromPosition(pos.x, canvas.clientWidth)
    const color = neonFromHue(hue)
    const freq = frequencyFromPosition(pos.y, canvas.clientHeight)

    // Spawn nebula cloud
    dotsRef.current.push({
      x: pos.x,
      y: pos.y,
      radius: 20 + Math.random() * 30,
      color,
      opacity: 0.4 + Math.random() * 0.2,
      birth: Date.now(),
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.3,
    })

    synthRef.current?.triggerAttackRelease(freq, '4n', undefined, 0.5)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawingRef.current) return
    const pos = getPos(e)
    const canvas = canvasRef.current!
    const hue = hueFromPosition(pos.x, canvas.clientWidth)
    const color = neonFromHue(hue)

    // Add trail points
    if (lastPosRef.current) {
      const dx = pos.x - lastPosRef.current.x
      const dy = pos.y - lastPosRef.current.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 3) {
        for (let i = 0; i < 3; i++) {
          trailsRef.current.push({
            x: pos.x + (Math.random() - 0.5) * 10,
            y: pos.y + (Math.random() - 0.5) * 10,
            color,
            opacity: 0.5,
            radius: 4 + Math.random() * 6,
          })
        }
      }
    }
    lastPosRef.current = pos
  }

  const handlePointerUp = () => {
    isDrawingRef.current = false
    lastPosRef.current = null
  }

  const handleClear = () => {
    haptic.tap()
    dotsRef.current = dotsRef.current.filter((d) => d.radius < 5) // keep dust
    trailsRef.current = []
  }

  return (
    <motion.div
      className="w-full h-full relative bg-void"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
      transition={{ duration: 0.5 }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {/* HUD */}
      <motion.div
        className="absolute top-4 left-4 z-10"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
      >
        <motion.button
          onClick={handleClear}
          className="glass rounded-full px-4 py-2 text-white/70 text-sm"
          style={{ fontFamily: 'var(--font-grotesk)' }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Clear
        </motion.button>
      </motion.div>

      <motion.div
        className="absolute top-4 right-4 z-10 flex gap-2"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
      >
        {['#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316'].map((color) => (
          <div
            key={color}
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: color, boxShadow: neonGlowCSS(color, 0.5) }}
          />
        ))}
      </motion.div>

      {/* Hint text */}
      {showHint && (
        <motion.p
          className="absolute bottom-28 left-1/2 -translate-x-1/2 text-white/30 text-sm text-center"
          style={{ fontFamily: 'var(--font-grotesk)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 1 }}
        >
          touch to create — drag to flow
        </motion.p>
      )}
    </motion.div>
  )
}
