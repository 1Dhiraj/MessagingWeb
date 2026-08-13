import React, { useState, useEffect, useRef } from 'react'
import { Form, Button } from 'react-bootstrap'
import { useConversations } from '../contexts/ConversationsProvider'
import EmojiPickerPanel from './EmojiPickerPanel'
import MediaPreview from './MediaPreview'
import VoiceNotePlayer from './VoiceNotePlayer'
import useVoiceRecorder from '../hooks/useVoiceRecorder'
import { useCall } from '../contexts/CallProvider'

const MENU_WIDTH = 170
const MENU_HEIGHT = 220

// Short label for a message that has no text of its own (quoted replies,
// the reply composer bar).
function describeMedia(m) {
  if (!m || !m.mediaType) return null
  if (m.mediaType === 'audio') return '🎤 Voice note'
  if (m.mediaType === 'image') return '📷 Photo'
  if (m.mediaType === 'video') return '🎥 Video'
  return `📄 ${m.mediaName || 'Document'}`
}

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
    return (
      <svg width="16" height="11" viewBox="0 0 16 11" style={{ display: 'inline', marginLeft: '3px' }}>
        <path d="M11.071.653l-1.089-.724L5.558 7.02 3.373 4.811l-.912.913 3.097 3.14 5.513-8.211z" fill="#53bdeb"/>
        <path d="M15.071.653l-1.089-.724-4.424 6.597.867.865.724-1.08 3.922-5.658zM1 7.453l2.914 2.914.724-1.08L1.724 6.54 1 7.453z" fill="#53bdeb"/>
      </svg>
    )
  }
  return (
    <svg width="10" height="11" viewBox="0 0 10 11" style={{ display: 'inline', marginLeft: '3px' }}>
      <path d="M4.558 7.02L.99 3.42.066 4.333l4.492 4.538 8.45-8.45-.914-.913z" fill="#8696a0"/>
    </svg>
  )
}

function ContextMenu({ x, y, message, fromMe, onClose, onReply, onEdit, onDelete, onDeleteEveryone, onReact }) {
  useEffect(() => {
    function handleDismiss() { onClose() }
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('click', handleDismiss)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('click', handleDismiss)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏']

  // Keep the menu on screen — near the right or bottom edge (and on narrow
  // phone viewports) the un-clamped version rendered partly off-screen.
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768
  const left = Math.max(8, Math.min(x, vw - MENU_WIDTH - 8))
  const top = Math.max(8, Math.min(y, vh - MENU_HEIGHT - 8))

  return (
    <div data-testid="context-menu" style={{
      position: 'fixed', left, top, zIndex: 1000,
      backgroundColor: 'var(--modal-bg)', border: '1px solid var(--border-color)',
      borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      padding: '4px 0', width: `${MENU_WIDTH}px`
    }} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', padding: '6px 8px', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
        {emojis.map(e => (
          <span key={e} role="button" aria-label={`React ${e}`} data-testid={`react-${e}`}
            onClick={() => { onReact(message.id, e); onClose() }}
            style={{ cursor: 'pointer', fontSize: '1.2rem', padding: '0 2px' }}>
            {e}
          </span>
        ))}
      </div>
      {!message.deleted && (
        <div data-testid="menu-reply" onClick={() => { onReply(message); onClose() }} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '0.9rem' }} className="menu-item hover-bg">Reply</div>
      )}
      {fromMe && !message.mediaUrl && !message.deleted && (
        <div data-testid="menu-edit" onClick={() => { onEdit(message); onClose() }} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '0.9rem' }} className="menu-item hover-bg">Edit message</div>
      )}
      <div data-testid="menu-delete-me" onClick={() => { onDelete(message.id); onClose() }} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '0.9rem' }} className="menu-item hover-bg">Delete for me</div>
      {fromMe && !message.deleted && (
        <div data-testid="menu-delete-all" onClick={() => { onDeleteEveryone(message.id); onClose() }} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '0.9rem', color: '#f15c6d' }} className="menu-item hover-bg">Delete for everyone</div>
      )}
    </div>
  )
}

