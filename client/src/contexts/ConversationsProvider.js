import React, { useContext, useState, useEffect, useCallback } from 'react'
import useLocalStorage from '../hooks/useLocalStorage';
import { useContacts } from './ContactsProvider';
import { useSocket } from './SocketProvider';

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
  const [unreadCounts, setUnreadCounts] = useState({})      // { index: number }
  const [typingUsers, setTypingUsers] = useState({})         // { userId: true }
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [lastSeen, setLastSeen] = useState({})               // { userId: timestamp }
  const [wallpapers, setWallpapers] = useLocalStorage('wallpapers', {}) // { convKey: wallpaper }
  const { contacts } = useContacts()
  const socket = useSocket()

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
        const next = { ...prev }
        delete next[sender]
        return next
      })
      // Auto-clear after 4s in case stop event is missed
      if (isTyping) {
        setTimeout(() => {
          setTypingUsers(prev => { const n = { ...prev }; delete n[sender]; return n })
        }, 4000)
      }
    })
    return () => socket.off('typing')
  }, [socket])

  // ── Read receipts ─────────────────────────────────────────
  useEffect(() => {
    if (!socket) return
    socket.on('messages-read', ({ readBy }) => {
      setConversations(prev => prev.map(conv => {
        if (!conv.recipients.includes(readBy)) return conv
        return {
          ...conv,
          messages: conv.messages.map(msg =>
            msg.sender === id ? { ...msg, status: 'read' } : msg
          )
        }
      }))
    })
    return () => socket.off('messages-read')
  }, [socket, id, setConversations])

  // ── Receive message ───────────────────────────────────────
  const addMessageToConversation = useCallback(({ recipients, text, sender, messageId }) => {
    setConversations(prevConversations => {
      let targetIndex = -1
      let madeChange = false
      const newMessage = { sender, text, id: messageId || generateId(), status: 'sent' }

      const newConversations = prevConversations.map((conversation, idx) => {
        if (arrayEquality(conversation.recipients, recipients)) {
          madeChange = true
          targetIndex = idx
          return { ...conversation, messages: [...conversation.messages, newMessage] }
        }
        return conversation
      })

      if (!madeChange) {
        targetIndex = newConversations.length
        newConversations.push({ recipients, messages: [newMessage] })
      }

      // Increment unread if not currently selected and message is from someone else
      if (sender !== id) {
        setUnreadCounts(prev => ({
          ...prev,
          [targetIndex]: (prev[targetIndex] || 0) + 1
        }))
      }

      return newConversations
    })
  }, [setConversations, id])

  useEffect(() => {
    if (!socket) return
    socket.on('receive-message', addMessageToConversation)
    return () => socket.off('receive-message')
  }, [socket, addMessageToConversation])

  // ── Select conversation ───────────────────────────────────
  function selectConversationIndex(index) {
    setSelectedConversationIndex(index)
    // Clear unread count
    setUnreadCounts(prev => { const n = { ...prev }; delete n[index]; return n })
    // Emit read-messages so sender knows we've read
    const conv = conversations[index]
    if (conv && socket) {
      socket.emit('read-messages', { recipients: conv.recipients })
    }
  }

  // ── Send message ──────────────────────────────────────────
  function sendMessage(recipients, text) {
    const messageId = generateId()
    socket.emit('send-message', { recipients, text, messageId })
    addMessageToConversation({ recipients, text, sender: id, messageId })
  }

  // ── Typing emit (debounced via component) ─────────────────
  function emitTyping(recipients, isTyping) {
    if (socket) socket.emit('typing', { recipients, isTyping })
  }

  // ── Wallpaper ─────────────────────────────────────────────
  function setWallpaper(recipients, wallpaper) {
    const key = getConvKey(recipients)
    setWallpapers(prev => ({ ...prev, [key]: wallpaper }))
  }

  function getWallpaper(recipients) {
    return wallpapers[getConvKey(recipients)] || null
  }

  // ── Create conversation ───────────────────────────────────
  function createConversation(recipients) {
    setConversations(prev => [...prev, { recipients, messages: [] }])
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
    selectConversationIndex,
    createConversation,
    emitTyping,
    setWallpaper,
    onlineUsers,
    lastSeen
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
