import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../stores/useAppStore'
import { useHaptic } from '../hooks/useHaptic'
import { simplex2D } from '../utils/math'

interface Star {
  x: number
  y: number
  radius: number
  twinkleSpeed: number
  twinkleOffset: number
  color: string
  brightness: number
}

interface CosmicCloud {
  x: number
  y: number
  radius: number
  color: string
  opacity: number
  rotation: number
  rotationSpeed: number
  birth: number
}

interface ShootingStar {
  x: number
  y: number
  vx: number
  vy: number
  length: number
  life: number
  maxLife: number
  color: string
}

function createStars(w: number, h: number, count: number): Star[] {
  const colors = ['#ffffff', '#c4b5fd', '#a5f3fc', '#fbcfe8', '#d9f99d']
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    radius: 0.5 + Math.random() * 2,
    twinkleSpeed: 0.5 + Math.random() * 2,
    twinkleOffset: Math.random() * Math.PI * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    brightness: 0.3 + Math.random() * 0.7,
  }))
}

function createCloud(w: number, h: number, fromEdge = false): CosmicCloud {
  const colors = ['#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316']
  let x: number, y: number
  if (fromEdge) {
    const side = Math.floor(Math.random() * 4)
    switch (side) {
      case 0: x = -100; y = Math.random() * h; break
      case 1: x = w + 100; y = Math.random() * h; break
      case 2: x = Math.random() * w; y = -100; break
      default: x = Math.random() * w; y = h + 100; break
    }
  } else {
    x = Math.random() * w
    y = Math.random() * h
  }
  return {
    x, y,
    radius: 60 + Math.random() * 120,
    color: colors[Math.floor(Math.random() * colors.length)],
    opacity: 0.08 + Math.random() * 0.12,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.002,
    birth: Date.now(),
  }
}

