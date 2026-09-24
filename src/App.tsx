import { useEffect } from 'react'
import { BrowserRouter, Link, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router'
import { useAuth } from './auth/AuthProvider'
import { Icon } from './components/Icon'
import { useDraft } from './data/draft'
import { useData } from './data/store'
import { ExerciseEditor } from './screens/ExerciseEditor'
import { Journal } from './screens/Journal'
import { LogActive } from './screens/LogActive'
import { LogConfigure } from './screens/LogConfigure'
import { LogPick } from './screens/LogPick'
import { SessionEditor } from './screens/SessionEditor'
import { Setup } from './screens/Setup'
import { Welcome } from './screens/Welcome'
import { WorkoutDetail } from './screens/WorkoutDetail'

export function App() {
  const { state } = useAuth()
  const data = useData()

  if (state.status === 'loading') return <Splash />
  if (state.status === 'signedOut') return <Welcome />
  if (!data) return <Splash />

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<TabsLayout />}>
          <Route index element={<Journal />} />
          <Route path="setup" element={<Setup />} />
        </Route>
        <Route path="log" element={<LogPick />} />
        <Route path="log/active" element={<LogActive />} />
        <Route path="log/:typeId" element={<LogConfigure />} />
        <Route path="workout/:id" element={<WorkoutDetail />} />
        <Route path="setup/session/:id" element={<SessionEditor />} />
        <Route path="setup/exercise/:id" element={<ExerciseEditor />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function TabsLayout() {
  const draft = useDraft()
  return (
    <>
      <Outlet />
      <nav className="tabbar" aria-label="Main">
        <div className="tabbar__inner">
          <NavLink to="/" end className="tabbar__item">
            <Icon name="journal" />
            <span>Journal</span>
          </NavLink>
          <Link to={draft ? '/log/active' : '/log'} className="tabbar__plus" aria-label={draft ? 'Resume workout' : 'Log a workout'}>
            <Icon name="plus" size={28} strokeWidth={2.2} />
            {draft && <span className="tabbar__live" aria-hidden="true" />}
          </Link>
          <NavLink to="/setup" className="tabbar__item">
            <Icon name="setup" />
            <span>Setup</span>
          </NavLink>
        </div>
      </nav>
    </>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    // Braces matter: newer Chrome returns a Promise from scrollTo, which React would treat as a cleanup.
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function Splash() {
  return <div className="splash" aria-busy="true" />
}
