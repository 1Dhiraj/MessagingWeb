import { useState, useRef, useCallback, useEffect } from 'react'

/*
 * Voice note recorder.
 *
 * Fixes the failure modes of the original inline implementation:
 *  - Hard-coded `audio/webm` threw on Safari/iOS, which only supports
 *    `audio/mp4`. We now negotiate a supported container.
 *  - `MediaRecorder.start()` with no timeslice only emits data at stop, so
 *    very short taps produced an empty chunk list. We request periodic chunks.
 *  - The early `return` when there were no chunks skipped track cleanup, so
 *    the microphone stayed live (browser tab kept its recording indicator).
 *    Cleanup now runs unconditionally.
 *  - Duration was counted by incrementing a state variable on an interval,
 *    which drifts and stalls in background tabs. We measure against a
 *    wall-clock timestamp.
 */

const MAX_DURATION_MS = 5 * 60 * 1000 // 5 minutes, matches the 50MB upload cap
const MIN_DURATION_MS = 300           // shorter than this is an accidental tap

const CANDIDATE_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
]

export function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  if (typeof MediaRecorder.isTypeSupported !== 'function') return ''
  for (const type of CANDIDATE_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return '' // let the browser choose its default
}

function extensionFor(mimeType) {
  if (!mimeType) return 'webm'
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'webm'
}

export function isRecordingSupported() {
  return !!(
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  )
}

export default function useVoiceRecorder() {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0) // seconds
  const [error, setError] = useState(null)

  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const startedAtRef = useRef(0)
  const tickRef = useRef(null)
  const settleRef = useRef(null)   // resolver for the pending stop()
  const cancelledRef = useRef(false)
  const startingRef = useRef(false) // guards double-start from touch + mouse
  const mountedRef = useRef(true)

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  // Teardown that always runs, whatever path we exit through.
  const teardown = useCallback(() => {
    clearTick()
    releaseStream()
    recorderRef.current = null
    chunksRef.current = []
    startingRef.current = false
    if (mountedRef.current) {
      setRecording(false)
      setElapsed(0)
    }
  }, [clearTick, releaseStream])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      // Leaving the screen mid-recording must not leave the mic open.
      try {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
          cancelledRef.current = true
          recorderRef.current.stop()
        }
      } catch (e) { /* ignore */ }
      clearTick()
      releaseStream()
    }
  }, [clearTick, releaseStream])

  const start = useCallback(async () => {
    if (startingRef.current || recorderRef.current) return false
    if (!isRecordingSupported()) {
      setError('Voice recording is not supported in this browser.')
      return false
    }

    startingRef.current = true
    setError(null)
    cancelledRef.current = false

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } catch (err) {
      startingRef.current = false
      const denied = err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      setError(denied
        ? 'Microphone permission denied. Allow mic access to send voice notes.'
        : 'No microphone found.')
      return false
    }

    // The user may have released/cancelled while the permission prompt was up.
    if (cancelledRef.current || !mountedRef.current) {
      stream.getTracks().forEach(t => t.stop())
      startingRef.current = false
      return false
    }

    const mimeType = pickMimeType()
    let recorder
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    } catch (err) {
      stream.getTracks().forEach(t => t.stop())
      startingRef.current = false
      setError('This browser cannot record audio.')
      return false
    }

    streamRef.current = stream
    recorderRef.current = recorder
    chunksRef.current = []

    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onerror = () => {
      setError('Recording failed.')
      const settle = settleRef.current
      settleRef.current = null
      teardown()
      if (settle) settle(null)
    }

    recorder.onstop = () => {
      const durationMs = Date.now() - startedAtRef.current
      const chunks = chunksRef.current
      const wasCancelled = cancelledRef.current
      // Capture the blob before teardown wipes the chunk buffer.
      const blob = chunks.length
        ? new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' })
        : null

      const settle = settleRef.current
      settleRef.current = null

      teardown() // always releases the mic, even for an empty recording

      if (!settle) return
      if (wasCancelled || !blob || blob.size === 0 || durationMs < MIN_DURATION_MS) {
        settle(null)
        return
      }

      const type = blob.type || 'audio/webm'
      const file = new File([blob], `voice-note-${Date.now()}.${extensionFor(type)}`, { type })
      settle({ file, blob, duration: durationMs / 1000 })
    }

    startedAtRef.current = Date.now()
    // Timeslice keeps chunks flowing so even a half-second note has data.
    recorder.start(250)

    startingRef.current = false
    setRecording(true)
    setElapsed(0)

    tickRef.current = setInterval(() => {
      const secs = (Date.now() - startedAtRef.current) / 1000
      if (mountedRef.current) setElapsed(secs)
      if (secs * 1000 >= MAX_DURATION_MS) {
        try {
          if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop()
          }
        } catch (e) { /* ignore */ }
      }
    }, 200)

    return true
  }, [teardown])

  // Resolves with { file, blob, duration } or null when there is nothing to send.
  const stop = useCallback(() => {
    // Released before getUserMedia resolved — abandon the pending start.
    if (startingRef.current && !recorderRef.current) {
      cancelledRef.current = true
      return Promise.resolve(null)
    }
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') {
      teardown()
      return Promise.resolve(null)
    }
    clearTick()
    return new Promise(resolve => {
      settleRef.current = resolve
      try {
        recorder.stop()
      } catch (e) {
        settleRef.current = null
        teardown()
        resolve(null)
      }
    })
  }, [clearTick, teardown])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    return stop()
  }, [stop])

  return {
    supported: isRecordingSupported(),
    recording,
    elapsed,
    error,
    clearError: useCallback(() => setError(null), []),
    start,
    stop,
    cancel,
  }
}
