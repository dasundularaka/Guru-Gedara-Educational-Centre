import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Send, 
  User, 
  Search, 
  MessageSquare, 
  ShieldCheck, 
  GraduationCap, 
  Award, 
  CheckCheck, 
  Clock, 
  Sparkles, 
  Mail, 
  Phone, 
  ArrowLeft, 
  Check, 
  Loader2,
  RefreshCw,
  Users
} from 'lucide-react';
import { UserProfile, DirectMessage, ChatAttachment } from '../types';
import { firestoreService } from '../lib/firestoreService';
import { ChatAttachmentViewer } from './ChatAttachmentViewer';
import { ChatTypingIndicator } from './ChatTypingIndicator';
import { ChatReadReceipt } from './ChatReadReceipt';
import { ChatAttachmentInput } from './ChatAttachmentInput';

interface AdminDirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  initialSelectedUser?: UserProfile | null;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onViewUserProfile?: (user: UserProfile) => void;
}

const ADMIN_QUICK_TEMPLATES = [
  { label: "👋 Welcome & Introduction", text: "Hello! This is the Guru Gedara Academy Administration reaching out. Please let us know if you need any assistance." },
  { label: "📋 Enrollment & Course Status", text: "Important update regarding your class enrollment status. Please check your student portal for full details." },
  { label: "💳 Tuition & Ledger Receipt", text: "Notice regarding your monthly class tuition fee and payment ledger. Your payment record is available in the portal." },
  { label: "📅 Timetable & Schedule", text: "Please review your upcoming weekly class schedule and lecture times on your dashboard." },
  { label: "⚠️ Urgent Academy Notice", text: "Urgent administrative notice: Please contact the academy administrative desk at your earliest convenience." }
];

