import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Search, 
  Send, 
  User, 
  ArrowLeft, 
  CheckCheck, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  UserCheck, 
  GraduationCap, 
  X, 
  Filter,
  RefreshCw,
  Loader2,
  ChevronRight,
  ExternalLink,
  Users
} from 'lucide-react';
import { UserProfile, DirectMessage, ChatAttachment } from '../types';
import { firestoreService } from '../lib/firestoreService';
import { ChatAttachmentViewer } from './ChatAttachmentViewer';
import { ChatTypingIndicator } from './ChatTypingIndicator';
import { ChatReadReceipt } from './ChatReadReceipt';
import { ChatAttachmentInput } from './ChatAttachmentInput';

interface AdminMessagingSectionProps {
  currentUser: UserProfile;
  initialTargetUser?: UserProfile | null;
  onViewUserProfile?: (user: UserProfile) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const ADMIN_QUICK_TEMPLATES = [
  { label: "Class Rescheduled", text: "Hello, please be advised that the upcoming class schedule has been revised. Kindly verify your timetable on the portal." },
  { label: "Payment Due Reminder", text: "Notice from Academy Accounts: Your course installment payment is due. Please settle via the student portal to prevent access suspension." },
  { label: "Admission Confirmed", text: "Congratulations! Your admission to Guru Gedara Educational Centre has been verified. Welcome to our academic community." },
  { label: "Attendance Notice", text: "Academic Advisory: Please note that consistent attendance is mandatory. Ensure you scan your Student ID QR pass upon classroom entry." },
  { label: "Syllabus Uploaded", text: "Faculty Notice: New study materials, revision packs, and past papers have been uploaded for your enrolled subject." },
  { label: "General Check-in", text: "Hello! This is Guru Gedara Academy Administration reaching out to check on your learning progress and answer any queries." }
];

export const AdminMessagingSection: React.FC<AdminMessagingSectionProps> = ({
  currentUser,
  initialTargetUser,
  onViewUserProfile,
  showToast
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeUser, setActiveUser] = useState<UserProfile | null>(initialTargetUser || null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | 'student' | 'tutor' | 'admin'>('all');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState('');
  // On mobile screens: 'list' shows directory, 'chat' shows full conversation
  const [mobileView, setMobileView] = useState<'list' | 'chat'>(initialTargetUser ? 'chat' : 'list');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Sync initialTargetUser if changed externally
  useEffect(() => {
    if (initialTargetUser) {
      setActiveUser(initialTargetUser);
      setMobileView('chat');
    }
  }, [initialTargetUser]);

  // Fetch all users across the academy
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const allUsers = await firestoreService.getAllUsers();
      // Exclude self from messaging directory
      const peers = allUsers.filter(u => u.uid !== currentUser.uid);
      setUsers(peers);
      
      // If no active user is set, pick the first user on desktop
      if (!activeUser && peers.length > 0 && window.innerWidth >= 768) {
        setActiveUser(peers[0]);
      }
    } catch (err) {
      console.warn("Error fetching users for admin messaging:", err);
      showToast("Unable to load contacts directory.", "error");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser.uid]);

  // Subscribe to real-time direct messages
  useEffect(() => {
    if (!currentUser?.uid || !activeUser?.uid) {
      setMessages([]);
      return;
    }

    const unsubscribe = firestoreService.subscribeDirectMessages(
      currentUser.uid,
      activeUser.uid,
      (incoming) => {
        setMessages(incoming);
        // Automatically mark unread messages as read
        firestoreService.markConversationAsRead(currentUser.uid, activeUser.uid).catch(() => {});
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid, activeUser?.uid]);

  // Subscribe to typing presence
  useEffect(() => {
    if (!currentUser?.uid || !activeUser?.uid) {
      setIsRecipientTyping(false);
      return;
    }

    const unsubTyping = firestoreService.subscribeTypingPresence(
      currentUser.uid,
      activeUser.uid,
      (typing, user) => {
        setIsRecipientTyping(typing);
        setTypingUserName(user || activeUser.name || 'User');
      }
    );

    return () => unsubTyping();
  }, [currentUser?.uid, activeUser?.uid, activeUser?.name]);

  // Reset transient state when switching active peer
  useEffect(() => {
    setPendingAttachments([]);
    setIsRecipientTyping(false);
  }, [activeUser?.uid]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 0 || isRecipientTyping) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isRecipientTyping]);

