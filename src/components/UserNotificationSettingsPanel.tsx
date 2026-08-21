import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Mail, 
  Calendar, 
  Clock, 
  XCircle, 
  CreditCard, 
  UserCheck, 
  BookOpen, 
  AlertCircle, 
  Check, 
  Save, 
  Send, 
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Eye
} from 'lucide-react';
import { UserProfile, UserEmailPreferences } from '../types';
import { firestoreService } from '../lib/firestoreService';
import { emailNotificationService, shouldUserReceiveEmail } from '../lib/emailNotificationService';

interface UserNotificationSettingsPanelProps {
  currentUser: UserProfile;
  onProfileUpdated?: (updated: UserProfile) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const DEFAULT_PREFERENCES: UserEmailPreferences = {
  bookingConfirmation: true,
  classReminder24h: true,
  classCancellation: true,
  paymentReceipts: true,
  attendanceAlerts: true,
  studyMaterials: true,
  classScheduleUpdates: true,
  monthlyReports: true
};

export const UserNotificationSettingsPanel: React.FC<UserNotificationSettingsPanelProps> = ({
  currentUser,
  onProfileUpdated,
  showToast
}) => {
  const [preferences, setPreferences] = useState<UserEmailPreferences>({
    ...DEFAULT_PREFERENCES,
    ...(currentUser.emailPreferences || {})
  });

  const [parentEmail, setParentEmail] = useState(currentUser.parentEmail || '');
  const [isParentLinked, setIsParentLinked] = useState(currentUser.isParentEmailLinked || currentUser.ccParentOnNotifications || false);
  const [parentCcPrefs, setParentCcPrefs] = useState({
    attendance: currentUser.parentEmailCcPreferences?.attendance !== false,
    payments: currentUser.parentEmailCcPreferences?.payments !== false,
    general: currentUser.parentEmailCcPreferences?.general !== false
  });

  const [saving, setSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [testingSampleType, setTestingSampleType] = useState<string | null>(null);
  const [previewSampleModal, setPreviewSampleModal] = useState<{
    isOpen: boolean;
    title: string;
    html: string;
    subject: string;
  }>({
    isOpen: false,
    title: '',
    html: '',
    subject: ''
  });

  useEffect(() => {
    if (currentUser.emailPreferences) {
      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...currentUser.emailPreferences
      });
    }
    setParentEmail(currentUser.parentEmail || '');
    setIsParentLinked(currentUser.isParentEmailLinked || currentUser.ccParentOnNotifications || false);
    if (currentUser.parentEmailCcPreferences) {
      setParentCcPrefs({
        attendance: currentUser.parentEmailCcPreferences.attendance !== false,
        payments: currentUser.parentEmailCcPreferences.payments !== false,
        general: currentUser.parentEmailCcPreferences.general !== false
      });
    }
  }, [currentUser]);

