import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../lib/firestoreService';
import { DirectMessage, UserProfile, ChatAttachment } from '../types';
import { Send, User, MessageSquare, AlertCircle, Search, Loader2, ArrowLeft } from 'lucide-react';
import { ChatAttachmentViewer } from './ChatAttachmentViewer';
import { ChatTypingIndicator } from './ChatTypingIndicator';
import { ChatReadReceipt } from './ChatReadReceipt';
import { ChatAttachmentInput } from './ChatAttachmentInput';

interface ChatWidgetProps {
  currentUserId: string;
  currentUserRole: 'student' | 'tutor' | 'admin';
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ currentUserId, currentUserRole }) => {
  const { showToast, bookings, currentUser: appUser } = useApp();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Load chat directory
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const list = await firestoreService.getAllUsers();
        // Filter: Students see enrolled tutors and admins, Tutors see enrolled students and admins
        const filtered = list.filter(u => {
          if (currentUserRole === 'student') {
            const activeBookings = bookings || [];
            const enrolledTutorIds = activeBookings
              .filter(b => b.studentId === currentUserId && b.status === 'active')
              .map(b => b.tutorId);
            return u.role === 'admin' || (u.role === 'tutor' && enrolledTutorIds.includes(u.uid));
          } else if (currentUserRole === 'tutor') {
            const activeBookings = bookings || [];
            const enrolledStudentIds = activeBookings
              .filter(b => b.tutorId === currentUserId && b.status === 'active')
              .map(b => b.studentId);
            return u.role === 'admin' || (u.role === 'student' && enrolledStudentIds.includes(u.uid));
          }
          return u.uid !== currentUserId; // Admin sees everyone
        });
        setUsers(filtered);
        if (filtered.length > 0 && !selectedUser) {
          setSelectedUser(filtered[0]);
        }
      } catch (err) {
        console.warn("Error loading chat peer users", err);
      }
    };
    fetchUsers();
  }, [currentUserId, currentUserRole, bookings]);

  // Real-time subscribe message logs for selected user
  useEffect(() => {
    if (!selectedUser) return;
    
    const unsubscribe = firestoreService.subscribeDirectMessages(currentUserId, selectedUser.uid, (logs) => {
      setMessages(logs);
    });
    
    return () => unsubscribe();
  }, [selectedUser, currentUserId]);

  // Real-time subscribe typing status
  useEffect(() => {
    if (!selectedUser || !currentUserId) {
      setIsRecipientTyping(false);
      return;
    }

    const unsubTyping = firestoreService.subscribeTypingPresence(
      currentUserId,
      selectedUser.uid,
      (typing, user) => {
        setIsRecipientTyping(typing);
        setTypingUserName(user || selectedUser.name || 'Participant');
      }
    );

    return () => unsubTyping();
  }, [selectedUser, currentUserId]);

  // Reset state on switching user
  useEffect(() => {
    setPendingAttachments([]);
    setIsRecipientTyping(false);
  }, [selectedUser?.uid]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isRecipientTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (currentUserId && selectedUser) {
      const myName = appUser?.name || 'Member';
      firestoreService.setTypingPresence(currentUserId, selectedUser.uid, myName, true);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (currentUserId && selectedUser) {
          firestoreService.setTypingPresence(currentUserId, selectedUser.uid, myName, false);
        }
      }, 2500);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = inputText.trim();
    if (!selectedUser || (!textToSend && pendingAttachments.length === 0) || loading) return;

    setLoading(true);
    setInputText("");
    const attachmentsToSend = [...pendingAttachments];
    setPendingAttachments([]);

    // Clear typing status
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    firestoreService.setTypingPresence(currentUserId, selectedUser.uid, appUser?.name || 'Member', false).catch(() => {});
    
    try {
      const parentUser = await firestoreService.getUserProfile(currentUserId);
      const senderName = parentUser?.name || appUser?.name || "Anonymous Member";
      
      const newMsg = await firestoreService.sendDirectMessage(
        currentUserId,
        senderName,
        selectedUser.uid,
        textToSend,
        attachmentsToSend
      );
      
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    } catch (err) {
      showToast("Message could not be processed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-blue-50 shadow-md overflow-hidden flex flex-col md:grid md:grid-cols-3 h-[520px] md:h-[480px] w-full" id="communication_hub">
      {/* Sidebar: Users directory */}
      <div className={`border-r border-gray-100 flex flex-col bg-gray-50/50 w-full h-full md:col-span-1 ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-3 border-b border-gray-100 bg-white space-y-2">
          <div>
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              Active Conversations
            </h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Select a participant to chat</p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, role or @username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 font-sans"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100/60">
          {filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-xs">
              No matching conversations found.
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isSelected = selectedUser?.uid === u.uid;
              return (
                <button
                  key={u.uid}
                  onClick={() => {
                    setSelectedUser(u);
                    setMobileView('chat');
                  }}
                  className={`w-full p-3 text-left flex items-center gap-3 transition-colors cursor-pointer ${
                    isSelected ? 'bg-blue-50/80 border-r-2 border-blue-600' : 'hover:bg-gray-100/60'
                  }`}
                >
                  <div className="relative shrink-0">
                    {u.photoURL ? (
                      <img
                        src={u.photoURL}
                        alt={u.name}
                        className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                        {u.name?.substr(0, 2).toUpperCase() || 'U'}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white"></span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        <p className="text-xs font-bold text-gray-900 truncate">{u.name}</p>
                        {u.uid === currentUserId && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-600 text-white text-[8px] font-black uppercase shrink-0">
                            Me
                          </span>
                        )}
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded capitalize ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700 font-bold' :
                        u.role === 'tutor' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5 font-sans">
                      @{u.username || u.uid.slice(0, 7)}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main chat window */}
      <div className={`flex-1 md:col-span-2 flex flex-col h-full bg-white overflow-hidden ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-1.5 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 cursor-pointer"
                  title="Back to contacts"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                {selectedUser.photoURL ? (
                  <img 
                    src={selectedUser.photoURL} 
                    alt={selectedUser.name} 
                    className="h-8 w-8 rounded-full object-cover ring-1 ring-gray-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                    {selectedUser.name?.substr(0, 2).toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-gray-900 leading-tight">{selectedUser.name}</h4>
                    {selectedUser.uid === currentUserId && (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-600 text-white text-[8px] font-black uppercase">Me</span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[9px] text-green-600 font-bold font-mono">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span> ONLINE / SYNCED
                  </span>
                </div>
              </div>
            </div>

            {/* Message streams */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 Scrollbar-thin">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-gray-400 py-10">
                  <AlertCircle className="w-7 h-7 text-gray-300 mb-1" />
                  <p className="text-xs font-sans">No message logs with {selectedUser.name}.</p>
                  <p className="text-[10px] text-gray-400 mt-1">Start writing or attach a document to communicate.</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isOwn = m.senderId === currentUserId;
                  return (
                    <div 
                      key={m.id} 
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs space-y-1 ${
                        isOwn 
                          ? 'bg-blue-600 text-white rounded-br-xs font-sans' 
                          : 'bg-gray-100 text-gray-800 rounded-bl-xs font-sans'
                      }`}>
                        {!isOwn && (
                          <span className="text-[9px] font-bold text-blue-600 block mb-0.5 font-mono uppercase">
                            {m.senderName}
                          </span>
                        )}

                        {/* Attachments if any */}
                        {m.attachments && m.attachments.length > 0 && (
                          <div className="space-y-1.5 my-1">
                            {m.attachments.map((att, attIdx) => (
                              <ChatAttachmentViewer
                                key={attIdx}
                                attachment={att}
                                isOwnMessage={isOwn}
                              />
                            ))}
                          </div>
                        )}

                        {m.message && <p className="whitespace-pre-wrap break-words">{m.message}</p>}

                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className={`text-[8px] font-mono leading-none ${isOwn ? 'text-blue-100' : 'text-gray-400'}`}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <ChatReadReceipt
                            isRead={m.read}
                            readAt={m.readAt}
                            isOwnMessage={isOwn}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              <AnimatePresence>
                {isRecipientTyping && (
                  <div className="flex justify-start">
                    <ChatTypingIndicator userName={typingUserName || selectedUser.name} />
                  </div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Input form with attachments */}
            <form onSubmit={handleSendMessage} className="p-2.5 border-t border-gray-100 flex flex-col gap-1.5 bg-white shrink-0">
              <div className="flex items-center gap-1.5">
                <ChatAttachmentInput
                  currentUserId={currentUserId}
                  attachments={pendingAttachments}
                  onAttachmentsChange={setPendingAttachments}
                  disabled={loading}
                />

                <input
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder={`Write message to ${selectedUser.name}...`}
                  className="flex-1 text-xs px-3 py-2 border border-gray-200 bg-gray-50 rounded-xl outline-none focus:border-blue-500 font-sans"
                />

                <button
                  type="submit"
                  disabled={loading || (!inputText.trim() && pendingAttachments.length === 0)}
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-40 shrink-0"
                  title="Send message"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="h-full flex flex-col justify-center items-center text-gray-400">
            <MessageSquare className="w-8 h-8 text-gray-300 mb-2 animate-bounce" />
            <p className="text-xs">Select any user profile on the directory to begin chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
};
