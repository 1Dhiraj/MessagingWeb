import React, { useState } from 'react'
import { Tab, Nav, Button, Modal } from 'react-bootstrap'
import Conversations from './Conversations'
import Contacts from './Contacts'
import NewContactModal from './NewContactModal'
import NewConversationModal from './NewConversationModal'

const CONVERSATIONS_KEY = 'conversations'
const CONTACTS_KEY = 'contacts'

export default function Sidebar({ id }) {
  const [activeKey, setActiveKey] = useState(CONVERSATIONS_KEY)
  const [modalOpen, setModalOpen] = useState(false)
  const conversationsOpen = activeKey === CONVERSATIONS_KEY

  function closeModal() {
    setModalOpen(false)
  }

  return (
    <div style={{ width: '100%', backgroundColor: 'white', borderRight: '1px solid #d1d7db', zIndex: 10, boxShadow: '2px 0 8px rgba(0,0,0,0.03)' }} className="d-flex flex-column">
      <style>{`
        @media (min-width: 769px) {
          .sidebar-wrapper {
            width: 340px !important;
          }
        }
        @media (max-width: 768px) {
          .sidebar-header h5 {
            font-size: 1rem;
            margin-bottom: 0.75rem !important;
          }
          .sidebar-button {
            padding: 0.75rem !important;
            font-size: 0.95rem !important;
          }
          .nav-tabs {
            font-size: 0.9rem;
          }
          .id-display {
            padding: 0.75rem !important;
            font-size: 0.75rem !important;
          }
          .id-display span {
            font-size: 0.65rem !important;
          }
        }
      `}</style>
      <Tab.Container activeKey={activeKey} onSelect={setActiveKey}>
        <div className="sidebar-header" style={{ backgroundColor: '#f0f2f5', padding: '16px 16px 0' }}>
          <h5 className="font-weight-bold mb-3 px-2" style={{ color: '#111b21' }}>Chats</h5>
          <Nav variant="tabs" className="justify-content-center w-100" style={{ borderBottom: 'none' }}>
            <Nav.Item className="w-50">
              <Nav.Link
                eventKey={CONVERSATIONS_KEY}
                className={`text-center py-2 ${conversationsOpen ? 'font-weight-bold text-dark' : 'text-muted'}`}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: conversationsOpen ? '3px solid var(--primary-color)' : '3px solid transparent',
                  borderRadius: 0,
                  transition: 'border-color 0.2s',
                  paddingBottom: '8px'
                }}
              >
                Messages
              </Nav.Link>
            </Nav.Item>
            <Nav.Item className="w-50">
              <Nav.Link
                eventKey={CONTACTS_KEY}
                className={`text-center py-2 ${!conversationsOpen ? 'font-weight-bold text-dark' : 'text-muted'}`}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: !conversationsOpen ? '3px solid var(--primary-color)' : '3px solid transparent',
                  borderRadius: 0,
                  transition: 'border-color 0.2s',
                  paddingBottom: '8px'
                }}
              >
                Contacts
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </div>
        <Tab.Content className="overflow-auto flex-grow-1" style={{ backgroundColor: 'white' }}>
          <Tab.Pane eventKey={CONVERSATIONS_KEY} className="h-100">
            <Conversations />
          </Tab.Pane>
          <Tab.Pane eventKey={CONTACTS_KEY} className="h-100">
            <Contacts />
          </Tab.Pane>
        </Tab.Content>
        <div className="id-display p-3 border-top small" style={{ backgroundColor: '#f0f2f5' }}>
          <div className="d-flex justify-content-between align-items-center">
            <span className="text-muted font-weight-bold">Your ID</span>
            <span className="bg-white px-2 py-1 rounded border text-monospace shadow-sm" style={{ fontSize: '0.85rem' }}>{id}</span>
          </div>
        </div>
        <Button onClick={() => setModalOpen(true)} className="sidebar-button rounded-0 py-3" style={{ background: 'var(--primary-color)', border: 'none', fontWeight: '600', fontSize: '1.05rem', transition: 'background-color 0.2s', width: '100%' }} onMouseOver={e => e.target.style.background = 'var(--primary-dark)'} onMouseOut={e => e.target.style.background = 'var(--primary-color)'}>
          + New {conversationsOpen ? 'Conversation' : 'Contact'}
        </Button>
      </Tab.Container>

      <Modal show={modalOpen} onHide={closeModal}>
        {conversationsOpen ?
          <NewConversationModal closeModal={closeModal} /> :
          <NewContactModal closeModal={closeModal} />
        }
      </Modal>
    </div>
  )
}