  const handleToggle = (key: keyof UserEmailPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const updatedData: Partial<UserProfile> = {
        emailPreferences: preferences,
        parentEmail: parentEmail.trim(),
        isParentEmailLinked: isParentLinked && !!parentEmail.trim(),
        ccParentOnNotifications: isParentLinked && !!parentEmail.trim(),
        parentEmailCcPreferences: parentCcPrefs
      };

      await firestoreService.updateUserProfile(currentUser.uid, updatedData);

      const mergedUser: UserProfile = {
        ...currentUser,
        ...updatedData
      };

      if (onProfileUpdated) {
        onProfileUpdated(mergedUser);
      }

      setLastSavedTime(new Date().toLocaleTimeString());
      if (showToast) {
        showToast("Email notification preferences saved successfully!", "success");
      }
    } catch (err) {
      console.error("Error saving email preferences:", err);
      if (showToast) {
        showToast("Failed to save preferences. Please try again.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  // Trigger real sample email for testing
  const handleSendSampleEmail = async (type: keyof UserEmailPreferences) => {
    setTestingSampleType(type);
    try {
      const userEmail = currentUser.email || 'student@gurugedara.edu';
      const userName = currentUser.name || currentUser.username || 'Scholar Student';

      let sampleLog: any;

      if (type === 'bookingConfirmation') {
        const result = await emailNotificationService.notifyClassBookingSuccess({
          booking: {
            id: `sample_book_${Date.now().toString().slice(-4)}`,
            studentId: currentUser.uid,
            studentName: userName,
            studentEmail: userEmail,
            classId: 'sample_class_101',
            classTitle: 'Advanced Level Combined Mathematics 2026',
            tutorId: 'sample_tutor',
            tutorName: 'Prof. Samantha Perera',
            dayOfWeek: 'Saturday',
            timeSlot: '08:30 AM - 11:30 AM',
            bookingDate: new Date().toISOString(),
            status: 'active'
          },
          studentUser: currentUser
        });
        sampleLog = result.studentLog;
      } else if (type === 'classReminder24h') {
        sampleLog = await emailNotificationService.notify24HourClassReminder({
          booking: {
            id: `sample_rem_${Date.now().toString().slice(-4)}`,
            studentId: currentUser.uid,
            studentName: userName,
            studentEmail: userEmail,
            classId: 'sample_class_101',
            classTitle: 'Advanced Level Physics Masterclass',
            tutorId: 'sample_tutor_physics',
            tutorName: 'Dr. Sunil Fernando',
            dayOfWeek: 'Sunday',
            timeSlot: '09:00 AM - 12:00 PM',
            bookingDate: new Date().toISOString(),
            status: 'active'
          },
          studentUser: currentUser,
          sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
      } else if (type === 'classCancellation') {
        const res = await emailNotificationService.notifyBookingCancellation({
          booking: {
            id: `sample_canc_${Date.now().toString().slice(-4)}`,
            studentId: currentUser.uid,
            studentName: userName,
            studentEmail: userEmail,
            classId: 'sample_class_chem',
            classTitle: 'Advanced Level Chemistry Revision',
            tutorId: 'sample_tutor_chem',
            tutorName: 'Dr. Nirmal Jayasuriya',
            dayOfWeek: 'Monday',
            timeSlot: '03:30 PM - 06:30 PM',
            bookingDate: new Date().toISOString(),
            status: 'cancelled'
          },
          studentUser: currentUser,
          reason: 'Scheduled student timetable adjustment'
        });
        sampleLog = res.studentLog;
      } else if (type === 'paymentReceipts') {
        sampleLog = await emailNotificationService.notifyPaymentSuccess({
          payment: {
            id: `sample_pay_${Date.now().toString().slice(-4)}`,
            studentId: currentUser.uid,
            studentName: userName,
            classId: 'sample_class_101',
            classTitle: 'Combined Mathematics Monthly Tuition Fee',
            amount: 2500,
            paymentMethod: 'Online Tuition Portal / Visa',
            status: 'paid',
            date: new Date().toISOString()
          },
          studentUser: currentUser
        });
      } else if (type === 'attendanceAlerts') {
        sampleLog = await emailNotificationService.notifyAttendanceMarked({
          record: {
            id: `sample_att_${Date.now().toString().slice(-4)}`,
            studentId: currentUser.uid,
            studentName: userName,
            classId: 'sample_class_101',
            classTitle: 'Combined Mathematics Morning Session',
            date: new Date().toISOString().split('T')[0],
            status: 'Present',
            markedAt: new Date().toISOString(),
            tutorId: 'sample_tutor_math',
            type: 'qrcode',
            isLate: false,
            delayMinutes: 0
          },
          studentUser: currentUser,
          punctualityStatusText: 'Arrived On Time (Punctual Check-in)',
          isLate: false,
          delayMinutes: 0,
          markedTimeFormatted: new Date().toLocaleTimeString(),
          classTimesFormatted: '08:30 AM - 11:30 AM'
        });
      } else if (type === 'studyMaterials') {
        const logs = await emailNotificationService.notifyClassResourceAdded({
          material: {
            id: `sample_mat_${Date.now().toString().slice(-4)}`,
            title: 'Unit 04: Calculus & Differentiation Practice Workbook',
            description: 'Comprehensive problem set with worked solutions and past paper questions (2018-2025).',
            subject: 'Combined Mathematics',
            classId: 'sample_class_101',
            classTitle: 'Advanced Level Combined Mathematics',
            type: 'file',
            tutorId: 'sample_tutor',
            tutorName: 'Prof. Samantha Perera',
            referenceUrl: 'https://gurugedara.edu/classes',
            createdAt: new Date().toISOString()
          },
          enrolledStudents: [currentUser]
        });
        sampleLog = logs[0];
      } else {
        // Schedule update sample
        const logs = await emailNotificationService.notifyClassUpdated({
          classItem: {
            id: 'sample_class_101',
            title: 'Advanced Level Combined Mathematics',
            subject: 'Combined Mathematics',
            schedule: 'Saturdays 08:30 AM - 11:30 AM',
            description: 'Special seminar session rescheduled: Class will commence at 08:30 AM in Main Hall A & Online Livestream.',
            maxSlots: 50,
            bookedSlots: 24,
            tutorId: 'sample_tutor',
            tutorName: 'Prof. Samantha Perera',
            dayOfWeek: 'Saturday',
            timeSlot: '08:30 AM - 11:30 AM',
            price: 2500,
            gracePeriod: 10
          },
          updateDetails: 'Special seminar session rescheduled: Class will commence at 08:30 AM in Main Hall A & Online Livestream.',
          enrolledStudents: [currentUser]
        });
        sampleLog = logs[0];
      }

      if (showToast) {
        showToast(`Sample email triggered for ${userEmail}!`, "success");
      }

      if (sampleLog && sampleLog.htmlContent) {
        setPreviewSampleModal({
          isOpen: true,
          title: `Sample Email: ${sampleLog.subject}`,
          html: sampleLog.htmlContent,
          subject: sampleLog.subject
        });
      }
    } catch (e) {
      console.error("Error generating sample email:", e);
      if (showToast) {
        showToast("Error generating sample email preview.", "error");
      }
    } finally {
      setTestingSampleType(null);
    }
  };

  const notificationOptions = [
    {
      id: 'bookingConfirmation' as keyof UserEmailPreferences,
      icon: Calendar,
      iconBg: 'bg-indigo-100 text-indigo-700',
      title: 'Class Booking & Enrollment Confirmations',
      description: 'Official seat reservation notice, timetable details, and calendar link sent immediately upon enrollment.',
      badge: 'High Priority',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    },
    {
      id: 'classReminder24h' as keyof UserEmailPreferences,
      icon: Clock,
      iconBg: 'bg-amber-100 text-amber-700',
      title: '24-Hour Upcoming Class Reminders',
      description: 'Automated 24h countdown reminder with Google Calendar 1-click sync, grace period, and preparation checklist.',
      badge: 'Automated Cron',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    {
      id: 'classCancellation' as keyof UserEmailPreferences,
      icon: XCircle,
      iconBg: 'bg-rose-100 text-rose-700',
      title: 'Class Cancellations & Schedule Shifts',
      description: 'Instant notification if a course or booking is cancelled, with seat release and refund status info.',
      badge: 'Important',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200'
    },
    {
      id: 'paymentReceipts' as keyof UserEmailPreferences,
      icon: CreditCard,
      iconBg: 'bg-emerald-100 text-emerald-700',
      title: 'Tuition Receipts & Payment Confirmations',
      description: 'Branded digital payment voucher, transaction reference, course breakdown, and due date alerts.',
      badge: 'Financial Record',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      id: 'attendanceAlerts' as keyof UserEmailPreferences,
      icon: UserCheck,
      iconBg: 'bg-blue-100 text-blue-700',
      title: 'Attendance Check-in & Late Arrival Alerts',
      description: 'Real-time alert whenever your barcode/QR code is scanned at entrance check-in or class entry.',
      badge: 'Real-Time',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      id: 'studyMaterials' as keyof UserEmailPreferences,
      icon: BookOpen,
      iconBg: 'bg-purple-100 text-purple-700',
      title: 'Study Materials & Learning Notes Uploads',
      description: 'Instant notice when your tutor uploads tutorial worksheets, PDF summaries, or practice problem sets.',
      badge: 'Academic',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200'
    },
    {
      id: 'classScheduleUpdates' as keyof UserEmailPreferences,
      icon: Bell,
      iconBg: 'bg-sky-100 text-sky-700',
      title: 'Class Timetable & Notice Board Bulletins',
      description: 'Announcements regarding room transfers, extra revision seminars, and holiday timetables.',
      badge: 'Bulletins',
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200'
    },
    {
      id: 'monthlyReports' as keyof UserEmailPreferences,
      icon: ShieldCheck,
      iconBg: 'bg-teal-100 text-teal-700',
      title: 'Monthly Progress & Attendance Summary',
      description: 'Monthly digest summarizing total classes attended, punctuality rate, and active course credentials.',
      badge: 'Monthly Digest',
      badgeColor: 'bg-teal-50 text-teal-700 border-teal-200'
    }
  ];

  return (
    <div className="space-y-6" id="user_notification_settings_panel">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-900">Email &amp; Notification Settings</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                Active Engine
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Control exactly which institutional emails, 24h reminders, receipts, and parent alerts you receive to <span className="font-semibold text-slate-800">{currentUser.email || 'your registered email'}</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            id="save_email_preferences_btn"
            onClick={handleSavePreferences}
            disabled={saving}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Preferences
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Notification Type Toggles */}
        <div className="lg:col-span-2 space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Notification Channels &amp; Email Triggers
            </h3>
            {lastSavedTime && (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Synced at {lastSavedTime}
              </span>
            )}
          </div>

          {notificationOptions.map((opt) => {
            const Icon = opt.icon;
            const isEnabled = preferences[opt.id];
            const isTesting = testingSampleType === opt.id;

            return (
              <motion.div
                key={opt.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isEnabled 
                    ? 'bg-white border-slate-200/90 shadow-sm hover:border-indigo-200' 
                    : 'bg-slate-50/70 border-slate-200/60 opacity-80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${opt.iconBg}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-semibold ${isEnabled ? 'text-slate-900' : 'text-slate-500'}`}>
                          {opt.title}
                        </span>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${opt.badgeColor}`}>
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                        {opt.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pl-12 sm:pl-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {/* Sample test trigger */}
                    <button
                      type="button"
                      onClick={() => handleSendSampleEmail(opt.id)}
                      disabled={isTesting}
                      title="Preview / Send test email template"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200/80"
                    >
                      {isTesting ? (
                        <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                      Preview Template
                    </button>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isEnabled}
                      onClick={() => handleToggle(opt.id)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Right 1 Col: Parent Link & Delivery Summary */}
        <div className="space-y-6">
          
          {/* Parent / Guardian Notification CC Card */}
          {currentUser.role === 'student' && (
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Parent / Guardian Auto-CC</h4>
                  <p className="text-xs text-slate-500">Keep parents updated on check-ins &amp; payments</p>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Parent / Guardian Email
                  </label>
                  <input
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="parent@example.com"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enable_parent_link"
                    checked={isParentLinked}
                    onChange={(e) => setIsParentLinked(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <label htmlFor="enable_parent_link" className="text-xs text-slate-700 font-medium">
                    Automatically CC parent on selected notifications
                  </label>
                </div>

                {isParentLinked && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Include parent on:
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={parentCcPrefs.attendance}
                        onChange={(e) => setParentCcPrefs(p => ({ ...p, attendance: e.target.checked }))}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                      Attendance &amp; check-in alerts
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={parentCcPrefs.payments}
                        onChange={(e) => setParentCcPrefs(p => ({ ...p, payments: e.target.checked }))}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                      Tuition payment receipts &amp; dues
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={parentCcPrefs.general}
                        onChange={(e) => setParentCcPrefs(p => ({ ...p, general: e.target.checked }))}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                      24-Hour class reminders &amp; schedule updates
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delivery & Security Info Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-md space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 text-indigo-300 flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold">Multi-Channel Delivery</h4>
            </div>

            <p className="text-xs text-indigo-200/90 leading-relaxed">
              Guru Gedara uses multi-channel delivery: emails are sent via verified institutional SMTP/Resend API, recorded in Firestore <code className="text-white bg-white/10 px-1 py-0.5 rounded">mail</code> collection, and paired with instant in-app alerts.
            </p>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-indigo-200">
              <span>Security Level:</span>
              <span className="font-semibold text-emerald-400">TLS Encrypted</span>
            </div>
          </div>
        </div>

      </div>

      {/* HTML Email Template Preview Modal */}
      <AnimatePresence>
        {previewSampleModal.isOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">HTML Template Preview</h3>
                    <p className="text-xs text-slate-500">{previewSampleModal.subject}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewSampleModal({ isOpen: false, title: '', html: '', subject: '' })}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Iframe Content */}
              <div className="flex-1 p-4 bg-slate-100 overflow-y-auto min-h-[400px]">
                <iframe
                  title="Email Preview"
                  srcDoc={previewSampleModal.html}
                  className="w-full h-[480px] bg-white rounded-xl shadow-sm border border-slate-200"
                />
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between bg-white">
                <span className="text-xs text-slate-500">
                  Rendered with Guru Gedara Master Template
                </span>
                <button
                  onClick={() => setPreviewSampleModal({ isOpen: false, title: '', html: '', subject: '' })}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default UserNotificationSettingsPanel;
