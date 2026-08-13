import React, { useContext } from 'react'
import useLocalStorage from '../hooks/useLocalStorage';

const ContactsContext = React.createContext()

export function useContacts() {
  return useContext(ContactsContext)
}

export function ContactsProvider({ children }) {
  const [contacts, setContacts] = useLocalStorage('contacts', [])

  function createContact(id, name) {
    setContacts(prevContacts => {
      return [...prevContacts, { id, name }]
    })
  }

  function updateContact(id, name) {
    setContacts(prevContacts => {
      return prevContacts.map(contact => contact.id === id ? { ...contact, name } : contact)
    })
  }

  function deleteContact(id) {
    setContacts(prevContacts => {
      return prevContacts.filter(contact => contact.id !== id)
    })
  }

  return (
    <ContactsContext.Provider value={{ contacts, createContact, updateContact, deleteContact }}>
      {children}
    </ContactsContext.Provider>
  )
}
