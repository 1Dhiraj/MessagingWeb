import React from 'react'
import { ListGroup } from 'react-bootstrap'
import { useContacts } from '../contexts/ContactsProvider';

export default function Contacts({ searchQuery }) {
  const { contacts } = useContacts()

  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true
    return contact.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           contact.id.toString().includes(searchQuery)
  })

  return (
    <ListGroup variant="flush">
      {filteredContacts.length === 0 ? (
        <div className="p-4 text-center text-muted animate-fade-in-scale">
          <div className="mb-3">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#d1d7db"><path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z" /></svg>
          </div>
          <p className="mb-1" style={{ fontSize: '1.05rem', color: '#41525d' }}>No contacts found</p>
        </div>
      ) : (
        filteredContacts.map(contact => (
          <ListGroup.Item
            key={contact.id}
            style={{
              border: 'none',
              borderBottom: '1px solid #f0f2f5',
              padding: '15px 20px',
              backgroundColor: 'white',
              transition: 'background-color 0.2s',
              cursor: 'pointer'
            }}
            onMouseOver={e => e.target.style.backgroundColor = '#f5f6f6'}
            onMouseOut={e => e.target.style.backgroundColor = 'white'}
          >
            <div className="d-flex align-items-center">
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#dfe5e7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px', color: '#fff', fontSize: '1.2rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#8696a0"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" /></svg>
              </div>
              <div>
                <div className="font-weight-bold" style={{ color: '#111b21', fontSize: '1.05rem' }}>{contact.name}</div>
                <div className="text-muted small" style={{ letterSpacing: '0.2px' }}>ID: {contact.id}</div>
              </div>
            </div>
          </ListGroup.Item>
        ))
      )}
    </ListGroup>
  )
}
