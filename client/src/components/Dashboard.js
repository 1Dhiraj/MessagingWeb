import React, { useState, useEffect } from 'react'
import Sidebar from './Sidebar';
import OpenConversation from './OpenConversation';
import { useConversations } from '../contexts/ConversationsProvider';

export default function Dashboard({ id }) {
  const { selectedConversation } = useConversations()
  const [mobileView, setMobileView] = useState('sidebar') // 'sidebar' | 'chat'

  // When a conversation is selected on mobile, switch to chat view
  useEffect(() => {
    if (selectedConversation) {
      setMobileView('chat')
    }
  }, [selectedConversation])

  function handleBackToSidebar() {
    setMobileView('sidebar')
  }

  return (
    <div
      className="dashboard-wrapper"
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100vh',
        backgroundColor: '#efeae2',
        backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-light_04fcacde539c58cca6745483d4858c52.png")',
        backgroundRepeat: 'repeat',
        backgroundSize: '400px',
        overflow: 'hidden'
      }}
    >
      {/* Sidebar panel */}
      <div
        className="sidebar-panel"
        style={{
          width: '340px',
          minWidth: '340px',
          backgroundColor: 'white',
          borderRight: '1px solid #d1d7db',
          zIndex: 10,
          boxShadow: '2px 0 8px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Sidebar id={id} />
      </div>

      {/* Conversation panel */}
      <div
        className="conversation-panel"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
      >
        {selectedConversation
          ? <OpenConversation onBack={handleBackToSidebar} />
          : (
            <div
              className="welcome-screen"
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '2rem',
                zIndex: 1
              }}
            >
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '2rem',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.05)'
                }}
                className="animate-fade-in-scale"
              >
                <svg width="60" height="60" viewBox="0 0 24 24" fill="#aebac1">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" />
                </svg>
              </div>
              <h2 className="font-weight-bold animate-slide-up" style={{ color: '#41525d', marginBottom: '1rem' }}>
                Welcome to Chat App
              </h2>
              <p className="text-muted animate-slide-up" style={{ fontSize: '1.1rem', maxWidth: '400px', animationDelay: '0.1s' }}>
                Send and receive messages seamlessly. Add a contact using their <strong>unique ID</strong> and start a conversation.
              </p>
            </div>
          )
        }
      </div>

      {/* Mobile styles injected here so mobileView state is accessible */}
      <style>{`
        @media (max-width: 768px) {
          .sidebar-panel {
            position: fixed !important;
            top: 0;
            left: 0;
            width: 100% !important;
            min-width: 100% !important;
            height: 100vh;
            transform: translateX(${mobileView === 'sidebar' ? '0' : '-100%'});
            transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 200 !important;
          }
          .conversation-panel {
            position: fixed !important;
            top: 0;
            left: 0;
            width: 100% !important;
            height: 100vh;
            transform: translateX(${mobileView === 'chat' ? '0' : '100%'});
            transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 200 !important;
          }
          .welcome-screen h2 {
            font-size: 1.3rem;
          }
          .welcome-screen p {
            font-size: 0.95rem;
          }
        }
      `}</style>
    </div>
  )
}
