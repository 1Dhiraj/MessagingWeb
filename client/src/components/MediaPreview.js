import React, { useState, useEffect } from 'react'

export default function MediaPreview({ file, onSend, onCancel, uploading }) {
  const [previewUrl, setPreviewUrl] = useState(null)
  const [caption, setCaption] = useState('')

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  if (!file) return null

  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')
  const isAudio = file.type.startsWith('audio/')
  const sizeMb = (file.size / 1024 / 1024).toFixed(2)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.88)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      animation: 'fadeInScale 0.2s ease',
    }}>
      {/* Close */}
      <button
        onClick={onCancel}
        style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
          width: '40px', height: '40px', color: 'white', cursor: 'pointer',
          fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ✕
      </button>

      {/* File name */}
      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', marginBottom: '12px' }}>
        {file.name} — {sizeMb} MB
      </div>

      {/* Preview area */}
      <div style={{ maxWidth: '80vw', maxHeight: '55vh', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
        {isImage && (
          <img src={previewUrl} alt="preview" style={{ maxWidth: '100%', maxHeight: '55vh', borderRadius: '10px', objectFit: 'contain', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} />
        )}
        {isVideo && (
          <video src={previewUrl} controls style={{ maxWidth: '100%', maxHeight: '55vh', borderRadius: '10px' }} />
        )}
        {isAudio && (
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎵</div>
            <audio src={previewUrl} controls />
          </div>
        )}
        {!isImage && !isVideo && !isAudio && (
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: '5rem', marginBottom: '16px' }}>📄</div>
            <div style={{ fontSize: '1rem', fontWeight: '600' }}>{file.name}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '4px' }}>{sizeMb} MB</div>
          </div>
        )}
      </div>

      {/* Caption + Send */}
      <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '480px', padding: '0 16px' }}>
        <input
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Add a caption… (optional)"
          onKeyDown={e => { if (e.key === 'Enter' && !uploading) onSend(caption) }}
          disabled={uploading}
          style={{
            flex: 1, padding: '11px 16px', borderRadius: '24px',
            border: 'none', backgroundColor: 'rgba(255,255,255,0.14)',
            color: 'white', fontSize: '0.95rem', outline: 'none',
          }}
        />
        <button
          onClick={() => onSend(caption)}
          disabled={uploading}
          style={{
            width: '46px', height: '46px', borderRadius: '50%',
            backgroundColor: uploading ? '#555' : '#25D366',
            border: 'none', cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            transition: 'background 0.2s',
          }}
        >
          {uploading
            ? <div style={{ width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            : <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '2px' }}><path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" /></svg>
          }
        </button>
      </div>
    </div>
  )
}
