import React, { useState } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { useEmailNotifications } from '../hooks/useEmailNotifications';
import { EmailNotificationLog, EmailTriggerEventType } from '../types';

interface EmailNotificationLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFilter?: string;
}

export const EmailNotificationLogsModal: React.FC<EmailNotificationLogsModalProps> = ({
  isOpen,
  onClose,
  defaultFilter = 'all'
}) => {
  const { 
    emailLogs, 
    isLoading, 
    isDispatching, 
    refreshLogs, 
    triggerTestEmail, 
    clearLogs 
  } = useEmailNotifications();

  const [filterType, setFilterType] = useState<string>(defaultFilter);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<EmailNotificationLog | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'text' | 'metadata'>('preview');
  const [testEmailAddress, setTestEmailAddress] = useState<string>('student@gurugedara.edu');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const showInternalToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showInternalToast('Copied content to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendTest = async (type: 'booking' | 'payment' | 'resource' | 'attendance') => {
    setIsSendingTest(true);
    try {
      const log = await triggerTestEmail(type, testEmailAddress);
      setSelectedLog(log);
      showInternalToast(`Automated ${type.toUpperCase()} email triggered successfully!`);
    } catch (e) {
      showInternalToast('Failed to trigger test email.');
    } finally {
      setIsSendingTest(false);
    }
  };

  const filteredLogs = emailLogs.filter(log => {
    const matchesFilter = 
      filterType === 'all' || 
      (filterType === 'booking' && (log.eventType === 'booking_confirmation' || log.eventType === 'booking_tutor_alert')) ||
      (filterType === 'payment' && (log.eventType === 'payment_receipt' || log.eventType === 'payment_due_reminder')) ||
      (filterType === 'resource' && log.eventType === 'class_resource_added') ||
      (filterType === 'attendance' && (log.eventType === 'attendance_marked' || log.eventType === 'attendance_late_alert' || log.eventType === 'attendance_absent_alert')) ||
      (filterType === 'updates' && (log.eventType === 'class_schedule_updated' || log.eventType === 'class_created'));

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
      case 'class_schedule_updated':
      case 'class_created':
        return { label: 'Class Update', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: <Calendar className="w-3 h-3" /> };
      default:
        return { label: 'Notification', color: 'bg-slate-50 text-slate-700 border-slate-200', icon: <Mail className="w-3 h-3" /> };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Automated Email Notification Service</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Firebase Cloud Service
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Automated email triggers for bookings, payment receipts, attendance check-ins, and study materials.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshLogs()}
              disabled={isLoading}
              title="Refresh logs"
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar / Test Trigger Drawer */}
        <div className="px-6 py-3 bg-indigo-50/60 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-indigo-900 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Instant Test Dispatch:
            </span>
            <input
              type="email"
              value={testEmailAddress}
              onChange={(e) => setTestEmailAddress(e.target.value)}
              placeholder="Destination email"
              className="px-2.5 py-1 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 w-52"
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
              onClick={() => handleSendTest('resource')}
              disabled={isSendingTest || isDispatching}
              className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-3 h-3" /> Resource
            </button>
            <button
              onClick={() => handleSendTest('attendance')}
              disabled={isSendingTest || isDispatching}
              className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <UserCheck className="w-3 h-3" /> Attendance
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-indigo-700 font-mono">
              Queue: <span className="font-bold">{emailLogs.length}</span> records
            </span>
            {emailLogs.length > 0 && (
              <button
                onClick={clearLogs}
                className="text-xs text-slate-400 hover:text-rose-600 px-2 py-1 rounded transition-colors flex items-center gap-1"
                title="Clear local logs"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Content Body: Split Layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Column: Email Log History */}
          <div className="w-5/12 border-r border-slate-200 flex flex-col bg-slate-50/40">
            {/* Search & Filters */}
            <div className="p-3 border-b border-slate-200 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search subject, recipient, event..."
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
                  { id: 'resource', label: 'Materials' },
                  { id: 'attendance', label: 'Attendance' },
                  { id: 'updates', label: 'Updates' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterType(f.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
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
                <div className="py-12 text-center px-4">
                  <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No email notification records</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Trigger actions in the app or use the test buttons above to simulate email dispatches.
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
                          ? 'bg-indigo-50/70 border-indigo-600 shadow-xs' 
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
                          To: <span className="font-mono text-slate-700">{recipientStr}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
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
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getEventBadge(selectedLog.eventType).color}`}>
                        {getEventBadge(selectedLog.eventType).icon}
                        {selectedLog.eventType}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">
                        {selectedLog.subject}
                      </h3>
                    </div>

                    {/* View mode toggle */}
                    <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-medium">
                      <button
                        onClick={() => setViewMode('preview')}
                        className={`px-3 py-1 rounded-md transition-all ${
                          viewMode === 'preview' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        HTML Preview
                      </button>
                      <button
                        onClick={() => setViewMode('text')}
                        className={`px-3 py-1 rounded-md transition-all ${
                          viewMode === 'text' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Plain Text
                      </button>
                      <button
                        onClick={() => setViewMode('metadata')}
                        className={`px-3 py-1 rounded-md transition-all ${
                          viewMode === 'metadata' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Cloud Data
                      </button>
                    </div>
                  </div>

                  {/* Recipient details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-2.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Recipient (To)</span>
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
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Dispatched At</span>
                      <span className="text-slate-700 truncate block">
                        {new Date(selectedLog.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Cloud Function</span>
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" /> Active Queue
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
                          className="px-2.5 py-1 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center gap-1"
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
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cloud Function Payload JSON</span>
                        <button
                          onClick={() => handleCopyText(JSON.stringify(selectedLog, null, 2), 'meta')}
                          className="px-2.5 py-1 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center gap-1"
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
                  View the rendered HTML layout, verify student and parent CC recipient addresses, and examine Firebase trigger payloads.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Automated Event Dispatcher Active • Synced with Firestore <code className="font-mono text-slate-700 bg-slate-200 px-1 py-0.5 rounded">mail</code> &amp; <code className="font-mono text-slate-700 bg-slate-200 px-1 py-0.5 rounded">email_notifications</code></span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute bottom-16 right-6 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 animate-in slide-in-from-bottom-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toastMessage}
          </div>
        )}

      </div>
    </div>
  );
};
