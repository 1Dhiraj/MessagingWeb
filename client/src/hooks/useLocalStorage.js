import { useState, useRef, useCallback } from 'react'

const PREFIX = 'whatsapp-clone-'

function read(prefixedKey, initialValue) {
  let stored = null
  try {
    stored = localStorage.getItem(prefixedKey)
  } catch (e) {
    // Storage can be unavailable (private mode, blocked cookies).
    stored = null
  }

  if (stored != null && stored !== 'undefined') {
    try {
      return JSON.parse(stored)
    } catch (e) {
      // Corrupted entry from an older build — drop it rather than crash.
      try { localStorage.removeItem(prefixedKey) } catch (e2) { /* ignore */ }
    }
  }

  return typeof initialValue === 'function' ? initialValue() : initialValue
}

export default function useLocalStorage(key, initialValue) {
  const prefixedKey = PREFIX + key
  const [value, setValue] = useState(() => read(prefixedKey, initialValue))

  // Mirrors the latest value so updates are sequenced correctly even when
  // several land in the same tick (multiple socket events, for example).
  const valueRef = useRef(value)

  const setAndPersist = useCallback(update => {
    const next = typeof update === 'function' ? update(valueRef.current) : update
    valueRef.current = next

    // Persist synchronously rather than in an effect. The effect version ran
    // after paint, so an action followed immediately by a reload or tab close
    // was lost even though the UI had already updated.
    try {
      if (next === undefined) localStorage.removeItem(prefixedKey)
      else localStorage.setItem(prefixedKey, JSON.stringify(next))
    } catch (e) {
      // Out of quota or storage disabled: keep the in-memory state working.
      console.warn(`Could not persist "${prefixedKey}"`, e)
    }

    setValue(next)
  }, [prefixedKey])

  return [value, setAndPersist]
}
