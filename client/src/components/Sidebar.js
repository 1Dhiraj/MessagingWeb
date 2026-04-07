import React, { useState } from 'react'
import { Tab, Nav, Button, Modal } from 'react-bootstrap'
import Conversations from './Conversations'
import Contacts from './Contacts'
import NewContactModal from './NewContactModal'
import NewConversationModal from './NewConversationModal'

const CONVERSATIONS_KEY = 'conversations'
const CONTACTS_KEY = 'contacts'

export default function Sidebar({ id, onCloseSidebar }) {
  const [activeKey, setActiveKey] = useState(CONVERSATIONS_KEY)
  const [modalOpen, setModalOpen] = useState(false)
  const conversationsOpen = activeKey === CONVERSATIONS_KEY

  function closeModal() {
    setModalOpen(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'white' }}>
      <Tab.Container activeKey={activeKey} onSelect={setActiveKey}>
        {/* Header */}
        <div style={{ backgroundColor: '#f0f2f5', padding: '16px 16px 0', flexShrink: 0, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h5 style={{ fontWeight: '700', marginBottom: '12px', paddingLeft: '8px', color: '#111b21' }}>Chats</h5>
            {onCloseSidebar && (
              <button
                className="mobile-close-sidebar"
                onClick={onCloseSidebar}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '8px',
                  cursor: 'pointer',
                  color: '#667781',
                  display: 'none', // Overridden in Dashboard.js CSS for mobile
                  marginTop: '-12px'
                }}
                aria-label="Close Sidebar"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z" />
                </svg>
              </button>
            )}
          </div>
          <Nav variant="tabs" className="justify-content-center w-100" style={{ borderBottom: 'none' }}>
            <Nav.Item className="w-50">
              <Nav.Link
                eventKey={CONVERSATIONS_KEY}
                style={{
                  textAlign: 'center',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: conversationsOpen ? '3px solid var(--primary-color)' : '3px solid transparent',
                  borderRadius: 0,
                  transition: 'border-color 0.2s',
                  fontWeight: conversationsOpen ? '600' : '400',
                  color: conversationsOpen ? '#111b21' : '#667781',
                  paddingBottom: '8px'
                }}
              >
                Messages
              </Nav.Link>
            </Nav.Item>
            <Nav.Item className="w-50">
              <Nav.Link
                eventKey={CONTACTS_KEY}
                style={{
                  textAlign: 'center',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: !conversationsOpen ? '3px solid var(--primary-color)' : '3px solid transparent',
                  borderRadius: 0,
                  transition: 'border-color 0.2s',
                  fontWeight: !conversationsOpen ? '600' : '400',
                  color: !conversationsOpen ? '#111b21' : '#667781',
                  paddingBottom: '8px'
                }}
              >
                Contacts
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </div>

        {/* List area */}
        <Tab.Content style={{ flex: 1, overflowY: 'auto', backgroundColor: 'white' }}>
          <Tab.Pane eventKey={CONVERSATIONS_KEY} style={{ height: '100%' }}>
            <Conversations />
          </Tab.Pane>
          <Tab.Pane eventKey={CONTACTS_KEY} style={{ height: '100%' }}>
            <Contacts />
          </Tab.Pane>
        </Tab.Content>

        {/* Footer — Your ID */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e9ecef', backgroundColor: '#f0f2f5', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#667781', fontWeight: '600', fontSize: '0.8rem' }}>Your ID</span>
            <span
              style={{
                backgroundColor: 'white',
                padding: '3px 10px',
                borderRadius: '6px',
                border: '1px solid #e1e9eb',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {id}
            </span>
          </div>
        </div>

        {/* New button */}
        <Button
          onClick={() => setModalOpen(true)}
          style={{
            background: 'var(--primary-color)',
            border: 'none',
            borderRadius: 0,
            padding: '14px',
            fontWeight: '600',
            fontSize: '1rem',
            width: '100%',
            flexShrink: 0
          }}
        >
          + New {conversationsOpen ? 'Conversation' : 'Contact'}
        </Button>
      </Tab.Container>

      <Modal show={modalOpen} onHide={closeModal}>
        {conversationsOpen
          ? <NewConversationModal closeModal={closeModal} />
          : <NewContactModal closeModal={closeModal} />
        }
      </Modal>
    </div>
  )
}
