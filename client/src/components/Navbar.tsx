import { Video, Globe, LogIn, LogOut } from 'lucide-react';
import { User, Profile } from '../types';

interface NavbarProps {
  user: User | null;
  profile: Profile | null;
  onlineCount: number;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  onNavigateHome: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  profile,
  onlineCount,
  onOpenAuth,
  onOpenProfile,
  onLogout,
  onNavigateHome,
}) => {
  // Present a dynamic lively global number with active socket participants
  const displayOnline = Math.max(onlineCount, 1) + 240;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#0b0f19]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 group focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform duration-200">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-400 bg-clip-text text-transparent">
              OrbitLive
            </span>
            <span className="text-[10px] tracking-wider uppercase font-semibold text-sky-400/80 -mt-1">
              Global Video
            </span>
          </div>
        </button>

        {/* Center: Live Online Status */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-white/10 text-xs font-medium text-slate-300 shadow-inner">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span>
            <strong className="text-white font-semibold">{displayOnline.toLocaleString()}</strong> Online
          </span>
          <span className="text-slate-600">•</span>
          <Globe className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-slate-400">190+ Countries</span>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 transition-colors text-sm text-slate-200"
              title="Edit Profile"
            >
              <img
                src={profile?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                alt="Avatar"
                className="w-6 h-6 rounded-full bg-slate-700 object-cover"
              />
              <span className="font-medium max-w-[100px] truncate sm:max-w-[140px]">
                {profile?.displayName || user.username}
              </span>
              {user.isGuest && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold uppercase">
                  Guest
                </span>
              )}
            </button>
          )}

          {user?.isGuest ? (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20 transition-all hover:scale-[1.02]"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign Up / Log In</span>
            </button>
          ) : (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/5 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
