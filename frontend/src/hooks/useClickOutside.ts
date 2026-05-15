import { useEffect, type RefObject } from 'react'

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void,
  delay = 0,
) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler()
      }
    }
    const timeoutId = delay > 0 ? setTimeout(() => document.addEventListener('mousedown', listener), delay) : null
    if (delay === 0) document.addEventListener('mousedown', listener)
    return () => {
      if (timeoutId !== null) clearTimeout(timeoutId)
      document.removeEventListener('mousedown', listener)
    }
  }, [ref, handler, delay])
}
