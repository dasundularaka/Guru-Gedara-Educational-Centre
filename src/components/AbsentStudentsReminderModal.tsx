import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  X, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Calendar, 
  BookOpen, 
  FileText, 
  Sparkles, 
  Link as LinkIcon, 
  Check, 
  Clock, 
  ShieldAlert, 
  Eye, 
  Edit3,
  Loader2
} from 'lucide-react';
import { ClassItem, UserProfile, EmailNotificationLog } from '../types';
import { emailNotificationService } from '../lib/emailNotificationService';

export interface AbsentStudentItem {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  parentEmail?: string;
  bookingId?: string;
}

interface AbsentStudentsReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClass?: ClassItem | null;
  selectedDate: string;
  absentStudents: AbsentStudentItem[];
  currentUser?: UserProfile | null;
  onSuccess?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AbsentStudentsReminderModal: React.FC<AbsentStudentsReminderModalProps> = ({
  isOpen,
  onClose,
  selectedClass,
  selectedDate,
  absentStudents,
  currentUser,
  onSuccess,
  showToast
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(absentStudents.map(s => s.studentId))
  );
  const [customMessage, setCustomMessage] = useState<string>(
    'Please review the uploaded session notes and complete the weekly assignment exercises before our next class session.'
  );
  const [recordingUrl, setRecordingUrl] = useState<string>('');
  const [activeView, setActiveView] = useState<'compose' | 'preview'>('compose');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [dispatchResults, setDispatchResults] = useState<{
    sentCount: number;
    failedCount: number;
    completed: boolean;
    logs: EmailNotificationLog[];
  } | null>(null);

  // Sync selectedIds when absentStudents change
  React.useEffect(() => {
    setSelectedIds(new Set(absentStudents.map(s => s.studentId)));
    setDispatchResults(null);
  }, [absentStudents, isOpen]);

  if (!isOpen) return null;

  const toggleSelectStudent = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === absentStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(absentStudents.map(s => s.studentId)));
    }
  };

  const targetStudents = absentStudents.filter(s => selectedIds.has(s.studentId));
  const classTitle = selectedClass?.title || 'Class Session';
  const tutorName = selectedClass?.tutorName || currentUser?.name || 'Course Instructor';

  const handleSendReminders = async () => {
    if (targetStudents.length === 0) {
      showToast('Please select at least one absent student to notify.', 'error');
      return;
    }

    setIsSending(true);
    try {
      const result = await emailNotificationService.notifyBulkAbsentStudents({
        absentStudents: targetStudents,
        classItem: selectedClass || {
          id: 'manual_class',
          title: classTitle,
          tutorName: tutorName,
          tutorId: currentUser?.uid || 'tutor',
          subject: 'Academic Study',
          dayOfWeek: 'Monday',
          description: 'Class session',
          schedule: selectedClass?.schedule || 'Scheduled Session',
          timeSlot: selectedClass?.timeSlot || 'Scheduled Time',
          price: 0,
          maxSlots: 50,
          bookedSlots: absentStudents.length
        },
        tutorUser: currentUser,
        sessionDate: selectedDate,
        customTutorMessage: customMessage.trim() || undefined,
        recordingUrl: recordingUrl.trim() || undefined
      });

      setDispatchResults({
        sentCount: result.successful,
        failedCount: result.totalSent - result.successful,
        completed: true,
        logs: result.logs
      });

      showToast(`Successfully dispatched ${result.successful} absence reminder email(s)!`, 'success');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Failed sending bulk absent reminders:', err);
      showToast('Failed to dispatch some reminder emails. Please check connectivity.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-600 via-red-600 to-indigo-700 text-white flex justify-between items-start shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md shrink-0">
                <Mail className="w-5 h-5 text-rose-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-200 font-mono">
                    Tutor Attendance Follow-Up
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/40 border border-rose-300/30 text-white text-[10px] font-bold">
                    Automated Dispatcher
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight mt-0.5">
                  Send Absence Catch-Up Reminder Emails
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Subheader info bar */}
          <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5 font-bold">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> {classTitle}
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> {selectedDate}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveView('compose')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeView === 'compose'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" /> Compose
              </button>
              <button
                type="button"
                onClick={() => setActiveView('preview')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeView === 'preview'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Live Email Preview
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans flex-1">
            {dispatchResults?.completed ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Absence Reminders Dispatched!
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    {dispatchResults.sentCount} student(s) received the automated absence catch-up email and system portal notification.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800 text-left max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {dispatchResults.logs.map((log) => (
                    <div key={log.id} className="py-2 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{log.recipientName || log.to}</span>
                        <span className="text-slate-400 font-mono block text-[10px]">
                          {Array.isArray(log.to) ? log.to.join(', ') : log.to} {log.cc ? `(CC: ${log.cc})` : ''}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold text-[9px]">
                        Dispatched
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setDispatchResults(null);
                      onClose();
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            ) : activeView === 'compose' ? (
              <>
                {/* Absent Students Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-rose-500" />
                      Select Absent Students to Notify ({targetStudents.length} of {absentStudents.length} selected)
                    </label>
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {selectedIds.size === absentStudents.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {absentStudents.length === 0 ? (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                      No absent students recorded for this session date!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                      {absentStudents.map((s) => {
                        const isSelected = selectedIds.has(s.studentId);
                        return (
                          <div
                            key={s.studentId}
                            onClick={() => toggleSelectStudent(s.studentId)}
                            className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-white dark:bg-slate-800 border-indigo-500/70 shadow-2xs'
                                : 'bg-transparent border-transparent opacity-60 hover:opacity-100 hover:bg-white/50'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600'
                            }`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                                {s.studentName}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono truncate">
                                {s.studentEmail || `${s.studentId}@gurugedara.edu`}
                                {s.parentEmail ? ` • CC Parent` : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Custom Tutor Guidance Note */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Instructor Catch-Up Guidance & Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="e.g. We covered Chapter 4 Calculus integration today. Please review the uploaded PDF and complete homework 3..."
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 dark:focus:border-indigo-400 text-xs font-sans leading-relaxed resize-none text-slate-800 dark:text-slate-200 placeholder-slate-400"
                  />
                </div>

                {/* Optional Class Recording URL */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                    Lecture Video Recording / Session Replay Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={recordingUrl}
                    onChange={(e) => setRecordingUrl(e.target.value)}
                    placeholder="https://zoom.us/rec/play/... or https://youtube.com/..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-xs font-mono text-slate-800 dark:text-slate-200 placeholder-slate-400"
                  />
                </div>

                {/* Automation Advisory Notice */}
                <div className="p-3.5 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/60 rounded-xl flex items-start gap-2.5 text-rose-900 dark:text-rose-200">
                  <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <strong>Automated System Delivery:</strong> Sending this notification immediately emails the formatted catch-up advisory to the student's inbox, automatically CCs linked parent emails, and creates an in-app reminder alert.
                  </div>
                </div>
              </>
            ) : (
              /* Live Email Preview */
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-950 space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 text-xs">
                  <div className="text-slate-400 font-mono text-[10px]">SUBJECT:</div>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                    ⚠️ [Guru Gedara] Absence Follow-Up & Study Reminder: {classTitle} ({selectedDate})
                  </div>
                </div>

                {/* Email Header Banner Mock */}
                <div className="bg-slate-900 text-white p-4 rounded-xl text-center space-y-1">
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                    Absence Catch-Up Reminder
                  </div>
                  <h3 className="text-sm font-extrabold text-white">We Missed You in Class Today!</h3>
                  <p className="text-[11px] text-slate-300">{classTitle} • Session Date: {selectedDate}</p>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-900 space-y-1">
                  <div className="font-bold">⚠️ Academic Continuity Advisory</div>
                  <p>Regular classroom participation is critical to syllabus mastery. Please catch up on the topics covered.</p>
                </div>

                {customMessage && (
                  <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-[11px] text-indigo-950">
                    <div className="font-bold text-indigo-900 mb-1">📝 Direct Message from {tutorName}:</div>
                    <p className="italic text-slate-700">{customMessage}</p>
                  </div>
                )}

                <div className="text-center pt-2">
                  <span className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-xs">
                    Access Missed Class Resources & Portal
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          {!dispatchResults?.completed && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSending || targetStudents.length === 0}
                onClick={handleSendReminders}
                className="px-5 py-2 bg-gradient-to-r from-rose-600 via-red-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Dispatching Reminders...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Send Absence Reminders ({targetStudents.length})
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
