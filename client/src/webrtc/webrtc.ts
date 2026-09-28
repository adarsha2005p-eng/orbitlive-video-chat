import { IceServerConfig } from '../types';

export interface WebRTCEvents {
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onIceCandidate: (candidate: RTCIceCandidate) => void;
  onError: (err: Error) => void;
}

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private queuedIceCandidates: RTCIceCandidateInit[] = [];
  private isRemoteDescriptionSet = false;
  private events: WebRTCEvents;

  constructor(events: WebRTCEvents) {
    this.events = events;
  }

  /**
   * Initializes local user media (camera and microphone)
   */
  async initLocalStream(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    if (this.localStream) {
      return this.localStream;
    }

    const defaultConstraints: MediaStreamConstraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    };

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(
        constraints || defaultConstraints
      );
      return this.localStream;
    } catch (err: any) {
      console.error('[WebRTC] Error acquiring media stream:', err);
      let friendlyError = new Error('Could not access camera or microphone.');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        friendlyError = new Error('Your camera and microphone permissions are required for video chat.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        friendlyError = new Error('No camera or microphone found on your device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        friendlyError = new Error('Camera or microphone is already in use by another application.');
      }
      this.events.onError(friendlyError);
      throw friendlyError;
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Creates a new RTCPeerConnection with STUN/TURN configuration
   */
  createPeerConnection(iceServers: IceServerConfig[]): RTCPeerConnection {
    this.closePeerConnection();

    const config: RTCConfiguration = {
      iceServers: iceServers.length > 0 ? iceServers : [{ urls: 'stun:stun.l.google.com:19302' }],
      iceCandidatePoolSize: 10,
    };

    this.pc = new RTCPeerConnection(config);
    this.isRemoteDescriptionSet = false;
    this.queuedIceCandidates = [];

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.pc && this.localStream) {
          this.pc.addTrack(track, this.localStream);
        }
      });
    }

    // Handle incoming remote media tracks
    this.pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.events.onRemoteStream(event.streams[0]);
      } else {
        // Fallback for browsers that don't package track into stream
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
          this.events.onRemoteStream(this.remoteStream);
        }
        this.remoteStream.addTrack(event.track);
      }
    };

    // Relay local ICE candidates to peer through signaling
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.events.onIceCandidate(event.candidate);
      }
    };

    // Track connection state
    this.pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      console.log('[WebRTC] Connection state changed:', this.pc.connectionState);
      this.events.onConnectionStateChange(this.pc.connectionState);
    };

    this.pc.oniceconnectionstatechange = () => {
      if (!this.pc) return;
      console.log('[WebRTC] ICE Connection state:', this.pc.iceConnectionState);
      if (this.pc.iceConnectionState === 'failed') {
        this.pc.restartIce();
      }
    };

    return this.pc;
  }

  /**
   * Initiator creates an SDP offer
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }

    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await this.pc.setLocalDescription(offer);
    return offer;
  }

  /**
   * Receiver sets remote offer and creates an SDP answer
   */
  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }

    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    this.isRemoteDescriptionSet = true;
    await this.processQueuedCandidates();

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  /**
   * Initiator receives and sets the remote answer
   */
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }

    if (this.pc.signalingState !== 'have-local-offer') {
      console.warn('[WebRTC] Ignoring answer in invalid signaling state:', this.pc.signalingState);
      return;
    }

    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    this.isRemoteDescriptionSet = true;
    await this.processQueuedCandidates();
  }

  /**
   * Add ICE candidate or queue it if remote description isn't set yet
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) return;

    if (!this.isRemoteDescriptionSet) {
      this.queuedIceCandidates.push(candidate);
      return;
    }

    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('[WebRTC] Failed to add ICE candidate:', err);
    }
  }

  private async processQueuedCandidates(): Promise<void> {
    if (!this.pc || !this.isRemoteDescriptionSet) return;

    while (this.queuedIceCandidates.length > 0) {
      const candidate = this.queuedIceCandidates.shift();
      if (candidate) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WebRTC] Error adding queued ICE candidate:', err);
        }
      }
    }
  }

  /**
   * Toggle microphone audio
   */
  toggleAudio(enabled?: boolean): boolean {
    if (!this.localStream) return false;
    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) return false;

    const newState = enabled !== undefined ? enabled : !audioTracks[0].enabled;
    audioTracks.forEach((t) => (t.enabled = newState));
    return newState;
  }

  /**
   * Toggle camera video
   */
  toggleVideo(enabled?: boolean): boolean {
    if (!this.localStream) return false;
    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length === 0) return false;

    const newState = enabled !== undefined ? enabled : !videoTracks[0].enabled;
    videoTracks.forEach((t) => (t.enabled = newState));
    return newState;
  }

  /**
   * Closes active peer connection while keeping local stream alive
   */
  closePeerConnection(): void {
    if (this.pc) {
      this.pc.ontrack = null;
      this.pc.onicecandidate = null;
      this.pc.onconnectionstatechange = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.close();
      this.pc = null;
    }
    this.remoteStream = null;
    this.isRemoteDescriptionSet = false;
    this.queuedIceCandidates = [];
  }

  /**
   * Stops local camera and microphone
   */
  stopLocalStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  }

  /**
   * Full cleanup
   */
  destroy(): void {
    this.closePeerConnection();
    this.stopLocalStream();
  }
}
