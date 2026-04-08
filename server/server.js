require('dotenv').config()
const express = require('express')
const http = require('http')
const socketio = require('socket.io')
const multer = require('multer')
const cloudinary = require('cloudinary').v2
const cors = require('cors')

// ── Cloudinary config ────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// ── Express app ──────────────────────────────────────────────
const app = express()
app.use(cors({ origin: '*' }))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
})

// ── Upload endpoint ──────────────────────────────────────────
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' })
  try {
    const isImage = req.file.mimetype.startsWith('image/')
    const isVideo = req.file.mimetype.startsWith('video/')
    const rType = isImage ? 'image' : isVideo ? 'video' : 'raw'

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto', folder: 'whatsapp-clone' },
        (err, result) => { if (err) reject(err); else resolve(result) }
      )
      stream.end(req.file.buffer)
    })
    res.json({
      url: result.secure_url,
      resourceType: result.resource_type,
      format: result.format,
      originalName: req.file.originalname,
    })
  } catch (err) {
    console.error('Cloudinary upload error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── HTTP + Socket.io ─────────────────────────────────────────
const server = http.createServer(app)
const io = socketio(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

io.on('connection', socket => {
  const id = socket.handshake.query.id
  socket.join(id)
  console.log('User connected:', id)

  // Tell everyone this user came online
  socket.broadcast.emit('user-online', { userId: id })

  // Send the new user the current online list
  const onlineIds = []
  Object.values(io.sockets.sockets).forEach(s => {
    const uid = s.handshake.query.id
    if (uid && uid !== id) onlineIds.push(uid)
  })
  socket.emit('online-users', onlineIds)

  // ── Send message ──────────────────────────────────────────
  socket.on('send-message', ({ recipients, text, messageId, mediaUrl, mediaType, mediaName, replyTo }) => {
    recipients.forEach(recipient => {
      const newRecipients = recipients.filter(r => r !== recipient)
      newRecipients.push(id)
      socket.broadcast.to(recipient).emit('receive-message', {
        recipients: newRecipients,
        sender: id,
        text,
        messageId,
        mediaUrl,
        mediaType,
        mediaName,
        replyTo,
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
  socket.on('read-messages', ({ recipients }) => {
    recipients.forEach(recipient => {
      socket.broadcast.to(recipient).emit('messages-read', { readBy: id })
    })
  })

  // ── Delete for everyone ───────────────────────────────────
  socket.on('delete-for-everyone', ({ recipients, messageId }) => {
    recipients.forEach(recipient => {
      socket.broadcast.to(recipient).emit('delete-for-everyone', { messageId })
    })
  })

  // ── Edit Message ──────────────────────────────────────────
  socket.on('edit-message', ({ recipients, messageId, newText }) => {
    recipients.forEach(recipient => {
      // Reconstruct recipients array for the receiver so it matches deterministic key
      const newRecipients = recipients.filter(r => r !== recipient)
      newRecipients.push(id)
      socket.broadcast.to(recipient).emit('edit-message', { recipients: newRecipients, sender: id, messageId, newText })
    })
  })

  // ── Reactions ─────────────────────────────────────────────
  socket.on('add-reaction', ({ recipients, messageId, emoji, userId }) => {
    recipients.forEach(recipient => {
      socket.broadcast.to(recipient).emit('add-reaction', { messageId, emoji, userId })
    })
  })

  // ── WebRTC Signaling ────────────────────────────────────────
  socket.on('call-user', (data) => {
    socket.broadcast.to(data.userToCall).emit('call-user', { signal: data.signalData, from: data.from, isVideo: data.isVideo })
  })

  socket.on('make-answer', (data) => {
    socket.broadcast.to(data.to).emit('call-accepted', data.signal)
  })

  socket.on('call-ice-candidate', (data) => {
    socket.broadcast.to(data.targetId).emit('call-ice-candidate', data.candidate)
  })

  socket.on('call-rejected', (data) => {
    socket.broadcast.to(data.to).emit('call-rejected')
  })

  socket.on('end-call', (data) => {
    socket.broadcast.to(data.to).emit('call-ended')
  })

  // ── Disconnect ────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log('User disconnected:', id)
    socket.broadcast.emit('user-offline', { userId: id, lastSeen: Date.now() })
  })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => console.log(`Backend Server running on port ${PORT}`))
