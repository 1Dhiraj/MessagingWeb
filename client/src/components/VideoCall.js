import React, { useEffect, useRef } from 'react'
import { useCall } from '../contexts/CallProvider'
import { useConversations } from '../contexts/ConversationsProvider'

export default function VideoCall() {
  const { 
      localStream, remoteStream, callActive, incomingCall, outgoingCall,
      answerCall, rejectCall, endCall 
  } = useCall()
  const { contacts } = useConversations()

  const localVideoRef = useRef()
  const remoteVideoRef = useRef()

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  if (!callActive && !incomingCall) return null

  // Find name
  let targetName = 'Unknown'
  if (incomingCall) targetName = contacts?.find(c => c.id === incomingCall.callerId)?.name || incomingCall.callerId
  if (outgoingCall) targetName = contacts?.find(c => c.id === outgoingCall.targetId)?.name || outgoingCall.targetId

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: '#111b21', zIndex: 9999, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', color: 'white'
    }}>
      
      {/* ── Incoming Call Dialog ── */}
      {incomingCall && !callActive && (
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--avatar-bg)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <svg width="50" height="50" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z"/></svg>
              </div>
              <h2 style={{ marginBottom: '10px' }}>{targetName}</h2>
              <p style={{ color: '#8696a0', marginBottom: '30px' }}>Incoming {incomingCall.isVideo ? 'Video' : 'Voice'} Call...</p>
              
              <div style={{ display: 'flex', gap: '30px', justifyContent: 'center' }}>
                  <button onClick={rejectCall} style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#f15c6d', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(241,92,109,0.3)' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                  </button>
                  <button onClick={answerCall} style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#00a884', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,168,132,0.3)', animation: 'pulse 1.5s infinite' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                  </button>
              </div>
          </div>
      )}

      {/* ── Active Call / Outgoing Call ── */}
      {callActive && (
          <>
             {remoteStream ? (
                incomingCall?.isVideo || outgoingCall?.isVideo ? (
                    <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} />
                ) : (
                    <div style={{ textAlign: 'center', zIndex: 10 }}>
                        <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'var(--avatar-bg)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z"/></svg>
                        </div>
                        <h2>{targetName}</h2>
                        <p style={{ color: '#00a884' }}>00:00</p>
                        <audio ref={remoteVideoRef} autoPlay style={{ display: 'none' }} />
                    </div>
                )
             ) : (
                <div style={{ zIndex: 10, textAlign: 'center' }}>
                   <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--avatar-bg)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <svg width="50" height="50" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z"/></svg>
                   </div>
                   <h2>{targetName}</h2>
                   <p style={{ color: '#8696a0' }}>Calling...</p>
                </div>
             )}

             {/* Local Video Mini */}
             {(incomingCall?.isVideo || outgoingCall?.isVideo) && (
                <video ref={localVideoRef} autoPlay playsInline muted style={{
                    width: '120px', height: '160px', objectFit: 'cover',
                    position: 'absolute', bottom: '100px', right: '20px',
                    borderRadius: '12px', border: '2px solid white', zIndex: 11,
                    backgroundColor: '#222'
                }} />
             )}
             
             {/* Call Controls */}
             <div style={{ position: 'absolute', bottom: '30px', display: 'flex', gap: '20px', zIndex: 12 }}>
                <button onClick={endCall} style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#f15c6d', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(241,92,109,0.3)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                </button>
             </div>
          </>
      )}

      <style>{`
        @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 168, 132, 0.7); }
            70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(0, 168, 132, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 168, 132, 0); }
        }
      `}</style>
    </div>
  )
}
