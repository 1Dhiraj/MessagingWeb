import React, { useState } from 'react'
import { Modal, Form, Button } from 'react-bootstrap'
import { useContacts } from '../contexts/ContactsProvider'
import { useConversations } from '../contexts/ConversationsProvider'

export default function NewConversationModal({ closeModal }) {
  const [selectedContactIds, setSelectedContactIds] = useState([])
  const [groupName, setGroupName] = useState('')
  const [error, setError] = useState('')
  const { contacts } = useContacts()
  const { createConversation } = useConversations()

  const isGroup = selectedContactIds.length > 1

  function handleSubmit(e) {
    e.preventDefault()

    // Submitting with nothing ticked used to create an empty conversation
    // that rendered as a blank row and could never receive a message.
    if (selectedContactIds.length === 0) {
      setError('Select at least one contact.')
      return
    }
    if (isGroup && !groupName.trim()) {
      setError('Give the group a name.')
      return
    }

    createConversation(selectedContactIds, isGroup ? groupName.trim() : null)
    closeModal()
  }

  function handleCheckboxChange(contactId) {
    setError('')
    setSelectedContactIds(prevSelectedContactIds => {
      if (prevSelectedContactIds.includes(contactId)) {
        return prevSelectedContactIds.filter(prevId => prevId !== contactId)
      } else {
        return [...prevSelectedContactIds, contactId]
      }
    })
  }

  return (
    <>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Create Conversation</Modal.Title>
      </Modal.Header>
      <Modal.Body className="px-4 pb-4">
        <p className="small mb-4" style={{ color: 'var(--text-muted)' }}>
          Select one or more contacts to start a new conversation.
        </p>

        {contacts.length === 0 ? (
          <div data-testid="no-contacts-hint" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            You have no contacts yet. Add one from the <strong>Contacts</strong> tab first.
          </div>
        ) : (
        <Form onSubmit={handleSubmit}>

          {isGroup && (
            <Form.Group className="mb-3">
              <Form.Label>Group Name</Form.Label>
              <Form.Control
                type="text"
                value={groupName}
                data-testid="group-name-input"
                onChange={e => { setGroupName(e.target.value); setError('') }}
                placeholder="Enter a catchy name for the group"
              />
            </Form.Group>
          )}

          <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '15px' }}>
            {contacts.map(contact => (
              <Form.Group controlId={`contact-${contact.id}`} key={contact.id} className="mb-2">
                <Form.Check
                  type="checkbox"
                  /* `checked`, not `value` — the checkbox was uncontrolled, so
                     React state and the visible tick could drift apart. */
                  checked={selectedContactIds.includes(contact.id)}
                  label={contact.name}
                  data-testid="conversation-contact-check"
                  onChange={() => handleCheckboxChange(contact.id)}
                />
              </Form.Group>
            ))}
          </div>

          {error && (
            <div data-testid="conversation-error" role="alert" style={{
              color: '#c93448', backgroundColor: 'rgba(241,92,109,0.12)',
              border: '1px solid rgba(241,92,109,0.3)', borderRadius: '6px',
              padding: '6px 10px', fontSize: '0.83rem', marginBottom: '12px'
            }}>{error}</div>
          )}

          <Button type="submit" data-testid="create-conversation-btn" style={{ background: 'var(--primary-color)', border: 'none', fontWeight: 'bold' }}>
            Create
          </Button>
        </Form>
        )}
      </Modal.Body>
    </>
  )
}
