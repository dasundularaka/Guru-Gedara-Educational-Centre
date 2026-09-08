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
  CheckCheck,
  Loader2
} from 'lucide-react';
import { UserProfile, DirectMessage, ChatAttachment } from '../types';
import { firestoreService } from '../lib/firestoreService';
import { ChatAttachmentViewer } from './ChatAttachmentViewer';
import { ChatTypingIndicator } from './ChatTypingIndicator';
import { ChatReadReceipt } from './ChatReadReceipt';
import { ChatAttachmentInput } from './ChatAttachmentInput';

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
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

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

  // Subscribe to typing presence
  useEffect(() => {
    if (!isOpen || !currentUser?.uid || !tutor?.uid) {
      setIsRecipientTyping(false);
      return;
    }

    const unsubTyping = firestoreService.subscribeTypingPresence(
      currentUser.uid,
      tutor.uid,
      (typing, user) => {
        setIsRecipientTyping(typing);
        setTypingUserName(user || tutor.name || 'Instructor');
      }
    );

    return () => unsubTyping();
  }, [isOpen, currentUser?.uid, tutor?.uid, tutor?.name]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (isOpen && (messages.length > 0 || isRecipientTyping)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isRecipientTyping, isOpen]);

  if (!isOpen || !tutor) return null;

  const tutorName = tutor.name || tutor.displayName || tutor.username || 'Faculty Tutor';
  const subjects = tutor.tutorDetails?.subjects || tutor.preferredSubjects || ['Academic Tutoring'];
  const qualification = tutor.tutorDetails?.qualification || 'Academic Faculty Specialist';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (currentUser?.uid && tutor?.uid) {
      const myName = currentUser.name || currentUser.username || 'Student';
      firestoreService.setTypingPresence(currentUser.uid, tutor.uid, myName, true);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (currentUser?.uid && tutor?.uid) {
          firestoreService.setTypingPresence(currentUser.uid, tutor.uid, myName, false);
        }
      }, 2500);
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if ((!text && pendingAttachments.length === 0) || !currentUser || isSending) return;

    setIsSending(true);
    const attachmentsToSend = [...pendingAttachments];
    setPendingAttachments([]);

    // Clear typing state
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    firestoreService.setTypingPresence(currentUser.uid, tutor.uid, currentUser.name || 'Student', false).catch(() => {});

    try {
      const senderName = currentUser.name || currentUser.displayName || currentUser.username || 'Student';
      const newMsg = await firestoreService.sendDirectMessage(
        currentUser.uid,
        senderName,
        tutor.uid,
        text,
        attachmentsToSend
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
      id="modal_tutor_live_chat"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-[100dvh] sm:h-[620px] max-h-none sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              {tutor.photoURL ? (
                <img 
                  src={tutor.photoURL} 
                  alt={tutorName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-white/30"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/20 text-white font-black flex items-center justify-center text-sm ring-2 ring-white/30">
                  {tutorName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-indigo-700 rounded-full"></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold leading-tight">{tutorName}</h3>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-medium">
                  Verified Tutor
                </span>
              </div>
              <p className="text-[11px] text-indigo-100/90 truncate max-w-[240px] flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-300 inline" />
                {qualification}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Guard Check */}
        {!currentUser ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
              <MessageSquare className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 max-w-sm">
              <h4 className="text-base font-bold text-slate-800 dark:text-white">
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
                          className={`p-3 rounded-2xl text-xs leading-relaxed space-y-1 ${
                            isMe 
                              ? 'bg-indigo-600 text-white rounded-br-xs shadow-sm' 
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-xs shadow-xs'
                          }`}
                        >
                          {/* Attachments if any */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="space-y-1.5 my-1">
                              {msg.attachments.map((att, attIdx) => (
                                <ChatAttachmentViewer
                                  key={attIdx}
                                  attachment={att}
                                  isOwnMessage={isMe}
                                />
                              ))}
                            </div>
                          )}

                          {msg.message && <p className="whitespace-pre-wrap break-words">{msg.message}</p>}
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono mt-1 px-1 flex items-center gap-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <ChatReadReceipt
                          isRead={msg.read}
                          readAt={msg.readAt}
                          isOwnMessage={isMe}
                        />
                      </span>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              <AnimatePresence>
                {isRecipientTyping && (
                  <div className="flex justify-start">
                    <ChatTypingIndicator userName={typingUserName || tutorName} />
                  </div>
                )}
              </AnimatePresence>

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

            {/* Message Input Bar with Attachments */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }}
              className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-1.5 shrink-0"
            >
              <div className="flex items-center gap-1.5">
                <ChatAttachmentInput
                  currentUserId={currentUser.uid}
                  attachments={pendingAttachments}
                  onAttachmentsChange={setPendingAttachments}
                  disabled={isSending}
                />

                <input
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder={`Message Dr. ${tutorName}...`}
                  className="flex-1 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 border border-transparent font-sans"
                />

                <button
                  type="submit"
                  disabled={isSending || (!inputText.trim() && pendingAttachments.length === 0)}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-colors shrink-0 shadow-xs cursor-pointer flex items-center justify-center"
                  title="Send message"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
