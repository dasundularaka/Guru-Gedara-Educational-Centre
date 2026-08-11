import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Sparkles, 
  Check, 
  Eye, 
  ExternalLink,
  ShieldCheck,
  Bell,
  BellRing
} from 'lucide-react';
import { 
  fetchGoogleCalendarEvents, 
  GoogleCalendarEvent 
} from '../lib/googleCalendarService';
import { 
  sendGmailEmail, 
  buildPaymentReminderHtml, 
  EmailReminderPayload 
} from '../lib/gmailService';
import { Payment } from '../types';

interface GmailLogEntry {
  id: string;
  paymentId: string;
  classTitle: string;
  recipientEmail: string;
  calendarEventTitle: string;
  calendarEventDate: string;
  dueDate: string;
  amount: number;
  sentAt: string;
  gmailMessageId?: string;
  status: 'sent' | 'failed' | 'scheduled';
}

interface GoogleCalendarPaymentRemindersProps {
  payments?: Payment[];
}

export const GoogleCalendarPaymentReminders: React.FC<GoogleCalendarPaymentRemindersProps> = ({ payments = [] }) => {
  const { currentUser, googleAccessToken, connectGoogleCalendar, showToast, classes } = useApp();

  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [autoEmailEnabled, setAutoEmailEnabled] = useState<boolean>(() => {
    if (!currentUser?.uid) return true;
    const saved = localStorage.getItem(`auto_gmail_reminders_${currentUser.uid}`);
    return saved !== null ? saved === 'true' : true;
  });

  const [emailLogs, setEmailLogs] = useState<GmailLogEntry[]>(() => {
    if (!currentUser?.uid) return [];
    try {
      const saved = localStorage.getItem(`gmail_reminder_logs_${currentUser.uid}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [previewPayload, setPreviewPayload] = useState<EmailReminderPayload | null>(null);

  // Save auto email preference
  useEffect(() => {
    if (currentUser?.uid) {
      localStorage.setItem(`auto_gmail_reminders_${currentUser.uid}`, String(autoEmailEnabled));
    }
  }, [autoEmailEnabled, currentUser?.uid]);

  // Save logs
  useEffect(() => {
    if (currentUser?.uid) {
      localStorage.setItem(`gmail_reminder_logs_${currentUser.uid}`, JSON.stringify(emailLogs));
    }
  }, [emailLogs, currentUser?.uid]);

  // Fetch Google Calendar Events
  const loadCalendarEvents = async () => {
    if (!googleAccessToken) return;
    setLoadingEvents(true);
    try {
      const events = await fetchGoogleCalendarEvents(googleAccessToken);
      setCalendarEvents(events);
    } catch (err: any) {
      console.warn("Could not fetch Google Calendar events:", err);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (googleAccessToken) {
      loadCalendarEvents();
    }
  }, [googleAccessToken]);

  // Get pending payments
  const pendingPayments = payments.filter(p => p.status === 'pending');

  // Match Google Calendar event dates with payments
  const getEventTriggerForPayment = (payment: Payment) => {
    // Search calendar events for matching course title or tuition keywords
    const matchedEvent = calendarEvents.find(evt => 
      evt.summary.toLowerCase().includes(payment.classTitle.toLowerCase()) ||
      payment.classTitle.toLowerCase().includes(evt.summary.toLowerCase()) ||
      evt.summary.toLowerCase().includes('tuition') ||
      evt.summary.toLowerCase().includes('guru gedara')
    );

    if (matchedEvent && (matchedEvent.start.dateTime || matchedEvent.start.date)) {
      const eventDateStr = matchedEvent.start.dateTime || matchedEvent.start.date || '';
      const eventDateObj = new Date(eventDateStr);
      return {
        eventTitle: matchedEvent.summary,
        eventDateStr: eventDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        rawDate: eventDateObj
      };
    }

    // Fallback: Use payment due date as trigger date
    const fallbackDateObj = payment.dueDate 
      ? new Date(payment.dueDate) 
      : new Date(new Date(payment.date).getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
      eventTitle: `Google Calendar: ${payment.classTitle} Lecture Session`,
      eventDateStr: fallbackDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      rawDate: fallbackDateObj
    };
  };

  // Dispatch single email reminder via Gmail API
  const handleSendReminder = async (payment: Payment) => {
    if (!currentUser?.email) {
      showToast("User email not found. Please log in with a valid account.", "error");
      return;
    }

    if (!googleAccessToken) {
      showToast("Google OAuth token required to send Gmail emails. Please connect your Google account.", "info");
      await connectGoogleCalendar();
      return;
    }

    const triggerInfo = getEventTriggerForPayment(payment);
    const recipientEmail = currentUser.email;

    const payload: EmailReminderPayload = {
      to: recipientEmail,
      studentName: currentUser.name || currentUser.displayName || currentUser.email.split('@')[0],
      classTitle: payment.classTitle,
      amount: payment.amount,
      dueDate: triggerInfo.eventDateStr,
      calendarEventTitle: triggerInfo.eventTitle,
      calendarEventDate: triggerInfo.eventDateStr
    };

    setSendingEmailId(payment.id);

    try {
      const htmlBody = buildPaymentReminderHtml(payload);
      const subject = `[Guru Gedara] Upcoming Tuition Payment Reminder - ${payment.classTitle}`;
      
      const res = await sendGmailEmail(googleAccessToken, recipientEmail, subject, htmlBody);

      const logEntry: GmailLogEntry = {
        id: `gmail_log_${Date.now()}`,
        paymentId: payment.id,
        classTitle: payment.classTitle,
        recipientEmail,
        calendarEventTitle: triggerInfo.eventTitle,
        calendarEventDate: triggerInfo.eventDateStr,
        dueDate: triggerInfo.eventDateStr,
        amount: payment.amount,
        sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        gmailMessageId: res.id,
        status: 'sent'
      };

      setEmailLogs(prev => [logEntry, ...prev]);
      showToast(`⚡ Automated email reminder sent via Gmail API to ${recipientEmail}!`, "success");
    } catch (err: any) {
      console.error("Gmail Dispatch Error:", err);
      showToast(`Gmail Dispatch Error: ${err.message || 'Failed to send via Gmail API'}`, "error");

      const failedLogEntry: GmailLogEntry = {
        id: `gmail_log_${Date.now()}`,
        paymentId: payment.id,
        classTitle: payment.classTitle,
        recipientEmail,
        calendarEventTitle: triggerInfo.eventTitle,
        calendarEventDate: triggerInfo.eventDateStr,
        dueDate: triggerInfo.eventDateStr,
        amount: payment.amount,
        sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'failed'
      };
      setEmailLogs(prev => [failedLogEntry, ...prev]);
    } finally {
      setSendingEmailId(null);
    }
  };

  // Automated background email trigger check
  useEffect(() => {
    if (!autoEmailEnabled || !googleAccessToken || !currentUser?.email || pendingPayments.length === 0) {
      return;
    }

    const checkAndTriggerAutomatedEmails = () => {
      const now = new Date();
      pendingPayments.forEach(payment => {
        const trigger = getEventTriggerForPayment(payment);
        const diffTime = trigger.rawDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // If trigger is within 3 days and not already sent today
        const alreadySent = emailLogs.some(
          log => log.paymentId === payment.id && log.status === 'sent' && log.calendarEventDate === trigger.eventDateStr
        );

        if (!alreadySent && diffDays <= 3 && diffDays >= 0) {
          handleSendReminder(payment);
        }
      });
    };

    const interval = setInterval(checkAndTriggerAutomatedEmails, 120000); // Check every 2 mins
    return () => clearInterval(interval);
  }, [autoEmailEnabled, googleAccessToken, currentUser, pendingPayments, emailLogs]);

  return (
    <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-6">
      {/* Background Accent Mesh */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 text-indigo-400 rounded-2xl shadow-inner">
            <Mail className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                Google Calendar Automated Gmail Payment Reminders
              </h3>
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[10px] font-bold font-mono uppercase">
                OAuth 2.0 Gmail
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Trigger automated email reminders to your Gmail using Google Calendar event dates as the schedule source.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {!googleAccessToken ? (
            <button
              onClick={connectGoogleCalendar}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <CalendarIcon className="w-4 h-4" /> Connect Google OAuth
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Google OAuth Active
              </span>
              <button
                onClick={loadCalendarEvents}
                disabled={loadingEvents}
                title="Refresh Google Calendar Events"
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer border border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingEvents ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Feature Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Col: Pending Deadlines Trigger Source Table */}
        <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h4 className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-2 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Event Trigger Sources & Due Dates
            </h4>

            {/* Toggle Switch for Auto Emailing */}
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[11px] text-slate-300 font-bold">Auto Email Reminders</span>
              <button
                type="button"
                onClick={() => setAutoEmailEnabled(!autoEmailEnabled)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoEmailEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    autoEmailEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </label>
          </div>

          {pendingPayments.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs italic">
              No pending payment invoices found. All tuition fees are up to date!
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {pendingPayments.map(payment => {
                const trigger = getEventTriggerForPayment(payment);
                const isSending = sendingEmailId === payment.id;
                const sentLog = emailLogs.find(l => l.paymentId === payment.id && l.status === 'sent');

                return (
                  <div 
                    key={`trigger_${payment.id}`}
                    className="p-3.5 bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl space-y-2 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="text-xs font-extrabold text-white">{payment.classTitle}</h5>
                        <p className="text-[10px] text-indigo-300/80 font-mono mt-0.5 flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3 text-indigo-400" /> Trigger Source: {trigger.eventTitle}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-black text-amber-400">
                        LKR {payment.amount.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/60">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-400" /> Calendar Trigger Date: <strong className="text-white">{trigger.eventDateStr}</strong>
                      </span>

                      <div className="flex items-center gap-2 mt-1 sm:mt-0">
                        {sentLog ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Sent ({sentLog.sentAt})
                          </span>
                        ) : null}

                        <button
                          onClick={() => {
                            const payload: EmailReminderPayload = {
                              to: currentUser?.email || 'student@example.com',
                              studentName: currentUser?.name || currentUser?.displayName || 'Student',
                              classTitle: payment.classTitle,
                              amount: payment.amount,
                              dueDate: trigger.eventDateStr,
                              calendarEventTitle: trigger.eventTitle,
                              calendarEventDate: trigger.eventDateStr
                            };
                            setPreviewPayload(payload);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold transition-all flex items-center gap-1 cursor-pointer border border-slate-700"
                        >
                          <Eye className="w-3 h-3 text-indigo-300" /> Preview Email
                        </button>

                        <button
                          onClick={() => handleSendReminder(payment)}
                          disabled={isSending}
                          className="px-2.5 py-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black rounded transition-all flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          {isSending ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          <span>Send Gmail</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Gmail Reminder Dispatch Logs */}
        <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h4 className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-2 font-mono">
              <Mail className="w-3.5 h-3.5 text-indigo-400" /> Gmail Dispatch History
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">
              {emailLogs.length} Logged Entries
            </span>
          </div>

          {emailLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs italic">
              No Gmail payment reminders sent yet. Click 'Send Gmail' or enable automated background email reminders.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 font-mono text-[11px]">
              {emailLogs.map((log) => (
                <div 
                  key={log.id} 
                  className={`p-3 rounded-xl border space-y-1.5 transition-all ${
                    log.status === 'sent' 
                      ? 'bg-slate-900/90 border-emerald-500/30' 
                      : 'bg-rose-950/20 border-rose-800/40'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-extrabold text-white truncate pr-2">{log.classTitle}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      log.status === 'sent' 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {log.status}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 space-y-0.5">
                    <p>To: <span className="text-indigo-300">{log.recipientEmail}</span></p>
                    <p>Trigger: <span className="text-slate-300">{log.calendarEventDate}</span></p>
                    {log.gmailMessageId && (
                      <p className="text-[9px] text-slate-500 truncate">Gmail Msg ID: {log.gmailMessageId}</p>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[9px] text-slate-500 border-t border-slate-800/60 pt-1">
                    <span>Dispatch Time: {log.sentAt}</span>
                    <span className="text-amber-300 font-bold">LKR {log.amount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Email Modal */}
      <AnimatePresence>
        {previewPayload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white text-slate-900 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                <div className="flex items-center gap-2 text-indigo-900 font-black text-sm">
                  <Mail className="w-4 h-4 text-indigo-600" /> Automated Gmail Reminder Preview
                </div>
                <button
                  onClick={() => setPreviewPayload(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Close ✕
                </button>
              </div>

              {/* Render HTML preview */}
              <div 
                className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner bg-slate-50 p-2 text-xs"
                dangerouslySetInnerHTML={{ __html: buildPaymentReminderHtml(previewPayload) }}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setPreviewPayload(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const matchedPayment = payments.find(p => p.classTitle === previewPayload.classTitle);
                    setPreviewPayload(null);
                    if (matchedPayment) {
                      handleSendReminder(matchedPayment);
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Send className="w-3.5 h-3.5" /> Send Gmail Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
