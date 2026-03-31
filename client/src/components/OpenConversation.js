import React, { useState, useCallback } from 'react'
import { Form, InputGroup, Button } from 'react-bootstrap'
import { useConversations } from '../contexts/ConversationsProvider';

export default function OpenConversation() {
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
    <div className="d-flex flex-column flex-grow-1" style={{ zIndex: 1, backgroundColor: 'transparent' }}>
      {/* Header */}
      <div className="d-flex align-items-center px-4 py-2 shadow-sm" style={{ backgroundColor: '#f0f2f5', borderBottom: '1px solid #d1d7db', minHeight: '65px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#dfe5e7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#8696a0"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" /></svg>
        </div>
        <div className="font-weight-bold" style={{ color: '#111b21', fontSize: '1.1rem' }}>
          {selectedConversation.recipients.map(r => r.name).join(', ')}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-grow-1 overflow-auto p-4 custom-scrollbar">
        <div className="d-flex flex-column align-items-start justify-content-end px-3">
          {selectedConversation.messages.map((message, index) => {
            const lastMessage = selectedConversation.messages.length - 1 === index
            return (
              <div
                ref={lastMessage ? setRef : null}
                key={index}
                className={`my-1 d-flex flex-column ${message.fromMe ? 'align-self-end align-items-end' : 'align-items-start'}`}
                style={{ maxWidth: '75%' }}
              >
                <div
                  className={`px-3 py-2 shadow-sm ${message.fromMe ? 'text-dark' : 'bg-white'}`}
                  style={{
                    backgroundColor: message.fromMe ? '#d9fdd3' : 'white',
                    borderRadius: message.fromMe ? '12px 0 12px 12px' : '0 12px 12px 12px',
                    fontSize: '0.95rem',
                    lineHeight: '1.4'
                  }}
                >
                  {!message.fromMe && <div className="font-weight-bold mb-1" style={{ fontSize: '0.8rem', color: 'var(--primary-dark)' }}>{message.senderName}</div>}
                  {message.text}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3" style={{ backgroundColor: '#f0f2f5' }}>
        <Form onSubmit={handleSubmit} className="m-0">
          <Form.Group className="m-0 d-flex align-items-center">
            <Form.Control
              as="textarea"
              required
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Type a message"
              style={{ height: '45px', resize: 'none', borderRadius: '25px', padding: '10px 20px', border: 'none', boxShadow: 'none' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
            />
            <Button type="submit" className="ml-3 rounded-circle d-flex align-items-center justify-content-center p-0" style={{ width: '45px', height: '45px', backgroundColor: 'var(--primary-dark)', border: 'none', transition: 'background-color 0.2s', flexShrink: 0 }} onMouseOver={e => e.target.style.backgroundColor = 'var(--secondary-color)'} onMouseOut={e => e.target.style.backgroundColor = 'var(--primary-dark)'}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '2px' }}><path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" /></svg>
            </Button>
          </Form.Group>
        </Form>
      </div>
    </div>
  )
}
