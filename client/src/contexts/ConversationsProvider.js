import React, { useContext, useState, useEffect, useCallback, useRef } from 'react'
import useLocalStorage from '../hooks/useLocalStorage'
import { useContacts } from './ContactsProvider'
import { useSocket } from './SocketProvider'
import CryptoJS from 'crypto-js'

const ConversationsContext = React.createContext()

export function useConversations() {
  return useContext(ConversationsContext)
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function getConvKey(recipients) {
  return [...recipients].sort().join(',')
}

export function ConversationsProvider({ id, children }) {
  const [conversations, setConversations] = useLocalStorage('conversations', [])
  const [selectedConversationIndex, setSelectedConversationIndex] = useState(-1)
  const [selectionTick, setSelectionTick] = useState(0)
  const [unreadCounts, setUnreadCounts] = useState({})
  const [typingUsers, setTypingUsers] = useState({})
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [lastSeen, setLastSeen] = useState({})
  const [wallpapers, setWallpapers] = useLocalStorage('wallpapers', {})
  const [replyTo, setReplyToState] = useState(null)
  const { contacts } = useContacts()
  const socket = useSocket()

  // Key of the conversation currently on screen, readable from socket handlers
  // without making them depend on (and re-subscribe to) conversation state.
  const activeConvKeyRef = useRef(null)
  const socketRef = useRef(null)
  useEffect(() => { socketRef.current = socket }, [socket])

  const selectedRaw = conversations[selectedConversationIndex]
  useEffect(() => {
    activeConvKeyRef.current = selectedRaw ? getConvKey(selectedRaw.recipients) : null
  })

  const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'https://messagingweb.onrender.com'

  // ── Migrate legacy stored data ───────────────────────────
  // Older builds saved messages without an id and conversations without a
  // messages array; both crash the render path, so repair them on load.
  useEffect(() => {
     setConversations(prev => {
       let changed = false
       const patched = prev.map(c => {
           const messages = Array.isArray(c.messages) ? c.messages : []
           if (!Array.isArray(c.messages)) changed = true

           let convChanged = false
           const msgs = messages.map(m => {
               if (!m.id) {
                   changed = true; convChanged = true
                   return { ...m, id: generateId() }
               }
               return m
           })
           return convChanged || !Array.isArray(c.messages) ? { ...c, messages: msgs } : c
       }).filter(c => Array.isArray(c.recipients) && c.recipients.length > 0)

       if (patched.length !== prev.length) changed = true
       return changed ? patched : prev
     })
  }, [setConversations]) // run once on mount; setConversations is stable

  // ── Online / offline ──────────────────────────────────────
  useEffect(() => {
    if (!socket) return
    socket.on('online-users', userIds => setOnlineUsers(new Set(userIds)))
    socket.on('user-online', ({ userId }) => setOnlineUsers(prev => new Set([...prev, userId])))
    socket.on('user-offline', ({ userId, lastSeen: ls }) => {
      setOnlineUsers(prev => { const n = new Set(prev); n.delete(userId); return n })
      setLastSeen(prev => ({ ...prev, [userId]: ls }))
    })
    return () => { socket.off('online-users'); socket.off('user-online'); socket.off('user-offline') }
  }, [socket])

  // ── Typing indicator ──────────────────────────────────────
  useEffect(() => {
    if (!socket) return
    socket.on('typing', ({ sender, isTyping }) => {
      setTypingUsers(prev => {
        if (isTyping) return { ...prev, [sender]: true }
        const next = { ...prev }; delete next[sender]; return next
      })
      if (isTyping) setTimeout(() => {
        setTypingUsers(prev => { const n = { ...prev }; delete n[sender]; return n })
      }, 4000)
    })
    return () => socket.off('typing')
  }, [socket])

  // ── Read receipts ─────────────────────────────────────────
  useEffect(() => {
    if (!socket) return
    socket.on('messages-read', ({ readBy }) => {
      setConversations(prev => prev.map(conv => {
        if (!conv.recipients.includes(readBy)) return conv
        return { ...conv, messages: conv.messages.map(msg => msg.sender === id ? { ...msg, status: 'read' } : msg) }
      }))
    })
    return () => socket.off('messages-read')
  }, [socket, id, setConversations])

  // ── Delete for everyone (received) ────────────────────────
  useEffect(() => {
    if (!socket) return
    socket.on('delete-for-everyone', ({ messageId }) => {
      setConversations(prev => prev.map(conv => ({
        ...conv,
        messages: conv.messages.map(msg =>
          msg.id === messageId ? { ...msg, deleted: true, text: '', mediaUrl: null } : msg
        ),
      })))
    })
    return () => socket.off('delete-for-everyone')
  }, [socket, setConversations])

  // ── Edit message (received) ───────────────────────────────
  useEffect(() => {
    if (!socket) return
    socket.on('edit-message', ({ recipients, messageId, newText }) => {
      let decryptedText = newText || ''
      if (newText) {
          try {
              const secretKey = [...recipients, id].sort().join(',')
              const bytes = CryptoJS.AES.decrypt(newText, secretKey)
              const decrypted = bytes.toString(CryptoJS.enc.Utf8)
              if (decrypted) decryptedText = decrypted
          } catch (e) {
              console.error("Decryption failed", e)
          }
      }
      setConversations(prev => prev.map(conv => ({
        ...conv,
        messages: conv.messages.map(msg =>
          msg.id === messageId ? { ...msg, text: decryptedText, edited: true } : msg
        ),
      })))
    })
    return () => socket.off('edit-message')
  }, [socket, setConversations, id])

  // ── Reaction (received) ───────────────────────────────────
  useEffect(() => {
    if (!socket) return
    socket.on('add-reaction', ({ messageId, emoji, userId }) => {
      setConversations(prev => prev.map(conv => ({
        ...conv,
        messages: conv.messages.map(msg => {
          if (msg.id !== messageId) return msg
          const reactions = { ...(msg.reactions || {}) }
          const users = reactions[emoji] ? [...reactions[emoji]] : []
          const idx = users.indexOf(userId)
          if (idx >= 0) users.splice(idx, 1); else users.push(userId)
          if (users.length === 0) delete reactions[emoji]; else reactions[emoji] = users
          return { ...msg, reactions }
        }),
      })))
    })
    return () => socket.off('add-reaction')
  }, [socket, setConversations])

  // ── Receive message ───────────────────────────────────────
  const addMessageToConversation = useCallback(({ recipients, text, sender, messageId, mediaUrl, mediaType, mediaName, mediaDuration, replyTo: replyToMsg }) => {
    // Decrypt outside the state updater: updaters must stay pure, and React
    // StrictMode invokes them twice (which previously double-counted unread
    // badges and fired duplicate notifications).
    let finalDecryptedText = text || ''
    let finalReplyToMsg = replyToMsg
    if (sender !== id && text) {
        try {
            const secretKey = [...recipients, id].sort().join(',')
            const bytes = CryptoJS.AES.decrypt(text, secretKey)
            const decrypted = bytes.toString(CryptoJS.enc.Utf8)
            if (decrypted) finalDecryptedText = decrypted

            if (finalReplyToMsg && finalReplyToMsg.text) {
                const replyBytes = CryptoJS.AES.decrypt(finalReplyToMsg.text, secretKey)
                const replyDecrypted = replyBytes.toString(CryptoJS.enc.Utf8)
                if (replyDecrypted) finalReplyToMsg = { ...finalReplyToMsg, text: replyDecrypted }
            }
        } catch (e) {
            console.error("Decryption failed", e)
        }
    }

    const newMessage = {
      sender,
      text: finalDecryptedText,
      id: messageId || generateId(),
      status: 'sent',
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      mediaName: mediaName || null,
      mediaDuration: mediaDuration || null,
      replyTo: finalReplyToMsg || null,
      reactions: {},
      deleted: false,
      timestamp: Date.now(),
    }

    setConversations(prevConversations => {
      // Ignore replays of a message we already stored (socket reconnect can
      // redeliver, and StrictMode replays this updater).
      if (prevConversations.some(c => c.messages.some(m => m.id === newMessage.id))) {
        return prevConversations
      }

      let madeChange = false
      const newConversations = prevConversations.map(conversation => {
        if (arrayEquality(conversation.recipients, recipients)) {
          madeChange = true
          return { ...conversation, messages: [...conversation.messages, newMessage] }
        }
        return conversation
      })

      if (!madeChange) newConversations.push({ recipients, messages: [newMessage] })

      return newConversations
    })

    if (sender !== id) {
      // Track unread by conversation key, not array index — indexes shift when
      // a conversation is created or removed and badges landed on the wrong row.
      const convKey = getConvKey(recipients)
      const isOpenOnScreen = convKey === activeConvKeyRef.current && !document.hidden

      if (isOpenOnScreen) {
        // Already reading it: don't badge, and tell the sender it was read.
        if (socketRef.current) socketRef.current.emit('read-messages', { recipients })
      } else {
        setUnreadCounts(prev => ({ ...prev, [convKey]: (prev[convKey] || 0) + 1 }))
      }

      // Desktop notification when the tab is backgrounded
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
         const contact = contacts.find(c => c.id === sender)
         const senderName = (contact && contact.name) || sender
         // Must use the decrypted text — `text` here is still ciphertext.
         const notifText = mediaType
           ? (mediaType === 'audio' ? 'Sent a voice note' : `Sent ${mediaType === 'image' ? 'a photo' : `a ${mediaType}`}`)
           : finalDecryptedText
         try {
           const notification = new Notification(`New message from ${senderName}`, {
               body: notifText,
               icon: '/logo192.png',
               tag: newMessage.id,
           })
           notification.onclick = () => {
               window.focus()
               notification.close()
           }
         } catch (e) {
           // Some browsers throw when constructing Notification outside a SW
           console.warn('Notification failed', e)
         }
      }
    }
  }, [setConversations, id, contacts])

  // Request Notification Permissions on mount
  useEffect(() => {
     if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
         Notification.requestPermission()
     }
  }, [])

  useEffect(() => {
    if (!socket) return
    socket.on('receive-message', addMessageToConversation)
    return () => socket.off('receive-message')
  }, [socket, addMessageToConversation])

  // ── Select conversation ───────────────────────────────────
  // `selectionTick` increments on every selection, including re-selecting the
  // conversation that is already active. Mobile needs that signal: after
  // backing out to the list, tapping the same row must reopen the chat, and an
  // unchanged index alone would not re-trigger the view switch.
  function selectConversationIndex(index) {
    setSelectedConversationIndex(index)
    setSelectionTick(t => t + 1)
    const conv = conversations[index]
    if (!conv) return
    const convKey = getConvKey(conv.recipients)
    setUnreadCounts(prev => { const n = { ...prev }; delete n[convKey]; return n })
    if (socket) socket.emit('read-messages', { recipients: conv.recipients })
  }

  function deselectConversation() {
    setSelectedConversationIndex(-1)
  }

  // ── Send text message ─────────────────────────────────────
  function sendMessage(recipients, text, mediaUrl, mediaType, mediaName, replyToMsg, mediaDuration) {
    const messageId = generateId()

    // E2E Encryption
    const secretKey = [...recipients, id].sort().join(',')
    const encryptedText = text ? CryptoJS.AES.encrypt(text, secretKey).toString() : ''

    // Encrypt replyTo text to prevent leakage
    let safeReplyTo = replyToMsg
    if (safeReplyTo && safeReplyTo.text) {
        safeReplyTo = { ...safeReplyTo, text: CryptoJS.AES.encrypt(safeReplyTo.text, secretKey).toString() }
    }
    // Strip fields the receiver rebuilds itself, so a quoted reply can't leak
    // reactions or the local `fromMe` flag of the original message.
    if (safeReplyTo) {
        safeReplyTo = {
            id: safeReplyTo.id,
            sender: safeReplyTo.sender,
            text: safeReplyTo.text,
            mediaType: safeReplyTo.mediaType || null,
            mediaName: safeReplyTo.mediaName || null,
            deleted: !!safeReplyTo.deleted,
        }
    }

    if (socket) {
      socket.emit('send-message', {
        recipients, text: encryptedText, messageId,
        mediaUrl, mediaType, mediaName, mediaDuration, replyTo: safeReplyTo,
      })
    }
    // Save locally unencrypted
    addMessageToConversation({
      recipients, text, sender: id, messageId,
      mediaUrl, mediaType, mediaName, mediaDuration, replyTo: replyToMsg,
    })
  }

  // ── Upload media then send ────────────────────────────────
  async function sendMedia(recipients, file, caption, currentReplyTo, extra = {}) {
    const formData = new FormData()
    formData.append('file', file)

    let response
    try {
      response = await fetch(`${SERVER_URL}/upload`, { method: 'POST', body: formData })
    } catch (e) {
      throw new Error('Could not reach the server. Check your connection and try again.')
    }
    if (!response.ok) {
      let detail = ''
      try { detail = (await response.json()).error } catch (e) { /* non-JSON error body */ }
      throw new Error(detail || `Upload failed (${response.status})`)
    }

    const { url, resourceType, originalName } = await response.json()
    const name = originalName || file.name || 'file'

    // Cloudinary reports webm/ogg/mp4 audio as "video"; trust the browser's
    // MIME type first, then the extension, before falling back to the
    // resource type the CDN inferred.
    let mediaType
    if ((file.type || '').startsWith('audio/') || /\.(webm|ogg|mp3|m4a|wav|aac)$/i.test(name)) {
      mediaType = 'audio'
    } else if ((file.type || '').startsWith('image/') || resourceType === 'image') {
      mediaType = 'image'
    } else if ((file.type || '').startsWith('video/')) {
      mediaType = 'video'
    } else if (resourceType === 'video') {
      mediaType = 'video'
    } else {
      mediaType = 'document'
    }

    // A recorded voice note carries its measured duration; the webm container
    // MediaRecorder produces has no duration header, so the player needs it.
    sendMessage(
      recipients,
      caption || '',
      url,
      mediaType,
      name,
      currentReplyTo || null,
      extra.duration
    )
    setReplyToState(null)
  }

  // ── Edit message ──────────────────────────────────────────
  function editMessage(messageId, newText, recipients) {
    // E2E Encryption
    const secretKey = [...recipients, id].sort().join(',')
    const encryptedText = newText ? CryptoJS.AES.encrypt(newText, secretKey).toString() : ''

    if (socket) {
      socket.emit('edit-message', { recipients, messageId, newText: encryptedText })
    }

    setConversations(prev => prev.map(conv => {
      const messages = conv.messages.map(msg => {
        if (msg.id !== messageId) return msg
        return { ...msg, text: newText, edited: true }
      })
      return { ...conv, messages }
    }))
  }

  // ── Delete message ────────────────────────────────────────
  function deleteMessage(messageId, deleteForEveryone, recipients) {
    if (!messageId) return
    
    if (deleteForEveryone && socket) {
      socket.emit('delete-for-everyone', { recipients, messageId })
    }
    setConversations(prev => prev.map(conv => {
      const messages = conv.messages
        .map(msg => {
          if (msg.id !== messageId) return msg
          if (deleteForEveryone) return { ...msg, deleted: true, text: '', mediaUrl: null }
          return null
        })
        .filter(Boolean)
      return { ...conv, messages }
    }))
  }

  // ── Toggle reaction ───────────────────────────────────────
  function addReaction(messageId, emoji, recipients) {
    setConversations(prev => prev.map(conv => ({
      ...conv,
      messages: conv.messages.map(msg => {
        if (msg.id !== messageId) return msg
        const reactions = { ...(msg.reactions || {}) }
        const users = reactions[emoji] ? [...reactions[emoji]] : []
        const idx = users.indexOf(id)
        if (idx >= 0) users.splice(idx, 1); else users.push(id)
        if (users.length === 0) delete reactions[emoji]; else reactions[emoji] = users
        return { ...msg, reactions }
      }),
    })))
    if (socket) socket.emit('add-reaction', { recipients, messageId, emoji, userId: id })
  }

  // ── Reply state ───────────────────────────────────────────
  function setReplyTo(message) { setReplyToState(message) }
  function clearReplyTo() { setReplyToState(null) }

  // ── Typing emit ───────────────────────────────────────────
  function emitTyping(recipients, isTyping) {
    if (socket) socket.emit('typing', { recipients, isTyping })
  }

  // ── Wallpaper ─────────────────────────────────────────────
  function setWallpaper(recipients, wallpaper) {
    setWallpapers(prev => ({ ...prev, [getConvKey(recipients)]: wallpaper }))
  }
  function getWallpaper(recipients) {
    return wallpapers[getConvKey(recipients)] || null
  }

  // ── Create conversation ───────────────────────────────────
  // Returns the index of the conversation (existing or new) so the caller can
  // open it immediately.
  function createConversation(recipients, groupName = null) {
    if (!recipients || recipients.length === 0) return -1

    const existingIndex = conversations.findIndex(c => arrayEquality(c.recipients, recipients))
    if (existingIndex >= 0) {
      selectConversationIndex(existingIndex)
      return existingIndex
    }

    const newIndex = conversations.length
    setConversations(prev => [...prev, {
       recipients,
       messages: [],
       groupName,
       admin: groupName ? id : null
    }])
    setSelectedConversationIndex(newIndex)
    setSelectionTick(t => t + 1)
    return newIndex
  }

  // ── Format conversations ──────────────────────────────────
  const formattedConversations = conversations.map((conversation, index) => {
    const recipients = conversation.recipients.map(recipient => {
      const contact = contacts.find(c => c.id === recipient)
      return { id: recipient, name: (contact && contact.name) || recipient }
    })
    const messages = conversation.messages.map(message => {
      const contact = contacts.find(c => c.id === message.sender)
      const name = (contact && contact.name) || message.sender
      const fromMe = id === message.sender
      return { ...message, senderName: name, fromMe }
    })
    const lastMessage = messages[messages.length - 1] || null
    const unread = unreadCounts[getConvKey(conversation.recipients)] || 0
    const isTyping = recipients.some(r => typingUsers[r.id])
    const isOnline = recipients.some(r => onlineUsers.has(r.id))
    const recipientLastSeen = recipients.length === 1 ? lastSeen[recipients[0].id] : null
    const wallpaper = getWallpaper(conversation.recipients)
    const selected = index === selectedConversationIndex
    return { ...conversation, messages, recipients, selected, lastMessage, unread, isTyping, isOnline, recipientLastSeen, wallpaper }
  })

  const value = {
    conversations: formattedConversations,
    selectedConversation: formattedConversations[selectedConversationIndex],
    // A conversation is "open" whenever a valid index is selected. Components
    // must key mobile view transitions off this primitive rather than the
    // formatted object, which is rebuilt (new identity) on every render.
    hasSelectedConversation: selectedConversationIndex >= 0 && selectedConversationIndex < formattedConversations.length,
    selectedConversationIndex,
    selectionTick,
    sendMessage,
    sendMedia,
    selectConversationIndex,
    deselectConversation,
    createConversation,
    emitTyping,
    setWallpaper,
    onlineUsers,
    lastSeen,
    deleteMessage,
    editMessage,
    addReaction,
    replyTo,
    setReplyTo,
    clearReplyTo,
    currentUserId: id,
  }

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  )
}

function arrayEquality(a, b) {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((el, i) => el === sb[i])
}
