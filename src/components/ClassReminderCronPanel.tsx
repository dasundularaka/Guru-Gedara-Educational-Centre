import React, { useState, useEffect } from 'react';
import { 
  run24HourClassReminderCron, 
  getSentEmailLogs, 
  ClassReminderAlertLog, 
  CronRunResult 
} from '../lib/classReminderCronTrigger';
import { useApp } from '../context/AppContext';
import { 
  Clock, 
  Mail, 
  Bell, 
  Zap, 
  CheckCircle2, 
  RefreshCw, 
  Send, 
  Sparkles, 
  Calendar, 
  ChevronRight,
  Eye,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ClassReminderCronPanel: React.FC = () => {
  const { showToast, refreshNotifications } = useApp();
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<CronRunResult | null>(null);
  const [sentLogs, setSentLogs] = useState<ClassReminderAlertLog[]>([]);
  const [selectedLogModal, setSelectedLogModal] = useState<ClassReminderAlertLog | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'email' | 'in_app'>('all');

  const reloadLogs = () => {
    setSentLogs(getSentEmailLogs());
  };

  useEffect(() => {
    reloadLogs();
  }, []);

  const handleManualCronTrigger = async (force: boolean = false) => {
    setIsRunning(true);
    try {
      const result = await run24HourClassReminderCron(force);
      setLastResult(result);
      reloadLogs();
      await refreshNotifications();

      if (result.triggeredAlertsCount > 0) {
        showToast(
          `Cron executed successfully! Dispatched ${result.triggeredAlertsCount} 24-hour reminder email & in-app alerts.`,
          'success'
        );
      } else {
        showToast(
          `Cron executed. Evaluated ${result.totalBookingsEvaluated} active class bookings. No pending 24h triggers required at this moment.`,
          'info'
        );
      }
    } catch (e) {
      console.error("Manual cron run error:", e);
      showToast("Error triggering 24h reminder cron job.", "error");
    } finally {
      setIsRunning(false);
    }
  };

  const filteredLogs = sentLogs.filter(log => {
    if (activeFilter === 'email') return log.emailAlertSent;
    if (activeFilter === 'in_app') return log.inAppAlertSent;
    return true;
  });

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm space-y-6">
      
      {/* Header & Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Clock className="w-5 h-5" />
            </span>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              24-Hour Class Reminder Cron Trigger
            </h3>
            <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Background Cron
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
            Automatically scans upcoming class schedules and sends automated email reminders and in-app alerts to enrolled students exactly 24 hours prior to class commencement.
          </p>
        </div>

        {/* Control Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="trigger_24h_cron_btn"
            onClick={() => handleManualCronTrigger(false)}
            disabled={isRunning}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-sm hover:shadow flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Evaluating Schedules...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300" /> Run 24h Cron Check
              </>
            )}
          </button>

          <button
            id="force_trigger_24h_cron_btn"
            onClick={() => handleManualCronTrigger(true)}
            disabled={isRunning}
            title="Force trigger reminders for all active student bookings for testing"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5 text-indigo-500" /> Force Test Dispatch
          </button>
        </div>
      </div>

      {/* Execution Metrics Summary */}
      {lastResult && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-100 dark:border-slate-700/60">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Last Run Timestamp</span>
            <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200 mt-1 block">
              {new Date(lastResult.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-100 dark:border-slate-700/60">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Active Bookings Evaluated</span>
            <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 block font-mono">
              {lastResult.totalBookingsEvaluated} Class Sessions
            </span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-100 dark:border-slate-700/60">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Reminders Dispatched</span>
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block font-mono flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> {lastResult.triggeredAlertsCount} Alerts
            </span>
          </div>
        </div>
      )}

      {/* Dispatched Email Outbox & In-App Alert Logs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-500" /> Sent Email & Alert Outbox ({sentLogs.length})
          </h4>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl text-[11px] font-bold text-slate-500">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${activeFilter === 'all' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'hover:text-slate-800'}`}
            >
              All Alerts
            </button>
            <button
              onClick={() => setActiveFilter('email')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${activeFilter === 'email' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'hover:text-slate-800'}`}
            >
              Email Outbox
            </button>
            <button
              onClick={() => setActiveFilter('in_app')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${activeFilter === 'in_app' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'hover:text-slate-800'}`}
            >
              In-App Alerts
            </button>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-700/20 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
            <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">No 24-hour reminder alert logs recorded yet.</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Click <span className="font-bold text-indigo-600 dark:text-indigo-400">"Run 24h Cron Check"</span> or <span className="font-bold text-indigo-600 dark:text-indigo-400">"Force Test Dispatch"</span> above to evaluate class schedules.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {filteredLogs.map(log => (
              <div 
                key={log.id}
                className="p-3.5 bg-slate-50/70 dark:bg-slate-700/40 hover:bg-slate-100/80 dark:hover:bg-slate-700/70 border border-slate-100 dark:border-slate-700/60 rounded-2xl transition-all flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-indigo-100 dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 rounded-xl shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-800 dark:text-white truncate">
                        {log.classTitle}
                      </span>
                      <span className="text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                        To: {log.studentName} ({log.studentEmail})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      Scheduled: <span className="font-bold text-slate-700 dark:text-slate-300">{log.scheduledDate} @ {log.scheduledTime}</span> • {log.emailSubject}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex flex-col items-end text-[10px] font-mono">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Dispatched
                    </span>
                    <span className="text-slate-400">
                      {new Date(log.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedLogModal(log)}
                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-white dark:hover:bg-slate-600 transition-all cursor-pointer"
                    title="View Email Body Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Email Body Preview Modal */}
      <AnimatePresence>
        {selectedLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <Mail className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Sent Email Notification Preview
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400">
                      ID: {selectedLogModal.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLogModal(null)}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 dark:bg-slate-700/40 p-3 rounded-2xl space-y-1 font-mono text-[11px]">
                  <div><span className="text-slate-400">Recipient:</span> <span className="font-bold text-slate-800 dark:text-white">{selectedLogModal.studentName} &lt;{selectedLogModal.studentEmail}&gt;</span></div>
                  <div><span className="text-slate-400">Subject:</span> <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedLogModal.emailSubject}</span></div>
                  <div><span className="text-slate-400">Class:</span> <span className="font-bold text-slate-800 dark:text-white">{selectedLogModal.classTitle}</span></div>
                  <div><span className="text-slate-400">Faculty:</span> <span className="font-bold text-slate-800 dark:text-white">{selectedLogModal.tutorName}</span></div>
                  <div><span className="text-slate-400">Scheduled Time:</span> <span className="font-bold text-amber-600 dark:text-amber-400">{selectedLogModal.scheduledDate} @ {selectedLogModal.scheduledTime}</span></div>
                </div>

                <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl space-y-3 font-sans leading-relaxed border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Guru Gedara Academy Mailer
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      24h Class Alert
                    </span>
                  </div>

                  <p className="font-semibold text-slate-100">
                    Dear {selectedLogModal.studentName},
                  </p>

                  <p className="text-slate-300">
                    This is an automated 24-hour advance reminder that your enrolled class session <strong className="text-white">{selectedLogModal.classTitle}</strong> with <strong className="text-white">{selectedLogModal.tutorName}</strong> is starting in 24 hours.
                  </p>

                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-1 text-[11px] font-mono text-indigo-300">
                    <div>📅 <strong>Date:</strong> {selectedLogModal.scheduledDate}</div>
                    <div>⏰ <strong>Time:</strong> {selectedLogModal.scheduledTime}</div>
                    <div>📍 <strong>Venue:</strong> Guru Gedara Interactive Smart Classroom</div>
                  </div>

                  <p className="text-slate-400 text-[11px]">
                    Please verify that your course notes, homework submissions, and study materials are prepared prior to check-in.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
