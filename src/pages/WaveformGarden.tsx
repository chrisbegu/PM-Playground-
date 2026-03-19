import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import * as Tone from 'tone'
import { useAppStore } from '../stores/useAppStore'
import { useHaptic } from '../hooks/useHaptic'
import { hueFromPosition, frequencyFromPosition } from '../utils/math'
import { neonFromHue } from '../utils/colors'

interface WaveformPoint {
  x: number
  y: number
}

interface Plant {
  points: WaveformPoint[]
  color: string
  growthProgress: number
  branches: Branch[]
}

interface Branch {
  x: number
  y: number
  angle: number
  length: number
  depth: number
  color: string
}

function generateBranches(points: WaveformPoint[], color: string): Branch[] {
  const branches: Branch[] = []
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]
    const dy = Math.abs(curr.y - prev.y) + Math.abs(next.y - curr.y)
    if (dy > 15) {
      const angle = curr.y < prev.y ? -Math.PI / 4 - Math.random() * 0.5 : Math.PI / 4 + Math.random() * 0.5
      const side = i % 2 === 0 ? 1 : -1
      branches.push({
        x: curr.x,
        y: curr.y,
        angle: angle * side,
        length: 15 + dy * 0.8,
        depth: 0,
        color,
      })
      if (dy > 30) {
        branches.push({
          x: curr.x,
          y: curr.y,
          angle: (angle * side) + (Math.random() - 0.5) * 0.6,
          length: 10 + dy * 0.4,
          depth: 1,
          color,
        })
      }
    }
  }
  return branches
}

