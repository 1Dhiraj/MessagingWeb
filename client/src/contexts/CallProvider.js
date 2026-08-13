import React, { useContext, useState, useRef, useEffect, useCallback } from 'react'
import { useSocket } from './SocketProvider'

const CallContext = React.createContext()

export function useCall() {
  return useContext(CallContext)
}

export function CallProvider({ id, children }) {
  const socket = useSocket()
  
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  
  const [callActive, setCallActive] = useState(false)
  const [incomingCall, setIncomingCall] = useState(null) // { callerId, offer, isVideo }
  const [outgoingCall, setOutgoingCall] = useState(null) // { targetId, isVideo }
  // The peer we are actually connected to, and whether the call carries video.
  // The old code derived both from `incomingCall`, which answerCall cleared —
  // so the callee's video call rendered with the audio-only layout and
  // hanging up emitted to a bogus "remote" room the caller never joined.
  const [peer, setPeer] = useState(null) // { id, isVideo, direction }

  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
  const peerIdRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const startingCallRef = useRef(false)

  // Update ref so socket handlers access latest stream
  useEffect(() => {
      localStreamRef.current = localStream
  }, [localStream])

  const cleanupCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }
    setLocalStream(null)
    setRemoteStream(null)
    setIncomingCall(null)
    setOutgoingCall(null)
    setPeer(null)
    setCallActive(false)
    peerIdRef.current = null
    pendingCandidatesRef.current = []
    startingCallRef.current = false
    if (peerConnectionRef.current) {
        try { peerConnectionRef.current.close() } catch (e) { /* already closed */ }
        peerConnectionRef.current = null
    }
  }, [])

  // ICE candidates can arrive before setRemoteDescription has been called.
  // addIceCandidate throws in that window, which silently broke connectivity
  // on slower networks, so we buffer and flush them.
  const flushPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current
    if (!pc || !pc.remoteDescription) return
    const queued = pendingCandidatesRef.current
    pendingCandidatesRef.current = []
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (e) {
        console.error('Error adding queued ICE candidate', e)
      }
    }
  }, [])

  const createPeerConnection = useCallback((targetId, isVideo) => {
    const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })

    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current)
        })
    }

    pc.ontrack = (event) => {
        setRemoteStream(event.streams[0])
    }

    pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
            socket.emit('call-ice-candidate', { targetId, candidate: event.candidate })
        }
    }

    pc.onconnectionstatechange = () => {
        // 'disconnected' is routinely transient (a brief network blip) and
        // often recovers on its own; tearing down there dropped healthy calls.
        // Only give up once the connection is genuinely done.
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            cleanupCall()
        }
    }

    peerConnectionRef.current = pc
    return pc
  }, [socket, cleanupCall])

  const initiateCall = async (targetId, isVideo) => {
    if (!socket) return
    // Claim the slot synchronously: peerIdRef is only set once getUserMedia
    // resolves, so a double click would otherwise start two calls.
    if (peerIdRef.current || startingCallRef.current) return
    startingCallRef.current = true
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true })
        setLocalStream(stream)
        localStreamRef.current = stream
        peerIdRef.current = targetId
        setPeer({ id: targetId, isVideo, direction: 'outgoing' })
        setOutgoingCall({ targetId, isVideo })
        setCallActive(true)

        const pc = createPeerConnection(targetId, isVideo)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        socket.emit('call-user', { userToCall: targetId, signalData: offer, from: id, isVideo })
    } catch (err) {
        console.error("Failed to start call", err)
        alert(isVideo
          ? "Could not access your camera and microphone."
          : "Could not access your microphone.")
        cleanupCall()
    } finally {
        startingCallRef.current = false
    }
  }

  const answerCall = async () => {
    if (!incomingCall || !socket) return
    const { callerId, isVideo, offer } = incomingCall
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true })
        setLocalStream(stream)
        localStreamRef.current = stream
        peerIdRef.current = callerId
        // Record the peer *before* clearing incomingCall so the UI keeps
        // rendering the video layout after the call is answered.
        setPeer({ id: callerId, isVideo, direction: 'incoming' })
        setCallActive(true)

        const pc = createPeerConnection(callerId, isVideo)
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        await flushPendingCandidates()

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        socket.emit('make-answer', { to: callerId, signal: answer })
        setIncomingCall(null)
    } catch (err) {
        console.error("Failed to answer call", err)
        alert("Could not access your microphone/camera to answer.")
        if (socket) socket.emit('call-rejected', { to: callerId })
        cleanupCall()
    }
  }

  const rejectCall = () => {
      if (incomingCall && socket) {
          socket.emit('call-rejected', { to: incomingCall.callerId })
      }
      cleanupCall()
  }

  const endCall = () => {
      // Always route the hang-up to the real peer id, whichever side we are on.
      const targetId = peerIdRef.current
      if (targetId && socket) {
          socket.emit('end-call', { to: targetId })
      }
      cleanupCall()
  }

  useEffect(() => {
    if (socket == null) return

    socket.on('call-user', ({ from, signal, isVideo }) => {
        // Busy: politely reject rather than clobbering the call in progress.
        if (peerIdRef.current) {
            socket.emit('call-rejected', { to: from })
            return
        }
        pendingCandidatesRef.current = []
        setIncomingCall({ callerId: from, offer: signal, isVideo })
    })

    socket.on('call-accepted', async (signal) => {
        if (!peerConnectionRef.current) return
        try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal))
            await flushPendingCandidates()
        } catch (e) {
            console.error('Failed to apply answer', e)
        }
    })

    socket.on('call-ice-candidate', async (candidate) => {
        const pc = peerConnectionRef.current
        if (!pc || !pc.remoteDescription) {
            // Offer/answer not exchanged yet — hold onto it.
            pendingCandidatesRef.current.push(candidate)
            return
        }
        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (e) {
            console.error('Error adding received ice candidate', e)
        }
    })

    socket.on('call-rejected', () => {
        cleanupCall()
    })

    socket.on('call-ended', () => {
        cleanupCall()
    })

    return () => {
        socket.off('call-user')
        socket.off('call-accepted')
        socket.off('call-ice-candidate')
        socket.off('call-rejected')
        socket.off('call-ended')
    }
  }, [socket, cleanupCall, flushPendingCandidates])

  const value = {
      localStream,
      remoteStream,
      callActive,
      incomingCall,
      outgoingCall,
      peer,
      isVideoCall: peer ? peer.isVideo : (incomingCall ? incomingCall.isVideo : false),
      initiateCall,
      answerCall,
      rejectCall,
      endCall
  }

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  )
}
