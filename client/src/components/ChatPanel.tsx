import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Sparkles } from 'lucide-react';
import { ChatMessage, User } from '../types';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentUser: User | null;
  strangerName?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  currentUser,
  strangerName = 'Stranger',
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-80 md:w-96 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between bg-slate-800/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-sky-400" />
          <h3 className="font-semibold text-sm text-slate-100">In-Call Chat</h3>
          <span className="text-[11px] text-slate-400">with {strangerName}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages View */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 px-6">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-sky-400" />
            </div>
            <p className="text-sm font-medium text-slate-200">Say hello!</p>
            <p className="text-xs text-slate-500 mt-1">
              Messages are instant, ephemeral, and cleared when call ends.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.id;
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-semibold text-slate-400">
                    {isMe ? 'You' : msg.senderName}
                  </span>
                  <span className="text-[9px] text-slate-500">{timeStr}</span>
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words shadow-sm ${
                    isMe
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-800 text-slate-200 border border-white/5 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 bg-slate-800/40">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            maxLength={300}
            className="w-full bg-slate-950/70 border border-white/10 rounded-xl pl-3.5 pr-11 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="absolute right-1.5 p-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-30 disabled:hover:bg-sky-500 text-white transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
