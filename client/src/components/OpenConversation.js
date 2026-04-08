import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Form, Button } from 'react-bootstrap'
import { useConversations } from '../contexts/ConversationsProvider'
import EmojiPickerPanel from './EmojiPickerPanel'
import MediaPreview from './MediaPreview'
import { useCall } from '../contexts/CallProvider'

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
    function handleClickClick() { onClose() }
    document.addEventListener('click', handleClickClick)
    return () => document.removeEventListener('click', handleClickClick)
  }, [onClose])

  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏']

  return (
    <div style={{
      position: 'fixed', left: x, top: y, zIndex: 1000,
      backgroundColor: 'var(--modal-bg)', border: '1px solid var(--border-color)',
      borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      padding: '4px 0', minWidth: '150px'
    }} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', padding: '6px 8px', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
        {emojis.map(e => (
          <span key={e} onClick={() => { onReact(message.id, e); onClose() }} style={{ cursor: 'pointer', fontSize: '1.2rem', padding: '0 2px' }}>
            {e}
          </span>
        ))}
      </div>
      <div onClick={() => { onReply(message); onClose() }} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '0.9rem' }} className="menu-item hover-bg">Reply</div>
      {fromMe && !message.mediaUrl && (
        <div onClick={() => { onEdit(message); onClose() }} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '0.9rem' }} className="menu-item hover-bg">Edit message</div>
      )}
      <div onClick={() => { onDelete(message.id); onClose() }} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '0.9rem' }} className="menu-item hover-bg">Delete for me</div>
      {fromMe && (
        <div onClick={() => { onDeleteEveryone(message.id); onClose() }} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '0.9rem', color: '#f15c6d' }} className="menu-item hover-bg">Delete for everyone</div>
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
  
  const [recording, setRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordIntervalRef = useRef(null)
  const isRecordingIntentRef = useRef(false)

  const [contextMenu, setContextMenu] = useState(null)
  const [editingMessage, setEditingMessage] = useState(null)

  const setRef = useCallback(node => {
    if (node) node.scrollIntoView({ smooth: true })
  }, [])
  
  const fileInputRef = useRef()
  const messagesEndRef = useRef(null)

  const { 
    sendMessage, sendMedia, selectedConversation, emitTyping, setWallpaper,
    deleteMessage, editMessage, addReaction, replyTo, setReplyTo, clearReplyTo, currentUserId
  } = useConversations()

  const { initiateCall } = useCall()

  const recipients = selectedConversation.recipients.map(r => r.id)
  const isTyping = selectedConversation.isTyping
  const wallpaper = selectedConversation.wallpaper

  useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [selectedConversation.messages, showSearch])

  useEffect(() => {
      const observer = new IntersectionObserver(
          entries => {
              if (entries[0].isIntersecting) {
                  setVisibleMessagesCount(prev => prev + 30)
              }
          },
          { threshold: 1.0 }
      )
      if (observerTarget.current) {
          observer.observe(observerTarget.current)
      }
      return () => {
          if (observerTarget.current) {
              observer.unobserve(observerTarget.current) // eslint-disable-line
          }
      }
  }, [observerTarget])

  const filteredMessages = selectedConversation.messages.filter(m => {
    if (!searchQuery) return true
    return m.text && m.text.toLowerCase().includes(searchQuery.toLowerCase())
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
    try {
      await sendMedia(recipients, mediaFile, caption, replyTo)
      setMediaFile(null)
    } catch (err) {
      console.error(err)
      alert("Failed to send media")
    } finally {
      setUploadingMedia(false)
    }
  }

  const startRecording = async () => {
    try {
      isRecordingIntentRef.current = true
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!isRecordingIntentRef.current) {
         stream.getTracks().forEach(t => t.stop())
         return
      }
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorderRef.current.onstop = async () => {
        if (audioChunksRef.current.length === 0) return;
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], 'voice-note.webm', { type: 'audio/webm' })
        setUploadingMedia(true)
        try {
            await sendMedia(recipients, file, '', replyTo)
        } catch(e) {
            console.error(e)
        } finally {
            setUploadingMedia(false)
        }
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setRecording(true)
      setRecordTime(0)
      recordIntervalRef.current = setInterval(() => {
        setRecordTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Mic access denied', err)
      alert('Microphone access is required to send voice notes.')
    }
  }

  const stopRecording = () => {
    isRecordingIntentRef.current = false
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setRecording(false)
      clearInterval(recordIntervalRef.current)
    }
  }

  const formatRecordTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleContextMenu = (e, message, fromMe) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      message,
      fromMe
    })
  }

  const renderMedia = (message) => {
    if (!message.mediaUrl) return null
    if (message.mediaType === 'image') return <img src={message.mediaUrl} alt="attachment" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', cursor: 'pointer' }} onClick={()=>window.open(message.mediaUrl, '_blank')} />
    if (message.mediaType === 'video') return <video src={message.mediaUrl} controls style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
    if (message.mediaType === 'audio') return <audio src={message.mediaUrl} controls style={{ maxWidth: '250px' }} />
    return (
      <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)', padding: '8px', borderRadius: '8px' }}>
        <span style={{ fontSize: '24px', marginRight: '8px' }}>📄</span>
        <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all', fontSize: '0.85rem' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div ref={observerTarget} style={{ height: '10px' }}></div>
          {filteredMessages.map((message, index) => {
            const lastMessage = filteredMessages.length - 1 === index
            
            return (
              <div
                ref={lastMessage ? setRef : null}
                key={message.id || index}
                style={{
                  display: 'flex',
                  justifyContent: message.fromMe ? 'flex-end' : 'flex-start'
                }}
              >
                <div 
                  onContextMenu={(e) => handleContextMenu(e, message, message.fromMe)}
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
                      <span style={{ fontSize: '0.93rem', color: 'var(--text-muted)' }}>This message was deleted</span>
                  ) : (
                      <>
                        {message.replyTo && (
                            <div style={{ 
                                backgroundColor: 'rgba(0,0,0,0.05)', 
                                borderLeft: '3px solid var(--primary-color)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                marginBottom: '4px',
                                fontSize: '0.8rem',
                                color: 'var(--text-secondary)'
                            }}>
                                <div style={{ fontWeight: 'bold' }}>{message.replyTo.fromMe ? 'You' : message.replyTo.senderName}</div>
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {message.replyTo.deleted ? 'Deleted message' : (message.replyTo.text || message.replyTo.mediaName || 'Media')}
                                </div>
                            </div>
                        )}
                        {renderMedia(message)}
                        <span style={{ fontSize: '0.93rem', color: 'var(--bubble-text)', lineHeight: '1.4' }}>
                          {message.text}
                          {message.edited && (
                              <span style={{ fontSize: '0.65rem', fontStyle: 'italic', color: 'var(--text-muted)', marginLeft: '6px' }}>(edited)</span>
                          )}
                        </span>
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
          <div ref={messagesEndRef} />
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
                      Replying to {replyTo.fromMe ? 'yourself' : replyTo.senderName}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                      {replyTo.deleted ? 'Deleted message' : (replyTo.text || replyTo.mediaName || 'Media')}
                  </div>
              </div>
              <button onClick={clearReplyTo} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" onClick={() => setShowEmojiPicker(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' }}>
                😀
            </button>
            <button type="button" onClick={() => fileInputRef.current.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' }}>
                📎
            </button>

            {recording ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', backgroundColor: 'var(--input-bg)', borderRadius: '22px', padding: '10px 18px', color: '#f15c6d', fontWeight: 'bold' }}>
                    <span style={{ marginRight: '10px', animation: 'blink 1s infinite', letterSpacing: '2px' }}>၊၊||၊</span> 
                    {formatRecordTime(recordTime)}
                </div>
            ) : (
                <Form.Control
                    as="textarea"
                    value={text}
                    onChange={handleTextChange}
                    placeholder="Type a message"
                    style={{
                        height: '44px', resize: 'none', borderRadius: '22px',
                        padding: '10px 18px', border: 'none', boxShadow: 'none',
                        fontSize: '0.95rem', backgroundColor: 'var(--input-bg)',
                        color: 'var(--text-primary)', flex: 1
                    }}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) }
                    }}
                />
            )}
            
            {text.trim() ? (
                <Button onClick={handleSubmit} style={{
                    width: '44px', height: '44px', minWidth: '44px', borderRadius: '50%',
                    backgroundColor: 'var(--primary-dark)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0, flexShrink: 0
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '2px' }}>
                    <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z"/>
                    </svg>
                </Button>
            ) : (
                <Button 
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    style={{
                    width: '44px', height: '44px', minWidth: '44px', borderRadius: '50%',
                    backgroundColor: recording ? '#f15c6d' : 'var(--primary-dark)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0, flexShrink: 0, cursor: 'pointer', transition: 'background 0.2s',
                    color: 'white', fontWeight: 'bold'
                }}>
                    <span style={{ letterSpacing: '1px' }}>၊၊||၊</span>
                </Button>
            )}
          </div>
      </div>

      {mediaFile && (
          <MediaPreview 
            file={mediaFile} 
            uploading={uploadingMedia}
            onSend={handleSendMedia} 
            onCancel={() => {
                if(!uploadingMedia){
                   setMediaFile(null); 
                   fileInputRef.current.value = null; 
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
            50% { opacity: 0.5; }
        }
        .menu-item:hover {
            background-color: var(--hover-bg);
        }
      `}</style>
    </div>
  )
}
