import React, { useContext, useState, useEffect, useCallback } from 'react'
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
  const [unreadCounts, setUnreadCounts] = useState({})
  const [typingUsers, setTypingUsers] = useState({})
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [lastSeen, setLastSeen] = useState({})
  const [wallpapers, setWallpapers] = useLocalStorage('wallpapers', {})
  const [replyTo, setReplyToState] = useState(null)
  const { contacts } = useContacts()
  const socket = useSocket()

  const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'https://messagingweb.onrender.com'

  // ── Fix Legacy Messages ──────────────────────────────────
  useEffect(() => {
     let changed = false
     const patched = conversations.map(c => {
         let convChanged = false
         const msgs = c.messages.map(m => {
             if (!m.id) {
                 changed = true; convChanged = true
                 return { ...m, id: generateId() }
             }
             return m
         })
         return convChanged ? { ...c, messages: msgs } : c
     })
     if (changed) setConversations(patched)
  }, []) // run once on mount

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
  const addMessageToConversation = useCallback(({ recipients, text, sender, messageId, mediaUrl, mediaType, mediaName, replyTo: replyToMsg }) => {
    setConversations(prevConversations => {
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

      let targetIndex = -1
      let madeChange = false
      const newMessage = {
        sender,
        text: finalDecryptedText,
        id: messageId || generateId(),
        status: 'sent',
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        mediaName: mediaName || null,
        replyTo: finalReplyToMsg || null,
        reactions: {},
        deleted: false,
        timestamp: Date.now(),
      }

      const newConversations = prevConversations.map((conversation, idx) => {
        if (arrayEquality(conversation.recipients, recipients)) {
          madeChange = true; targetIndex = idx
          return { ...conversation, messages: [...conversation.messages, newMessage] }
        }
        return conversation
      })

      if (!madeChange) {
        targetIndex = newConversations.length
        newConversations.push({ recipients, messages: [newMessage] })
      }

      if (sender !== id) {
        setUnreadCounts(prev => ({ ...prev, [targetIndex]: (prev[targetIndex] || 0) + 1 }))

        // Trigger Desktop Notification if tab is backgrounded
        if (document.hidden && Notification.permission === 'granted') {
           const senderName = contacts.find(c => c.id === sender)?.name || sender
           const notifText = mediaType ? `Sent a ${mediaType}` : text
           const notification = new Notification(`New message from ${senderName}`, {
               body: notifText,
               icon: '/logo192.png' // Use default react icon if exists
           })
           notification.onclick = () => {
               window.focus()
               notification.close()
               // We could also select the conversation here, but focus is good enough
           }
        }
      }

      return newConversations
    })
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
  function selectConversationIndex(index) {
    setSelectedConversationIndex(index)
    setUnreadCounts(prev => { const n = { ...prev }; delete n[index]; return n })
    const conv = conversations[index]
    if (conv && socket) socket.emit('read-messages', { recipients: conv.recipients })
  }

  // ── Send text message ─────────────────────────────────────
  function sendMessage(recipients, text, mediaUrl, mediaType, mediaName, replyToMsg) {
    const messageId = generateId()
    
    // E2E Encryption
    const secretKey = [...recipients, id].sort().join(',')
    const encryptedText = text ? CryptoJS.AES.encrypt(text, secretKey).toString() : ''
    
    // Encrypt replyTo text to prevent leakage
    let safeReplyTo = replyToMsg
    if (safeReplyTo && safeReplyTo.text) {
        safeReplyTo = { ...safeReplyTo, text: CryptoJS.AES.encrypt(safeReplyTo.text, secretKey).toString() }
    }
    
    socket.emit('send-message', { recipients, text: encryptedText, messageId, mediaUrl, mediaType, mediaName, replyTo: safeReplyTo })
    // Save locally unencrypted
    addMessageToConversation({ recipients, text, sender: id, messageId, mediaUrl, mediaType, mediaName, replyTo: replyToMsg })
  }

  // ── Upload media then send ────────────────────────────────
  async function sendMedia(recipients, file, caption, currentReplyTo) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(`${SERVER_URL}/upload`, { method: 'POST', body: formData })
    if (!response.ok) throw new Error('Upload failed')
    const { url, resourceType, originalName } = await response.json()
    let mediaType = resourceType
    if (resourceType === 'raw') mediaType = 'document'
    if (file.type.startsWith('audio/') || originalName.endsWith('.webm')) mediaType = 'audio'
    sendMessage(recipients, caption || '', url, mediaType, originalName || file.name, currentReplyTo || null)
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
  function createConversation(recipients, groupName = null) {
    setConversations(prev => [...prev, { 
       recipients, 
       messages: [],
       groupName,
       admin: groupName ? id : null 
    }])
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
    const unread = unreadCounts[index] || 0
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
    sendMessage,
    sendMedia,
    selectConversationIndex,
    createConversation,
    emitTyping,
    setWallpaper,
    onlineUsers,
    lastSeen,
    deleteMessage,
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
