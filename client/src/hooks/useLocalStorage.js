import { useEffect, useState } from 'react'

const PREFIX = 'whatsapp-clone-'

export default function useLocalStorage(key, initialValue) {
  const prefixedKey = PREFIX + key
  const [value, setValue] = useState(() => {
    const jsonValue = localStorage.getItem(prefixedKey)
    if (jsonValue != null) {
      try {
        return JSON.parse(jsonValue)
      } catch {
        localStorage.removeItem(prefixedKey)
      }
    }
    if (typeof initialValue === 'function') {
      return initialValue()
    } else {
      return initialValue
    }
  })

  useEffect(() => {
    if (value === undefined) {
      localStorage.removeItem(prefixedKey)
    } else {
      localStorage.setItem(prefixedKey, JSON.stringify(value))
    }
  }, [prefixedKey, value])

  return [value, setValue]
}
