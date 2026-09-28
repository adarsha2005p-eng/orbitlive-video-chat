import React, { useState, useEffect } from 'react';
import {
  Globe,
  Loader2,
  AlertTriangle,
  UserX,
  VolumeX,
  CameraOff,
  Sparkles,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import { Controls } from '../components/Controls';
import { ChatPanel } from '../components/ChatPanel';
import { ReportModal } from '../components/ReportModal';
import { CallState, PeerInfo, ChatMessage, User } from '../types';

interface VideoChatPageProps {
  user: User | null;
  callState: CallState;
  statusMessage: string;
  peer: PeerInfo | null;
  isAudioMuted: boolean;
  isVideoDisabled: boolean;
  chatMessages: ChatMessage[];
  errorMessage: string | null;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  onStartSearching: () => void;
  onNext: () => void;
  onEndCall: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onSendMessage: (text: string) => void;
  onBlock: () => void;
  onReport: (reason: string, details?: string) => Promise<void>;
  onNavigateHome: () => void;
}

export const VideoChatPage: React.FC<VideoChatPageProps> = ({
  user,
  callState,
  statusMessage,
  peer,
  isAudioMuted,
  isVideoDisabled,
  chatMessages,
  errorMessage,
  localVideoRef,
  remoteVideoRef,
  onStartSearching,
  onNext,
  onEndCall,
  onToggleAudio,
  onToggleVideo,
  onSendMessage,
  onBlock,
  onReport,
  onNavigateHome,
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [pipPosition, setPipPosition] = useState<'bottom-right' | 'top-right'>('bottom-right');

  // Auto-start searching when landing on this page if idle
  useEffect(() => {
    if (callState === 'idle') {
      onStartSearching();
    }
  }, [callState, onStartSearching]);

  const isConnected = callState === 'connected';
  const isSearching = callState === 'searching';
  const isConnecting = callState === 'connecting';
  const isStrangerDisconnected = callState === 'stranger_disconnected';

  const unreadMessagesCount = isChatOpen ? 0 : chatMessages.filter(m => m.senderId !== user?.id).length;

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col bg-[#080b13] overflow-hidden">
      {/* Top Banner Alert for errors or disconnection */}
      {(errorMessage || isStrangerDisconnected) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 max-w-lg w-full px-4 animate-slide-down">
          <div
            className={`flex items-center justify-between p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border ${
              isStrangerDisconnected
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isStrangerDisconnected ? (
                <UserX className="w-5 h-5 text-amber-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              )}
              <span className="text-xs sm:text-sm font-medium">
                {errorMessage || statusMessage}
              </span>
            </div>
            {isStrangerDisconnected && (
              <button
                onClick={onNext}
                className="ml-3 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs transition-colors shrink-0 shadow"
              >
                Find Next
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Video Area */}
      <div className="relative flex-1 w-full max-w-7xl mx-auto p-2 sm:p-4 md:p-6 flex flex-col items-center justify-center">
        {/* Main Frame (Stranger / Primary Video Screen) */}
        <div className="relative w-full h-full max-h-[82vh] rounded-3xl bg-slate-900/90 border border-white/10 shadow-2xl overflow-hidden flex items-center justify-center group">
          {/* Remote Video Element */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-500 ${
              isConnected ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
            }`}
          />

          {/* Fallback Overlay when not connected (Searching / Connecting / Disconnected) */}
          {!isConnected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-radial-gradient">
              {/* Radar pulse circles */}
              <div className="relative flex items-center justify-center mb-8">
                <div className="absolute w-44 h-44 rounded-full border border-sky-500/20 animate-ping opacity-30" />
                <div className="absolute w-32 h-32 rounded-full border border-sky-500/30 animate-pulse" />
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-sky-500/20 to-indigo-600/30 border border-sky-500/40 backdrop-blur-md flex items-center justify-center shadow-lg shadow-sky-500/20">
                  {isSearching ? (
                    <Globe className="w-10 h-10 text-sky-400 animate-spin" style={{ animationDuration: '6s' }} />
                  ) : isConnecting ? (
                    <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
                  ) : isStrangerDisconnected ? (
                    <UserX className="w-10 h-10 text-amber-400" />
                  ) : (
                    <Sparkles className="w-10 h-10 text-sky-400" />
                  )}
                </div>
              </div>

              {/* Status Headline */}
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
                {isSearching
                  ? 'Finding someone...'
                  : isConnecting
                  ? 'Establishing connection...'
                  : isStrangerDisconnected
                  ? 'Stranger Disconnected'
                  : 'Ready to Chat'}
              </h2>

              <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-8">
                {isSearching
                  ? 'Searching active worldwide queue. You will be connected in real-time.'
                  : isConnecting
                  ? 'Exchanging WebRTC handshake directly between browsers...'
                  : isStrangerDisconnected
                  ? 'Your stranger skipped or left the session. Click below to find someone new!'
                  : 'Click below to find your next connection.'}
              </p>

              {/* Action Button */}
              {isStrangerDisconnected || callState === 'idle' || callState === 'ended' ? (
                <button
                  onClick={onNext}
                  className="px-8 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-xl shadow-sky-500/30 transition-all hover:scale-105 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Search for Someone</span>
                </button>
              ) : null}
            </div>
          )}

          {/* Top-Left controls: Exit to Home & Peer Info */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            <button
              onClick={onNavigateHome}
              className="p-2.5 rounded-2xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white transition-colors"
              title="Exit to Home"
            >
              <span className="text-xs font-semibold px-1">Exit</span>
            </button>

            {isConnected && peer && (
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 shadow-lg">
                <img
                  src={peer.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer.username}`}
                  alt="Stranger Avatar"
                  className="w-8 h-8 rounded-xl bg-slate-800 object-cover"
                />
                <div className="text-left">
                  <p className="text-xs font-bold text-white leading-tight">
                    {peer.displayName || peer.username}
                  </p>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                    <Globe className="w-3 h-3 text-sky-400" />
                    <span>{peer.country || 'Worldwide'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Floating Self Video (Picture-in-Picture window) */}
          <div
            className={`absolute z-20 w-32 sm:w-44 md:w-56 aspect-[4/3] rounded-2xl bg-slate-950/80 border-2 border-white/20 shadow-2xl overflow-hidden transition-all duration-300 ${
              pipPosition === 'bottom-right'
                ? 'bottom-20 right-4 sm:bottom-24 sm:right-6'
                : 'top-4 right-4'
            }`}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover mirror-video ${
                isVideoDisabled ? 'hidden' : 'block'
              }`}
            />

            {/* Placeholder when camera is toggled off */}
            {isVideoDisabled && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500">
                <CameraOff className="w-6 h-6 mb-1 text-slate-400" />
                <span className="text-[10px] font-semibold">Camera Off</span>
              </div>
            )}

            {/* Self Overlay indicators */}
            <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[10px] font-semibold text-white drop-shadow">
              <span className="bg-black/60 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                You
              </span>
              <div className="flex items-center gap-1">
                {isAudioMuted && (
                  <span className="p-1 rounded bg-rose-500/80 text-white">
                    <VolumeX className="w-2.5 h-2.5" />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setPipPosition((pos) =>
                      pos === 'bottom-right' ? 'top-right' : 'bottom-right'
                    )
                  }
                  className="p-1 rounded bg-black/60 hover:bg-black/90 text-white/80"
                  title="Move preview"
                >
                  <Maximize2 className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Bottom Controls Bar */}
        <div className="w-full pt-3 pb-2 z-20">
          <Controls
            callState={callState}
            isAudioMuted={isAudioMuted}
            isVideoDisabled={isVideoDisabled}
            isChatOpen={isChatOpen}
            unreadCount={unreadMessagesCount}
            onToggleAudio={onToggleAudio}
            onToggleVideo={onToggleVideo}
            onNext={onNext}
            onEndCall={onEndCall}
            onOpenReport={() => setIsReportOpen(true)}
            onBlock={onBlock}
            onToggleChat={() => setIsChatOpen((prev) => !prev)}
          />
        </div>
      </div>

      {/* In-Call Text Chat Panel */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        onSendMessage={onSendMessage}
        currentUser={user}
        strangerName={peer?.displayName || 'Stranger'}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        peer={peer}
        onSubmitReport={onReport}
      />
    </div>
  );
};
