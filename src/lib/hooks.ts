import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

/** Re-renders every `interval` ms and returns the current time. */
export function useNow(interval = 1000) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), interval)
    return () => window.clearInterval(id)
  }, [interval])
  return now
}

/** Goes back if there's in-app history (e.g. opened from the list), otherwise to `fallback` (e.g. deep link). */
export function useBack(fallback = '/') {
  const navigate = useNavigate()
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }, [navigate, fallback])
}

/** Keeps the screen on while mounted, if the browser allows it (Chrome on Android does). */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let released = false
    const request = () =>
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (released) l.release()
          else lock = l
        })
        .catch(() => {})
    request()
    // The lock drops when the tab is hidden; take it again on return.
    const onVisible = () => document.visibilityState === 'visible' && request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release()
    }
  }, [enabled])
}

export function tap() {
  if ('vibrate' in navigator) navigator.vibrate(12)
}
