import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Form, Button } from 'react-bootstrap'
import { useConversations } from '../contexts/ConversationsProvider';

const WALLPAPERS = [
  { id: 'none',    label: 'Default',  value: null },
  { id: 'sage',    label: 'Sage',     value: 'linear-gradient(135deg,#d4e6c3,#b8d4a8)' },
  { id: 'dusk',    label: 'Dusk',     value: 'linear-gradient(135deg,#c9d6ff,#e2e2e2)' },
  { id: 'sunset',  label: 'Sunset',   value: 'linear-gradient(135deg,#ffecd2,#fcb69f)' },
  { id: 'ocean',   label: 'Ocean',    value: 'linear-gradient(135deg,#a8edea,#fed6e3)' },
  { id: 'night',   label: 'Night',    value: 'linear-gradient(135deg,#2c3e50,#3498db)' },
  { id: 'forest',  label: 'Forest',   value: 'linear-gradient(135deg,#134e5e,#71b280)' },
  { id: 'candy',   label: 'Candy',    value: 'linear-gradient(135deg,#f093fb,#f5576c)' },
]

function ReadTick({ status }) {
  if (status === 'read') {
    // Double blue ticks
    return (
      <svg width="16" height="11" viewBox="0 0 16 11" style={{ display: 'inline', marginLeft: '3px' }}>
        <path d="M11.071.653l-1.089-.724L5.558 7.02 3.373 4.811l-.912.913 3.097 3.14 5.513-8.211z" fill="#53bdeb"/>
        <path d="M15.071.653l-1.089-.724-4.424 6.597.867.865.724-1.08 3.922-5.658zM1 7.453l2.914 2.914.724-1.08L1.724 6.54 1 7.453z" fill="#53bdeb"/>
      </svg>
    )
  }
  // Single grey tick
  return (
    <svg width="10" height="11" viewBox="0 0 10 11" style={{ display: 'inline', marginLeft: '3px' }}>
      <path d="M4.558 7.02L.99 3.42.066 4.333l4.492 4.538 8.45-8.45-.914-.913z" fill="#8696a0"/>
    </svg>
  )
}

