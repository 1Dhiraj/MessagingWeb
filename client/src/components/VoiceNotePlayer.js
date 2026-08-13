import React, { useState, useRef, useEffect, useCallback } from 'react'

/*
 * WhatsApp-style voice note player.
 *
 * Why this exists instead of a plain <audio controls>:
 *
 *  1. MediaRecorder produces WebM/Matroska without a duration header, so
 *     `audio.duration` reports `Infinity` and the native control renders
 *     "Infinity:NaN" with a dead seek bar. We recover the real duration by
 *     seeking far past the end, which forces the browser to scan the file.
 *  2. The recorder measures the duration as it records, so we can show the
 *     correct length instantly instead of waiting for that scan.
 *  3. Native controls look nothing like a chat bubble and overflow on mobile.
 */

const BAR_COUNT = 34

// Only one voice note should ever be audible at a time.
let currentlyPlaying = null

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Deterministic pseudo-waveform derived from the URL, so a given note always
// renders the same bars across reloads and across both participants' screens.
function buildWaveform(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0
  }
  const bars = []
  for (let i = 0; i < BAR_COUNT; i++) {
    h = (h * 1103515245 + 12345) >>> 0
    bars.push(0.25 + ((h >>> 16) % 1000) / 1000 * 0.75)
  }
  return bars
}

export default function VoiceNotePlayer({ src, duration: knownDuration, fromMe }) {
  const audioRef = useRef(null)
  const barsRef = useRef(null)
  const scanningRef = useRef(false)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(
    Number.isFinite(knownDuration) && knownDuration > 0 ? knownDuration : 0
  )
  const [rate, setRate] = useState(1)
  const [error, setError] = useState(false)

  const waveform = React.useMemo(() => buildWaveform(src || ''), [src])

  // ── Recover a usable duration from a header-less WebM ──────────────
  const resolveDuration = useCallback(() => {
    const audio = audioRef.current
    if (!audio || scanningRef.current) return

    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration)
      return
    }

    // Infinity/NaN: seek beyond any plausible end. The browser scans to the
    // real end, fires `durationchange` with the true value, and we rewind.
    scanningRef.current = true
    const onDurationChange = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.removeEventListener('durationchange', onDurationChange)
        scanningRef.current = false
        setDuration(audio.duration)
        try { audio.currentTime = 0 } catch (e) { /* ignore */ }
        setCurrentTime(0)
      }
    }
    audio.addEventListener('durationchange', onDurationChange)
    try {
      audio.currentTime = 1e101
    } catch (e) {
      audio.removeEventListener('durationchange', onDurationChange)
      scanningRef.current = false
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTime = () => { if (!scanningRef.current) setCurrentTime(audio.currentTime) }
    const onEnd = () => {
      setPlaying(false)
      setCurrentTime(0)
      try { audio.currentTime = 0 } catch (e) { /* ignore */ }
      if (currentlyPlaying === audio) currentlyPlaying = null
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onError = () => setError(true)

    audio.addEventListener('loadedmetadata', resolveDuration)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('error', onError)

    // Metadata may already be present if the file came from cache.
    if (audio.readyState >= 1) resolveDuration()

    return () => {
      audio.removeEventListener('loadedmetadata', resolveDuration)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('error', onError)
      if (currentlyPlaying === audio) currentlyPlaying = null
    }
  }, [resolveDuration])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate
  }, [rate])

  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio || error) return

    if (playing) {
      audio.pause()
      return
    }

    if (currentlyPlaying && currentlyPlaying !== audio) {
      currentlyPlaying.pause()
    }
    currentlyPlaying = audio
    try {
      await audio.play()
    } catch (e) {
      // Autoplay policy or a decode failure — surface it rather than
      // leaving a button that silently does nothing.
      console.error('Voice note playback failed', e)
      setError(true)
      setPlaying(false)
    }
  }

  const seekFromEvent = (clientX) => {
    const audio = audioRef.current
    const el = barsRef.current
    if (!audio || !el || !duration) return
    const rect = el.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const target = ratio * duration
    try {
      audio.currentTime = target
      setCurrentTime(target)
    } catch (e) { /* not seekable yet */ }
  }

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0
  const accent = fromMe ? 'var(--primary-dark)' : 'var(--primary-color)'
  const idleBar = 'var(--text-muted)'
  const remaining = duration > 0 ? Math.max(0, duration - currentTime) : 0

  return (
    <div
      data-testid="voice-note"
      data-duration={duration ? duration.toFixed(2) : ''}
      data-playing={playing ? 'true' : 'false'}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        minWidth: '210px', maxWidth: '100%', padding: '2px 0',
      }}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
        data-testid="voice-note-toggle"
        disabled={error}
        style={{
          width: '36px', height: '36px', minWidth: '36px', borderRadius: '50%',
          border: 'none', backgroundColor: error ? 'var(--text-muted)' : accent,
          color: '#fff', cursor: error ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
        }}
      >
        {error ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        ) : playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ marginLeft: '2px' }}>
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          ref={barsRef}
          role="slider"
          tabIndex={0}
          aria-label="Seek voice message"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration) || 0}
          aria-valuenow={Math.round(currentTime)}
          onClick={e => seekFromEvent(e.clientX)}
          onKeyDown={e => {
            const audio = audioRef.current
            if (!audio || !duration) return
            if (e.key === 'ArrowRight') { e.preventDefault(); audio.currentTime = Math.min(duration, audio.currentTime + 5) }
            if (e.key === 'ArrowLeft') { e.preventDefault(); audio.currentTime = Math.max(0, audio.currentTime - 5) }
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); togglePlay() }
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '2px',
            height: '26px', cursor: duration ? 'pointer' : 'default', outline: 'none',
          }}
        >
          {waveform.map((h, i) => {
            const filled = i / BAR_COUNT < progress
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${Math.round(h * 22)}px`,
                  minWidth: '2px',
                  borderRadius: '2px',
                  backgroundColor: filled ? accent : idleBar,
                  opacity: filled ? 1 : 0.45,
                  transition: 'background-color 0.1s, opacity 0.1s',
                }}
              />
            )
          })}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1px',
        }}>
          <span data-testid="voice-note-time">
            {error ? 'Unavailable' : formatTime(playing || currentTime > 0 ? remaining : duration)}
          </span>
          {!error && (
            <button
              type="button"
              onClick={() => setRate(r => (r === 1 ? 1.5 : r === 1.5 ? 2 : 1))}
              aria-label={`Playback speed ${rate}x`}
              style={{
                background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '9px',
                padding: '0 6px', fontSize: '0.65rem', fontWeight: 600,
                color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: '15px',
              }}
            >
              {rate}x
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
