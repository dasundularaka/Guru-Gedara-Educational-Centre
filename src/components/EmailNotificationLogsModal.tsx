import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Filter, 
  Eye, 
  Trash2, 
  X, 
  Sparkles, 
  BookOpen, 
  CreditCard, 
  FileText, 
  Calendar, 
  UserCheck,
  ShieldCheck,
  Check,
  Copy,
  ExternalLink,
  Settings,
  Repeat,
  SendHorizontal,
  UserPlus,
  Award,
  Globe,
  Download,
  Key,
  Flame
} from 'lucide-react';
import { useEmailNotifications } from '../hooks/useEmailNotifications';
import { EmailNotificationLog, EmailTriggerEventType } from '../types';
import { downloadEmlFile, buildGmailComposeUrl, buildMailtoUrl } from '../lib/emailNotificationService';

interface EmailNotificationLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFilter?: string;
  userEmail?: string;
}

export const EmailNotificationLogsModal: React.FC<EmailNotificationLogsModalProps> = ({
  isOpen,
  onClose,
  defaultFilter = 'all',
  userEmail
}) => {
  const { 
    emailLogs, 
    emailSettings,
    isLoading, 
    isDispatching, 
    refreshLogs, 
    updateSettings,
    resendEmail,
    triggerTestEmail, 
    triggerCustomEmail,
    clearLogs 
  } = useEmailNotifications();

  const [activeTab, setActiveTab] = useState<'logs' | 'compose' | 'settings'>('logs');
  const [filterType, setFilterType] = useState<string>(defaultFilter);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<EmailNotificationLog | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'text' | 'metadata'>('preview');
  const [testEmailAddress, setTestEmailAddress] = useState<string>(userEmail || 'dasundularaka@gmail.com');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Custom Compose State
  const [composeTo, setComposeTo] = useState<string>('');
  const [composeCc, setComposeCc] = useState<string>('');
  const [composeSubject, setComposeSubject] = useState<string>('');
  const [composeBody, setComposeBody] = useState<string>('');
  const [isSendingCustom, setIsSendingCustom] = useState<boolean>(false);

  // Settings State
  const [senderName, setSenderName] = useState<string>(emailSettings.senderName);
  const [senderEmail, setSenderEmail] = useState<string>(emailSettings.senderEmail);
  const [replyToEmail, setReplyToEmail] = useState<string>(emailSettings.replyToEmail);
  const [webhookUrl, setWebhookUrl] = useState<string>(emailSettings.externalWebhookUrl || '');
  const [resendApiKey, setResendApiKey] = useState<string>(emailSettings.resendApiKey || '');
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [customResendRecipient, setCustomResendRecipient] = useState<string>('');
  const [showResendInput, setShowResendInput] = useState<boolean>(false);

  useEffect(() => {
    setSenderName(emailSettings.senderName);
    setSenderEmail(emailSettings.senderEmail);
    setReplyToEmail(emailSettings.replyToEmail);
    setWebhookUrl(emailSettings.externalWebhookUrl || '');
    setResendApiKey(emailSettings.resendApiKey || '');
  }, [emailSettings]);

  if (!isOpen) return null;

  const showInternalToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showInternalToast('Copied content to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendTest = async (type: 'booking' | 'payment' | 'resource' | 'attendance' | 'approval' | 'welcome') => {
    setIsSendingTest(true);
    try {
      const target = testEmailAddress.trim() || 'dasundularaka@gmail.com';
      const log = await triggerTestEmail(type, target);
      setSelectedLog(log);
      showInternalToast(`Automated ${type.toUpperCase()} email dispatched to ${target}!`);
    } catch (e) {
      showInternalToast('Failed to dispatch test email.');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleResend = async (customRecipient?: string) => {
    if (!selectedLog) return;
    setIsResending(true);
    try {
      const res = await resendEmail(selectedLog.id, customRecipient || undefined);
      setSelectedLog(res);
      setShowResendInput(false);
      setCustomResendRecipient('');
      showInternalToast(`Email resent successfully to ${Array.isArray(res.to) ? res.to.join(', ') : res.to}!`);
    } catch (e) {
      showInternalToast('Failed to resend email.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await updateSettings({
        senderName: senderName.trim(),
        senderEmail: senderEmail.trim(),
        replyToEmail: replyToEmail.trim(),
        externalWebhookUrl: webhookUrl.trim() || undefined,
        resendApiKey: resendApiKey.trim() || undefined
      });
      showInternalToast('Email configuration saved successfully!');
    } catch (e) {
      showInternalToast('Failed to save settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSendCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      showInternalToast('Please fill in destination email, subject, and message.');
      return;
    }
    setIsSendingCustom(true);
    try {
      const log = await triggerCustomEmail({
        to: composeTo.split(',').map(s => s.trim()),
        cc: composeCc ? composeCc.split(',').map(s => s.trim()) : undefined,
        subject: composeSubject.trim(),
        htmlContent: `<div style="font-family: sans-serif; padding: 20px; color: #334155; line-height: 1.6;"><h2 style="color: #1e1b4b; margin-top: 0;">${composeSubject}</h2><p>${composeBody.replace(/\n/g, '<br/>')}</p><hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;"/><p style="font-size: 12px; color: #64748b;">Dispatched from Guru Gedara Education Administrative Portal</p></div>`,
        textContent: `${composeSubject}\n\n${composeBody}\n\n---\nGuru Gedara Education`,
        eventType: 'custom_broadcast'
      });
      setSelectedLog(log);
      setActiveTab('logs');
      setComposeTo('');
      setComposeCc('');
      setComposeSubject('');
      setComposeBody('');
      showInternalToast('Custom broadcast email dispatched successfully!');
    } catch (e) {
      showInternalToast('Failed to dispatch broadcast email.');
    } finally {
      setIsSendingCustom(false);
    }
  };

  const filteredLogs = emailLogs.filter(log => {
    const matchesFilter = 
      filterType === 'all' || 
      (filterType === 'booking' && (log.eventType === 'booking_confirmation' || log.eventType === 'booking_tutor_alert')) ||
      (filterType === 'payment' && (log.eventType === 'payment_receipt' || log.eventType === 'payment_due_reminder')) ||
      (filterType === 'resource' && log.eventType === 'class_resource_added') ||
      (filterType === 'attendance' && (log.eventType === 'attendance_marked' || log.eventType === 'attendance_late_alert' || log.eventType === 'attendance_absent_alert')) ||
      (filterType === 'approval' && (log.eventType === 'student_approved' || log.eventType === 'account_created')) ||
      (filterType === 'updates' && (log.eventType === 'class_schedule_updated' || log.eventType === 'class_created' || log.eventType === 'custom_broadcast'));

    const searchLower = searchQuery.toLowerCase();
    const recipientStr = Array.isArray(log.to) ? log.to.join(' ') : log.to;
    const matchesSearch = 
      !searchQuery || 
      log.subject.toLowerCase().includes(searchLower) ||
      recipientStr.toLowerCase().includes(searchLower) ||
      (log.recipientName && log.recipientName.toLowerCase().includes(searchLower)) ||
      log.eventType.toLowerCase().includes(searchLower);

    return matchesFilter && matchesSearch;
  });

  const getEventBadge = (type: EmailTriggerEventType) => {
    switch (type) {
      case 'booking_confirmation':
      case 'booking_tutor_alert':
        return { label: 'Booking', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <BookOpen className="w-3 h-3" /> };
      case 'payment_receipt':
      case 'payment_due_reminder':
        return { label: 'Payment Receipt', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <CreditCard className="w-3 h-3" /> };
      case 'class_resource_added':
        return { label: 'Study Material', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: <FileText className="w-3 h-3" /> };
      case 'attendance_marked':
      case 'attendance_late_alert':
      case 'attendance_absent_alert':
        return { label: 'Attendance', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <UserCheck className="w-3 h-3" /> };
      case 'student_approved':
        return { label: 'Approval Notice', color: 'bg-emerald-50 text-emerald-800 border-emerald-300', icon: <Award className="w-3 h-3" /> };
      case 'account_created':
        return { label: 'Welcome / Login', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: <UserPlus className="w-3 h-3" /> };
      case 'class_schedule_updated':
      case 'class_created':
        return { label: 'Class Update', color: 'bg-sky-50 text-sky-700 border-sky-200', icon: <Calendar className="w-3 h-3" /> };
      default:
        return { label: 'Broadcast', color: 'bg-slate-50 text-slate-700 border-slate-200', icon: <Mail className="w-3 h-3" /> };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Automated Email Notification System</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Cloud Queue Active
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Automated email triggers for bookings, payment receipts, attendance check-ins, study materials, and account approvals.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switchers */}
            <div className="flex items-center bg-slate-200/80 p-1 rounded-xl text-xs font-semibold mr-2">
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'logs' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Email Queue ({emailLogs.length})
              </button>
              <button
                onClick={() => setActiveTab('compose')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  activeTab === 'compose' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SendHorizontal className="w-3 h-3" /> Broadcast
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  activeTab === 'settings' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Settings className="w-3 h-3" /> Settings
              </button>
            </div>

            <button
              onClick={() => refreshLogs()}
              disabled={isLoading}
              title="Refresh queue"
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar / Test Trigger Drawer */}
        {activeTab === 'logs' && (
          <div className="px-6 py-2.5 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Live Test Dispatch:
              </span>
              <input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="Target inbox email..."
                className="px-2.5 py-1 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 w-56 font-mono"
              />
              <button
                onClick={() => handleSendTest('booking')}
                disabled={isSendingTest || isDispatching}
                className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <BookOpen className="w-3 h-3" /> Booking
              </button>
              <button
                onClick={() => handleSendTest('payment')}
                disabled={isSendingTest || isDispatching}
                className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <CreditCard className="w-3 h-3" /> Payment
              </button>
              <button
                onClick={() => handleSendTest('attendance')}
                disabled={isSendingTest || isDispatching}
                className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <UserCheck className="w-3 h-3" /> Attendance
              </button>
              <button
                onClick={() => handleSendTest('resource')}
                disabled={isSendingTest || isDispatching}
                className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <FileText className="w-3 h-3" /> Resource
              </button>
              <button
                onClick={() => handleSendTest('approval')}
                disabled={isSendingTest || isDispatching}
                className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Award className="w-3 h-3" /> Approval
              </button>
              <button
                onClick={() => handleSendTest('welcome')}
                disabled={isSendingTest || isDispatching}
                className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-purple-600 hover:text-white text-purple-700 border border-purple-200 rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="w-3 h-3" /> Welcome
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-indigo-700 font-mono">
                Total: <span className="font-bold">{emailLogs.length}</span>
              </span>
              {emailLogs.length > 0 && (
                <button
                  onClick={clearLogs}
                  className="text-xs text-slate-400 hover:text-rose-600 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
                  title="Purge logs"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 1: Logs / History View */}
        {activeTab === 'logs' && (
          <div className="flex-1 flex overflow-hidden">
            
            {/* Left Column: Email Log History */}
            <div className="w-5/12 border-r border-slate-200 flex flex-col bg-slate-50/50">
              {/* Search & Filters */}
              <div className="p-3 border-b border-slate-200 space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search subject, email, recipient..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'booking', label: 'Bookings' },
                    { id: 'payment', label: 'Payments' },
                    { id: 'attendance', label: 'Attendance' },
                    { id: 'resource', label: 'Materials' },
                    { id: 'approval', label: 'Approvals' },
                    { id: 'updates', label: 'Updates' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilterType(f.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                        filterType === f.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <div className="py-16 text-center px-4">
                    <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">No email notification records</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                      Trigger bookings, payments, or attendance in the portal or dispatch live tests using the buttons above.
                    </p>
                  </div>
                ) : (
                  filteredLogs.map((log) => {
                    const badge = getEventBadge(log.eventType);
                    const isSelected = selectedLog?.id === log.id;
                    const recipientStr = Array.isArray(log.to) ? log.to[0] : log.to;

                    return (
                      <div
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={`p-3.5 cursor-pointer transition-all border-l-3 ${
                          isSelected 
                            ? 'bg-indigo-50/80 border-indigo-600 shadow-xs' 
                            : 'hover:bg-white border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badge.color}`}>
                            {badge.icon}
                            {badge.label}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="font-semibold text-xs text-slate-900 truncate mb-1">
                          {log.subject}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="truncate max-w-[180px]">
                            To: <span className="font-mono text-slate-700 font-medium">{recipientStr}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Sent
                          </span>
                        </div>

                        {log.cc && (
                          <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                            CC: {Array.isArray(log.cc) ? log.cc.join(', ') : log.cc}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Email Template Preview & Inspection */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              {selectedLog ? (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  
                  {/* Log Details Header */}
                  <div className="p-4 border-b border-slate-200 bg-slate-50/60 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getEventBadge(selectedLog.eventType).color}`}>
                            {getEventBadge(selectedLog.eventType).icon}
                            {selectedLog.eventType}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {selectedLog.id}</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1">
                          {selectedLog.subject}
                        </h3>
                      </div>

                      {/* Top Action buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Direct Gmail compose button */}
                        <a
                          href={selectedLog.webmailUrl || buildGmailComposeUrl(selectedLog.to, selectedLog.subject, selectedLog.textContent, selectedLog.cc)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                          title="Open pre-filled Gmail compose window ready to send in 1 click"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Open in Gmail
                          <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                        </a>

                        {/* Direct default Mail App button */}
                        <a
                          href={selectedLog.mailtoUrl || buildMailtoUrl(selectedLog.to, selectedLog.subject, selectedLog.textContent, selectedLog.cc)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-xs"
                          title="Open your device default mail application"
                        >
                          <Send className="w-3 h-3 text-slate-500" />
                          Mail App
                        </a>

                        {/* Download .EML button */}
                        <button
                          onClick={() => downloadEmlFile(selectedLog)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                          title="Download RFC-822 .eml file to open in Outlook, Apple Mail or Thunderbird"
                        >
                          <Download className="w-3 h-3 text-slate-500" />
                          .EML
                        </button>

                        <button
                          onClick={() => setShowResendInput(!showResendInput)}
                          disabled={isResending}
                          className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <Repeat className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                          Resend...
                        </button>

                        {/* View mode toggle */}
                        <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-medium">
                          <button
                            onClick={() => setViewMode('preview')}
                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              viewMode === 'preview' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            HTML View
                          </button>
                          <button
                            onClick={() => setViewMode('text')}
                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              viewMode === 'text' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Plain Text
                          </button>
                          <button
                            onClick={() => setViewMode('metadata')}
                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              viewMode === 'metadata' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Cloud JSON
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Resend to custom email drawer */}
                    {showResendInput && (
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-900 whitespace-nowrap">Resend to:</span>
                        <input
                          type="email"
                          value={customResendRecipient}
                          onChange={(e) => setCustomResendRecipient(e.target.value)}
                          placeholder="e.g. dasundularaka@gmail.com"
                          className="flex-1 px-2.5 py-1 text-xs bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-800"
                        />
                        <button
                          onClick={() => handleResend(customResendRecipient.trim())}
                          disabled={isResending}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isResending ? 'Sending...' : 'Send Now'}
                        </button>
                        <button
                          onClick={() => setShowResendInput(false)}
                          className="px-2 py-1 text-slate-500 hover:text-slate-700 text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Recipient details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-2.5 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Primary Recipient</span>
                        <span className="font-mono text-slate-800 font-semibold truncate block">
                          {Array.isArray(selectedLog.to) ? selectedLog.to.join(', ') : selectedLog.to}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Parent CC</span>
                        <span className="font-mono text-slate-700 truncate block">
                          {selectedLog.cc ? (Array.isArray(selectedLog.cc) ? selectedLog.cc.join(', ') : selectedLog.cc) : 'None'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Dispatched Timestamp</span>
                        <span className="text-slate-700 truncate block">
                          {new Date(selectedLog.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Delivery Channel</span>
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          {selectedLog.deliveryChannel || 'Firestore Mail Queue'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content View */}
                  <div className="flex-1 overflow-y-auto p-4 bg-slate-100/70">
                    {viewMode === 'preview' ? (
                      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                        <iframe
                          title="Email HTML Preview"
                          srcDoc={selectedLog.htmlContent}
                          className="w-full h-[520px] border-0"
                          sandbox="allow-same-origin"
                        />
                      </div>
                    ) : viewMode === 'text' ? (
                      <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plain-Text Alternative</span>
                          <button
                            onClick={() => handleCopyText(selectedLog.textContent, 'text')}
                            className="px-2.5 py-1 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            {copiedId === 'text' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            Copy Text
                          </button>
                        </div>
                        <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                          {selectedLog.textContent}
                        </pre>
                      </div>
                    ) : (
                      <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cloud Function Trigger Payload JSON</span>
                          <button
                            onClick={() => handleCopyText(JSON.stringify(selectedLog, null, 2), 'meta')}
                            className="px-2.5 py-1 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            {copiedId === 'meta' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            Copy JSON
                          </button>
                        </div>
                        <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-900 text-emerald-400 p-4 rounded-lg overflow-x-auto">
                          {JSON.stringify(selectedLog, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 border border-indigo-100">
                    <Eye className="w-8 h-8 text-indigo-500" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Select an email notification to inspect</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    View the rendered HTML layout, verify student and parent CC recipient addresses, resend emails, and inspect Firebase cloud delivery logs.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab 2: Compose Custom Broadcast Email */}
        {activeTab === 'compose' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <SendHorizontal className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Broadcast Custom Email Notice</h3>
                  <p className="text-xs text-slate-500">Send an official email announcement to students, parents, or staff.</p>
                </div>
              </div>

              <form onSubmit={handleSendCustom} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Recipient Email(s) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="student@example.com, parent@example.com"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">Separate multiple addresses with commas.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    CC Email(s) (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="admin@gurugedara.edu, parent@example.com"
                    value={composeCc}
                    onChange={(e) => setComposeCc(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subject Line <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 📢 Important Notice: Upcoming Term Mock Exam Schedule"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Message Content <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Write your announcement or notice here..."
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('logs')}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingCustom}
                    className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-md shadow-indigo-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSendingCustom ? 'Dispatching...' : 'Dispatch Email Broadcast'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tab 3: Email Sender Settings & Webhooks */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <Settings className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Email System Configuration</h3>
                  <p className="text-xs text-slate-500">Configure default sender identity, reply-to routing, and webhook triggers.</p>
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Default Sender Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="e.g. Guru Gedara Higher Educational Institute"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    System Sender Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="notifications@gurugedara.edu"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reply-To Support Email
                  </label>
                  <input
                    type="email"
                    required
                    value={replyToEmail}
                    onChange={(e) => setReplyToEmail(e.target.value)}
                    placeholder="support@gurugedara.edu"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Resend.com Direct Outbound API Key (Optional)</span>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> 100% Real Live Inbox Delivery
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={resendApiKey}
                      onChange={(e) => setResendApiKey(e.target.value)}
                      placeholder="re_123456789..."
                      className="w-full px-3 py-2 pl-9 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    If provided, transactional emails are sent directly via Resend API to actual destination inboxes (<a href="https://resend.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">free tier available at resend.com</a>).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    External Email Webhook URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://hook.eu1.make.com/... or Zapier/Resend Webhook"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    If configured, outbound notifications will also trigger an HTTP POST webhook with full recipient and message payload for external SMTP/SMS forwarding.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    Complete Email Delivery Architecture:
                  </div>
                  <ul className="text-[11px] space-y-1 list-disc pl-4 leading-relaxed">
                    <li><strong>Firebase Extension:</strong> Writes directly to the <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200 text-indigo-700">mail</code> collection for the Firebase Trigger Email Extension with SMTP credentials.</li>
                    <li><strong>1-Click Gmail &amp; Mail App:</strong> Open formatted emails directly in your Gmail webmail or native mail client.</li>
                    <li><strong>Direct API Dispatch:</strong> Optional Resend or Webhook integration for instant delivery.</li>
                  </ul>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('logs')}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Back to Logs
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-md shadow-indigo-200 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingSettings ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Automated Event Dispatcher Active • Synced with Firestore <code className="font-mono text-slate-700 bg-slate-200 px-1 py-0.5 rounded">mail</code> &amp; <code className="font-mono text-slate-700 bg-slate-200 px-1 py-0.5 rounded">email_notifications</code></span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute bottom-16 right-6 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 animate-in slide-in-from-bottom-2 flex items-center gap-2 z-50">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toastMessage}
          </div>
        )}

      </div>
    </div>
  );
};
