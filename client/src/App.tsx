import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { LandingPage } from './pages/LandingPage';
import { VideoChatPage } from './pages/VideoChatPage';
import { useAuth } from './hooks/useAuth';
import { useWebRTC } from './hooks/useWebRTC';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'landing' | 'chat'>('landing');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const {
    user,
    profile,
    authError,
    login,
    register,
    continueAsGuest,
    updateUserProfile,
    logout,
  } = useAuth();

  const {
    callState,
    statusMessage,
    peer,
    isAudioMuted,
    isVideoDisabled,
    chatMessages,
    onlineCount,
    errorMessage,
    localVideoRef,
    remoteVideoRef,
    startMedia,
    startSearching,
    nextMatch,
    endCall,
    toggleAudio,
    toggleVideo,
    sendChatMessage,
    blockStranger,
    reportStranger,
  } = useWebRTC(user, profile);

  const handleStartChat = async () => {
    // If user has not granted camera yet, prompt media
    await startMedia();
    setCurrentPage('chat');
    startSearching();
  };

  const handleEndCallAndExit = () => {
    endCall();
    setCurrentPage('landing');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] selection:bg-sky-500 selection:text-white">
      {/* Universal Top Navigation */}
      <Navbar
        user={user}
        profile={profile}
        onlineCount={onlineCount}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLogout={logout}
        onNavigateHome={() => setCurrentPage('landing')}
      />

      {/* Pages Switch */}
      {currentPage === 'landing' ? (
        <LandingPage
          onStartChat={handleStartChat}
          onlineCount={onlineCount}
        />
      ) : (
        <VideoChatPage
          user={user}
          callState={callState}
          statusMessage={statusMessage}
          peer={peer}
          isAudioMuted={isAudioMuted}
          isVideoDisabled={isVideoDisabled}
          chatMessages={chatMessages}
          errorMessage={errorMessage}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          onStartSearching={startSearching}
          onNext={nextMatch}
          onEndCall={handleEndCallAndExit}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onSendMessage={sendChatMessage}
          onBlock={blockStranger}
          onReport={reportStranger}
          onNavigateHome={() => setCurrentPage('landing')}
        />
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={login}
        onRegister={register}
        onGuest={continueAsGuest}
        error={authError}
      />

      {/* Profile Settings Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        username={user?.username || 'Guest'}
        onSave={updateUserProfile}
      />
    </div>
  );
};

export default App;
