import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { PeerInfo } from '../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  peer: PeerInfo | null;
  onSubmitReport: (reason: string, details?: string) => Promise<void>;
}

const REPORT_REASONS = [
  'Inappropriate or explicit video feed',
  'Harassment or abusive speech',
  'Hate speech or discrimination',
  'Spam, advertising, or bot behavior',
  'Violence or dangerous content',
  'Other violation',
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  peer,
  onSubmitReport,
}) => {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) return;
    try {
      setIsSubmitting(true);
      await onSubmitReport(selectedReason, details);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setDetails('');
        onClose();
      }, 1400);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-8 text-center flex flex-col items-center">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mb-3 animate-bounce" />
            <h3 className="text-lg font-bold text-white">Report Submitted</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Thank you for keeping OrbitLive safe. Our moderation team has logged this session.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">Report User</h3>
                <p className="text-xs text-slate-400">
                  Reporting <strong className="text-slate-200">{peer?.displayName || 'Stranger'}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Select Reason
                </label>
                <div className="space-y-2">
                  {REPORT_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                        selectedReason === reason
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                          : 'bg-slate-800/40 border-white/5 text-slate-300 hover:bg-slate-800/80'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={() => setSelectedReason(reason)}
                        className="text-amber-500 focus:ring-0"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Describe what occurred..."
                  rows={3}
                  maxLength={500}
                  className="w-full bg-slate-800/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
