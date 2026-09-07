import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Send, 
  User, 
  Award, 
  MessageSquare, 
  LogIn, 
  Sparkles, 
  Clock, 
  ShieldCheck,
  CheckCheck
} from 'lucide-react';
import { UserProfile, DirectMessage } from '../types';
import { firestoreService } from '../lib/firestoreService';

interface LiveChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  tutor: UserProfile;
  currentUser: UserProfile | null;
  onRedirectToLogin?: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const QUICK_PROMPTS = [
  "👋 Hello! Are you currently taking new students?",
  "📅 What is your upcoming class schedule?",
  "📖 Where can I find syllabus & study materials?",
  "💡 Can I get help preparing for exams?"
];

export const LiveChatModal: React.FC<LiveChatModalProps> = ({
  isOpen,
  onClose,
  tutor,
  currentUser,
  onRedirectToLogin,
  showToast
}) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Subscribe to live real-time messages between currentUser and tutor
  useEffect(() => {
    if (!isOpen || !currentUser || !tutor) return;

    const unsubscribe = firestoreService.subscribeDirectMessages(
      currentUser.uid,
      tutor.uid,
      (logs) => {
        setMessages(logs);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isOpen, currentUser?.uid, tutor?.uid]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen || !tutor) return null;

  const tutorName = tutor.name || tutor.displayName || tutor.username || 'Faculty Tutor';
  const subjects = tutor.tutorDetails?.subjects || tutor.preferredSubjects || ['Academic Tutoring'];
  const qualification = tutor.tutorDetails?.qualification || 'Academic Faculty Specialist';

  const handleSendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || !currentUser) return;

    setIsSending(true);
    try {
      const senderName = currentUser.name || currentUser.displayName || currentUser.username || 'Student';
      const newMsg = await firestoreService.sendDirectMessage(
        currentUser.uid,
        senderName,
        tutor.uid,
        text
      );
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setInputText('');
    } catch (err: any) {
      showToast(err.message || 'Failed to deliver message. Please retry.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-sans"
      id={`live_chat_modal_${tutor.uid}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[92vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-950/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              {tutor.photoURL ? (
                <img 
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-2xl object-cover ring-2 ring-indigo-400/40 shrink-0" 
                  src={tutor.photoURL} 
                  alt={tutorName} 
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm ring-2 ring-indigo-400/40 shrink-0">
                  {tutorName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse"></span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-white truncate">{tutorName}</h3>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Award className="w-2.5 h-2.5" /> Faculty
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                {subjects.slice(0, 2).join(', ')} • {qualification}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-2"
            title="Close chat window"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Gate: If user is not logged in */}
        {!currentUser ? (
          <div className="flex-1 p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4 overflow-y-auto">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
              <MessageSquare className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 max-w-sm">
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                Direct Faculty Messaging
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Connect directly with <strong className="text-slate-700 dark:text-slate-200">{tutorName}</strong> to ask questions regarding curriculum, classes, and personalized tutoring.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-left w-full max-w-sm space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Verified academic communication</span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-400 pl-6">
                Direct messages are saved to your student dashboard for easy reference.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-sm pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onRedirectToLogin) onRedirectToLogin();
                }}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Log In or Register to Chat</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto py-3 px-4 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Live Chat Conversation View */
          <>
            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50/70 dark:bg-slate-950/40">
              {/* Banner intro */}
              <div className="bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-center shadow-xs">
                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Direct Channel with {tutorName}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-500" /> Responses typically arrive within 2-4 hours
                </p>
              </div>

              {messages.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      No previous chat history with this instructor.
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Send a friendly introduction or click one of the quick suggestions below.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentUser.uid;
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-end gap-1.5 max-w-[85%]">
                        {!isMe && (
                          <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mb-1">
                            {tutorName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div 
                          className={`p-3 rounded-2xl text-xs leading-relaxed ${
                            isMe 
                              ? 'bg-indigo-600 text-white rounded-br-xs shadow-sm' 
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-xs shadow-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono mt-1 px-1 flex items-center gap-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isMe && <CheckCheck className="w-3 h-3 text-indigo-500" />}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            <div className="px-4 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 overflow-x-auto flex gap-1.5 no-scrollbar shrink-0">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-indigo-300 whitespace-nowrap transition-colors border border-slate-200/60 dark:border-slate-700 shrink-0 cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Message Input Bar */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }}
              className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Message Dr. ${tutorName}...`}
                className="flex-1 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 border border-transparent font-sans"
              />
              <button
                type="submit"
                disabled={isSending || !inputText.trim()}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-colors shrink-0 shadow-xs cursor-pointer flex items-center justify-center"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
