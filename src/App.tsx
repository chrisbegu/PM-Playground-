import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import BottomNav from './components/ui/BottomNav'

const TheLanding = lazy(() => import('./pages/TheLanding'))
const BeatGrid = lazy(() => import('./pages/BeatGrid'))
const WaveformGarden = lazy(() => import('./pages/WaveformGarden'))
const NebulaMode = lazy(() => import('./pages/NebulaMode'))
const CosmosView = lazy(() => import('./pages/CosmosView'))

function LoadingScreen() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-paper">
      <div className="relative">
        <svg width="60" height="60" viewBox="0 0 60 60" className="animate-spin">
          <circle
            cx="30" cy="30" r="24"
            fill="none" stroke="#2d2d2d" strokeWidth="2"
            strokeDasharray="100 50"
            strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 6px #8b5cf6)' }}
          />
        </svg>
      </div>
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const isLanding = location.pathname === '/'

  return (
    <div className="w-full h-full relative">
      <Suspense fallback={<LoadingScreen />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<TheLanding />} />
            <Route path="/beats" element={<BeatGrid />} />
            <Route path="/garden" element={<WaveformGarden />} />
            <Route path="/nebula" element={<NebulaMode />} />
            <Route path="/cosmos" element={<CosmosView />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
      {!isLanding && <BottomNav />}
    </div>
  )
}