export default function WaveformGarden() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [plants, setPlants] = useState<Plant[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const currentPoints = useRef<WaveformPoint[]>([])
  const animFrameRef = useRef<number>(0)
  const setCurrentWorld = useAppStore((s) => s.setCurrentWorld)
  const haptic = useHaptic()

  const synthRef = useRef<Tone.AMSynth | null>(null)

  useEffect(() => { setCurrentWorld('paper') }, [setCurrentWorld])

  useEffect(() => {
    synthRef.current = new Tone.AMSynth({
      harmonicity: 2,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.1, decay: 0.3, sustain: 0.5, release: 1 },
      modulation: { type: 'square' },
      modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 },
      volume: -15,
    }).toDestination()

    return () => { synthRef.current?.dispose() }
  }, [])

  const draw = useCallback(() => {
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

    ctx.clearRect(0, 0, w, h)

    // Draw all completed plants
    plants.forEach((plant) => {
      const progress = plant.growthProgress
      const visiblePoints = Math.floor(plant.points.length * Math.min(progress, 1))

      if (visiblePoints < 2) return

      // Main stem
      ctx.beginPath()
      ctx.moveTo(plant.points[0].x, plant.points[0].y)
      for (let i = 1; i < visiblePoints; i++) {
        const prev = plant.points[i - 1]
        const curr = plant.points[i]
        const cpx = (prev.x + curr.x) / 2
        const cpy = (prev.y + curr.y) / 2
        ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy)
      }
      ctx.strokeStyle = plant.color
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.shadowColor = plant.color
      ctx.shadowBlur = 8
      ctx.stroke()
      ctx.shadowBlur = 0

      // Branches
      if (progress > 0.3) {
        const branchProgress = (progress - 0.3) / 0.7
        plant.branches.forEach((branch) => {
          const len = branch.length * Math.min(branchProgress * 1.5, 1)
          const endX = branch.x + Math.cos(branch.angle) * len
          const endY = branch.y + Math.sin(branch.angle) * len

          ctx.beginPath()
          ctx.moveTo(branch.x, branch.y)
          const cpx = branch.x + Math.cos(branch.angle) * len * 0.5 + (Math.random() - 0.5) * 3
          const cpy = branch.y + Math.sin(branch.angle) * len * 0.5
          ctx.quadraticCurveTo(cpx, cpy, endX, endY)
          ctx.strokeStyle = branch.color
          ctx.lineWidth = branch.depth === 0 ? 2 : 1.5
          ctx.shadowColor = branch.color
          ctx.shadowBlur = 6
          ctx.stroke()
          ctx.shadowBlur = 0

          // Leaf at end
          if (branchProgress > 0.5) {
            const leafSize = 4 + branch.length * 0.15
            ctx.beginPath()
            ctx.ellipse(endX, endY, leafSize, leafSize * 0.6, branch.angle, 0, Math.PI * 2)
            ctx.fillStyle = branch.color + '60'
            ctx.shadowColor = branch.color
            ctx.shadowBlur = 10
            ctx.fill()
            ctx.shadowBlur = 0
          }
        })
      }
    })

    // Draw current stroke
    if (currentPoints.current.length > 1) {
      ctx.beginPath()
      ctx.moveTo(currentPoints.current[0].x, currentPoints.current[0].y)
      for (let i = 1; i < currentPoints.current.length; i++) {
        const prev = currentPoints.current[i - 1]
        const curr = currentPoints.current[i]
        ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) / 2, (prev.y + curr.y) / 2)
      }
      const hue = hueFromPosition(
        currentPoints.current[currentPoints.current.length - 1].x,
        w
      )
      const color = neonFromHue(hue)
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.shadowColor = color
      ctx.shadowBlur = 10
      ctx.stroke()
      ctx.shadowBlur = 0
    }
  }, [plants])

  // Animation loop for plant growth
  useEffect(() => {
    let running = true
    const animate = () => {
      if (!running) return
      setPlants((prev) => {
        let changed = false
        const next = prev.map((p) => {
          if (p.growthProgress < 1) {
            changed = true
            return { ...p, growthProgress: Math.min(p.growthProgress + 0.015, 1) }
          }
          return p
        })
        return changed ? next : prev
      })
      draw()
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animFrameRef.current = requestAnimationFrame(animate)
    return () => { running = false; cancelAnimationFrame(animFrameRef.current) }
  }, [draw])

  const getPos = (e: React.PointerEvent): WaveformPoint => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    currentPoints.current = [getPos(e)]
    haptic.tap()
    Tone.start()

    const canvas = canvasRef.current!
    const freq = frequencyFromPosition(e.clientY - canvas.getBoundingClientRect().top, canvas.clientHeight)
    synthRef.current?.triggerAttack(freq)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return
    currentPoints.current.push(getPos(e))

    const canvas = canvasRef.current!
    const freq = frequencyFromPosition(e.clientY - canvas.getBoundingClientRect().top, canvas.clientHeight)
    if (synthRef.current) {
      synthRef.current.frequency.rampTo(freq, 0.05)
    }
  }

  const handlePointerUp = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    synthRef.current?.triggerRelease()

    const points = [...currentPoints.current]
    if (points.length < 5) { currentPoints.current = []; return }

    const canvas = canvasRef.current!
    const avgX = points.reduce((s, p) => s + p.x, 0) / points.length
    const hue = hueFromPosition(avgX, canvas.clientWidth)
    const color = neonFromHue(hue)
    const branches = generateBranches(points, color)

    setPlants((prev) => [...prev, { points, color, growthProgress: 0, branches }])
    currentPoints.current = []
  }

  const handleExport = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], 'waveform-garden.png', { type: 'image/png' })
      if (navigator.share) {
        navigator.share({ files: [file] }).catch(() => {
          downloadBlob(blob)
        })
      } else {
        downloadBlob(blob)
      }
    })
  }

  const downloadBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'waveform-garden.png'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <motion.div
      className="w-full h-full bg-paper graph-paper flex flex-col relative"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 relative z-10">
        <h1
          className="text-ink"
          style={{ fontFamily: 'var(--font-hand)', fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 700 }}
        >
          Waveform Garden
        </h1>
        <div className="flex gap-2">
          <motion.button
            onClick={() => { haptic.tap(); setPlants([]) }}
            className="px-4 py-1.5 rounded-full border-2 border-ink/20 text-ink/50 text-sm"
            style={{ fontFamily: 'var(--font-hand)' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Clear
          </motion.button>
          <motion.button
            onClick={() => { haptic.tap(); handleExport() }}
            className="px-4 py-1.5 rounded-full border-2 border-neon-lime/50 text-neon-lime text-sm"
            style={{ fontFamily: 'var(--font-hand)' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Export ↗
          </motion.button>
        </div>
      </div>

      {/* Instruction */}
      <motion.p
        className="text-center text-ink/30 text-sm mb-2"
        style={{ fontFamily: 'var(--font-hand)' }}
        initial={{ opacity: 1 }}
        animate={{ opacity: plants.length > 0 ? 0 : 0.5 }}
      >
        draw a waveform — watch it grow
      </motion.p>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1 w-full cursor-crosshair touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </motion.div>
  )
}
