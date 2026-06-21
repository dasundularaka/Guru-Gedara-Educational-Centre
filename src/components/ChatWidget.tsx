import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../lib/firestoreService';
import { DirectMessage, UserProfile } from '../types';
import { Send, User, MessageSquare, AlertCircle } from 'lucide-react';

interface ChatWidgetProps {
  currentUserId: string;
  currentUserRole: 'student' | 'tutor' | 'admin';
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ currentUserId, currentUserRole }) => {
  const { showToast } = useApp();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat directory
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const list = await firestoreService.getAllUsers();
        // Filter: Students see tutors, Tutors see students
        const filtered = list.filter(u => {
          if (currentUserRole === 'student') {
            return u.role === 'tutor';
          } else if (currentUserRole === 'tutor') {
            return u.role === 'student';
          }
          return u.uid !== currentUserId; // Admin sees everyone
        });
        setUsers(filtered);
        if (filtered.length > 0) {
          setSelectedUser(filtered[0]);
        }
      } catch (err) {
        console.warn("Error loading chat peer users", err);
      }
    };
    fetchUsers();
  }, [currentUserId, currentUserRole]);

  // Load message logs for selected user
  const loadMessages = async () => {
    if (!selectedUser) return;
    try {
      const logs = await firestoreService.getDirectMessages(currentUserId, selectedUser.uid);
      setMessages(logs);
    } catch (e) {
      console.warn("Error loading chat logs", e);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(() => {
      loadMessages();
    }, 5000); // Poll messages every 5 seconds for real-time vibe
    return () => clearInterval(interval);
  }, [selectedUser, currentUserId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !inputText.trim()) return;

    setLoading(true);
    const textToSend = inputText;
    setInputText("");
    
    try {
      const parentUser = await firestoreService.getUserProfile(currentUserId);
      const senderName = parentUser?.name || "Anonymous Member";
      
      const newMsg = await firestoreService.sendDirectMessage(
        currentUserId,
        senderName,
        selectedUser.uid,
        textToSend
      );
      
      setMessages(prev => [...prev, newMsg]);
    } catch (err) {
      showToast("Message could not be processed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-blue-50 shadow-md overflow-hidden grid grid-cols-1 md:grid-cols-3 h-[420px]" id="communication_hub">
      {/* Sidebar: Users directory */}
      <div className="border-r border-gray-100 flex flex-col bg-gray-50/50">
        <div className="p-4 border-b border-gray-100 bg-white">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            Active Conversations
          </h4>
          <p className="text-[10px] text-gray-400 mt-0.5">Select a participant to chat</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {users.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-xs">
              No participants available.
            </div>
          ) : (
            users.map((u) => {
              const isSelected = selectedUser?.uid === u.uid;
              return (
                <button
                  key={u.uid}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center gap-3 cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-100' 
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {u.photoURL ? (
                    <img className="h-8 w-8 rounded-full object-cover border border-white" src={u.photoURL} alt="" />
                  ) : (
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700'}`}>
                      {u.name.substr(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate leading-tight">{u.name}</p>
                    <p className={`text-[9px] uppercase tracking-wider font-semibold font-mono ${isSelected ? 'text-blue-200' : 'text-blue-600'}`}>
                      {u.role}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main chat viewport */}
      <div className="col-span-2 flex flex-col h-full bg-white">
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/20">
              <div className="flex items-center gap-2.5">
                {selectedUser.photoURL ? (
                  <img className="h-8 w-8 rounded-full object-cover" src={selectedUser.photoURL} alt="" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                    {selectedUser.name.substr(0,2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold text-gray-900 leading-tight">{selectedUser.name}</h4>
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
                  <p className="text-[10px] text-gray-400 mt-1">Start writing to open communication guidelines.</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isOwn = m.senderId === currentUserId;
                  return (
                    <div 
                      key={m.id} 
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                        isOwn 
                          ? 'bg-blue-600 text-white rounded-br-none font-sans' 
                          : 'bg-gray-100 text-gray-800 rounded-bl-none font-sans'
                      }`}>
                        {!isOwn && (
                          <span className="text-[9px] font-bold text-blue-600 block mb-0.5 font-mono uppercase">
                            {m.senderName}
                          </span>
                        )}
                        <p>{m.message}</p>
                        <span className={`text-[8px] font-mono mt-1 block text-right leading-none ${isOwn ? 'text-blue-100' : 'text-gray-400'}`}>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 flex gap-2">
              <input
                required
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Write message to ${selectedUser.name}...`}
                className="flex-1 text-xs px-3.5 py-2 border border-gray-200 bg-gray-50 rounded-xl outline-none focus:border-blue-500 font-sans"
              />
              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
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
