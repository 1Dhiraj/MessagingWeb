const port = process.env.PORT || 5000
const io = require('socket.io')(port, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
})

const connectedUsers = {}   // id -> true
const lastSeenMap = {}      // id -> timestamp (ms)

io.on('connection', socket => {
  const id = socket.handshake.query.id
  socket.join(id)
  connectedUsers[id] = true
  console.log('User connected:', id)

  // Tell new user who is currently online
  socket.emit('online-users', Object.keys(connectedUsers))

  // Tell everyone else this user came online
  socket.broadcast.emit('user-online', { userId: id })

  // ── Messages ──────────────────────────────────────────────
  socket.on('send-message', ({ recipients, text, messageId }) => {
    recipients.forEach(recipient => {
      const newRecipients = recipients.filter(r => r !== recipient)
      newRecipients.push(id)
      socket.broadcast.to(recipient).emit('receive-message', {
        recipients: newRecipients, sender: id, text, messageId
      })
    })
  })

  // ── Typing indicator ──────────────────────────────────────
  socket.on('typing', ({ recipients, isTyping }) => {
    recipients.forEach(recipient => {
      socket.broadcast.to(recipient).emit('typing', { sender: id, isTyping })
    })
  })

  // ── Read receipts ─────────────────────────────────────────
  // Called when a user opens a conversation and sees unread messages
  socket.on('read-messages', ({ recipients }) => {
    recipients.forEach(recipient => {
      socket.broadcast.to(recipient).emit('messages-read', { readBy: id })
    })
  })

  // ── Disconnect ────────────────────────────────────────────
  socket.on('disconnect', () => {
    delete connectedUsers[id]
    lastSeenMap[id] = Date.now()
    socket.broadcast.emit('user-offline', { userId: id, lastSeen: lastSeenMap[id] })
    console.log('User disconnected:', id)
  })
})
