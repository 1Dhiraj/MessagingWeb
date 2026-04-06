import React, { useState, useCallback } from 'react'
import { Form, Button } from 'react-bootstrap'
import { useConversations } from '../contexts/ConversationsProvider';

export default function OpenConversation({ onBack }) {
  const [text, setText] = useState('')
  const setRef = useCallback(node => {
    if (node) {
      node.scrollIntoView({ smooth: true })
    }
  }, [])
  const { sendMessage, selectedConversation } = useConversations()

  function handleSubmit(e) {
    e.preventDefault()
    sendMessage(
      selectedConversation.recipients.map(r => r.id),
      text
    )
    setText('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, zIndex: 1, backgroundColor: 'transparent', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          backgroundColor: '#f0f2f5',
          borderBottom: '1px solid #d1d7db',
          minHeight: '60px',
          flexShrink: 0
        }}
      >
        {/* Back button — only visible on mobile */}
        <button
          className="mobile-back-btn"
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 12px 8px 0',
            cursor: 'pointer',
            display: 'none',
            alignItems: 'center',
            color: '#128C7E'
          }}
          aria-label="Back"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#128C7E">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>

        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#dfe5e7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '12px',
            flexShrink: 0
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#8696a0">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" />
          </svg>
        </div>

        <div style={{ fontWeight: '600', color: '#111b21', fontSize: '1rem' }}>
          {selectedConversation.recipients.map(r => r.name).join(', ')}
        </div>
      </div>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column'
        }}
        className="custom-scrollbar"
      >
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: '100%' }}>
          {selectedConversation.messages.map((message, index) => {
            const lastMessage = selectedConversation.messages.length - 1 === index
            return (
              <div
                ref={lastMessage ? setRef : null}
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: message.fromMe ? 'flex-end' : 'flex-start',
                  alignSelf: message.fromMe ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  margin: '3px 0'
                }}
              >
                <div
                  style={{
                    backgroundColor: message.fromMe ? '#d9fdd3' : 'white',
                    borderRadius: message.fromMe ? '12px 0 12px 12px' : '0 12px 12px 12px',
                    padding: '8px 12px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                    fontSize: '0.95rem',
                    lineHeight: '1.4'
                  }}
                >
                  {!message.fromMe && (
                    <div style={{ fontWeight: '600', fontSize: '0.78rem', color: 'var(--primary-dark)', marginBottom: '3px' }}>
                      {message.senderName}
                    </div>
                  )}
                  {message.text}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Input Area */}
      <div style={{ padding: '10px 16px', backgroundColor: '#f0f2f5', flexShrink: 0 }}>
        <Form onSubmit={handleSubmit} style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Form.Control
              as="textarea"
              required
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Type a message"
              style={{
                height: '45px',
                resize: 'none',
                borderRadius: '25px',
                padding: '10px 18px',
                border: 'none',
                boxShadow: 'none',
                fontSize: '0.95rem'
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            <Button
              type="submit"
              style={{
                width: '45px',
                height: '45px',
                minWidth: '45px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-dark)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                flexShrink: 0
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '2px' }}>
                <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" />
              </svg>
            </Button>
          </div>
        </Form>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-back-btn {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  )
}