export default function OpenConversation({ onBack }) {
  const [text, setText] = useState('')
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false)
  const typingTimeoutRef = useRef(null)

  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleMessagesCount, setVisibleMessagesCount] = useState(30)
  const observerTarget = useRef(null)
  
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [mediaFile, setMediaFile] = useState(null)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [sendError, setSendError] = useState(null)

  const {
    supported: micSupported, recording, elapsed: recordTime,
    error: recorderError, clearError: clearRecorderError,
    start: startRecorder, stop: stopRecorder, cancel: cancelRecorder,
  } = useVoiceRecorder()

  const [contextMenu, setContextMenu] = useState(null)
  const [editingMessage, setEditingMessage] = useState(null)

  const fileInputRef = useRef()
  const messagesContainerRef = useRef(null)
  const longPressTimerRef = useRef(null)

  const {
    sendMessage, sendMedia, selectedConversation, selectedConversationIndex, emitTyping, setWallpaper,
    deleteMessage, editMessage, addReaction, replyTo, setReplyTo, clearReplyTo, currentUserId
  } = useConversations()

  const { initiateCall } = useCall()

  const recipients = selectedConversation.recipients.map(r => r.id)
  const isTyping = selectedConversation.isTyping
  const wallpaper = selectedConversation.wallpaper

  const nameForId = (uid) => {
    if (uid === currentUserId) return 'You'
    const r = selectedConversation.recipients.find(x => x.id === uid)
    return (r && r.name) || uid
  }

  const messages = selectedConversation.messages
  const messageCount = messages.length
  const lastMessageId = messageCount ? messages[messageCount - 1].id : null

  // Scroll the message list itself rather than calling scrollIntoView, which
  // on mobile scrolls the whole page and pushes the composer off screen.
  //
  // Keyed on the last message id and the count, not the messages array: that
  // array is rebuilt on every render, so the old dependency re-fired on every
  // keystroke and presence tick and yanked you back down while you were
  // reading history.
  useEffect(() => {
    const el = messagesContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lastMessageId, messageCount, selectedConversationIndex, showSearch])

  useEffect(() => {
      const target = observerTarget.current
      if (!target || typeof IntersectionObserver === 'undefined') return
      const observer = new IntersectionObserver(
          entries => {
              if (entries[0].isIntersecting) {
                  setVisibleMessagesCount(prev => prev + 30)
              }
          },
          { threshold: 1.0 }
      )
      observer.observe(target)
      return () => observer.disconnect()
  }, [])

  // Reset the paging window when switching chats so a long history doesn't
  // stay expanded into the next conversation.
  useEffect(() => {
    setVisibleMessagesCount(30)
    setSearchQuery('')
    setShowSearch(false)
    setEditingMessage(null)
    setText('')
  }, [selectedConversationIndex])

  const filteredMessages = messages.filter(m => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    // Match captions and attachment names too, not just plain text messages.
    return (m.text && m.text.toLowerCase().includes(q)) ||
           (m.mediaName && m.mediaName.toLowerCase().includes(q))
  }).slice(-visibleMessagesCount)

  function handleSubmit(e) {
    if (e) e.preventDefault()
    if (!text.trim()) return
    
    if (editingMessage) {
       editMessage(editingMessage.id, text, recipients)
       setEditingMessage(null)
    } else {
       sendMessage(recipients, text, null, null, null, replyTo)
    }
    
    setText('')
    clearReplyTo()
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    emitTyping(recipients, false)
  }

  function handleCancelEdit() {
      setEditingMessage(null)
      setText('')
  }

  function handleTextChange(e) {
    setText(e.target.value)
    emitTyping(recipients, true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => emitTyping(recipients, false), 2000)
  }

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      emitTyping(recipients, false)
    }
  }, []) // eslint-disable-line

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) setMediaFile(file)
    e.target.value = null
  }

  const handleSendMedia = async (caption) => {
    setUploadingMedia(true)
    setSendError(null)
    try {
      await sendMedia(recipients, mediaFile, caption, replyTo)
      setMediaFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      console.error(err)
      setSendError(err.message || 'Failed to send media')
    } finally {
      setUploadingMedia(false)
    }
  }

  // ── Voice notes ───────────────────────────────────────────
  // Tap to start, tap again to send. The original press-and-hold fired both
  // touchstart and the synthesised mousedown on mobile, starting two
  // recorders, and any pointer drift off the button silently aborted a
  // recording mid-sentence.
  // Intent is tracked in a ref, not in render state: two taps landing in the
  // same frame would both read `recording === false` and try to start twice.
  const recordIntentRef = useRef(false)

  const handleToggleRecording = async () => {
    if (recordIntentRef.current) {
      recordIntentRef.current = false
      const result = await stopRecorder()
      if (!result) return // cancelled, or too short to be a real note
      setUploadingMedia(true)
      setSendError(null)
      try {
        await sendMedia(recipients, result.file, '', replyTo, { duration: result.duration })
        clearReplyTo()
      } catch (err) {
        console.error(err)
        setSendError(err.message || 'Failed to send voice note')
      } finally {
        setUploadingMedia(false)
      }
      return
    }

    recordIntentRef.current = true
    clearRecorderError()
    const started = await startRecorder()
    if (!started) recordIntentRef.current = false
  }

  const handleCancelRecording = async () => {
    recordIntentRef.current = false
    await cancelRecorder()
  }

  const formatRecordTime = (seconds) => {
    const total = Math.floor(seconds || 0)
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const openContextMenu = (clientX, clientY, message, fromMe) => {
    setContextMenu({ x: clientX, y: clientY, message, fromMe })
  }

  const handleContextMenu = (e, message, fromMe) => {
    e.preventDefault()
    openContextMenu(e.clientX, e.clientY, message, fromMe)
  }

  // Touch devices have no right-click, so long-press opens the same menu.
  const handleTouchStart = (e, message, fromMe) => {
    const touch = e.touches[0]
    if (!touch) return
    const { clientX, clientY } = touch
    clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = setTimeout(() => {
      openContextMenu(clientX, clientY, message, fromMe)
    }, 500)
  }
  const cancelLongPress = () => clearTimeout(longPressTimerRef.current)
  useEffect(() => () => clearTimeout(longPressTimerRef.current), [])

  const renderMedia = (message) => {
    if (!message.mediaUrl) return null
    if (message.mediaType === 'image') {
      return (
        <img src={message.mediaUrl} alt={message.mediaName || 'attachment'}
          data-testid="media-image"
          style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', cursor: 'pointer', display: 'block' }}
          onClick={() => window.open(message.mediaUrl, '_blank', 'noopener,noreferrer')} />
      )
    }
    if (message.mediaType === 'video') {
      return <video src={message.mediaUrl} controls data-testid="media-video" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', display: 'block' }} />
    }
    if (message.mediaType === 'audio') {
      return (
        <VoiceNotePlayer
          src={message.mediaUrl}
          duration={message.mediaDuration}
          fromMe={message.fromMe}
        />
      )
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)', padding: '8px', borderRadius: '8px' }}>
        <span style={{ fontSize: '24px', marginRight: '8px' }} role="img" aria-label="document">📄</span>
        <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" data-testid="media-document" style={{ wordBreak: 'break-all', fontSize: '0.85rem' }}>
          {message.mediaName || 'Document'}
        </a>
      </div>
    )
  }

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
            {selectedConversation.groupName || selectedConversation.recipients.map(r => r.name).join(', ')}
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

        {/* Call Buttons */}
        {selectedConversation.recipients.length === 1 && (
            <div style={{ display: 'flex', gap: '5px', marginRight: '5px' }}>
                <button onClick={() => initiateCall(selectedConversation.recipients[0].id, false)} title="Voice Call" style={{
                  background: 'none', border: 'none', padding: '6px', cursor: 'pointer',
                  borderRadius: '50%', color: 'var(--text-muted)'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
                </button>
                <button onClick={() => initiateCall(selectedConversation.recipients[0].id, true)} title="Video Call" style={{
                  background: 'none', border: 'none', padding: '6px', cursor: 'pointer',
                  borderRadius: '50%', color: 'var(--text-muted)'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                </button>
            </div>
        )}

        {/* Search button */}
        <button onClick={() => setShowSearch(p => !p)} title="Search messages" style={{
          background: showSearch ? 'var(--selected-bg)' : 'none', border: 'none', padding: '6px', cursor: 'pointer',
          borderRadius: '50%', color: 'var(--text-muted)', flexShrink: 0
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </button>

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

      {/* ── Search Bar ── */}
      {showSearch && (
         <div style={{ padding: '8px 12px', backgroundColor: 'var(--header-bg)', borderBottom: '1px solid var(--border-color)' }}>
              <input 
                type="text" 
                placeholder="Search messages..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                style={{
                  width: '100%', padding: '6px 12px', borderRadius: '8px',
                  border: '1px solid var(--border-color)', backgroundColor: 'var(--input-bg)',
                  outline: 'none', color: 'var(--text-primary)', fontSize: '0.9rem'
                }}
              />
         </div>
      )}

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
        ref={messagesContainerRef}
        data-testid="messages-container"
        onClick={() => setShowWallpaperPicker(false)}
        style={{
          flex: 1, overflowY: 'auto', padding: '12px 16px',
          // All longhand on purpose. Setting the `background` shorthand and
          // then `backgroundImage: undefined` made React clear the image it
          // had just set, so picking a wallpaper appeared to do nothing.
          backgroundColor: 'var(--chat-bg)',
          backgroundImage: wallpaper || 'var(--chat-pattern)',
          backgroundSize: wallpaper ? 'cover' : '400px',
          backgroundRepeat: wallpaper ? 'no-repeat' : 'repeat',
          backgroundAttachment: 'local',
        }}
        className="custom-scrollbar"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div ref={observerTarget} style={{ height: '10px' }}></div>
          {filteredMessages.map((message, index) => {
            const lastMessage = filteredMessages.length - 1 === index
            
            return (
              <div
                key={message.id || index}
                data-testid="message-row"
                data-last={lastMessage ? 'true' : 'false'}
                style={{
                  display: 'flex',
                  justifyContent: message.fromMe ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  data-testid="message-bubble"
                  onContextMenu={(e) => handleContextMenu(e, message, message.fromMe)}
                  onTouchStart={(e) => handleTouchStart(e, message, message.fromMe)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                  onTouchCancel={cancelLongPress}
                  style={{
                  maxWidth: '72%',
                  backgroundColor: message.fromMe ? 'var(--bubble-out)' : 'var(--bubble-in)',
                  borderRadius: message.fromMe ? '12px 0 12px 12px' : '0 12px 12px 12px',
                  padding: '7px 12px 6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  wordBreak: 'break-word',
                  position: 'relative',
                  opacity: message.deleted ? 0.6 : 1,
                  fontStyle: message.deleted ? 'italic' : 'normal'
                }}>
                  {!message.fromMe && !message.deleted && (
                     <div style={{ fontWeight: '600', fontSize: '0.78rem', color: 'var(--primary-dark)', marginBottom: '2px' }}>
                       {message.senderName}
                     </div>
                  )}
                  
                  {message.deleted ? (
                      <span data-testid="deleted-message" style={{ fontSize: '0.93rem', color: 'var(--text-muted)' }}>This message was deleted</span>
                  ) : (
                      <>
                        {message.replyTo && (
                            <div data-testid="reply-quote" style={{
                                backgroundColor: 'rgba(0,0,0,0.05)',
                                borderLeft: '3px solid var(--primary-color)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                marginBottom: '4px',
                                fontSize: '0.8rem',
                                color: 'var(--text-secondary)'
                            }}>
                                <div style={{ fontWeight: 'bold' }}>{nameForId(message.replyTo.sender)}</div>
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {message.replyTo.deleted ? 'Deleted message' : (message.replyTo.text || describeMedia(message.replyTo) || 'Media')}
                                </div>
                            </div>
                        )}
                        {renderMedia(message)}
                        {(message.text || message.edited) && (
                          <span data-testid="message-text" style={{
                            fontSize: '0.93rem', color: 'var(--bubble-text)', lineHeight: '1.4',
                            display: 'block', marginTop: message.mediaUrl ? '4px' : 0
                          }}>
                            {message.text}
                            {message.edited && (
                                <span style={{ fontSize: '0.65rem', fontStyle: 'italic', color: 'var(--text-muted)', marginLeft: '6px' }}>(edited)</span>
                            )}
                          </span>
                        )}
                      </>
                  )}
                  
                  {message.fromMe && (
                    <span style={{ float: 'right', marginLeft: '8px', marginTop: '2px', lineHeight: 1 }}>
                      <ReadTick status={message.status} />
                    </span>
                  )}

                  {/* Reactions */}
                  {!message.deleted && message.reactions && Object.keys(message.reactions).length > 0 && (
                      <div style={{
                          position: 'absolute',
                          bottom: '-12px',
                          display: 'flex',
                          gap: '2px',
                          right: message.fromMe ? '10px' : 'auto',
                          left: message.fromMe ? 'auto' : '10px',
                          background: 'var(--header-bg)',
                          padding: '2px 4px',
                          borderRadius: '10px',
                          border: '1px solid var(--border-color)',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                      }}>
                          {Object.entries(message.reactions).map(([emoji, users]) => (
                               <span key={emoji} style={{ fontSize: '0.75rem' }}>
                                   {emoji} <span style={{fontSize:'0.65rem', marginLeft:'-2px'}}>{users.length > 1 ? users.length : ''}</span>
                               </span>
                          ))}
                      </div>
                  )}

                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {editingMessage && (
          <div style={{
              padding: '8px 16px',
              backgroundColor: 'var(--header-bg)',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
          }}>
              <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary-dark)' }}>
                      Editing Message
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                      {editingMessage.text}
                  </div>
              </div>
              <div onClick={handleCancelEdit} style={{ cursor: 'pointer', padding: '4px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-muted)">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z"/>
                  </svg>
              </div>
          </div>
      )}

      {replyTo && (
          <div data-testid="reply-bar" style={{
              padding: '8px 16px',
              backgroundColor: 'var(--header-bg)',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px'
          }}>
              <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary-dark)' }}>
                      Replying to {replyTo.fromMe ? 'yourself' : replyTo.senderName}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {replyTo.deleted ? 'Deleted message' : (replyTo.text || describeMedia(replyTo) || 'Media')}
                  </div>
              </div>
              <button onClick={clearReplyTo} aria-label="Cancel reply" data-testid="cancel-reply" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>✕</button>
          </div>
      )}

      {uploadingMedia && !mediaFile && (
          <div data-testid="uploading-bar" style={{
              padding: '6px 16px', backgroundColor: 'var(--header-bg)',
              borderTop: '1px solid var(--border-color)', fontSize: '0.8rem',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
              <span style={{
                width: '12px', height: '12px', border: '2px solid var(--primary-color)',
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', display: 'inline-block'
              }} />
              Sending voice note…
          </div>
      )}

      {/* ── Input Area ── */}
      <div style={{
        padding: '8px 12px', backgroundColor: 'var(--input-area-bg)', flexShrink: 0,
        borderTop: '1px solid var(--border-color)', position: 'relative'
      }}>
          
        {showEmojiPicker && (
            <EmojiPickerPanel 
                onSelect={(emoji) => setText(prev => prev + emoji)}
                onClose={() => setShowEmojiPicker(false)}
            />
        )}
        
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        />

        {(recorderError || sendError) && (
            <div data-testid="composer-error" role="alert" style={{
                backgroundColor: 'rgba(241,92,109,0.12)', color: '#c93448',
                border: '1px solid rgba(241,92,109,0.35)', borderRadius: '8px',
                padding: '6px 10px', fontSize: '0.8rem', marginBottom: '8px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px'
            }}>
                <span>{recorderError || sendError}</span>
                <button onClick={() => { clearRecorderError(); setSendError(null) }} aria-label="Dismiss error" style={{
                    background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, flexShrink: 0
                }}>✕</button>
            </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" aria-label="Emoji picker" data-testid="emoji-btn" disabled={recording}
                onClick={() => setShowEmojiPicker(p => !p)}
                style={{ background: 'none', border: 'none', cursor: recording ? 'not-allowed' : 'pointer', padding: '4px', color: 'var(--text-muted)', opacity: recording ? 0.4 : 1, fontSize: '1.15rem' }}>
                <span role="img" aria-hidden="true">😀</span>
            </button>
            <button type="button" aria-label="Attach file" data-testid="attach-btn" disabled={recording}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                style={{ background: 'none', border: 'none', cursor: recording ? 'not-allowed' : 'pointer', padding: '4px', color: 'var(--text-muted)', opacity: recording ? 0.4 : 1, fontSize: '1.15rem' }}>
                <span role="img" aria-hidden="true">📎</span>
            </button>

            {recording ? (
                <>
                  {/* Discard the take instead of sending it */}
                  <button type="button" onClick={handleCancelRecording}
                    aria-label="Cancel recording" data-testid="cancel-recording"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
                      color: '#f15c6d', display: 'flex', alignItems: 'center', flexShrink: 0
                    }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                  <div data-testid="recording-indicator" style={{
                    flex: 1, display: 'flex', alignItems: 'center', backgroundColor: 'var(--input-bg)',
                    borderRadius: '22px', padding: '10px 18px', color: '#f15c6d', fontWeight: 'bold',
                    minWidth: 0
                  }}>
                    <span aria-hidden="true" style={{
                      width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f15c6d',
                      marginRight: '10px', animation: 'blink 1s infinite', flexShrink: 0
                    }} />
                    <span data-testid="record-timer">{formatRecordTime(recordTime)}</span>
                    <span style={{ marginLeft: '10px', fontWeight: 400, fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Recording… tap send to finish
                    </span>
                  </div>
                </>
            ) : (
                <Form.Control
                    as="textarea"
                    value={text}
                    onChange={handleTextChange}
                    placeholder="Type a message"
                    aria-label="Message"
                    data-testid="message-input"
                    disabled={uploadingMedia}
                    style={{
                        height: '44px', resize: 'none', borderRadius: '22px',
                        padding: '10px 18px', border: 'none', boxShadow: 'none',
                        fontSize: '0.95rem', backgroundColor: 'var(--input-bg)',
                        color: 'var(--text-primary)', flex: 1, minWidth: 0
                    }}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) }
                    }}
                />
            )}

            {text.trim() && !recording ? (
                <Button onClick={handleSubmit} data-testid="send-btn" aria-label={editingMessage ? 'Save edit' : 'Send message'} style={{
                    width: '44px', height: '44px', minWidth: '44px', borderRadius: '50%',
                    backgroundColor: 'var(--primary-dark)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0, flexShrink: 0
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden="true" style={{ marginLeft: '2px' }}>
                    <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z"/>
                    </svg>
                </Button>
            ) : (
                <Button
                    type="button"
                    onClick={handleToggleRecording}
                    disabled={!micSupported || uploadingMedia}
                    data-testid="record-btn"
                    aria-label={recording ? 'Send voice note' : 'Record voice note'}
                    title={micSupported ? (recording ? 'Send voice note' : 'Record voice note') : 'Recording not supported in this browser'}
                    style={{
                    width: '44px', height: '44px', minWidth: '44px', borderRadius: '50%',
                    backgroundColor: recording ? '#f15c6d' : 'var(--primary-dark)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0, flexShrink: 0, cursor: micSupported ? 'pointer' : 'not-allowed',
                    transition: 'background 0.2s', color: 'white',
                    opacity: micSupported ? 1 : 0.5,
                    // Suppress the synthetic mouse events + long-press callout
                    // that mobile browsers fire after a tap.
                    touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent'
                }}>
                    {recording ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden="true" style={{ marginLeft: '2px' }}>
                        <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                      </svg>
                    )}
                </Button>
            )}
          </div>
      </div>

      {mediaFile && (
          <MediaPreview
            file={mediaFile}
            uploading={uploadingMedia}
            error={sendError}
            onSend={handleSendMedia}
            onCancel={() => {
                if (!uploadingMedia) {
                   setMediaFile(null)
                   setSendError(null)
                   if (fileInputRef.current) fileInputRef.current.value = ''
                }
            }}
          />
      )}

      {contextMenu && (
          <ContextMenu 
            x={contextMenu.x} y={contextMenu.y} 
            message={contextMenu.message} 
            fromMe={contextMenu.fromMe}
            onClose={() => setContextMenu(null)} 
            onReply={setReplyTo}
            onEdit={(message) => {
                setEditingMessage(message)
                setText(message.text)
            }}
            onDelete={(id) => deleteMessage(id, false, recipients)}
            onDeleteEveryone={(id) => deleteMessage(id, true, recipients)}
            onReact={(id, emoji) => addReaction(id, emoji, recipients)}
          />
      )}

      <style>{`
        @media (max-width: 768px) {
          .mobile-back-btn { display: flex !important; }
        }
        @keyframes blink {
            50% { opacity: 0.25; }
        }
        .menu-item:hover {
            background-color: var(--hover-bg);
        }
      `}</style>
    </div>
  )
}
