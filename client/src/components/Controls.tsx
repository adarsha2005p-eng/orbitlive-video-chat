import React from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  SkipForward,
  PhoneOff,
  ShieldAlert,
  UserX,
  MessageSquare,
} from 'lucide-react';
import { CallState } from '../types';

interface ControlsProps {
  callState: CallState;
  isAudioMuted: boolean;
  isVideoDisabled: boolean;
  isChatOpen: boolean;
  unreadCount?: number;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onNext: () => void;
  onEndCall: () => void;
  onOpenReport: () => void;
  onBlock: () => void;
  onToggleChat: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  callState,
  isAudioMuted,
  isVideoDisabled,
  isChatOpen,
  unreadCount = 0,
  onToggleAudio,
  onToggleVideo,
  onNext,
  onEndCall,
  onOpenReport,
  onBlock,
  onToggleChat,
}) => {
  const isCallActive = callState === 'connected' || callState === 'connecting';
  const isSearching = callState === 'searching';

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 p-3 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/80 max-w-fit mx-auto">
      {/* 🎤 Mute / Unmute Mic */}
      <button
        onClick={onToggleAudio}
        className={`p-3.5 sm:p-4 rounded-xl transition-all duration-200 flex items-center justify-center ${
          isAudioMuted
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
            : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-white/5 hover:text-white'
        }`}
        title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
      >
        {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      {/* 📷 Enable / Disable Camera */}
      <button
        onClick={onToggleVideo}
        className={`p-3.5 sm:p-4 rounded-xl transition-all duration-200 flex items-center justify-center ${
          isVideoDisabled
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
            : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-white/5 hover:text-white'
        }`}
        title={isVideoDisabled ? 'Turn Camera On' : 'Turn Camera Off'}
      >
        {isVideoDisabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
      </button>

      <div className="w-px h-8 bg-white/10 mx-1" />

      {/* ⏭️ Next Button (Prominent Action) */}
      <button
        onClick={onNext}
        disabled={isSearching}
        className={`px-5 py-3.5 sm:px-6 sm:py-4 rounded-xl font-bold text-sm sm:text-base flex items-center gap-2 shadow-lg transition-all duration-200 ${
          isSearching
            ? 'bg-sky-600/50 text-sky-200 cursor-not-allowed'
            : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-sky-500/25 hover:scale-[1.03] active:scale-[0.98]'
        }`}
        title="Skip to next stranger"
      >
        <SkipForward className={`w-5 h-5 ${isSearching ? 'animate-spin' : ''}`} />
        <span>{isSearching ? 'Searching...' : 'Next'}</span>
      </button>

      {/* ❌ End Call */}
      <button
        onClick={onEndCall}
        className="p-3.5 sm:p-4 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white border border-white/5 transition-all duration-200 flex items-center justify-center"
        title="End Call and Stop"
      >
        <PhoneOff className="w-5 h-5" />
      </button>

      <div className="w-px h-8 bg-white/10 mx-1" />

      {/* 💬 Toggle Text Chat */}
      <button
        onClick={onToggleChat}
        className={`relative p-3.5 sm:p-4 rounded-xl transition-all duration-200 flex items-center justify-center ${
          isChatOpen
            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/5 hover:text-white'
        }`}
        title="Toggle In-Call Chat"
      >
        <MessageSquare className="w-5 h-5" />
        {unreadCount > 0 && !isChatOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {/* 🚫 Block */}
      <button
        onClick={onBlock}
        disabled={!isCallActive}
        className={`p-3.5 sm:p-4 rounded-xl border border-white/5 transition-all duration-200 flex items-center justify-center ${
          isCallActive
            ? 'bg-slate-800 text-slate-300 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30'
            : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
        }`}
        title="Block User (Won't be matched again)"
      >
        <UserX className="w-5 h-5" />
      </button>

      {/* ⚠️ Report */}
      <button
        onClick={onOpenReport}
        disabled={!isCallActive}
        className={`p-3.5 sm:p-4 rounded-xl border border-white/5 transition-all duration-200 flex items-center justify-center ${
          isCallActive
            ? 'bg-slate-800 text-slate-300 hover:bg-amber-500/20 hover:text-amber-400 hover:border-amber-500/30'
            : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
        }`}
        title="Report Inappropriate Behavior"
      >
        <ShieldAlert className="w-5 h-5" />
      </button>
    </div>
  );
};
