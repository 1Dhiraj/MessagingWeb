require('dotenv').config()
const express = require('express')
const http = require('http')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const socketio = require('socket.io')
const multer = require('multer')
const cloudinary = require('cloudinary').v2
const cors = require('cors')

// ── Cloudinary config ────────────────────────────────────────
// STORAGE=local forces the on-disk path, which keeps the e2e suite hermetic
// and lets the app be demoed without any Cloudinary account.
const CLOUDINARY_ENABLED = process.env.STORAGE !== 'local' && !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
)

if (CLOUDINARY_ENABLED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
} else {
  console.warn('[upload] Cloudinary credentials not set — falling back to local disk storage in ./uploads')
}

// ── Express app ──────────────────────────────────────────────
const app = express()
app.use(cors({ origin: '*' }))

// Local fallback so media, and voice notes in particular, still work when the
// app is run without Cloudinary credentials (fresh clone, offline demo, CI).
const UPLOAD_DIR = path.join(__dirname, 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '1y',
  setHeaders: res => res.setHeader('Accept-Ranges', 'bytes'), // seekable audio
}))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
})

app.get('/health', (req, res) => {
  res.json({ ok: true, storage: CLOUDINARY_ENABLED ? 'cloudinary' : 'local' })
})

function resourceTypeFor(mimetype) {
  if (mimetype.startsWith('image/')) return 'image'
  // Cloudinary handles audio under its "video" resource type.
  if (mimetype.startsWith('video/') || mimetype.startsWith('audio/')) return 'video'
  return 'raw'
}

function extensionFor(file) {
  const fromName = path.extname(file.originalname || '')
  if (fromName) return fromName
  const map = {
    'audio/webm': '.webm', 'audio/ogg': '.ogg', 'audio/mp4': '.m4a',
    'audio/mpeg': '.mp3', 'audio/wav': '.wav',
    'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp',
    'video/mp4': '.mp4', 'video/webm': '.webm',
  }
  return map[(file.mimetype || '').split(';')[0]] || ''
}

// ── Upload endpoint ──────────────────────────────────────────
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' })

  const declaredType = (req.file.mimetype || '').split(';')[0]
  const resourceType = resourceTypeFor(declaredType)

  if (!CLOUDINARY_ENABLED) {
    try {
      const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extensionFor(req.file)}`
      fs.writeFileSync(path.join(UPLOAD_DIR, name), req.file.buffer)
      const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`
      return res.json({
        url: `${base}/uploads/${name}`,
        resourceType,
        format: path.extname(name).replace('.', ''),
        originalName: req.file.originalname,
      })
    } catch (err) {
      console.error('Local upload error:', err)
      return res.status(500).json({ error: 'Could not save the file on the server.' })
    }
  }

  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          // Pin the resource type instead of relying on 'auto', which
          // mis-filed some voice notes and produced URLs that would not play.
          resource_type: resourceType,
          folder: 'whatsapp-clone',
        },
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
    res.status(500).json({ error: err.message || 'Upload failed' })
  }
})

// Multer surfaces size-limit violations as errors — translate them into a
// message the UI can show instead of a generic 500.
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File is too large (50 MB maximum).' })
  }
  if (err) {
    console.error('Unhandled server error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
  next()
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
  socket.on('send-message', ({ recipients, text, messageId, mediaUrl, mediaType, mediaName, mediaDuration, replyTo }) => {
    if (!Array.isArray(recipients)) return
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
        mediaDuration,
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
