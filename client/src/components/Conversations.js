import React from 'react'
import { useConversations } from '../contexts/ConversationsProvider'

function formatLastSeen(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  return d.toLocaleDateString()
}

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function Conversations({ searchQuery }) {
  const { conversations, selectConversationIndex } = useConversations()

  const filteredConversations = conversations.filter(conversation => {
      if (!searchQuery) return true
      const name = conversation.recipients.map(r => r.name).join(', ').toLowerCase()
      return name.includes(searchQuery.toLowerCase())
  })

  if (filteredConversations.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }} className="animate-fade-in-scale">
        <div style={{ marginBottom: '12px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--icon-color)">
            <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16ZM7 9H17V11H7V9ZM7 12H15V14H7V12ZM7 6H17V8H7V6Z" />
          </svg>
        </div>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>No messages found</p>
      </div>
    )
  }

  return (
    <div>
      {filteredConversations.map((conversation) => {
        const index = conversations.indexOf(conversation)
        const name = conversation.groupName || conversation.recipients.map(r => r.name).join(', ')
        const { lastMessage, unread, isTyping, isOnline, recipientLastSeen, selected } = conversation

        let lastMessageText = 'No messages yet'
        if (isTyping) lastMessageText = 'typing...'
        else if (lastMessage) {
            if (lastMessage.deleted) {
                lastMessageText = 'This message was deleted'
            } else if (lastMessage.mediaType) {
                const mediaPrefix = lastMessage.mediaType === 'image' ? '📷 Photo' : lastMessage.mediaType === 'video' ? '🎥 Video' : lastMessage.mediaType === 'audio' ? '🎤 Voice note' : '📄 Document'
                lastMessageText = lastMessage.text ? `${mediaPrefix} - ${lastMessage.text}` : mediaPrefix
                if (lastMessage.fromMe) lastMessageText = `You: ${lastMessageText}`
            } else {
                lastMessageText = lastMessage.fromMe ? `You: ${lastMessage.text}` : lastMessage.text
            }
        } else if (isOnline) {
            lastMessageText = 'Online'
        } else if (recipientLastSeen) {
            lastMessageText = `Last seen ${formatLastSeen(recipientLastSeen)}`
        }

        return (
          <div
            key={index}
            onClick={() => selectConversationIndex(index)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-light)',
              backgroundColor: selected ? 'var(--selected-bg)' : 'transparent',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
              gap: '12px'
            }}
            onMouseEnter={e => { if (!selected) e.currentTarget.style.backgroundColor = 'var(--hover-bg)' }}
            onMouseLeave={e => { if (!selected) e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            {/* Avatar with online dot */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                backgroundColor: 'var(--avatar-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="var(--avatar-icon)">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" />
                </svg>
              </div>
              {isOnline && (
                <div style={{
                  position: 'absolute', bottom: '2px', right: '2px',
                  width: '12px', height: '12px', borderRadius: '50%',
                  backgroundColor: '#25D366',
                  border: '2px solid var(--sidebar-bg)'
                }} />
              )}
            </div>

            {/* Text content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                <span style={{ fontWeight: '600', fontSize: '0.97rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {name}
                </span>
                {lastMessage && (
                  <span style={{ fontSize: '0.72rem', color: unread > 0 ? 'var(--primary-color)' : 'var(--text-muted)', flexShrink: 0, marginLeft: '8px' }}>
                    {formatTime(lastMessage.timestamp)}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: '0.82rem',
                  color: isTyping ? 'var(--primary-color)' : 'var(--text-muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontStyle: isTyping ? 'italic' : (lastMessage && lastMessage.deleted ? 'italic' : 'normal')
                }}>
                    {lastMessageText}
                </span>
                {unread > 0 && (
                  <div style={{
                    minWidth: '20px', height: '20px', borderRadius: '10px',
                    backgroundColor: 'var(--primary-color)',
                    color: 'white', fontSize: '0.72rem', fontWeight: '700',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 5px', flexShrink: 0, marginLeft: '8px'
                  }}>
                    {unread > 99 ? '99+' : unread}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
