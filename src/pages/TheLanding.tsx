import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/useAppStore'
import { useAudioStore } from '../stores/useAudioStore'
import { useHaptic } from '../hooks/useHaptic'

const TITLE = 'SYNTH.SPACE'
const DOODLES = ['♪', '∿', '◊', '△', '○', '♫', '⬡', '✦', '∞', '◇', '⊕', '❋']

function FloatingDoodle({ char, delay }: { char: string; delay: number }) {
  const x = Math.random() * 100
  const y = Math.random() * 100
  const size = 16 + Math.random() * 24
  const duration = 8 + Math.random() * 12

  return (
    <motion.span
      className="absolute text-ink/10 pointer-events-none select-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        fontSize: size,
        fontFamily: 'var(--font-hand)',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: [0, 0.15, 0.15, 0],
        y: [20, -30, -60, -80],
        x: [0, Math.random() * 40 - 20, Math.random() * 60 - 30],
        rotate: [0, Math.random() * 30 - 15],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {char}
    </motion.span>
  )
}

export default function TheLanding() {
  const navigate = useNavigate()
  const { setCurrentWorld, setAudioStarted } = useAppStore()
  const { initialize } = useAudioStore()
  const haptic = useHaptic()
  const [titleRevealed, setTitleRevealed] = useState(false)
  const [glowOn, setGlowOn] = useState(false)
  const titleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer1 = setTimeout(() => setTitleRevealed(true), 300)
    const timer2 = setTimeout(() => setGlowOn(true), 1800)
    return () => { clearTimeout(timer1); clearTimeout(timer2) }
  }, [])

  const handleEnter = async (world: 'paper' | 'void') => {
    haptic.heavyTap()
    try {
      await initialize()
      setAudioStarted()
    } catch { /* audio optional */ }
    setCurrentWorld(world)
    navigate(world === 'paper' ? '/beats' : '/nebula')
  }

  return (
    <motion.div
      className="w-full h-full bg-paper dot-grid flex flex-col items-center justify-center relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ scale: 1.1, opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 0.6 }}
    >
      {/* Floating doodles */}
      {DOODLES.map((d, i) => (
        <FloatingDoodle key={i} char={d} delay={i * 0.8} />
      ))}

      {/* Title */}
      <div ref={titleRef} className="relative z-10 mb-12">
        <div className="flex overflow-hidden">
          {TITLE.split('').map((char, i) => (
            <motion.span
              key={i}
              className="inline-block"
              style={{
                fontFamily: 'var(--font-hand)',
                fontSize: 'clamp(48px, 12vw, 96px)',
                fontWeight: 700,
                color: '#2d2d2d',
                lineHeight: 1,
              }}
              initial={{ y: 80, opacity: 0, rotateX: -90 }}
              animate={titleRevealed ? {
                y: 0,
                opacity: 1,
                rotateX: 0,
              } : {}}
              transition={{
                delay: i * 0.08,
                type: 'spring',
                stiffness: 200,
                damping: 15,
              }}
            >
              <span
                className="transition-all duration-700"
                style={glowOn ? {
                  color: i % 2 === 0 ? '#8b5cf6' : '#06b6d4',
                  textShadow: `0 0 10px ${i % 2 === 0 ? '#8b5cf6' : '#06b6d4'}, 0 0 30px ${i % 2 === 0 ? '#8b5cf680' : '#06b6d480'}`,
                } : {}}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            </motion.span>
          ))}
        </div>

        {/* Tagline */}
        <motion.p
          className="text-ink/50 mt-4 text-center"
          style={{ fontFamily: 'var(--font-hand)', fontSize: 'clamp(18px, 4vw, 28px)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: glowOn ? 1 : 0, y: glowOn ? 0 : 20 }}
          transition={{ duration: 0.8 }}
        >
          your pocket universe of sound & light
        </motion.p>
      </div>

      {/* Portal Buttons */}
      <motion.div
        className="relative z-10 flex flex-col sm:flex-row gap-4 sm:gap-6 px-6"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: glowOn ? 1 : 0, y: glowOn ? 0 : 40 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        {/* Paper World Portal */}
        <motion.button
          onClick={() => handleEnter('paper')}
          className="group relative px-8 py-4 rounded-2xl bg-white border-2 border-ink/30 overflow-hidden"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{ fontFamily: 'var(--font-hand)' }}
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ background: 'linear-gradient(135deg, #06b6d420, #84cc1620)' }}
          />
          <span className="relative text-xl font-bold text-ink">
            ✎ Paper World
          </span>
          <span className="relative block text-sm text-ink/50 mt-1">
            beats & garden
          </span>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-cyan to-neon-lime opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>

        {/* Void World Portal */}
        <motion.button
          onClick={() => handleEnter('void')}
          className="group relative px-8 py-4 rounded-2xl bg-void border-2 border-white/10 overflow-hidden"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{ fontFamily: 'var(--font-grotesk)' }}
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ background: 'linear-gradient(135deg, #8b5cf620, #ec489920)' }}
          />
          <span className="relative text-xl font-bold text-white">
            ◉ The Void
          </span>
          <span className="relative block text-sm text-white/50 mt-1">
            nebula & cosmos
          </span>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-purple to-neon-magenta opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
      </motion.div>

      {/* Hand-drawn decorative lines */}
      <svg className="absolute bottom-0 left-0 w-full h-32 pointer-events-none opacity-10" preserveAspectRatio="none">
        <path d="M0,80 Q200,20 400,60 T800,40 T1200,70 T1600,30" fill="none" stroke="#2d2d2d" strokeWidth="1.5" />
        <path d="M0,100 Q300,50 600,80 T1200,50 T1600,90" fill="none" stroke="#2d2d2d" strokeWidth="1" />
      </svg>
    </motion.div>
  )
}
