import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Tone from 'tone'
import { useBeatStore, ROWS, STEPS, ROW_LABELS, ROW_COLORS } from '../stores/useBeatStore'
import { useAppStore } from '../stores/useAppStore'
import { useHaptic } from '../hooks/useHaptic'

function BeatCell({ row, step, active, triggered }: {
  row: number; step: number; active: boolean; triggered: boolean
}) {
  const toggleCell = useBeatStore((s) => s.toggleCell)
  const haptic = useHaptic()
  const color = ROW_COLORS[row]

  return (
    <motion.button
      onClick={() => { haptic.tap(); toggleCell(row, step) }}
      className="relative aspect-square rounded-lg border-2 transition-colors duration-150"
      style={{
        borderColor: active ? color : '#2d2d2d30',
        backgroundColor: active ? `${color}20` : 'transparent',
        boxShadow: triggered && active ? `0 0 12px ${color}, 0 0 24px ${color}60` : 'none',
      }}
      whileTap={{ scale: 0.85 }}
      animate={triggered && active ? { scale: [1, 1.15, 1] } : { scale: 1 }}
      transition={{ duration: 0.15 }}
    >
      {active && (
        <motion.div
          className="absolute inset-1.5 rounded"
          style={{ backgroundColor: color }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: triggered ? 1 : 0.6 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        />
      )}
      {triggered && active && (
        <motion.div
          className="absolute inset-0 rounded-lg"
          style={{ boxShadow: `0 0 20px ${color}, 0 0 40px ${color}40` }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        />
      )}
    </motion.button>
  )
}

export default function BeatGrid() {
  const { grid, currentStep, isPlaying, bpm, soundPack } = useBeatStore()
  const { setCurrentStep, setPlaying, setBpm, clearGrid, setSoundPack } = useBeatStore()
  const setCurrentWorld = useAppStore((s) => s.setCurrentWorld)
  const haptic = useHaptic()

  const synthsRef = useRef<{
    kick: Tone.MembraneSynth
    snare: Tone.NoiseSynth
    hat: Tone.MetalSynth
    synth: Tone.FMSynth
  } | null>(null)
  const sequenceRef = useRef<Tone.Sequence | null>(null)

  useEffect(() => { setCurrentWorld('paper') }, [setCurrentWorld])

  useEffect(() => {
    const reverb = new Tone.Reverb({ decay: 1.5, wet: 0.2 }).toDestination()

    synthsRef.current = {
      kick: new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, volume: -6 }).connect(reverb),
      snare: new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
        volume: -10,
      }).connect(reverb),
      hat: new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
        harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5, volume: -15,
      }).connect(reverb),
      synth: new Tone.FMSynth({
        harmonicity: 3, modulationIndex: 10,
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5 },
        volume: -12,
      }).connect(reverb),
    }

    return () => {
      synthsRef.current?.kick.dispose()
      synthsRef.current?.snare.dispose()
      synthsRef.current?.hat.dispose()
      synthsRef.current?.synth.dispose()
      reverb.dispose()
    }
  }, [soundPack])

  const triggerStep = useCallback((step: number) => {
    const synths = synthsRef.current
    const g = useBeatStore.getState().grid
    if (!synths) return

    setCurrentStep(step)

    if (g[0][step]) synths.kick.triggerAttackRelease('C1', '8n')
    if (g[1][step]) synths.snare.triggerAttackRelease('16n')
    if (g[2][step]) synths.hat.triggerAttackRelease('C4', '32n')
    if (g[3][step]) {
      const notes = ['C4', 'E4', 'G4', 'B4', 'D5', 'E5', 'G5', 'A5']
      synths.synth.triggerAttackRelease(notes[step % notes.length], '8n')
    }
  }, [setCurrentStep])

  useEffect(() => {
    Tone.getTransport().bpm.value = bpm
  }, [bpm])

  useEffect(() => {
    if (isPlaying) {
      Tone.start()
      sequenceRef.current = new Tone.Sequence(
        (_, step) => triggerStep(step as number),
        Array.from({ length: STEPS }, (_, i) => i),
        '16n'
      )
      sequenceRef.current.start(0)
      Tone.getTransport().start()
    } else {
      sequenceRef.current?.stop()
      sequenceRef.current?.dispose()
      sequenceRef.current = null
      Tone.getTransport().stop()
      setCurrentStep(-1)
    }

    return () => {
      sequenceRef.current?.stop()
      sequenceRef.current?.dispose()
    }
  }, [isPlaying, triggerStep, setCurrentStep])

  const PACKS: Array<{ id: typeof soundPack; label: string }> = [
    { id: 'analog', label: 'Analog' },
    { id: 'glitch', label: 'Glitch' },
    { id: 'lofi', label: 'Lo-Fi' },
    { id: 'cosmic', label: 'Cosmic' },
  ]

  return (
    <motion.div
      className="w-full h-full bg-paper dot-grid flex flex-col items-center justify-center p-4 pb-24 overflow-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
    >
      {/* Title */}
      <h1
        className="text-ink mb-4 text-center"
        style={{ fontFamily: 'var(--font-hand)', fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 700 }}
      >
        Beat Grid
      </h1>

      {/* BPM Display */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-ink/50 text-sm" style={{ fontFamily: 'var(--font-hand)' }}>BPM</span>
        <motion.span
          key={bpm}
          className="text-2xl font-bold neon-text-purple"
          style={{ fontFamily: 'var(--font-mono)' }}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {bpm}
        </motion.span>
        <input
          type="range" min="60" max="200" value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-32 accent-neon-purple"
        />
      </div>

      {/* Grid */}
      <motion.div
        className="w-full max-w-3xl"
        animate={isPlaying ? { scale: [1, 1.003, 1] } : {}}
        transition={{ duration: 60 / bpm, repeat: Infinity }}
      >
        {Array.from({ length: ROWS }).map((_, row) => (
          <div key={row} className="flex items-center gap-1 mb-1.5">
            <span
              className="w-14 text-right text-xs font-bold mr-2 shrink-0"
              style={{ fontFamily: 'var(--font-hand)', fontSize: 14, color: ROW_COLORS[row] }}
            >
              {ROW_LABELS[row]}
            </span>
            <div className="grid grid-cols-16 gap-1 flex-1"
              style={{ gridTemplateColumns: `repeat(${STEPS}, 1fr)` }}
            >
              <AnimatePresence>
                {Array.from({ length: STEPS }).map((_, step) => (
                  <BeatCell
                    key={`${row}-${step}`}
                    row={row}
                    step={step}
                    active={grid[row][step]}
                    triggered={currentStep === step}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Playhead indicator */}
      {isPlaying && currentStep >= 0 && (
        <div className="w-full max-w-3xl mt-2 relative h-1">
          <motion.div
            className="absolute h-1 rounded-full"
            style={{
              width: `${100 / STEPS}%`,
              left: `calc(56px + 8px + ${(currentStep / STEPS) * 100}% * (1 - 56px / 100%))`,
              background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
              boxShadow: '0 0 10px #8b5cf6, 0 0 20px #06b6d480',
            }}
            layoutId="playhead"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <motion.button
          onClick={() => { haptic.tap(); Tone.start(); setPlaying(!isPlaying) }}
          className="px-6 py-2.5 rounded-full border-2 border-ink/30 bg-white font-bold text-ink"
          style={{ fontFamily: 'var(--font-hand)', fontSize: 18 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </motion.button>

        <motion.button
          onClick={() => { haptic.tap(); clearGrid() }}
          className="px-5 py-2.5 rounded-full border-2 border-ink/20 text-ink/60"
          style={{ fontFamily: 'var(--font-hand)', fontSize: 16 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Clear
        </motion.button>
      </div>

      {/* Sound Packs */}
      <div className="flex gap-2 mt-4">
        {PACKS.map((pack) => (
          <motion.button
            key={pack.id}
            onClick={() => { haptic.tap(); setSoundPack(pack.id) }}
            className={`px-4 py-1.5 rounded-full border-2 text-sm ${
              soundPack === pack.id
                ? 'border-neon-purple bg-neon-purple/10 text-neon-purple neon-glow-purple'
                : 'border-ink/20 text-ink/50'
            }`}
            style={{ fontFamily: 'var(--font-hand)' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {pack.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
