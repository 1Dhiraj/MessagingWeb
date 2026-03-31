import React, { useRef } from 'react'
import { Modal, Form, Button } from 'react-bootstrap'
import { useContacts } from '../contexts/ContactsProvider'

export default function NewContactModal({ closeModal }) {
  const idRef = useRef()
  const nameRef = useRef()
  const { createContact } = useContacts()

  function handleSubmit(e) {
    e.preventDefault()

    createContact(idRef.current.value, nameRef.current.value)
    closeModal()
  }

  return (
    <>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Create Contact</Modal.Title>
      </Modal.Header>
      <Modal.Body className="px-4 pb-4">
        <p className="text-muted small mb-4">
          Ask your friend for their unique ID to add them as a contact. This ID was given to them when they logged in.
        </p>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="small font-weight-bold text-muted">ID</Form.Label>
            <Form.Control type="text" ref={idRef} required placeholder="e.g. 5d54a-..." />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label className="small font-weight-bold text-muted">Name</Form.Label>
            <Form.Control type="text" ref={nameRef} required placeholder="Enter name" />
          </Form.Group>
          <Button type="submit" className="w-100" style={{ background: 'var(--primary-color)', border: 'none', fontWeight: 'bold' }}>Create Contact</Button>
        </Form>
      </Modal.Body>

    </>
  )
}
