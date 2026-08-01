import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../lib/firestoreService';
import { DirectMessage, UserProfile } from '../types';
import { 
  Send, 
  User, 
  MessageSquare, 
  AlertCircle, 
  Search, 
  CheckCheck, 
  Check, 
  Sparkles, 
  Clock, 
  GraduationCap, 
  Shield, 
  BookOpen, 
  RefreshCw,
  Users,
  X,
  Filter,
  Paperclip,
  FileText,
  Download,
  ExternalLink,
  Image as ImageIcon,
  FileUp
} from 'lucide-react';

interface ChatWidgetProps {
  currentUserId: string;
  currentUserRole: 'student' | 'tutor' | 'admin';
  initialSelectedUserId?: string;
  onSelectUser?: (userId: string) => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ 
  currentUserId, 
  currentUserRole,
  initialSelectedUserId,
  onSelectUser
}) => {
  const { showToast, bookings, classes } = useApp();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [allUserMessages, setAllUserMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [contactFilter, setContactFilter] = useState<'all' | 'students' | 'tutors' | 'admins'>('all');
  const [directoryTab, setDirectoryTab] = useState<'conversations' | 'all_contacts'>('conversations');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // File Attachment State
  const [selectedAttachment, setSelectedAttachment] = useState<{
    fileUrl: string;
    fileName: string;
    fileType: 'image' | 'pdf' | string;
    fileSize: string;
  } | null>(null);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Load users & contacts directory
  const loadUsersDirectory = async () => {
    try {
      setIsRefreshing(true);
      const list = await firestoreService.getAllUsers();
      
      // Permission / Role Filter Rules:
      // - Student: Can message their enrolled Tutors + Admins + any Tutor in academy
      // - Tutor: Can message their enrolled Students + Admins + any user who messaged them
      // - Admin: Can message ANY user
      const filtered = list.filter(u => {
        if (u.uid === currentUserId) return false;

        if (currentUserRole === 'student') {
          return true; // Students can reach out to tutors & admins or any member
        } else if (currentUserRole === 'tutor') {
          const activeBookings = bookings || [];
          const enrolledStudentIds = activeBookings
            .filter(b => b.tutorId === currentUserId && b.status === 'active')
            .map(b => b.studentId);
          // Allow enrolled students, admins, or any student
          return u.role === 'admin' || u.role === 'student' || enrolledStudentIds.includes(u.uid);
        }
        return true; // Admin sees everyone
      });

      setUsers(filtered);

      // Pre-select user if specified via initialSelectedUserId
      if (initialSelectedUserId) {
        const match = filtered.find(u => u.uid === initialSelectedUserId);
        if (match) {
          setSelectedUser(match);
        }
      } else if (filtered.length > 0 && !selectedUser) {
        setSelectedUser(filtered[0]);
      }
    } catch (err) {
      console.warn("Error loading user directory for chat", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsersDirectory();
  }, [currentUserId, currentUserRole, bookings, initialSelectedUserId]);

  // 2. Real-time subscribe to ALL messages for current user
  useEffect(() => {
    if (!currentUserId) return;

    const unsubscribe = firestoreService.subscribeUserMessages(currentUserId, (userMsgs) => {
      setAllUserMessages(userMsgs);
    });

    return () => unsubscribe();
  }, [currentUserId]);

  // 3. Automatically mark messages as read when viewing conversation
  useEffect(() => {
    if (!selectedUser || !currentUserId) return;

    const hasUnreadFromSelected = allUserMessages.some(
      m => m.senderId === selectedUser.uid && m.receiverId === currentUserId && !m.isRead
    );

    if (hasUnreadFromSelected) {
      firestoreService.markMessagesAsRead(selectedUser.uid, currentUserId);
    }
  }, [selectedUser, allUserMessages, currentUserId]);

  // Scroll to bottom on message update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allUserMessages, selectedUser]);

  // Map messages per contact
  const conversationStats = useMemo(() => {
    const stats: Record<string, {
      lastMessage?: DirectMessage;
      unreadCount: number;
      totalCount: number;
    }> = {};

    allUserMessages.forEach(m => {
      const peerId = m.senderId === currentUserId ? m.receiverId : m.senderId;
      if (!stats[peerId]) {
        stats[peerId] = { unreadCount: 0, totalCount: 0 };
      }
      
      stats[peerId].totalCount += 1;
      
      // Unread messages sent by peer to current user
      if (m.receiverId === currentUserId && !m.isRead) {
        stats[peerId].unreadCount += 1;
      }

      // Track last message by date
      if (!stats[peerId].lastMessage || new Date(m.createdAt) > new Date(stats[peerId].lastMessage!.createdAt)) {
        stats[peerId].lastMessage = m;
      }
    });

    return stats;
  }, [allUserMessages, currentUserId]);

  // Total unread messages count across all chats
  const totalUnreadCount = useMemo(() => {
    return Object.values(conversationStats).reduce((acc, curr) => acc + curr.unreadCount, 0);
  }, [conversationStats]);

  // Filtered contacts list
  const filteredDirectory = useMemo(() => {
    return users.filter(u => {
      // Role filter
      if (contactFilter === 'students' && u.role !== 'student') return false;
      if (contactFilter === 'tutors' && u.role !== 'tutor') return false;
      if (contactFilter === 'admins' && u.role !== 'admin') return false;

      // Text search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = u.name.toLowerCase().includes(q);
        const matchesRole = u.role.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        return matchesName || matchesRole || matchesEmail;
      }

      // Directory tab filter
      if (directoryTab === 'conversations') {
        return !!conversationStats[u.uid]?.lastMessage;
      }

      return true;
    }).sort((a, b) => {
      const timeA = conversationStats[a.uid]?.lastMessage ? new Date(conversationStats[a.uid]!.lastMessage!.createdAt).getTime() : 0;
      const timeB = conversationStats[b.uid]?.lastMessage ? new Date(conversationStats[b.uid]!.lastMessage!.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [users, contactFilter, searchQuery, directoryTab, conversationStats]);

  // Active chat message stream
  const activeChatMessages = useMemo(() => {
    if (!selectedUser) return [];
    
    let msgs = allUserMessages.filter(
      m => (m.senderId === currentUserId && m.receiverId === selectedUser.uid) ||
           (m.senderId === selectedUser.uid && m.receiverId === currentUserId)
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (chatSearchQuery.trim()) {
      const q = chatSearchQuery.toLowerCase();
      msgs = msgs.filter(m => m.message.toLowerCase().includes(q));
    }

    return msgs;
  }, [allUserMessages, selectedUser, currentUserId, chatSearchQuery]);

  // Enrolled class details context matching student & tutor
  const classContext = useMemo(() => {
    if (!selectedUser) return null;
    const activeBookings = bookings || [];
    if (currentUserRole === 'student' && selectedUser.role === 'tutor') {
      const match = activeBookings.find(b => b.studentId === currentUserId && b.tutorId === selectedUser.uid && b.status === 'active');
      return match ? match.classTitle : null;
    } else if (currentUserRole === 'tutor' && selectedUser.role === 'student') {
      const match = activeBookings.find(b => b.tutorId === currentUserId && b.studentId === selectedUser.uid && b.status === 'active');
      return match ? match.classTitle : null;
    }
    return null;
  }, [selectedUser, currentUserRole, currentUserId, bookings]);

  // Quick message template suggestion chips
  const quickTemplates = useMemo(() => {
    if (currentUserRole === 'student') {
      return [
        "🗓 Class Schedule Inquiry",
        "📝 Homework & Syllabus Clarification",
        "💳 Payment Confirmation Request",
        "❓ Request Extra Revision Session"
      ];
    } else if (currentUserRole === 'tutor') {
      return [
        "📢 Exam & Class Revision Update",
        "📚 Study Material Guidelines",
        "✅ Homework Feedback",
        "⏰ Schedule Revision Reminder"
      ];
    }
    return [
      "ℹ️ Account Status Guidelines",
      "📢 Official Academy Bulletin Notice",
      "📞 Support Callback Inquiry",
      "💳 Ledger Payment Verification"
    ];
  }, [currentUserRole]);

  // Handle File Selection (Images and PDFs up to 5MB)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("File size exceeds 5MB limit. Please choose a smaller image or PDF.", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const isPdf = file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      showToast("Only image files (PNG, JPG, WEBP) and PDF study materials are supported.", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + " MB";
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      setSelectedAttachment({
        fileUrl: result,
        fileName: file.name,
        fileType: isPdf ? 'pdf' : 'image',
        fileSize: sizeFormatted
      });
      showToast(`Attached ${file.name} (${sizeFormatted})`, "info");
    };

    reader.readAsDataURL(file);
  };

  // Handle send message
  const handleSendMessage = async (textToSend: string) => {
    if (!selectedUser) return;
    if (!textToSend.trim() && !selectedAttachment) return;

    setLoading(true);
    const msgText = textToSend.trim();
    const attachmentToSend = selectedAttachment ? { ...selectedAttachment } : undefined;

    setInputText("");
    setSelectedAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      const parentUser = await firestoreService.getUserProfile(currentUserId);
      const senderName = parentUser?.name || "Member";

      await firestoreService.sendDirectMessage(
        currentUserId,
        senderName,
        selectedUser.uid,
        msgText || (attachmentToSend?.fileType === 'pdf' ? `📎 Attached Study Material: ${attachmentToSend.fileName}` : '🖼 Attached Image'),
        attachmentToSend
      );
      showToast(`Message sent to ${selectedUser.name}`, "success");
    } catch (err) {
      showToast("Message could not be processed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUserHandler = (user: UserProfile) => {
    setSelectedUser(user);
    if (onSelectUser) {
      onSelectUser(user.uid);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] max-h-[720px]" id="communication_hub">
      
      {/* LEFT SIDEBAR: Directory & Inbox Conversations (4 cols) */}
      <div className="lg:col-span-4 border-r border-slate-150 flex flex-col bg-slate-50/70">
        
        {/* Header summary & Refresh */}
        <div className="p-4 border-b border-slate-150 bg-white space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 leading-none">Messages Inbox</h4>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Real-time communication portal</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {totalUnreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] bg-red-500 text-white font-extrabold rounded-full font-mono animate-pulse shadow-xs">
                  {totalUnreadCount} UNREAD
                </span>
              )}

              <button
                type="button"
                onClick={loadUsersDirectory}
                disabled={isRefreshing}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                title="Refresh contacts directory"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Directory Tab Switcher */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-500">
            <button
              type="button"
              onClick={() => setDirectoryTab('conversations')}
              className={`py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                directoryTab === 'conversations'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'hover:text-slate-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Inbox ({Object.keys(conversationStats).length})</span>
            </button>

            <button
              type="button"
              onClick={() => setDirectoryTab('all_contacts')}
              className={`py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                directoryTab === 'all_contacts'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Contacts ({users.length})</span>
            </button>
          </div>

          {/* Search Contacts Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user or role..."
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-sans transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Role Filter Pills (Admin or general) */}
          {currentUserRole === 'admin' && (
            <div className="flex gap-1 overflow-x-auto pb-0.5 text-[10px] font-bold">
              {(['all', 'students', 'tutors', 'admins'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setContactFilter(r)}
                  className={`px-2 py-0.5 rounded-lg uppercase tracking-wider font-mono cursor-pointer transition-all ${
                    contactFilter === r
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-200/60 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Directory User List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
          {filteredDirectory.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs space-y-2">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold">No contacts found</p>
              <p className="text-[10px] text-slate-400">
                {directoryTab === 'conversations' 
                  ? 'Switch to "Contacts" to start a new chat message.' 
                  : 'Try adjusting your search criteria.'}
              </p>
            </div>
          ) : (
            filteredDirectory.map((u) => {
              const isSelected = selectedUser?.uid === u.uid;
              const stats = conversationStats[u.uid];
              const lastMsg = stats?.lastMessage;
              const unread = stats?.unreadCount || 0;

              return (
                <button
                  key={u.uid}
                  type="button"
                  onClick={() => handleSelectUserHandler(u)}
                  className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-3 cursor-pointer group relative ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-200/50'
                      : 'hover:bg-slate-200/50 text-slate-800 bg-white border border-slate-150/60'
                  }`}
                >
                  {/* User Avatar */}
                  <div className="relative shrink-0">
                    {u.photoURL ? (
                      <img 
                        src={u.photoURL} 
                        alt={u.name} 
                        className={`w-10 h-10 rounded-full object-cover border ${isSelected ? 'border-white' : 'border-slate-200'}`} 
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                        isSelected 
                          ? 'bg-blue-500 text-white' 
                          : u.role === 'admin'
                            ? 'bg-amber-100 text-amber-800'
                            : u.role === 'tutor'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-blue-100 text-blue-800'
                      }`}>
                        {u.name.substr(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="w-3 h-3 bg-emerald-500 border-2 border-white rounded-full absolute -bottom-0.5 -right-0.5"></span>
                  </div>

                  {/* User Details & Last Message Snippet */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-1">
                      <h5 className={`text-xs font-extrabold truncate leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {u.name}
                      </h5>
                      {lastMsg && (
                        <span className={`text-[9px] font-mono shrink-0 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          {formatRelativeTime(lastMsg.createdAt)}
                        </span>
                      )}
                    </div>

                    {/* Role & Class badge */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[8px] uppercase tracking-wider font-extrabold font-mono px-1.5 py-0.2 rounded-md ${
                        isSelected 
                          ? 'bg-blue-500/80 text-blue-100' 
                          : u.role === 'admin'
                            ? 'bg-amber-100 text-amber-800'
                            : u.role === 'tutor'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {u.role}
                      </span>
                    </div>

                    {/* Last message preview */}
                    <p className={`text-[11px] truncate mt-1 ${
                      isSelected 
                        ? 'text-blue-100' 
                        : unread > 0 
                          ? 'font-bold text-slate-900' 
                          : 'text-slate-500'
                    }`}>
                      {lastMsg ? (
                        lastMsg.senderId === currentUserId ? `You: ${lastMsg.message}` : lastMsg.message
                      ) : (
                        <span className="italic text-[10px] opacity-70">Click to start conversation</span>
                      )}
                    </p>
                  </div>

                  {/* Unread Pill */}
                  {unread > 0 && (
                    <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full font-mono shrink-0 shadow-xs ${
                      isSelected ? 'bg-white text-blue-600' : 'bg-red-500 text-white'
                    }`}>
                      {unread}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Active Chat Window (8 cols) */}
      <div className="lg:col-span-8 flex flex-col h-full bg-white">
        {selectedUser ? (
          <>
            {/* Active Header */}
            <div className="p-4 border-b border-slate-150 flex flex-wrap justify-between items-center gap-3 bg-slate-50/50">
              <div className="flex items-center gap-3">
                {selectedUser.photoURL ? (
                  <img 
                    src={selectedUser.photoURL} 
                    alt={selectedUser.name} 
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs" 
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-xs ${
                    selectedUser.role === 'admin' 
                      ? 'bg-amber-500 text-white' 
                      : selectedUser.role === 'tutor' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-blue-600 text-white'
                  }`}>
                    {selectedUser.name.substr(0, 2).toUpperCase()}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                      {selectedUser.name}
                    </h4>
                    <span className={`text-[9px] uppercase tracking-wider font-extrabold font-mono px-1.5 py-0.2 rounded-md ${
                      selectedUser.role === 'admin'
                        ? 'bg-amber-100 text-amber-800'
                        : selectedUser.role === 'tutor'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {selectedUser.role}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1 text-emerald-600 font-bold font-mono">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      Real-time Synced
                    </span>

                    {classContext && (
                      <>
                        <span>•</span>
                        <span className="text-indigo-600 font-semibold flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> {classContext}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Chat Search */}
              <div className="relative w-44">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  placeholder="Filter chat..."
                  className="w-full text-[11px] pl-7 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                />
                {chatSearchQuery && (
                  <button 
                    onClick={() => setChatSearchQuery('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/30">
              {activeChatMessages.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-slate-400 py-12 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <h5 className="text-xs font-bold text-slate-700">Start conversation with {selectedUser.name}</h5>
                    <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                      Type a message below or select one of the quick template chips to send an inquiry.
                    </p>
                  </div>
                </div>
              ) : (
                activeChatMessages.map((m) => {
                  const isOwn = m.senderId === currentUserId;
                  const formattedTime = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div 
                      key={m.id} 
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}
                    >
                      <div className="flex gap-2 max-w-[80%]">
                        {!isOwn && (
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-1">
                            {m.senderName.substr(0, 1).toUpperCase()}
                          </div>
                        )}

                        <div className={`rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs ${
                          isOwn 
                            ? 'bg-blue-600 text-white rounded-br-xs font-sans' 
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs font-sans'
                        }`}>
                          {!isOwn && (
                            <span className="text-[10px] font-bold text-blue-600 block mb-1 font-mono uppercase">
                              {m.senderName}
                            </span>
                          )}

                          <p className="whitespace-pre-wrap break-words">{m.message}</p>

                          {m.fileUrl && (
                            <div className="mt-2 mb-1">
                              {m.fileType === 'pdf' || m.fileUrl.startsWith('data:application/pdf') || m.fileName?.toLowerCase().endsWith('.pdf') ? (
                                <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                                  isOwn ? 'bg-blue-700/60 border-blue-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                                }`}>
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-2 rounded-lg bg-red-500 text-white shrink-0 shadow-xs">
                                      <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="truncate">
                                      <span className="block text-xs font-bold truncate">{m.fileName || 'Study_Material.pdf'}</span>
                                      <span className={`block text-[10px] ${isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
                                        PDF Material • {m.fileSize || 'Attachment'}
                                      </span>
                                    </div>
                                  </div>
                                  <a 
                                    href={m.fileUrl} 
                                    download={m.fileName || 'Study_Material.pdf'} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 flex items-center gap-1 transition-all ${
                                      isOwn ? 'bg-white text-blue-700 hover:bg-blue-50' : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                  >
                                    <Download className="w-3.5 h-3.5" /> Download
                                  </a>
                                </div>
                              ) : (
                                <div className="relative group rounded-xl overflow-hidden border border-slate-200/40 shadow-xs max-w-sm">
                                  <img 
                                    src={m.fileUrl} 
                                    alt={m.fileName || 'Image Attachment'} 
                                    onClick={() => setPreviewModalUrl(m.fileUrl!)}
                                    className="max-h-60 w-full object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity" 
                                  />
                                  <div className="absolute top-2 right-2 flex gap-1 opacity-90 group-hover:opacity-100">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewModalUrl(m.fileUrl!)}
                                      className="p-1.5 bg-black/60 text-white rounded-lg hover:bg-black/80 cursor-pointer backdrop-blur-xs"
                                      title="Expand Image"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </button>
                                    <a
                                      href={m.fileUrl}
                                      download={m.fileName || 'chat-image.png'}
                                      className="p-1.5 bg-black/60 text-white rounded-lg hover:bg-black/80 cursor-pointer backdrop-blur-xs"
                                      title="Download Image"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className={`flex items-center justify-end gap-1 text-[9px] font-mono mt-1.5 ${
                            isOwn ? 'text-blue-100' : 'text-slate-400'
                          }`}>
                            <span>{formattedTime}</span>
                            {isOwn && (
                              m.isRead ? (
                                <span title="Read"><CheckCheck className="w-3.5 h-3.5 text-blue-200" /></span>
                              ) : (
                                <span title="Sent"><Check className="w-3.5 h-3.5 text-blue-200/70" /></span>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-150 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Quick Replies:
              </span>
              {quickTemplates.map((template, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(template)}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-600 rounded-xl transition-all whitespace-nowrap cursor-pointer shadow-2xs"
                >
                  {template}
                </button>
              ))}
            </div>

            {/* Selected File Attachment Preview */}
            {selectedAttachment && (
              <div className="px-3 pt-2 pb-1 bg-slate-50 border-t border-slate-150 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs truncate">
                  {selectedAttachment.fileType === 'pdf' ? (
                    <FileText className="w-4 h-4 text-red-500 shrink-0" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                  <span className="truncate max-w-[200px]">{selectedAttachment.fileName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({selectedAttachment.fileSize})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAttachment(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="p-1 hover:bg-slate-200 text-slate-500 rounded-lg cursor-pointer"
                  title="Remove Attachment"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept="image/*,.pdf,application/pdf" 
              className="hidden" 
            />

            {/* Input Form */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }} 
              className="p-3 border-t border-slate-150 bg-white flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-2xl transition-all cursor-pointer shrink-0"
                title="Attach Image or PDF Study Material"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={selectedAttachment ? "Add a message caption (optional)..." : `Write a message to ${selectedUser.name}...`}
                className="flex-1 text-xs px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-sans transition-all"
              />

              <button
                type="submit"
                disabled={loading || (!inputText.trim() && !selectedAttachment)}
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-sm transition-all cursor-pointer disabled:opacity-40 shrink-0 flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="h-full flex flex-col justify-center items-center text-slate-400 p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-800">Select a contact</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Choose a student, tutor, or administrator from the left directory sidebar to open your real-time chat history.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Image Lightbox Modal */}
      {previewModalUrl && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setPreviewModalUrl(null)}>
          <div className="relative max-w-4xl max-h-[90vh] p-2" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setPreviewModalUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-2 font-bold cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={previewModalUrl} alt="Attachment Preview" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
            <div className="mt-3 flex justify-end gap-2">
              <a 
                href={previewModalUrl} 
                download="attachment-image" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Download className="w-4 h-4" /> Download Original Image
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
