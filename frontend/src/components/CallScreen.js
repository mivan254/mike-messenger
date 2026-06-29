import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../services/socket';
import { callsAPI } from '../services/api';
import { Avatar } from './Sidebar';
import './CallScreen.css';

const CallScreen = ({ call, currentUser, onEnd }) => {
  const [callStatus, setCallStatus] = useState('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const timerRef = useRef(null);

  const isVideo = call.type === 'video' || call.type === 'meeting';
  const isIncoming = call.callerId !== currentUser._id;

  const getOtherUser = () => {
    if (call.caller?._id === currentUser._id) {
      return call.recipients?.[0]?.user;
    }
    return call.caller;
  };

  const otherUser = getOtherUser();

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const setupWebRTC = useCallback(async () => {
    try {
      const constraints = {
        audio: true,
        video: isVideo ? { width: 1280, height: 720 } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      const socket = getSocket();

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('webrtc_ice_candidate', {
            candidate: event.candidate,
            roomId: call.roomId,
            targetUserId: otherUser?._id,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setCallStatus('connected');
          startTimer();
        }
      };

      peerConnectionRef.current = pc;

      if (!isIncoming) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket?.emit('webrtc_offer', {
          offer,
          roomId: call.roomId,
          targetUserId: otherUser?._id,
        });
      }

      if (socket) {
        socket.on('webrtc_offer', async ({ offer, fromUserId }) => {
          if (fromUserId === otherUser?._id) {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc_answer', {
              answer,
              roomId: call.roomId,
              targetUserId: fromUserId,
            });
          }
        });

        socket.on('webrtc_answer', async ({ answer }) => {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.on('webrtc_ice_candidate', async ({ candidate }) => {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error('ICE candidate error:', e);
          }
        });

        socket.on('call_ended', () => {
          handleEndCall();
        });
      }

      setCallStatus('ringing');
    } catch (error) {
      console.error('WebRTC setup error:', error);
      setCallStatus('failed');
    }
  }, [call, isVideo, isIncoming, otherUser, startTimer]);

  useEffect(() => {
    setupWebRTC();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    const socket = getSocket();
    socket?.off('webrtc_offer');
    socket?.off('webrtc_answer');
    socket?.off('webrtc_ice_candidate');
    socket?.off('call_ended');
  };

  const handleEndCall = async () => {
    cleanup();
    try {
      await callsAPI.endCall(call._id);
    } catch {}
    const socket = getSocket();
    socket?.emit('call_ended', { roomId: call.roomId });
    onEnd();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff((prev) => !prev);
    }
  };

  return (
    <div className="call-screen">
      {isVideo ? (
        <div className="video-container">
          <video ref={remoteVideoRef} className="remote-video" autoPlay playsInline />
          <video ref={localVideoRef} className="local-video" autoPlay playsInline muted />
        </div>
      ) : (
        <div className="audio-call-ui">
          <div className="call-avatar-large">
            <Avatar user={otherUser} size={120} />
          </div>
          <div className="call-wave">
            <span /><span /><span /><span /><span />
          </div>
        </div>
      )}

      <div className="call-info">
        <h2>{otherUser?.displayName || 'Unknown'}</h2>
        <p className={`call-status-text ${callStatus}`}>
          {callStatus === 'connected'
            ? formatDuration(callDuration)
            : callStatus === 'ringing'
            ? '🔔 Ringing...'
            : callStatus === 'connecting'
            ? '⏳ Connecting...'
            : '❌ Call failed'}
        </p>
      </div>

      <div className="call-controls">
        <button
          className={`call-btn ${isMuted ? 'active' : ''}`}
          onClick={toggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇' : '🎤'}
          <span>{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        {isVideo && (
          <button
            className={`call-btn ${isVideoOff ? 'active' : ''}`}
            onClick={toggleVideo}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? '📷' : '🎥'}
            <span>{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
          </button>
        )}

        <button className="call-btn end-call" onClick={handleEndCall} title="End call">
          📵
          <span>End</span>
        </button>

        <button
          className={`call-btn ${isSpeakerOn ? 'active' : ''}`}
          onClick={() => setIsSpeakerOn((prev) => !prev)}
          title="Speaker"
        >
          {isSpeakerOn ? '🔊' : '🔈'}
          <span>Speaker</span>
        </button>
      </div>
    </div>
  );
};

export default CallScreen;