export const AdminDirectMessageModal: React.FC<AdminDirectMessageModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers = [],
  initialSelectedUser = null,
  showToast,
  onViewUserProfile
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | 'student' | 'tutor' | 'admin'>('all');
  const [activeUser, setActiveUser] = useState<UserProfile | null>(initialSelectedUser);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState('');
  const [showMobileList, setShowMobileList] = useState(!initialSelectedUser);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Sync initialSelectedUser when prop changes
  useEffect(() => {
    if (initialSelectedUser) {
      setActiveUser(initialSelectedUser);
      setShowMobileList(false);
    }
  }, [initialSelectedUser]);

  // Reset attachments and typing state when switching users
  useEffect(() => {
    setPendingAttachments([]);
    setIsRecipientTyping(false);
    setTypingUserName('');
  }, [activeUser?.uid]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Real-time subscription to direct messages between admin and activeUser
  useEffect(() => {
    if (!isOpen || !currentUser?.uid || !activeUser?.uid) {
      setMessages([]);
      return;
    }

    const unsubscribe = firestoreService.subscribeDirectMessages(
      currentUser.uid,
      activeUser.uid,
      (logs) => {
        setMessages(logs);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isOpen, currentUser?.uid, activeUser?.uid]);

  // Real-time subscription to typing presence
  useEffect(() => {
    if (!isOpen || !currentUser?.uid || !activeUser?.uid) {
      setIsRecipientTyping(false);
      return;
    }

    const unsubTyping = firestoreService.subscribeTypingPresence(
      currentUser.uid,
      activeUser.uid,
      (typing, user) => {
        setIsRecipientTyping(typing);
        setTypingUserName(user || activeUser.name || 'Participant');
      }
    );

    return () => {
      unsubTyping();
    };
  }, [isOpen, currentUser?.uid, activeUser?.uid, activeUser?.name]);

  // Auto-scroll messages
  useEffect(() => {
    if (messages.length > 0 || isRecipientTyping) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isRecipientTyping]);

  // Focus input when active user changes
  useEffect(() => {
    if (activeUser && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeUser]);

  // Filter users by role and search query (name, username, email)
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (allUsers || [])
      .filter(u => u && u.uid !== currentUser.uid)
      .filter(u => {
        if (selectedRole !== 'all' && u.role !== selectedRole) return false;
        if (!q) return true;
        const nameMatch = (u.name || '').toLowerCase().includes(q);
        const usernameMatch = (u.username || '').toLowerCase().includes(q);
        const emailMatch = (u.email || '').toLowerCase().includes(q);
        const phoneMatch = (u.phone || '').toLowerCase().includes(q);
        return nameMatch || usernameMatch || emailMatch || phoneMatch;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [allUsers, currentUser.uid, selectedRole, searchQuery]);

  // Counts by role
  const userCounts = useMemo(() => {
    const eligible = (allUsers || []).filter(u => u && u.uid !== currentUser.uid);
    return {
      all: eligible.length,
      student: eligible.filter(u => u.role === 'student').length,
      tutor: eligible.filter(u => u.role === 'tutor').length,
      admin: eligible.filter(u => u.role === 'admin').length
    };
  }, [allUsers, currentUser.uid]);

  const handleSelectUser = (user: UserProfile) => {
    setActiveUser(user);
    setShowMobileList(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    // Broadcast active presence
    if (currentUser?.uid && activeUser?.uid) {
      const myName = currentUser.name || currentUser.username || 'System Administrator';
      firestoreService.setTypingPresence(currentUser.uid, activeUser.uid, myName, true);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (currentUser?.uid && activeUser?.uid) {
          firestoreService.setTypingPresence(currentUser.uid, activeUser.uid, myName, false);
        }
      }, 2500);
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if ((!text && pendingAttachments.length === 0) || !activeUser || !currentUser || isSending) return;

    setIsSending(true);

    // Stop typing state immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    firestoreService.setTypingPresence(currentUser.uid, activeUser.uid, currentUser.name || 'Admin', false).catch(() => {});

    try {
      const senderName = currentUser.name || currentUser.username || 'System Administrator';
      const newMsg = await firestoreService.sendDirectMessage(
        currentUser.uid,
        senderName,
        activeUser.uid,
        text,
        pendingAttachments
      );

      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setInputText('');
      setPendingAttachments([]);
      showToast(`Delivered message to ${activeUser.name}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to deliver message. Please retry.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputText);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 font-sans"
      id="admin_direct_message_modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-white dark:bg-slate-900 rounded-none sm:rounded-3xl max-w-5xl w-full border-0 sm:border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[100dvh] sm:h-[740px] max-h-none sm:max-h-[94vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  Administrative Direct Messaging
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hidden sm:inline-block">
                  Universal User Access
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate max-w-[260px] sm:max-w-md">
                Pick and chat with any student, faculty tutor, or administrator across the academy.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close messaging hub"
            id="btn_close_admin_chat_modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content: Split Screen User Picker + Active Chat */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Column: User Search & Selection Panel */}
          <div className={`w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/70 dark:bg-slate-900/50 shrink-0 ${
            !showMobileList ? 'hidden md:flex' : 'flex'
          }`}>
            {/* Search Input */}
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name or @username..."
                  className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-850 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-medium"
                  id="input_admin_chat_user_search"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Role filter pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedRole('all')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shrink-0 transition-colors cursor-pointer ${
                    selectedRole === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  All ({userCounts.all})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('student')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shrink-0 transition-colors cursor-pointer ${
                    selectedRole === 'student'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Students ({userCounts.student})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('tutor')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shrink-0 transition-colors cursor-pointer ${
                    selectedRole === 'tutor'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Tutors ({userCounts.tutor})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('admin')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shrink-0 transition-colors cursor-pointer ${
                    selectedRole === 'admin'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Admins ({userCounts.admin})
                </button>
              </div>
            </div>

            {/* User Directory List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredUsers.length > 0 ? (
                filteredUsers.map(user => {
                  const isSelected = activeUser?.uid === user.uid;
                  const roleBadgeBg = user.role === 'student' 
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    : user.role === 'tutor'
                      ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

                  return (
                    <button
                      key={user.uid}
                      onClick={() => handleSelectUser(user)}
                      className={`w-full text-left p-2.5 rounded-2xl transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500'
                          : 'bg-white dark:bg-slate-850 hover:bg-indigo-50/50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800/80'
                      }`}
                      id={`btn_select_chat_user_${user.uid}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.name}
                              className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center ${
                              isSelected 
                                ? 'bg-white/20 text-white' 
                                : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                            }`}>
                              {user.name?.charAt(0) || 'U'}
                            </div>
                          )}
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                            isSelected ? 'border-indigo-600' : 'border-white dark:border-slate-850'
                          } ${
                            user.status === 'suspended' ? 'bg-rose-500' : 'bg-emerald-500'
                          }`} />
                        </div>

                        {/* Name & Username */}
                        <div className="min-w-0">
                          <h4 className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                            {user.name}
                          </h4>
                          <div className="flex items-center gap-1 text-[11px] truncate">
                            <span className={`font-mono font-bold truncate ${
                              isSelected ? 'text-indigo-200' : 'text-indigo-600 dark:text-indigo-400'
                            }`}>
                              @{user.username || user.uid.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Role Pill */}
                      <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase border shrink-0 ${
                        isSelected 
                          ? 'bg-white/20 text-white border-white/30' 
                          : roleBadgeBg
                      }`}>
                        {user.role}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center space-y-2">
                  <User className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-500">No users found</p>
                  <p className="text-[11px] text-slate-400">
                    No matching user for "{searchQuery}". Try searching their name, @username, or role.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Active Conversation Chat */}
          <div className={`flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden relative ${
            showMobileList ? 'hidden md:flex' : 'flex'
          }`}>
            {activeUser ? (
              <>
                {/* Active Chat Target Header */}
                <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile Back Button */}
                    <button
                      onClick={() => setShowMobileList(true)}
                      className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                      title="Back to users list"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    {/* Target Avatar */}
                    <div className="relative shrink-0">
                      {activeUser.photoURL ? (
                        <img
                          src={activeUser.photoURL}
                          alt={activeUser.name}
                          className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold flex items-center justify-center text-sm">
                          {activeUser.name?.charAt(0) || 'U'}
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 animate-pulse" />
                    </div>

                    {/* Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                          {activeUser.name}
                        </h4>
                        <span className="px-2 py-0.5 text-[9px] font-black rounded-md uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {activeUser.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          @{activeUser.username || activeUser.uid.slice(0, 8)}
                        </span>
                        {activeUser.email && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[200px]">{activeUser.email}</span>
                          </>
                        )}
                        {activeUser.studentDetails?.grade && (
                          <>
                            <span>•</span>
                            <span>Grade {activeUser.studentDetails.grade}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: View Profile */}
                  {onViewUserProfile && (
                    <button
                      onClick={() => onViewUserProfile(activeUser)}
                      className="hidden sm:flex py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>View Profile</span>
                    </button>
                  )}
                </div>

                {/* Quick Administrative Message Prompts Toolbar */}
                <div className="px-3.5 py-2 bg-slate-100/60 dark:bg-slate-850/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
                  <span className="text-[10px] uppercase font-black text-slate-400 shrink-0 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Templates:
                  </span>
                  {ADMIN_QUICK_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setInputText(tmpl.text)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0 transition-colors cursor-pointer"
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/30 dark:bg-slate-900/30">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                      <div className="w-14 h-14 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <MessageSquare className="w-7 h-7" />
                      </div>
                      <div className="max-w-xs space-y-1">
                        <h5 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                          Direct Conversation with {activeUser.name}
                        </h5>
                        <p className="text-xs text-slate-500">
                          No messages exchanged yet. Send an administrative update or notice using the input below.
                        </p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === currentUser.uid;
                      const timeStr = msg.createdAt 
                        ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '';

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isMe && (
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 mb-1">
                              {activeUser.name?.charAt(0) || 'U'}
                            </div>
                          )}

                          <div className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-xs space-y-1 ${
                            isMe 
                              ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-xs' 
                              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-750 rounded-bl-xs'
                          }`}>
                            <div className="flex items-center justify-between gap-3 text-[10px]">
                              <span className={`font-black uppercase tracking-wider ${
                                isMe ? 'text-indigo-200' : 'text-indigo-600 dark:text-indigo-400'
                              }`}>
                                {isMe ? 'You (Admin)' : (msg.senderName || activeUser.name)}
                              </span>
                              <div className="flex items-center gap-0.5">
                                <span className={`font-mono text-[9px] ${
                                  isMe ? 'text-indigo-200/80' : 'text-slate-400'
                                }`}>
                                  {timeStr}
                                </span>
                                <ChatReadReceipt 
                                  isRead={msg.read} 
                                  readAt={msg.readAt} 
                                  isOwnMessage={isMe} 
                                />
                              </div>
                            </div>

                            {/* Render attachments if any */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                {msg.attachments.map((att, attIdx) => (
                                  <ChatAttachmentViewer
                                    key={attIdx}
                                    attachment={att}
                                    isOwnMessage={isMe}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Render text message */}
                            {msg.message && (
                              <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                                {msg.message}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Real-time typing indicator */}
                  <AnimatePresence>
                    {isRecipientTyping && (
                      <div className="flex items-end gap-2.5 justify-start">
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 mb-1">
                          {activeUser.name?.charAt(0) || 'U'}
                        </div>
                        <ChatTypingIndicator userName={typingUserName || activeUser.name} />
                      </div>
                    )}
                  </AnimatePresence>

                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input Field */}
                <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-2">
                  <div className="flex items-end gap-2">
                    <ChatAttachmentInput
                      currentUserId={currentUser.uid}
                      attachments={pendingAttachments}
                      onAttachmentsChange={setPendingAttachments}
                      disabled={isSending}
                    />

                    <textarea
                      ref={inputRef}
                      value={inputText}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDownInput}
                      placeholder={`Message @${activeUser.username || activeUser.name}... (Press Enter to send)`}
                      rows={2}
                      className="flex-1 resize-none text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-850 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-medium"
                      id="textarea_admin_chat_input"
                    />

                    <button
                      type="button"
                      onClick={() => handleSendMessage(inputText)}
                      disabled={(!inputText.trim() && pendingAttachments.length === 0) || isSending}
                      className="p-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white rounded-2xl transition-all flex items-center justify-center shadow-sm cursor-pointer shrink-0 disabled:cursor-not-allowed"
                      title="Send message"
                      id="btn_admin_send_chat_message"
                    >
                      {isSending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                    <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">Shift+Enter</kbd> for new line</span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                      Direct Sync & Storage Enabled
                    </span>
                  </div>
                </div>
              </>
            ) : (
              /* Empty State when no user is selected */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                  <Users className="w-8 h-8" />
                </div>
                <div className="max-w-md space-y-2">
                  <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                    Select a User to Message
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Pick any student, faculty tutor, or fellow administrator from the directory on the left, or search by their full name or <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">@username</span>.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 max-w-sm text-left space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Administrator Communications</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Messages sent from this panel are tagged with your official administrator badge and delivered in real-time to the user's personal dashboard.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
