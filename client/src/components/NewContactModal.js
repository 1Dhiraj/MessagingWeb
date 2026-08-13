import React, { useRef, useState } from 'react'
import { Modal, Form, Button } from 'react-bootstrap'
import { useContacts } from '../contexts/ContactsProvider'
import { useConversations } from '../contexts/ConversationsProvider'

export default function NewContactModal({ closeModal, editContact }) {
  const idRef = useRef()
  const nameRef = useRef()
  const [error, setError] = useState('')
  const { contacts, createContact, updateContact } = useContacts()
  const { currentUserId } = useConversations()
  const isEditing = !!editContact

  function handleSubmit(e) {
    e.preventDefault()

    const id = isEditing ? editContact.id : idRef.current.value.trim()
    const name = nameRef.current.value.trim()

    // The original saved whatever was typed, so blank names, your own ID and
    // duplicate entries all made it into the contact list.
    if (!id || !name) {
      setError('Both an ID and a name are required.')
      return
    }
    if (!isEditing) {
      if (id === currentUserId) {
        setError("That's your own ID — you can't add yourself.")
        return
      }
      if (contacts.some(c => c.id === id)) {
        setError('A contact with that ID already exists.')
        return
      }
      createContact(id, name)
    } else {
      updateContact(id, name)
    }
    closeModal()
  }

  return (
    <>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{isEditing ? 'Edit Contact' : 'Create Contact'}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="px-4 pb-4">
        <p className="small mb-4" style={{ color: 'var(--text-muted)' }}>
          {isEditing
            ? 'Update the display name for this contact. The ID cannot be changed.'
            : 'Ask your friend for their unique ID to add them as a contact. This ID was given to them when they logged in.'}
        </p>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="small font-weight-bold" style={{ color: 'var(--text-muted)' }}>ID</Form.Label>
            <Form.Control
              type="text"
              ref={idRef}
              required
              placeholder="e.g. 5d54a-..."
              data-testid="contact-id-input"
              defaultValue={isEditing ? editContact.id : undefined}
              readOnly={isEditing}
              disabled={isEditing}
              onChange={() => setError('')}
            />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label className="small font-weight-bold" style={{ color: 'var(--text-muted)' }}>Name</Form.Label>
            <Form.Control
              type="text"
              ref={nameRef}
              required
              placeholder="Enter name"
              data-testid="contact-name-input"
              defaultValue={isEditing ? editContact.name : undefined}
              onChange={() => setError('')}
            />
          </Form.Group>
          {error && (
            <div data-testid="contact-error" role="alert" style={{
              color: '#c93448', backgroundColor: 'rgba(241,92,109,0.12)',
              border: '1px solid rgba(241,92,109,0.3)', borderRadius: '6px',
              padding: '6px 10px', fontSize: '0.83rem', marginBottom: '12px'
            }}>{error}</div>
          )}
          <Button type="submit" className="w-100" data-testid="create-contact-btn" style={{ background: 'var(--primary-color)', border: 'none', fontWeight: 'bold' }}>
            {isEditing ? 'Save Changes' : 'Create Contact'}
          </Button>
        </Form>
      </Modal.Body>
    </>
  )
}
