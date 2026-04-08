import React from 'react'
import Login from './Login'
import useLocalStorage from '../hooks/useLocalStorage';
import Dashboard from './Dashboard'
import { ContactsProvider } from '../contexts/ContactsProvider'
import { ConversationsProvider } from '../contexts/ConversationsProvider';
import { SocketProvider } from '../contexts/SocketProvider';
import { ThemeProvider } from '../contexts/ThemeContext';
import { CallProvider } from '../contexts/CallProvider';

function App() {
  const [id, setId] = useLocalStorage('id')

  const dashboard = (
    <SocketProvider id={id}>
      <CallProvider id={id}>
        <ContactsProvider>
          <ConversationsProvider id={id}>
            <Dashboard id={id} />
          </ConversationsProvider>
        </ContactsProvider>
      </CallProvider>
    </SocketProvider>
  )

  return (
    <ThemeProvider>
      {id ? dashboard : <Login onIdSubmit={setId} />}
    </ThemeProvider>
  )
}

export default App;
