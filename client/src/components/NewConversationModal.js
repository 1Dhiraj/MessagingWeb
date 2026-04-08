import React, { useState } from 'react'
import { Modal, Form, Button } from 'react-bootstrap'
import { useContacts } from '../contexts/ContactsProvider'
import { useConversations } from '../contexts/ConversationsProvider'

export default function NewConversationModal({ closeModal }) {
  const [selectedContactIds, setSelectedContactIds] = useState([])
  const [groupName, setGroupName] = useState('')
  const { contacts } = useContacts()
  const { createConversation } = useConversations()

  function handleSubmit(e) {
    e.preventDefault()

    // Pass groupName if more than 1 person is selected
    createConversation(selectedContactIds, selectedContactIds.length > 1 ? groupName : null)
    closeModal()
  }

  function handleCheckboxChange(contactId) {
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
        <p className="text-muted small mb-4">
          Select one or more contacts to start a new conversation.
        </p>
        <Form onSubmit={handleSubmit}>
          
          {selectedContactIds.length > 1 && (
            <Form.Group className="mb-3">
              <Form.Label>Group Name</Form.Label>
              <Form.Control
                type="text"
                required
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="Enter a catchy name for the group"
              />
            </Form.Group>
          )}

          <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '15px' }}>
            {contacts.map(contact => (
            <Form.Group controlId={contact.id} key={contact.id} className="mb-2">
              <Form.Check
                type="checkbox"
                value={selectedContactIds.includes(contact.id)}
                label={contact.name}
                onChange={() => handleCheckboxChange(contact.id)}
              />
            </Form.Group>
          ))}
          </div>
          <Button type="submit">Create</Button>
        </Form>
      </Modal.Body>
    </>
  )
}