  // Handle typing input
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);

    // Broadcast presence
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

  // Dispatch message
  const handleSendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if ((!text && pendingAttachments.length === 0) || !activeUser || !currentUser || isSending) return;

    setIsSending(true);

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
      showToast(`Message sent to ${activeUser.name}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch message.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputText);
    }
  };

  const handleSelectUser = (user: UserProfile) => {
    setActiveUser(user);
    setMobileView('chat');
  };

  // Filter users based on search and selected role
  const filteredUsers = users.filter(u => {
    const matchesRole = selectedRole === 'all' || u.role === selectedRole;
    if (!matchesRole) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (u.name || '').toLowerCase().includes(q);
    const usernameMatch = (u.username || '').toLowerCase().includes(q);
    const emailMatch = (u.email || '').toLowerCase().includes(q);
    return nameMatch || usernameMatch || emailMatch;
  });

  const userCounts = {
    all: users.length,
    student: users.filter(u => u.role === 'student').length,
    tutor: users.filter(u => u.role === 'tutor').length,
    admin: users.filter(u => u.role === 'admin').length
  };

  return (
    <div 
      id="admin_messaging_section_container" 
      className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col h-[calc(100dvh-130px)] min-h-[460px] sm:min-h-[580px] sm:max-h-[840px] transition-all w-full"
    >
      {/* Top Banner & Hub Controls */}
      <div className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-base font-extrabold text-white leading-tight">
                Executive Direct Messaging
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-2.5 h-2.5" /> Universal Access
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-md hidden xs:block">
              Secure administrative channel with scholars, faculty tutors, and staff.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loadingUsers}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh contacts directory"
          >
            <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Container: Split-screen on desktop; full-screen responsive view on mobile */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: Contacts Directory (Desktop: sidebar, Mobile: full-view when mobileView === 'list') */}
        {/* ========================================================= */}
        <div 
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/70 dark:bg-slate-900/50 shrink-0 transition-all ${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
          id="admin_messaging_contacts_pane"
        >
          {/* Search bar & filter pills */}
          <div className="p-3 sm:p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2.5 bg-white dark:bg-slate-900/80">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search scholars, faculty, @username..."
                className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-850 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-medium"
                id="input_admin_section_search"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Role Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <button
                type="button"
                onClick={() => setSelectedRole('all')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shrink-0 transition-colors cursor-pointer ${
                  selectedRole === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
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
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Students ({userCounts.student})
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('tutor')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shrink-0 transition-colors cursor-pointer ${
                  selectedRole === 'tutor'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Faculty ({userCounts.tutor})
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('admin')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shrink-0 transition-colors cursor-pointer ${
                  selectedRole === 'admin'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Admins ({userCounts.admin})
              </button>
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {loadingUsers ? (
              <div className="p-8 text-center space-y-3">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                <p className="text-xs text-slate-500">Loading directory contacts...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <User className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No matching contacts</p>
                <p className="text-[11px] text-slate-400">Try adjusting your search query or role filter.</p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = activeUser?.uid === user.uid;
                const roleColor = 
                  user.role === 'tutor' 
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200' 
                    : user.role === 'admin'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200';

                return (
                  <button
                    key={user.uid}
                    onClick={() => handleSelectUser(user)}
                    className={`w-full p-3 text-left flex items-center gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-l-4 border-indigo-600'
                        : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="relative shrink-0">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.name}
                          className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold flex items-center justify-center text-sm">
                          {user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {user.name}
                        </p>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border capitalize font-bold ${roleColor}`}>
                          {user.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        @{user.username || user.uid.slice(0, 8)}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 md:hidden" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Conversation Window (Full screen on mobile when mobileView === 'chat') */}
        {/* ========================================================= */}
        <div 
          className={`flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden relative ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
          id="admin_messaging_conversation_pane"
        >
          {activeUser ? (
            <>
              {/* Conversation Top Header */}
              <div className="p-3 sm:p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Mobile Back Button: Returns to contacts list */}
                  <button
                    type="button"
                    onClick={() => setMobileView('list')}
                    className="md:hidden p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-200/80 dark:bg-slate-800 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                    title="Back to contacts directory"
                    id="btn_back_to_contacts_mobile"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="relative shrink-0">
                    {activeUser.photoURL ? (
                      <img
                        src={activeUser.photoURL}
                        alt={activeUser.name}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold flex items-center justify-center text-sm">
                        {activeUser.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 animate-pulse" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-[240px]">
                        {activeUser.name}
                      </h4>
                      <span className="px-1.5 py-0.5 text-[9px] font-black rounded uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {activeUser.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        @{activeUser.username || activeUser.uid.slice(0, 8)}
                      </span>
                      {activeUser.studentDetails?.grade && (
                        <>
                          <span>•</span>
                          <span>Grade {activeUser.studentDetails.grade}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profile quick action */}
                {onViewUserProfile && (
                  <button
                    type="button"
                    onClick={() => onViewUserProfile(activeUser)}
                    className="py-1.5 px-2.5 sm:px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    title="View user credentials & card"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Profile</span>
                  </button>
                )}
              </div>

              {/* Quick Template Prompts Horizontal Bar */}
              <div className="px-3 py-1.5 bg-slate-100/70 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                <span className="text-[10px] uppercase font-black text-slate-400 shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Templates:
                </span>
                {ADMIN_QUICK_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputText(tmpl.text)}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>

              {/* Messages Feed View */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50/40 dark:bg-slate-900/30 overscroll-contain">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div className="max-w-xs space-y-1">
                      <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Direct Channel with {activeUser.name}
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        No previous messages found. Send an administrative update or notice using the input below.
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
                        className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isMe && (
                          <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mb-1">
                            {activeUser.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}

                        <div className={`max-w-[88%] sm:max-w-[75%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed break-words shadow-xs ${
                              isMe
                                ? 'bg-indigo-600 text-white rounded-br-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-xs'
                            }`}
                          >
                            {/* File Attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="space-y-1.5 mb-1.5">
                                {msg.attachments.map((att, attIdx) => (
                                  <ChatAttachmentViewer
                                    key={attIdx}
                                    attachment={att}
                                    isOwnMessage={isMe}
                                  />
                                ))}
                              </div>
                            )}

                            {msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}
                          </div>

                          <div className={`flex items-center gap-1 text-[9px] text-slate-400 font-mono px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <span>{timeStr}</span>
                            <ChatReadReceipt
                              isRead={msg.read}
                              readAt={msg.readAt}
                              isOwnMessage={isMe}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Typing Indicator */}
                <AnimatePresence>
                  {isRecipientTyping && (
                    <div className="flex justify-start">
                      <ChatTypingIndicator userName={typingUserName || activeUser.name} />
                    </div>
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar with Attachments */}
              <div className="p-2.5 sm:p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-2">
                <div className="flex items-end gap-2">
                  <ChatAttachmentInput
                    currentUserId={currentUser.uid}
                    attachments={pendingAttachments}
                    onAttachmentsChange={setPendingAttachments}
                    disabled={isSending}
                  />

                  <textarea
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${activeUser.name}... (Press Enter to send)`}
                    rows={1}
                    className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-850 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white resize-none max-h-24 font-sans"
                  />

                  <button
                    type="button"
                    onClick={() => handleSendMessage(inputText)}
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
              </div>
            </>
          ) : (
            /* Empty State: No user selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Users className="w-8 h-8" />
              </div>
              <div className="max-w-sm space-y-1">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Pick a scholar or faculty member
                </h4>
                <p className="text-xs text-slate-500">
                  Select any contact from the directory on the left to review chat history or dispatch real-time administrative messages.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
