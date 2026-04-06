import React from 'react'
import Sidebar from './Sidebar';
import OpenConversation from './OpenConversation';
import { useConversations } from '../contexts/ConversationsProvider';

export default function Dashboard({ id }) {
  const { selectedConversation } = useConversations()

  return (
    <div className="d-flex flex-column flex-md-row" style={{ height: '100vh', backgroundColor: '#efeae2', backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-light_04fcacde539c58cca6745483d4858c52.png")', backgroundRepeat: 'repeat', backgroundSize: '400px', opacity: 0.98 }}>
      <style>{`
        @media (max-width: 768px) {
          .sidebar-container {
            width: 100% !important;
            border-right: none !important;
            border-bottom: 1px solid #d1d7db !important;
            max-height: 50vh;
            overflow-y: auto;
            z-index: 100 !important;
            display: ${selectedConversation ? 'none' : 'flex'} !important;
          }
          .conversation-container {
            width: 100%;
            flex-grow: 1;
          }
          .welcome-message p {
            font-size: 0.95rem;
          }
          .welcome-message h2 {
            font-size: 1.3rem;
          }
          .welcome-icon {
            width: 80px !important;
            height: 80px !important;
          }
          .welcome-icon svg {
            width: 40px !important;
            height: 40px !important;
          }
        }
      `}</style>
      <div className="sidebar-container d-flex flex-column" style={{ width: '340px', backgroundColor: 'white', borderRight: '1px solid #d1d7db', zIndex: 10, boxShadow: '2px 0 8px rgba(0,0,0,0.03)' }}>
        <Sidebar id={id} />
      </div>
      <div className="conversation-container flex-grow-1 d-flex flex-column">
        {selectedConversation ? <OpenConversation /> :
          <div className="welcome-message flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center p-3 p-md-5" style={{ zIndex: 1 }}>
            <div className="welcome-icon animate-fade-in-scale" style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }}>
              <svg width="60" height="60" viewBox="0 0 24 24" fill="#aebac1"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" /></svg>
            </div>
            <h2 className="font-weight-bold animate-slide-up" style={{ color: '#41525d', marginBottom: '1rem' }}>Welcome to Chat App</h2>
            <p className="text-muted animate-slide-up" style={{ fontSize: '1.1rem', maxWidth: '400px', animationDelay: '0.1s' }}>
              Send and receive messages seamlessly. Add a contact using their <strong>unique ID</strong> and start a conversation.
            </p>
          </div>
        }
      </div>
    </div>
  )
}
