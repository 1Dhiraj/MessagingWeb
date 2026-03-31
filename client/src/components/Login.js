import React, { useRef } from 'react'
import { Container, Form, Button } from 'react-bootstrap'
import { v4 as uuidV4 } from 'uuid'

export default function Login({ onIdSubmit }) {
  const idRef = useRef()

  function handleSubmit(e) {
    e.preventDefault()

    onIdSubmit(idRef.current.value)
  }

  function createNewId() {
    onIdSubmit(uuidV4())
  }

  return (
    <Container className="align-items-center d-flex justify-content-center" style={{ height: '100vh', position: 'relative', zIndex: 1 }}>
      <div className="glass-panel p-5 rounded animate-fade-in-scale" style={{ width: '100%', maxWidth: '420px', backgroundColor: 'rgba(255,255,255,0.92)' }}>
        <div className="text-center mb-4">
          <div style={{ width: '64px', height: '64px', background: 'var(--primary-color)', borderRadius: '50%', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(37, 211, 102, 0.4)' }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 15.54 3.85 18.64 6.64 20.35L5.27 23.36C5.08 23.77 5.46 24.16 5.89 24.01L9.19 22.84C10.09 23.11 11.03 23.25 12 23.25C17.52 23.25 22 18.77 22 12C22 6.48 17.52 2 12 2ZM15.68 16.71C15.53 17.13 14.93 17.52 14.47 17.63C14.01 17.74 13.43 17.84 10.99 16.83C7.94 15.56 5.96 12.44 5.8 12.23C5.65 12.02 4.67 10.72 4.67 9.38C4.67 8.04 5.37 7.39 5.65 7.09C5.89 6.82 6.37 6.68 6.8 6.68C6.94 6.68 7.06 6.69 7.16 6.74C7.4 6.79 7.52 6.82 7.68 7.21C7.88 7.69 8.35 8.84 8.41 8.97C8.47 9.09 8.56 9.27 8.46 9.46C8.36 9.66 8.28 9.77 8.13 9.94C7.98 10.11 7.82 10.33 7.68 10.45C7.52 10.61 7.36 10.78 7.54 11.1C7.73 11.41 8.34 12.4 9.23 13.19C10.38 14.21 11.31 14.53 11.66 14.68C11.96 14.81 12.3 14.78 12.51 14.54C12.78 14.25 13.11 13.75 13.45 13.26C13.68 12.92 13.97 12.87 14.28 12.99C14.6 13.11 16.27 13.93 16.6 14.1C16.94 14.27 17.16 14.35 17.24 14.49C17.32 14.63 17.32 15.26 17.06 15.86H17.06Z" />
            </svg>
          </div>
          <h4 className="font-weight-bold" style={{ color: 'var(--primary-dark)', letterSpacing: '-0.5px' }}>Welcome to Chat App</h4>
          <p className="text-muted small mt-2 mb-0" style={{ lineHeight: '1.5' }}>
            To talk with friends, you need to use a unique ID. Create a new one below, or log in with an existing ID. Share your ID so they can add you!
          </p>
        </div>
        <Form onSubmit={handleSubmit} className="w-100">
          <Form.Group className="mb-4">
            <Form.Control
              type="text"
              ref={idRef}
              placeholder="Enter your ID"
              required
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid #e1e9eb',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                background: '#f8f9fa'
              }}
            />
          </Form.Group>
          <Button type="submit" className="w-100 mb-3 rounded" style={{ padding: '12px', background: 'var(--primary-color)', border: 'none', fontWeight: '600', boxShadow: '0 6px 12px rgba(37, 211, 102, 0.3)', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseOver={e => e.target.style.transform = 'translateY(-2px)'} onMouseOut={e => e.target.style.transform = 'translateY(0)'}>
            Login to Account
          </Button>
          <Button onClick={createNewId} variant="outline-secondary" className="w-100 rounded" style={{ padding: '10px', fontWeight: '500', transition: 'all 0.2s' }} onMouseOver={e => { e.target.style.background = '#f0f2f5'; e.target.style.color = '#128C7E' }} onMouseOut={e => { e.target.style.background = 'transparent'; e.target.style.color = '#6c757d' }}>
            Create A New ID
          </Button>
        </Form>
      </div>
    </Container>
  )
}
