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
  
  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
  
  // Update ref so socket handlers access latest stream
  useEffect(() => {
      localStreamRef.current = localStream
  }, [localStream])

  const cleanupCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }
    setLocalStream(null)
    setRemoteStream(null)
    setIncomingCall(null)
    setOutgoingCall(null)
    setCallActive(false)
    if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
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
        if (event.candidate) {
            socket.emit('call-ice-candidate', { targetId, candidate: event.candidate })
        }
    }
    
    pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            cleanupCall()
        }
    }

    peerConnectionRef.current = pc
    return pc
  }, [socket, cleanupCall])

  const initiateCall = async (targetId, isVideo) => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true })
        setLocalStream(stream)
        localStreamRef.current = stream
        setOutgoingCall({ targetId, isVideo })
        setCallActive(true)

        const pc = createPeerConnection(targetId, isVideo)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        socket.emit('call-user', { userToCall: targetId, signalData: offer, from: id, isVideo })
    } catch (err) {
        console.error("Failed to start call", err)
        alert("Failed to access camera/mic")
        cleanupCall()
    }
  }

  const answerCall = async () => {
    if (!incomingCall) return
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: incomingCall.isVideo, audio: true })
        setLocalStream(stream)
        localStreamRef.current = stream
        setCallActive(true)

        const pc = createPeerConnection(incomingCall.callerId, incomingCall.isVideo)
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer))
        
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        socket.emit('make-answer', { to: incomingCall.callerId, signal: answer })
        setIncomingCall(null)
    } catch (err) {
        console.error("Failed to answer call", err)
        cleanupCall()
    }
  }

  const rejectCall = () => {
      if (incomingCall) {
          socket.emit('call-rejected', { to: incomingCall.callerId })
      }
      cleanupCall()
  }

  const endCall = () => {
      const targetId = outgoingCall ? outgoingCall.targetId : (remoteStream ? 'remote' : null)
      if (targetId) {
          socket.emit('end-call', { to: targetId })
      }
      cleanupCall()
  }

  useEffect(() => {
    if (socket == null) return

    socket.on('call-user', ({ from, signal, isVideo }) => {
        setIncomingCall({ callerId: from, offer: signal, isVideo })
    })

    socket.on('call-accepted', async (signal) => {
        if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal))
        }
    })
    
    socket.on('call-ice-candidate', async (candidate) => {
        if (peerConnectionRef.current) {
            try {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (e) {
                console.error('Error adding received ice candidate', e)
            }
        }
    })

    socket.on('call-rejected', () => {
        alert("Call was rejected")
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
  }, [socket, cleanupCall])

  const value = {
      localStream,
      remoteStream,
      callActive,
      incomingCall,
      outgoingCall,
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
