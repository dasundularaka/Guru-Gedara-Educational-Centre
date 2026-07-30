import React, { useState, useEffect } from 'react';
import { 
  Mail, Send, RefreshCw, LogOut, CheckCircle2, AlertCircle, Search, 
  User as UserIcon, FileText, X, ChevronRight, CornerUpLeft, ArrowLeft,
  Paperclip, Sparkles, ShieldCheck
} from 'lucide-react';
import { 
  authorizeGmail, getGmailAccessToken, clearGmailAccessToken, 
  getGmailUserProfile, listGmailMessages, sendGmailMessage, 
  GmailMessageSummary, GmailUserProfile 
} from '../lib/gmailService';
import { UserProfile } from '../types';

interface GmailMailboxProps {
  isOpen: boolean;
  onClose: () => void;
  usersList?: UserProfile[];
  initialRecipientEmail?: string;
  initialSubject?: string;
}

export const GmailMailbox: React.FC<GmailMailboxProps> = ({
  isOpen,
  onClose,
  usersList = [],
  initialRecipientEmail = '',
  initialSubject = ''
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<GmailUserProfile | null>(null);
  
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessageSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Compose states
  const [recipient, setRecipient] = useState(initialRecipientEmail);
  const [subject, setSubject] = useState(initialSubject);
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // User Confirmation Dialog before sending
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);

  // Check initial token status on load
  useEffect(() => {
    if (isOpen) {
      const token = getGmailAccessToken();
      if (token) {
        setIsAuthenticated(true);
        loadGmailData();
      }
      if (initialRecipientEmail) {
        setRecipient(initialRecipientEmail);
        setActiveTab('compose');
      }
      if (initialSubject) {
        setSubject(initialSubject);
      }
    }
  }, [isOpen, initialRecipientEmail, initialSubject]);

  const loadGmailData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const profile = await getGmailUserProfile();
      setUserProfile(profile);

      const q = activeTab === 'sent' ? 'in:sent' : 'in:inbox';
      const msgs = await listGmailMessages(searchQuery ? `${q} ${searchQuery}` : q);
      setMessages(msgs);
    } catch (err: any) {
      console.warn("Error loading Gmail data:", err);
      setErrorMsg(err.message || "Failed to load Gmail messages.");
      if (err.message?.includes('expired') || err.message?.includes('token')) {
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await authorizeGmail();
      setIsAuthenticated(true);
      await loadGmailData();
    } catch (err: any) {
      console.error("Authorization failed:", err);
      setErrorMsg(err.message || "Google Sign-In failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    clearGmailAccessToken();
    setIsAuthenticated(false);
    setUserProfile(null);
    setMessages([]);
    setSelectedMessage(null);
    setSuccessMsg("Disconnected from Gmail successfully.");
  };

  const handleTabChange = (tab: 'inbox' | 'sent' | 'compose') => {
    setActiveTab(tab);
    setSelectedMessage(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    if (tab !== 'compose' && isAuthenticated) {
      loadGmailData();
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthenticated) {
      loadGmailData();
    }
  };

  const applyTemplate = (templateType: 'enrollment' | 'invoice' | 'announcement' | 'reminder') => {
    switch (templateType) {
      case 'enrollment':
        setSubject("Guru Gedara Academy - Enrollment Confirmation & Welcome");
        setEmailBody(
          `<div style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6;">` +
          `<h2>Welcome to Guru Gedara Educational Centre!</h2>` +
          `<p>Dear Student/Guardian,</p>` +
          `<p>We are delighted to confirm your class enrollment. Your learning portal account is now fully active.</p>` +
          `<ul>` +
          `<li><strong>Academy Portal:</strong> Guru Gedara Learning Management</li>` +
          `<li><strong>Schedule:</strong> As listed in your portal dashboard</li>` +
          `</ul>` +
          `<p>If you have any questions, feel free to reply directly to this email.</p>` +
          `<br/><p>Warm regards,<br/><strong>Guru Gedara Administration Team</strong></p>` +
          `</div>`
        );
        break;
      case 'invoice':
        setSubject("Guru Gedara Academy - Tuition Payment Receipt & Statement");
        setEmailBody(
          `<div style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6;">` +
          `<h2>Tuition Payment Confirmation</h2>` +
          `<p>Dear Valued Student/Guardian,</p>` +
          `<p>Thank you for your payment. Your tuition fee record has been updated and approved in our financial ledger.</p>` +
          `<p>You can view your updated receipt and download attendance logs from your student dashboard anytime.</p>` +
          `<br/><p>Best regards,<br/><strong>Guru Gedara Accounts Department</strong></p>` +
          `</div>`
        );
        break;
      case 'announcement':
        setSubject("Guru Gedara Academy - Important Class Schedule Notice");
        setEmailBody(
          `<div style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6;">` +
          `<h2>Important Academic Update</h2>` +
          `<p>Dear Students,</p>` +
          `<p>Please take note of upcoming revisions to class schedules and laboratory session timetables.</p>` +
          `<p>Be sure to log into your portal for uploaded revision materials and class recordings.</p>` +
          `<br/><p>Sincerely,<br/><strong>Faculty Directorship</strong></p>` +
          `</div>`
        );
        break;
      case 'reminder':
        setSubject("Guru Gedara Academy - Upcoming Class & Revision Reminder");
        setEmailBody(
          `<div style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6;">` +
          `<h2>Class Reminder</h2>` +
          `<p>Hello,</p>` +
          `<p>This is a friendly reminder for your upcoming scheduled lecture and revision module.</p>` +
          `<p>Please prepare your notes and arrive 10 minutes before session commencement.</p>` +
          `<br/><p>Regards,<br/><strong>Guru Gedara Academic Services</strong></p>` +
          `</div>`
        );
        break;
    }
  };

  const handleSendPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !subject.trim() || !emailBody.trim()) {
      setErrorMsg("Recipient, Subject, and Email Body are required.");
      return;
    }
    // Show explicit user confirmation dialog
    setShowSendConfirmation(true);
  };

  const confirmAndSendEmail = async () => {
    setShowSendConfirmation(false);
    setIsSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await sendGmailMessage(recipient.trim(), subject.trim(), emailBody.trim());
      setSuccessMsg(`Email successfully sent via Gmail to ${recipient.trim()}!`);
      setRecipient('');
      setSubject('');
      setEmailBody('');
      setTimeout(() => {
        handleTabChange('sent');
      }, 1500);
    } catch (err: any) {
      console.error("Failed sending email:", err);
      setErrorMsg(err.message || "Failed to send email via Gmail.");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 rounded-xl text-white shadow-md shadow-red-900/30">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Gmail Communications Hub
                <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30 rounded-full">
                  Official Google Workspace
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {userProfile ? `Connected: ${userProfile.emailAddress}` : 'Send & receive emails directly via Gmail API'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <>
                <button
                  onClick={loadGmailData}
                  disabled={loading}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title="Refresh Mailbox"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-400' : ''}`} />
                </button>
                <button
                  onClick={handleDisconnect}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Disconnect Gmail"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!isAuthenticated ? (
          /* Unauthenticated State - Sign in with Google Button */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-900/50">
            <div className="max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl flex flex-col items-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 rounded-2xl flex items-center justify-center text-red-600 mb-4">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Connect Gmail Account
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                Authorize your Google account to send class notifications, payment statements, and manage student communications safely via Gmail.
              </p>

              {errorMsg && (
                <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Official Google Sign In Material Button */}
              <button
                onClick={handleAuthorize}
                disabled={loading}
                className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{loading ? 'Connecting Google Account...' : 'Sign in with Google'}</span>
              </button>

              <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Protected by Google Workspace OAuth 2.0</span>
              </div>
            </div>
          </div>
        ) : (
          /* Authenticated Mailbox Layout */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Navigation Sidebar */}
            <div className="w-full md:w-56 bg-slate-50 dark:bg-slate-800/60 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-2">
              <button
                onClick={() => handleTabChange('compose')}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mb-2"
              >
                <Send className="w-4 h-4" />
                <span>Compose Email</span>
              </button>

              <button
                onClick={() => handleTabChange('inbox')}
                className={`w-full py-2 px-3 rounded-xl font-medium text-sm flex items-center justify-between transition-colors ${
                  activeTab === 'inbox'
                    ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>Inbox</span>
                </div>
              </button>

              <button
                onClick={() => handleTabChange('sent')}
                className={`w-full py-2 px-3 rounded-xl font-medium text-sm flex items-center justify-between transition-colors ${
                  activeTab === 'sent'
                    ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  <span>Sent Mail</span>
                </div>
              </button>

              <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700/60">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Connected Profile</div>
                  <div className="text-slate-500 truncate">{userProfile?.emailAddress}</div>
                </div>
              </div>
            </div>

            {/* Main Section */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
              
              {/* Top Search bar for Inbox/Sent */}
              {activeTab !== 'compose' && (
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search ${activeTab === 'inbox' ? 'Inbox' : 'Sent Messages'}...`}
                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm rounded-xl transition-colors"
                    >
                      Search
                    </button>
                  </form>
                </div>
              )}

              {/* Status Alert Banner */}
              {errorMsg && (
                <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                  <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4" /></button>
                </div>
              )}

              {successMsg && (
                <div className="m-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                  <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
                </div>
              )}

              {/* View 1: COMPOSE TAB */}
              {activeTab === 'compose' ? (
                <div className="flex-1 p-6 overflow-y-auto">
                  <form onSubmit={handleSendPrompt} className="space-y-4 max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Send className="w-4 h-4 text-red-600" />
                        Compose Email via Gmail
                      </h3>
                      
                      {/* Template Selector */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-slate-500 font-medium">Quick Template:</span>
                        <button
                          type="button"
                          onClick={() => applyTemplate('enrollment')}
                          className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700"
                        >
                          Enrollment
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTemplate('invoice')}
                          className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700"
                        >
                          Invoice
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTemplate('announcement')}
                          className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700"
                        >
                          Class Update
                        </button>
                      </div>
                    </div>

                    {/* Recipient Input + Quick Picker */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Recipient Email Address *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          required
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                          placeholder="student@example.com"
                          className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        {usersList.length > 0 && (
                          <select
                            onChange={(e) => {
                              if (e.target.value) setRecipient(e.target.value);
                            }}
                            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 max-w-[180px]"
                          >
                            <option value="">Select Enrolled Student/Tutor...</option>
                            {usersList.filter(u => u.email).map((u) => (
                              <option key={u.uid} value={u.email}>
                                {u.name} ({u.role})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Subject Input */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Email Subject *
                      </label>
                      <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Notice regarding class timetable..."
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>

                    {/* Email Body */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Message Content (HTML Supported) *
                      </label>
                      <textarea
                        required
                        rows={10}
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        placeholder="Write your email body here..."
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-sans"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Will be sent officially from your connected Gmail address</span>
                      </div>

                      <button
                        type="submit"
                        disabled={isSending}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        <span>Send Email</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : selectedMessage ? (
                /* View 2: MESSAGE DETAIL VIEW */
                <div className="flex-1 p-6 overflow-y-auto flex flex-col">
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="self-start text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-red-600 mb-4 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to {activeTab === 'inbox' ? 'Inbox' : 'Sent'}
                  </button>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 mb-4 space-y-3">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedMessage.subject}
                    </h2>
                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700/60 pt-3 gap-2">
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">From:</span> {selectedMessage.from}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Date:</span> {selectedMessage.date}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-y-auto">
                    {selectedMessage.bodyHtml ? (
                      <div 
                        className="prose dark:prose-invert max-w-none text-sm text-slate-800 dark:text-slate-200 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: selectedMessage.bodyHtml }} 
                      />
                    ) : (
                      <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {selectedMessage.bodyText || selectedMessage.snippet}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={() => {
                        const replyTo = selectedMessage.from.match(/<([^>]+)>/)?.[1] || selectedMessage.from;
                        setRecipient(replyTo);
                        setSubject(`Re: ${selectedMessage.subject}`);
                        setActiveTab('compose');
                      }}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl flex items-center gap-2"
                    >
                      <CornerUpLeft className="w-4 h-4" />
                      Reply via Gmail
                    </button>
                  </div>
                </div>
              ) : (
                /* View 3: MESSAGES LIST VIEW */
                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                      <RefreshCw className="w-8 h-8 animate-spin mb-2 text-red-500" />
                      <p className="text-sm">Fetching Gmail messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                      <Mail className="w-12 h-12 mb-3 text-slate-300" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">No emails found</p>
                      <p className="text-xs text-slate-500 mt-1">Your {activeTab} is currently empty.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          onClick={() => setSelectedMessage(msg)}
                          className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors flex items-start justify-between gap-4"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                                {msg.from}
                              </span>
                            </div>
                            <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                              {msg.subject}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {msg.snippet}
                            </p>
                          </div>
                          <div className="text-xs text-slate-400 whitespace-nowrap pt-1">
                            {msg.date ? new Date(msg.date).toLocaleDateString() : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Confirmation Dialog for Destructive / Sending Action */}
        {showSendConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-950/50 rounded-xl flex items-center justify-center text-red-600 mb-4">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Confirm Sending Email
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                Are you sure you want to send this email officially via Gmail?
              </p>
              
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1 mb-6">
                <div><span className="font-semibold text-slate-700 dark:text-slate-300">To:</span> {recipient}</div>
                <div><span className="font-semibold text-slate-700 dark:text-slate-300">Subject:</span> {subject}</div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSendConfirmation(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium text-sm rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmAndSendEmail}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded-xl shadow-md flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Confirm & Send</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