export default function CosmosView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const cloudsRef = useRef<CosmicCloud[]>([])
  const shootingStarsRef = useRef<ShootingStar[]>([])
  const animRef = useRef<number>(0)
  const lastCloudTime = useRef(Date.now())
  const lastShootingTime = useRef(Date.now())
  const setCurrentWorld = useAppStore((s) => s.setCurrentWorld)
  const haptic = useHaptic()
  const [sessionStart] = useState(Date.now())
  const [elapsed, setElapsed] = useState('0:00')
  const [showUI, setShowUI] = useState(true)

  useEffect(() => { setCurrentWorld('void') }, [setCurrentWorld])

  useEffect(() => {
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - sessionStart) / 1000)
      const mins = Math.floor(secs / 60)
      const s = secs % 60
      setElapsed(`${mins}:${s.toString().padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [sessionStart])

  const getTimeBasedPalette = useCallback(() => {
    const hour = new Date().getHours()
    const isDay = hour >= 6 && hour < 18
    return {
      bg1: isDay ? '#0a0a1a' : '#050510',
      bg2: isDay ? '#0f0a20' : '#0a0515',
      warmth: isDay ? 0.3 : 0,
    }
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
    const now = Date.now()
    const time = now / 1000

    // Initialize stars if needed
    if (starsRef.current.length === 0) {
      starsRef.current = createStars(w, h, 800)
      for (let i = 0; i < 4; i++) {
        cloudsRef.current.push(createCloud(w, h))
      }
    }

    // Background gradient
    const palette = getTimeBasedPalette()
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7)
    bgGrad.addColorStop(0, palette.bg1)
    bgGrad.addColorStop(1, palette.bg2)
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, w, h)

    // Cosmic clouds
    cloudsRef.current.forEach((cloud) => {
      cloud.rotation += cloud.rotationSpeed

      ctx.save()
      ctx.translate(cloud.x, cloud.y)
      ctx.rotate(cloud.rotation)

      // Multiple noise-based blobs
      for (let i = 0; i < 3; i++) {
        const noiseVal = simplex2D(cloud.x * 0.01 + i, time * 0.1)
        const r = cloud.radius * (0.7 + noiseVal * 0.3) * (1 - i * 0.2)
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
        gradient.addColorStop(0, cloud.color + Math.round(cloud.opacity * 255).toString(16).padStart(2, '0'))
        gradient.addColorStop(0.5, cloud.color + Math.round(cloud.opacity * 100).toString(16).padStart(2, '0'))
        gradient.addColorStop(1, cloud.color + '00')

        ctx.beginPath()
        ctx.ellipse(i * 20, i * 15, r, r * 0.7, i * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      }
      ctx.restore()
    })

    // Stars with twinkling
    starsRef.current.forEach((star) => {
      const twinkle = 0.3 + 0.7 * ((Math.sin(time * star.twinkleSpeed + star.twinkleOffset) + 1) / 2)
      const alpha = star.brightness * twinkle

      ctx.beginPath()
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
      ctx.fillStyle = star.color + Math.round(alpha * 255).toString(16).padStart(2, '0')
      ctx.fill()

      // Glow for brighter stars
      if (star.radius > 1.2) {
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius * 3, 0, Math.PI * 2)
        const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius * 3)
        glow.addColorStop(0, star.color + Math.round(alpha * 80).toString(16).padStart(2, '0'))
        glow.addColorStop(1, star.color + '00')
        ctx.fillStyle = glow
        ctx.fill()
      }
    })

    // Shooting stars
    shootingStarsRef.current = shootingStarsRef.current.filter((ss) => ss.life > 0)
    shootingStarsRef.current.forEach((ss) => {
      ss.x += ss.vx
      ss.y += ss.vy
      ss.life--

      const alpha = ss.life / ss.maxLife
      ctx.beginPath()
      ctx.moveTo(ss.x, ss.y)
      ctx.lineTo(ss.x - ss.vx * ss.length, ss.y - ss.vy * ss.length)
      ctx.strokeStyle = ss.color + Math.round(alpha * 255).toString(16).padStart(2, '0')
      ctx.lineWidth = 2
      ctx.shadowColor = ss.color
      ctx.shadowBlur = 15
      ctx.stroke()
      ctx.shadowBlur = 0

      // Head glow
      ctx.beginPath()
      ctx.arc(ss.x, ss.y, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff' + Math.round(alpha * 255).toString(16).padStart(2, '0')
      ctx.fill()
    })

    // Auto-generate new cloud every 30s
    if (now - lastCloudTime.current > 30000) {
      cloudsRef.current.push(createCloud(w, h, true))
      if (cloudsRef.current.length > 8) cloudsRef.current.shift()
      lastCloudTime.current = now
    }

    // Shooting star every 45-90s
    if (now - lastShootingTime.current > 45000 + Math.random() * 45000) {
      const angle = Math.random() * Math.PI * 0.5 + Math.PI * 0.25
      shootingStarsRef.current.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.3,
        vx: Math.cos(angle) * 8,
        vy: Math.sin(angle) * 8,
        length: 8,
        life: 40,
        maxLife: 40,
        color: '#ffffff',
      })
      lastShootingTime.current = now
    }

    // Vignette
    const vignetteGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.8)
    vignetteGrad.addColorStop(0, 'transparent')
    vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.5)')
    ctx.fillStyle = vignetteGrad
    ctx.fillRect(0, 0, w, h)

    animRef.current = requestAnimationFrame(drawScene)
  }, [getTimeBasedPalette])

  useEffect(() => {
    animRef.current = requestAnimationFrame(drawScene)
    return () => cancelAnimationFrame(animRef.current)
  }, [drawScene])

  return (
    <motion.div
      className="w-full h-full relative bg-void"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      onClick={() => { haptic.tap(); setShowUI(!showUI) }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />

      {/* Overlay UI */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: showUI ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Session timer */}
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2">
          <span
            className="text-white/20 text-xs"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {elapsed}
          </span>
        </div>

        {/* Title */}
        <div className="absolute top-4 left-4">
          <span
            className="text-white/30 text-sm"
            style={{ fontFamily: 'var(--font-grotesk)' }}
          >
            COSMOS
          </span>
        </div>

        {/* Hint */}
        <div className="absolute top-4 right-4">
          <span
            className="text-white/20 text-xs"
            style={{ fontFamily: 'var(--font-grotesk)' }}
          >
            tap to toggle UI
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
