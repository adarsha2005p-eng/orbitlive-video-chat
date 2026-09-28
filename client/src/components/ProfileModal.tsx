import React, { useState, useEffect } from 'react';
import { X, Globe, MessageCircle, Heart, User, Check, RefreshCw } from 'lucide-react';
import { Profile } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  username: string;
  onSave: (updated: Partial<Profile>) => Promise<any>;
}

const COMMON_INTERESTS = [
  'Tech',
  'Gaming',
  'Music',
  'Travel',
  'Anime',
  'Fitness',
  'Art',
  'Movies',
  'Coding',
  'Language Practice',
];

const COUNTRIES = [
  'Worldwide',
  'United States',
  'United Kingdom',
  'Canada',
  'Germany',
  'France',
  'Japan',
  'South Korea',
  'Brazil',
  'India',
  'Australia',
  'Spain',
  'Italy',
  'Mexico',
  'Other',
];

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Korean',
  'Mandarin',
  'Portuguese',
  'Hindi',
  'Russian',
  'Arabic',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  username,
  onSave,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [country, setCountry] = useState('Worldwide');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarSeed, setAvatarSeed] = useState(username);
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || username);
      setCountry(profile.country || 'Worldwide');
      setPreferredLanguage(profile.preferredLanguage || 'English');
      setInterests(profile.interests || ['Tech', 'Gaming']);
      setBio(profile.bio || '');
      setAvatarSeed(username);
    }
  }, [profile, username, isOpen]);

  if (!isOpen) return null;

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter((i) => i !== interest));
    } else {
      if (interests.length < 5) {
        setInterests([...interests, interest]);
      }
    }
  };

  const handleRandomizeAvatar = () => {
    setAvatarSeed(Math.random().toString(36).substring(7));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await onSave({
        displayName: displayName.trim() || username,
        country,
        preferredLanguage,
        interests,
        bio,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`,
      });
      setSuccessNotice(true);
      setTimeout(() => {
        setSuccessNotice(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const currentAvatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-sky-400" />
          <span>Edit Profile</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar Preview & Randomizer */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/40 border border-white/5">
            <img
              src={currentAvatarUrl}
              alt="Avatar"
              className="w-16 h-16 rounded-2xl bg-slate-800 border border-sky-500/30 p-1"
            />
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-300">Avatar Style</p>
              <p className="text-[11px] text-slate-500">Pick a fun animated avatar</p>
              <button
                type="button"
                onClick={handleRandomizeAvatar}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-sky-400 border border-white/5 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Randomize Avatar</span>
              </button>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={25}
              placeholder="e.g. Alex"
              className="w-full bg-slate-800/70 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Country & Language Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>Country</span>
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-slate-800/70 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c} className="bg-slate-900">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-indigo-400" />
                <span>Preferred Language</span>
              </label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className="w-full bg-slate-800/70 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l} className="bg-slate-900">
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Interests Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>Interests (up to 5)</span>
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {COMMON_INTERESTS.map((item) => {
                const isSelected = interests.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleInterest(item)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                        : 'bg-slate-800/60 border-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2"
            >
              {successNotice ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Profile Saved!</span>
                </>
              ) : isSaving ? (
                <span>Saving...</span>
              ) : (
                <span>Save Profile</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