export default function OpenConversation({ onBack }) {
  const [text, setText] = useState('')
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false)
  const typingTimeoutRef = useRef(null)
  const setRef = useCallback(node => {
    if (node) node.scrollIntoView({ smooth: true })
  }, [])
  const { sendMessage, selectedConversation, emitTyping, setWallpaper } = useConversations()

  const recipients = selectedConversation.recipients.map(r => r.id)
  const isTyping = selectedConversation.isTyping
  const wallpaper = selectedConversation.wallpaper

  // Emit read when conversation opens
  useEffect(() => {
    if (selectedConversation && recipients.length > 0) {
      // Handled by selectConversationIndex in provider
    }
  }, [selectedConversation.recipients]) // eslint-disable-line

  function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    sendMessage(recipients, text)
    setText('')
    // Stop typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    emitTyping(recipients, false)
  }

  function handleTextChange(e) {
    setText(e.target.value)
    emitTyping(recipients, true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => emitTyping(recipients, false), 2000)
  }

  // Cleanup typing on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      emitTyping(recipients, false)
    }
  }, []) // eslint-disable-line

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      height: '100%', position: 'relative', overflow: 'hidden'
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '0 12px', backgroundColor: 'var(--header-bg)',
        borderBottom: '1px solid var(--border-color)',
        minHeight: '60px', flexShrink: 0, zIndex: 2, gap: '10px'
      }}>
        <button className="mobile-back-btn" onClick={onBack} style={{
          background: 'none', border: 'none', padding: '6px 8px 6px 0',
          cursor: 'pointer', display: 'none', color: 'var(--primary-dark)'
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--primary-dark)">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>

        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          backgroundColor: 'var(--avatar-bg)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--avatar-icon)">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z"/>
          </svg>
          {selectedConversation.isOnline && (
            <div style={{
              position: 'absolute', bottom: '1px', right: '1px',
              width: '10px', height: '10px', borderRadius: '50%',
              backgroundColor: '#25D366', border: '2px solid var(--header-bg)'
            }}/>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.97rem', lineHeight: 1.2 }}>
            {selectedConversation.recipients.map(r => r.name).join(', ')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)', height: '14px' }}>
            {isTyping
              ? <span style={{ fontStyle: 'italic' }}>typing...</span>
              : selectedConversation.isOnline
                ? <span style={{ color: 'var(--primary-color)' }}>online</span>
                : selectedConversation.recipientLastSeen
                  ? <span style={{ color: 'var(--text-muted)' }}>
                      last seen {new Date(selectedConversation.recipientLastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  : null
            }
          </div>
        </div>

        {/* Wallpaper button */}
        <button onClick={() => setShowWallpaperPicker(p => !p)} title="Change wallpaper" style={{
          background: 'none', border: 'none', padding: '6px', cursor: 'pointer',
          borderRadius: '50%', color: 'var(--text-muted)', flexShrink: 0
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
          </svg>
        </button>
      </div>

      {/* ── Wallpaper Picker ── */}
      {showWallpaperPicker && (
        <div style={{
          position: 'absolute', top: '61px', right: '8px', zIndex: 100,
          backgroundColor: 'var(--modal-bg)', borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)', padding: '12px', width: '220px'
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
            CHAT WALLPAPER
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {WALLPAPERS.map(wp => (
              <button key={wp.id} title={wp.label} onClick={() => {
                setWallpaper(selectedConversation.recipients.map(r => r.id), wp.value)
                setShowWallpaperPicker(false)
              }} style={{
                width: '40px', height: '40px', borderRadius: '8px', cursor: 'pointer',
                border: wallpaper === wp.value ? '3px solid var(--primary-color)' : '2px solid var(--border-color)',
                background: wp.value || 'var(--chat-bg)',
                padding: 0, overflow: 'hidden'
              }}>
                {wp.id === 'none' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-muted)">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Messages Area ── */}
      <div
        onClick={() => setShowWallpaperPicker(false)}
        style={{
          flex: 1, overflowY: 'auto', padding: '12px 16px',
          background: wallpaper || 'var(--chat-bg)',
          backgroundImage: !wallpaper ? 'var(--chat-pattern)' : undefined,
          backgroundSize: !wallpaper ? '400px' : undefined,
          backgroundRepeat: !wallpaper ? 'repeat' : undefined,
        }}
        className="custom-scrollbar"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {selectedConversation.messages.map((message, index) => {
            const lastMessage = selectedConversation.messages.length - 1 === index
            return (
              <div
                ref={lastMessage ? setRef : null}
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: message.fromMe ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  maxWidth: '72%',
                  backgroundColor: message.fromMe ? 'var(--bubble-out)' : 'var(--bubble-in)',
                  borderRadius: message.fromMe ? '12px 0 12px 12px' : '0 12px 12px 12px',
                  padding: '7px 12px 6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  wordBreak: 'break-word'
                }}>
                  {!message.fromMe && (
                    <div style={{ fontWeight: '600', fontSize: '0.78rem', color: 'var(--primary-dark)', marginBottom: '2px' }}>
                      {message.senderName}
                    </div>
                  )}
                  <span style={{ fontSize: '0.93rem', color: 'var(--bubble-text)', lineHeight: '1.4' }}>
                    {message.text}
                  </span>
                  {message.fromMe && (
                    <span style={{ float: 'right', marginLeft: '8px', marginTop: '2px', lineHeight: 1 }}>
                      <ReadTick status={message.status} />
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Input Area ── */}
      <div style={{
        padding: '8px 12px', backgroundColor: 'var(--input-area-bg)', flexShrink: 0,
        borderTop: '1px solid var(--border-color)'
      }}>
        <Form onSubmit={handleSubmit} style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Form.Control
              as="textarea"
              required
              value={text}
              onChange={handleTextChange}
              placeholder="Type a message"
              style={{
                height: '44px', resize: 'none', borderRadius: '22px',
                padding: '10px 18px', border: 'none', boxShadow: 'none',
                fontSize: '0.95rem', backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)'
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) }
              }}
            />
            <Button type="submit" style={{
              width: '44px', height: '44px', minWidth: '44px', borderRadius: '50%',
              backgroundColor: 'var(--primary-dark)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0, flexShrink: 0
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '2px' }}>
                <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z"/>
              </svg>
            </Button>
          </div>
        </Form>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-back-btn { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
