import {
  Video,
  Globe2,
  ShieldCheck,
  Zap,
  ArrowRight,
  Lock,
} from 'lucide-react';

interface LandingPageProps {
  onStartChat: () => void;
  onlineCount: number;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartChat,
  onlineCount,
}) => {
  const displayOnline = Math.max(onlineCount, 1) + 240;

  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-20 right-10 w-[350px] h-[350px] bg-sky-400/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 relative z-10 flex-1 flex flex-col items-center justify-center text-center">
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-sky-500/20 shadow-lg shadow-sky-500/5 mb-8 animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
          </span>
          <span className="text-xs font-semibold text-sky-300">
            {displayOnline.toLocaleString()} People Live & Ready to Chat
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-xs text-slate-400">Zero Wait Time</span>
        </div>

        {/* Large Headline */}
        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white max-w-4xl leading-[1.08] mb-6">
          Meet Someone <br />
          <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-sky-200 bg-clip-text text-transparent">
            New.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl md:text-2xl text-slate-300/90 max-w-2xl font-normal leading-relaxed mb-10">
          Connect with people from around the world through instant video chat.
        </p>

        {/* Big Start Video Chat CTA Button */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <button
            onClick={onStartChat}
            className="group relative inline-flex items-center justify-center gap-3 px-9 py-5 rounded-2xl font-extrabold text-lg text-white bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-500 bg-[length:200%_auto] hover:bg-right transition-all duration-500 shadow-xl shadow-sky-500/30 hover:shadow-sky-500/50 hover:scale-[1.03] active:scale-[0.98]"
          >
            <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <span>Start Video Chat</span>
            <ArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* World Visual & Interactive Connecting Arcs Graphic */}
        <div className="w-full max-w-4xl relative py-8">
          <div className="relative mx-auto rounded-3xl p-1 bg-gradient-to-b from-white/10 to-transparent">
            <div className="rounded-[22px] bg-slate-900/80 backdrop-blur-xl border border-white/5 p-6 sm:p-10 overflow-hidden relative">
              {/* World Visual Illustration */}
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Visual Avatar Left */}
                <div className="flex items-center gap-4 bg-slate-800/80 border border-white/10 p-3.5 rounded-2xl shadow-lg">
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=user_berlin`}
                    alt="User"
                    className="w-12 h-12 rounded-xl bg-slate-700"
                  />
                  <div className="text-left">
                    <p className="text-xs font-bold text-white">Elena, 24</p>
                    <p className="text-[11px] text-slate-400">Berlin, Germany 🇩🇪</p>
                  </div>
                </div>

                {/* Connecting WebRTC Wave */}
                <div className="flex-1 flex flex-col items-center justify-center px-4">
                  <div className="w-full flex items-center justify-center gap-2">
                    <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent relative">
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
                    </div>
                    <div className="px-3 py-1 rounded-full bg-sky-500/20 border border-sky-500/40 text-[11px] font-bold text-sky-300 uppercase tracking-widest flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-sky-400" />
                      <span>WebRTC P2P</span>
                    </div>
                    <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-2 font-medium">
                    Direct encrypted audio & video pipeline
                  </span>
                </div>

                {/* Visual Avatar Right */}
                <div className="flex items-center gap-4 bg-slate-800/80 border border-white/10 p-3.5 rounded-2xl shadow-lg">
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=user_tokyo`}
                    alt="User"
                    className="w-12 h-12 rounded-xl bg-slate-700"
                  />
                  <div className="text-left">
                    <p className="text-xs font-bold text-white">Kenji, 27</p>
                    <p className="text-[11px] text-slate-400">Tokyo, Japan 🇯🇵</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mt-12 text-left">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-sky-500/30 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-4">
              <Globe2 className="w-5 h-5 text-sky-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Worldwide Matching</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instantly connect with people across 190+ countries with one click. Discover new languages and cultures.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-sky-500/30 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
              <Lock className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">P2P Encrypted Video</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real WebRTC streams travel directly between browsers. Video and audio never pass through server storage.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-sky-500/30 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Safe & Moderated</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instant skip, one-click blocking, and automated report queues ensure you remain in complete control.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-6 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© 2026 OrbitLive Inc. All rights reserved. Peer-to-peer real-time video chat.</p>
          <div className="flex items-center gap-6">
            <span>Community Guidelines</span>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
