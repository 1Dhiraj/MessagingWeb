import React from 'react'
import { ListGroup } from 'react-bootstrap'
import { useConversations } from '../contexts/ConversationsProvider';

export default function Conversations() {
  const { conversations, selectConversationIndex } = useConversations()

  return (
    <ListGroup variant="flush">
      {conversations.length === 0 ? (
        <div className="p-4 text-center text-muted animate-fade-in-scale">
          <div className="mb-3">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#d1d7db"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16ZM7 9H17V11H7V9ZM7 12H15V14H7V12ZM7 6H17V8H7V6Z" /></svg>
          </div>
          <p className="mb-1" style={{ fontSize: '1.05rem', color: '#41525d' }}>No messages yet</p>
          <p className="small">Click <strong style={{ color: 'var(--primary-dark)' }}>+ New Conversation</strong> below to start chatting.</p>
        </div>
      ) : (
        conversations.map((conversation, index) => (
          <ListGroup.Item
            key={index}
            action
            onClick={() => selectConversationIndex(index)}
            active={conversation.selected}
            style={{
              border: 'none',
              borderBottom: '1px solid #f0f2f5',
              padding: '15px 20px',
              backgroundColor: conversation.selected ? '#ebebeb' : 'white',
              color: conversation.selected ? 'black' : 'inherit',
              fontWeight: conversation.selected ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={e => !conversation.selected && (e.target.style.backgroundColor = '#f5f6f6')}
            onMouseOut={e => !conversation.selected && (e.target.style.backgroundColor = 'white')}
          >
            <div className="d-flex align-items-center">
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#dfe5e7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px', color: '#fff', fontSize: '1.2rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#8696a0"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" /></svg>
              </div>
              <div className="text-truncate">
                {conversation.recipients.map(r => r.name).join(', ')}
              </div>
            </div>
          </ListGroup.Item>
        ))
      )}
    </ListGroup>
  )
}
