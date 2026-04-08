import React, { useState } from 'react'
import { Tab, Nav, Button, Modal } from 'react-bootstrap'
import Conversations from './Conversations'
import Contacts from './Contacts'
import NewContactModal from './NewContactModal'
import NewConversationModal from './NewConversationModal'
import { useTheme } from '../contexts/ThemeContext'

const CONVERSATIONS_KEY = 'conversations'
const CONTACTS_KEY = 'contacts'

export default function Sidebar({ id, onCloseSidebar }) {
  const [activeKey, setActiveKey] = useState(CONVERSATIONS_KEY)
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const conversationsOpen = activeKey === CONVERSATIONS_KEY
  const { dark, toggleTheme } = useTheme()

  function closeModal() { setModalOpen(false) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--sidebar-bg)' }}>
      <Tab.Container activeKey={activeKey} onSelect={setActiveKey}>

        {/* ── Header ── */}
        <div style={{ backgroundColor: 'var(--header-bg)', padding: '12px 16px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h5 style={{ fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Chats</h5>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {/* Dark / Light mode toggle */}
              <button onClick={toggleTheme} title={dark ? 'Switch to light mode' : 'Switch to dark mode'} style={{
                background: 'none', border: 'none', padding: '6px', cursor: 'pointer',
                borderRadius: '50%', color: 'var(--text-muted)', display: 'flex', alignItems: 'center'
              }}>
                {dark
                  ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z"/></svg>
                  : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>
                }
              </button>

              {/* Logout button */}
              <button 
                onClick={() => {
                   if (window.confirm('Are you sure you want to log out?')) {
                       const keys = Object.keys(localStorage)
                       for (let key of keys) {
                           if (key.startsWith('whatsapp-clone-')) {
                               localStorage.removeItem(key)
                           }
                       }
                       window.location.reload()
                   }
                }}  
                title="Log out" 
                style={{
                  background: 'none', border: 'none', padding: '6px', cursor: 'pointer',
                  borderRadius: '50%', color: '#f15c6d', display: 'flex', alignItems: 'center'
                }}
              >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
              </button>

              {/* Close button — mobile only */}
              {onCloseSidebar && (
                <button className="mobile-close-sidebar" onClick={onCloseSidebar} style={{
                  background: 'none', border: 'none', padding: '6px', cursor: 'pointer',
                  borderRadius: '50%', color: 'var(--text-muted)', display: 'none'
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          <Nav variant="tabs" className="justify-content-center w-100" style={{ borderBottom: 'none' }}>
            {[CONVERSATIONS_KEY, CONTACTS_KEY].map(key => {
              const active = activeKey === key
              return (
                <Nav.Item key={key} className="w-50">
                  <Nav.Link eventKey={key} style={{
                    textAlign: 'center', backgroundColor: 'transparent', border: 'none',
                    borderBottom: active ? '3px solid var(--primary-color)' : '3px solid transparent',
                    borderRadius: 0, transition: 'border-color 0.2s', paddingBottom: '8px',
                    fontWeight: active ? '600' : '400',
                    color: active ? 'var(--text-primary)' : 'var(--text-muted)'
                  }}>
                    {key === CONVERSATIONS_KEY ? 'Messages' : 'Contacts'}
                  </Nav.Link>
                </Nav.Item>
              )
            })}
          </Nav>
        </div>

        {/* ── Search Bar ── */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--sidebar-bg)', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
             <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
               <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
               </svg>
             </span>
             <input 
               type="text" 
               placeholder="Search or start new chat"
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               style={{ 
                 width: '100%', padding: '6px 12px 6px 38px', borderRadius: '8px', 
                 border: 'none', backgroundColor: 'var(--header-bg)', color: 'var(--text-primary)',
                 outline: 'none', fontSize: '0.9rem'
               }}
             />
             {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>✕</button>
             )}
          </div>
        </div>

        {/* ── List area ── */}
        <Tab.Content style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--sidebar-bg)' }}>
          <Tab.Pane eventKey={CONVERSATIONS_KEY}><Conversations searchQuery={searchQuery} /></Tab.Pane>
          <Tab.Pane eventKey={CONTACTS_KEY}><Contacts searchQuery={searchQuery} /></Tab.Pane>
        </Tab.Content>

        {/* ── Footer: Your ID ── */}
        <div style={{
          padding: '10px 16px', borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--header-bg)', flexShrink: 0
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.78rem' }}>Your ID</span>
            
            <div 
              onClick={() => {
                  navigator.clipboard.writeText(id)
                  const el = document.getElementById('copy-feedback')
                  if (el) {
                      el.style.opacity = 1
                      setTimeout(() => { el.style.opacity = 0 }, 1500)
                  }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                backgroundColor: 'var(--input-bg)', padding: '3px 10px', borderRadius: '6px',
                border: '1px solid var(--border-color)', position: 'relative'
              }}
              title="Click to copy ID"
            >
                <span id="copy-feedback" style={{
                    position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: 'var(--primary-color)', color: 'white', padding: '2px 6px',
                    borderRadius: '4px', fontSize: '0.7rem', opacity: 0, transition: 'opacity 0.2s',
                    pointerEvents: 'none', whiteSpace: 'nowrap'
                }}>Copied!</span>
                
                <span style={{
                    fontFamily: 'monospace', fontSize: '0.78rem', maxWidth: '140px', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)'
                }}>
                  {id}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13"rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            </div>

          </div>
        </div>

        {/* ── New button ── */}
        <Button onClick={() => setModalOpen(true)} style={{
          background: 'var(--primary-color)', border: 'none', borderRadius: 0,
          padding: '13px', fontWeight: '600', fontSize: '0.97rem', width: '100%', flexShrink: 0
        }}>
          + New {conversationsOpen ? 'Conversation' : 'Contact'}
        </Button>
      </Tab.Container>

      <Modal show={modalOpen} onHide={closeModal}>
        {conversationsOpen
          ? <NewConversationModal closeModal={closeModal} />
          : <NewContactModal closeModal={closeModal} />
        }
      </Modal>

      <style>{`
        @media (max-width: 768px) {
          .mobile-close-sidebar { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
