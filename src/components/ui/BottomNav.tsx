import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAppStore } from '../../stores/useAppStore'
import { useHaptic } from '../../hooks/useHaptic'

const NAV_ITEMS = [
  { path: '/beats', label: 'Beats', world: 'paper' as const, icon: '⬡' },
  { path: '/garden', label: 'Garden', world: 'paper' as const, icon: '❋' },
  { path: '/', label: 'Home', world: 'paper' as const, icon: '✦' },
  { path: '/nebula', label: 'Nebula', world: 'void' as const, icon: '◉' },
  { path: '/cosmos', label: 'Cosmos', world: 'void' as const, icon: '☾' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { setCurrentWorld } = useAppStore()
  const haptic = useHaptic()
  const currentWorld = useAppStore((s) => s.currentWorld)
  const isVoid = currentWorld === 'void'

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 25 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div
        className={`flex items-center gap-1 px-3 py-2 rounded-full transition-colors duration-700 ${
          isVoid
            ? 'glass'
            : 'bg-white/90 backdrop-blur-xl border-2 border-ink/20 shadow-lg'
        }`}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => {
                haptic.tap()
                setCurrentWorld(item.world)
                navigate(item.path)
              }}
              className="relative flex flex-col items-center px-3 py-1.5 min-w-[52px]"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className={`absolute inset-0 rounded-full ${
                    isVoid ? 'bg-white/10' : 'bg-neon-purple/10'
                  }`}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <span
                className={`text-lg relative z-10 transition-all duration-300 ${
                  isActive
                    ? isVoid
                      ? 'scale-110 drop-shadow-[0_0_8px_#8b5cf6]'
                      : 'scale-110'
                    : isVoid
                    ? 'text-white/50'
                    : 'text-ink/40'
                }`}
                style={isActive ? {
                  filter: `drop-shadow(0 0 6px ${item.world === 'void' ? '#8b5cf6' : '#06b6d4'})`,
                } : undefined}
              >
                {item.icon}
              </span>
              <span
                className={`text-[10px] mt-0.5 relative z-10 transition-colors duration-300 ${
                  isActive
                    ? isVoid ? 'text-white font-medium' : 'text-ink font-medium'
                    : isVoid ? 'text-white/40' : 'text-ink/40'
                }`}
                style={{ fontFamily: isVoid ? 'var(--font-grotesk)' : 'var(--font-hand)' }}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </motion.nav>
  )
}
