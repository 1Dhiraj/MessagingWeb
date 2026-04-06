const port = process.env.PORT || 5000
const io = require('socket.io')(port, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})


io.on('connection', socket => {
  const id = socket.handshake.query.id
  socket.join(id)
  console.log('User connected:', id)

  socket.on('send-message', ({ recipients, text }) => {
    console.log('Message from', id, 'to', recipients, ':', text)
    recipients.forEach(recipient => {
      const newRecipients = recipients.filter(r => r !== recipient)
      newRecipients.push(id)
      socket.broadcast.to(recipient).emit('receive-message', {
        recipients: newRecipients, sender: id, text
      })
    })
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', id)
  })
})