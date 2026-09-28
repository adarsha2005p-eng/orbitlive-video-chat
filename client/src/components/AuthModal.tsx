import React, { useState } from 'react';
import { X, Lock, User, Sparkles, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (username: string, password: string) => Promise<any>;
  onRegister: (username: string, password: string, displayName?: string, country?: string) => Promise<any>;
  onGuest: () => Promise<any>;
  error?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onRegister,
  onGuest,
  error,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [country, setCountry] = useState('Worldwide');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsLoading(true);

    try {
      if (tab === 'login') {
        await onLogin(username, password);
      } else {
        await onRegister(username, password, displayName || username, country);
      }
      onClose();
    } catch (err: any) {
      setLocalError(err.message || 'Operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = async () => {
    setIsLoading(true);
    setLocalError(null);
    try {
      await onGuest();
      onClose();
    } catch (err: any) {
      setLocalError(err.message || 'Guest login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab switch */}
        <div className="flex p-1 bg-slate-800/80 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setLocalError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              tab === 'login'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setLocalError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              tab === 'register'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error notification */}
        {(localError || error) && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{localError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>Username</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. wanderer42"
              className="w-full bg-slate-800/70 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {tab === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Chris P."
                  className="w-full bg-slate-800/70 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Country
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. United States"
                  className="w-full bg-slate-800/70 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Password</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              className="w-full bg-slate-800/70 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/25 transition-all"
            >
              {isLoading ? 'Processing...' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Or quick start
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Quick Guest Access */}
        <button
          type="button"
          onClick={handleGuest}
          disabled={isLoading}
          className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700/80 border border-white/10 text-slate-200 hover:text-white transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span>Continue Instantly as Guest</span>
        </button>
      </div>
    </div>
  );
};
