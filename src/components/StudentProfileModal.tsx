import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  BookOpen, 
  Send, 
  ShieldAlert, 
  Award, 
  TrendingUp, 
  MessageSquare,
  QrCode,
  Activity,
  History,
  Timer
} from 'lucide-react';
import { UserProfile, ClassItem, AttendanceRecord, Booking } from '../types';
import { calculateStudentPunctuality } from '../lib/punctualityUtils';
import { firestoreService } from '../lib/firestoreService';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: UserProfile | null;
  currentUser: UserProfile;
  classes: ClassItem[];
  attendanceRecords: AttendanceRecord[];
  bookings?: Booking[];
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onSendMessage?: (studentUid: string, studentName: string) => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  student,
  currentUser,
  classes = [],
  attendanceRecords = [],
  bookings = [],
  showToast,
  onSendMessage
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance_history' | 'enrolled_classes'>('overview');
  const [reminderMessage, setReminderMessage] = useState<string>('');
  const [sendingReminder, setSendingReminder] = useState<boolean>(false);
  const [showReminderBox, setShowReminderBox] = useState<boolean>(false);

  if (!isOpen || !student) return null;

  // Calculate punctuality statistics for this student
  const punctualitySummary = calculateStudentPunctuality(
    student.uid,
    attendanceRecords,
    classes
  );

  // Student's active bookings
  const studentBookings = bookings.filter(b => b.studentId === student.uid && b.status === 'active');
  const enrolledClassIds = new Set([
    ...(student.selectedClasses || []),
    ...studentBookings.map(b => b.classId)
  ]);
  const enrolledClasses = classes.filter(c => enrolledClassIds.has(c.id));

  // Quick reminder sender
  const handleSendPunctualityAdvisory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderMessage.trim()) {
      showToast('Please enter a message note.', 'info');
      return;
    }

    setSendingReminder(true);
    try {
      // Send direct notification
      await firestoreService.triggerNotification(
        student.uid,
        `⏰ Attendance Punctuality Advisory - Guru Gedara Academy`,
        reminderMessage.trim(),
        'reminder'
      );

      // Send chat message
      await firestoreService.sendDirectMessage(
        currentUser.uid,
        currentUser.name || 'Faculty Tutor',
        student.uid,
        `[Attendance Advisory]: ${reminderMessage.trim()}`
      );

      // Audit log
      await firestoreService.addAuditLog({
        username: currentUser.name || currentUser.username || 'Tutor',
        action: 'STUDENT_PUNCTUALITY_ADVISORY_SENT',
        details: `Sent punctuality reminder to ${student.name} (${student.email || student.username}): ${reminderMessage.trim()}`
      });

      showToast(`Punctuality notice dispatched to ${student.name}!`, 'success');
      setReminderMessage('');
      setShowReminderBox(false);
    } catch (err) {
      showToast('Failed to send advisory notice.', 'error');
    } finally {
      setSendingReminder(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs font-sans animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden w-full max-w-3xl max-h-[90vh] flex flex-col relative"
          id={`student_profile_modal_${student.uid}`}
        >
          {/* Header Profile Banner */}
          <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shrink-0">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
              id="btn_close_student_profile_modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {student.photoURL ? (
                <img 
                  referrerPolicy="no-referrer"
                  src={student.photoURL} 
                  alt={student.name} 
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30 shadow-md shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center border-2 border-white/30 shadow-md shrink-0">
                  {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                </div>
              )}

              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black tracking-tight">{student.name}</h2>
                  <span className="text-[10px] font-mono font-bold bg-white/15 px-2 py-0.5 rounded-full text-slate-200 uppercase">
                    ID: {student.username || student.uid.substring(0, 8)}
                  </span>
                  {student.status === 'suspended' ? (
                    <span className="text-[10px] font-mono font-extrabold bg-red-500/80 text-white px-2 py-0.5 rounded-full">
                      Suspended
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-extrabold bg-emerald-500/80 text-white px-2 py-0.5 rounded-full">
                      Active Scholar
                    </span>
                  )}

                  {/* PROMINENT LATE ARRIVAL BADGE */}
                  {punctualitySummary.isConsistentlyLate && (
                    <span 
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-md animate-pulse border border-amber-300"
                      title={punctualitySummary.badgeDescription}
                      id="badge_student_late_arrival"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 fill-slate-950 text-amber-500" />
                      Late Arrival ({punctualitySummary.lateRate}% Late)
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                  {student.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-indigo-300" /> {student.email}
                    </span>
                  )}
                  {student.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-indigo-300" /> {student.phone}
                    </span>
                  )}
                  {student.studentDetails?.grade && (
                    <span className="font-mono text-indigo-200">
                      Grade {student.studentDetails.grade}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Consistent Late Arrival Warning Alert Banner */}
          {punctualitySummary.isConsistentlyLate && (
            <div className="bg-amber-50 border-b border-amber-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-amber-200/80 rounded-lg text-amber-800 shrink-0 mt-0.5">
                  <Timer className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    Frequent Late Arrival Pattern Detected
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    Student has logged in or checked in after the class start time in <strong className="font-extrabold">{punctualitySummary.lateCount} of {punctualitySummary.totalPresent}</strong> attended sessions (average delay: <strong>{punctualitySummary.averageDelayMinutes} mins</strong> past scheduled start).
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setReminderMessage(`Hi ${student.name.split(' ')[0]}, we noticed you have frequently arrived after the scheduled class start time. Please make sure to join promptly so you don't miss essential lesson fundamentals!`);
                  setShowReminderBox(true);
                  setActiveTab('overview');
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                id="btn_open_late_advisory_composer"
              >
                <Send className="w-3.5 h-3.5" /> Send Punctuality Note
              </button>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex items-center gap-2">
            {[
              { id: 'overview', label: 'Student Overview & Punctuality', icon: Activity },
              { id: 'attendance_history', label: `Attendance Log (${punctualitySummary.totalSessions})`, icon: History },
              { id: 'enrolled_classes', label: `Enrolled Classes (${enrolledClasses.length})`, icon: BookOpen }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                  id={`tab_student_profile_${tab.id}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">

            {/* TAB 1: OVERVIEW & PUNCTUALITY METRICS */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                
                {/* Metric Summary Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Total Sessions</span>
                    <span className="text-xl font-black text-slate-800 font-mono mt-0.5 block">{punctualitySummary.totalSessions}</span>
                    <span className="text-[10px] text-slate-500 font-medium">Logged Marks</span>
                  </div>

                  <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/80 text-center">
                    <span className="text-[10px] uppercase font-mono font-bold text-emerald-600 block">On-Time Arrivals</span>
                    <span className="text-xl font-black text-emerald-700 font-mono mt-0.5 block">{punctualitySummary.onTimeCount}</span>
                    <span className="text-[10px] text-emerald-600 font-medium">{punctualitySummary.onTimeRate}% Punctual</span>
                  </div>

                  <div className={`p-3.5 rounded-2xl border text-center ${
                    punctualitySummary.isConsistentlyLate 
                      ? 'bg-rose-50 border-rose-200' 
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className={`text-[10px] uppercase font-mono font-bold block ${
                      punctualitySummary.isConsistentlyLate ? 'text-rose-600' : 'text-slate-400'
                    }`}>
                      Late Arrivals
                    </span>
                    <span className={`text-xl font-black font-mono mt-0.5 block ${
                      punctualitySummary.isConsistentlyLate ? 'text-rose-700' : 'text-slate-800'
                    }`}>
                      {punctualitySummary.lateCount}
                    </span>
                    <span className={`text-[10px] font-medium ${
                      punctualitySummary.isConsistentlyLate ? 'text-rose-600 font-bold' : 'text-slate-500'
                    }`}>
                      {punctualitySummary.lateRate}% of present
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Avg Late Delay</span>
                    <span className="text-xl font-black text-slate-800 font-mono mt-0.5 block">
                      {punctualitySummary.averageDelayMinutes}m
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Past class start</span>
                  </div>
                </div>

                {/* Direct Punctuality Advisory Composer */}
                {showReminderBox && (
                  <form onSubmit={handleSendPunctualityAdvisory} className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-indigo-600" /> Compose Punctuality Message to {student.name}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowReminderBox(false)}
                        className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                      >
                        Cancel
                      </button>
                    </div>

                    <textarea
                      required
                      rows={3}
                      value={reminderMessage}
                      onChange={(e) => setReminderMessage(e.target.value)}
                      placeholder="Write advisory notice or punctuality reminder..."
                      className="w-full text-xs p-3 bg-white border border-indigo-200 rounded-xl outline-none focus:border-indigo-500"
                    />

                    <div className="flex justify-end gap-2">
                      <button
                        type="submit"
                        disabled={sendingReminder}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                        id="btn_send_punctuality_advisory"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {sendingReminder ? 'Sending...' : 'Send Notification & Chat Message'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Student Personal & Guardian Details */}
                <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 space-y-3">
                  <h3 className="text-xs font-black text-slate-900 uppercase font-mono tracking-wider">
                    Student Details & Contact Record
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-mono uppercase">Guardian / Parent Name</span>
                      <p className="font-bold text-slate-800">{student.guardianName || student.studentDetails?.parentContact || 'Not Specified'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-mono uppercase">Guardian Phone Contact</span>
                      <p className="font-bold text-slate-800">{student.guardianPhone || 'Not Specified'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-mono uppercase">Residential Address</span>
                      <p className="font-bold text-slate-800">{student.address || 'Not Provided'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-mono uppercase">Admission / Card Category</span>
                      <p className="font-bold text-slate-800">
                        {student.isFreeCard ? 'Free Card Scholar' : student.admissionFeeCollected ? 'Admission Paid' : 'Standard Student'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recent Attendance Snapshot */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-900 uppercase font-mono tracking-wider">
                      Recent Check-In History Snapshot
                    </h3>
                    <button
                      onClick={() => setActiveTab('attendance_history')}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      View All Logs ({punctualitySummary.detailedRecords.length}) →
                    </button>
                  </div>

                  {punctualitySummary.detailedRecords.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                      No attendance sessions recorded yet for this student.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {punctualitySummary.detailedRecords.slice(0, 3).map((item, idx) => (
                        <div 
                          key={idx}
                          className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg ${
                              item.record.status === 'Absent'
                                ? 'bg-red-100 text-red-700'
                                : item.isLate 
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {item.record.status === 'Absent' ? (
                                <XCircle className="w-4 h-4" />
                              ) : item.isLate ? (
                                <Clock className="w-4 h-4" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4" />
                              )}
                            </div>

                            <div>
                              <h4 className="font-bold text-slate-800">{item.classItem?.title || item.record.classTitle}</h4>
                              <p className="text-[10px] text-slate-500 font-mono">
                                Date: {item.record.date} • {item.formattedTime}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold font-mono ${
                              item.record.status === 'Absent'
                                ? 'bg-red-100 text-red-700'
                                : item.isLate 
                                ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {item.record.status === 'Absent' ? 'Absent' : item.isLate ? `Late (+${item.delayMinutes}m)` : 'On Time'}
                            </span>
                            <span className="text-[9px] text-slate-400 block font-mono">Grace: {item.gracePeriodApplied}m</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 2: DETAILED ATTENDANCE & PUNCTUALITY HISTORY TABLE */}
            {activeTab === 'attendance_history' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Comprehensive Check-In Registry</h3>
                    <p className="text-xs text-slate-500">Historical check-in logs comparing arrival time against class start time and configured grace period.</p>
                  </div>
                </div>

                {punctualitySummary.detailedRecords.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                    No attendance records found for this student.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {punctualitySummary.detailedRecords.map((item, idx) => {
                      const isAbsent = item.record.status === 'Absent';
                      const isLate = item.isLate;

                      return (
                        <div 
                          key={item.record.id || idx}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                            isAbsent
                              ? 'bg-red-50/40 border-red-200'
                              : isLate 
                              ? 'bg-amber-50/50 border-amber-200/90' 
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-xl shrink-0 ${
                              isAbsent 
                                ? 'bg-red-100 text-red-700' 
                                : isLate 
                                ? 'bg-amber-500 text-slate-950' 
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isAbsent ? <XCircle className="w-4 h-4" /> : isLate ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-slate-900">
                                  {item.classItem?.title || item.record.classTitle}
                                </h4>
                                {item.record.isExtraClass && (
                                  <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[9px] font-mono font-bold">
                                    Extra Class
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                Date: <strong>{item.record.date}</strong> • Check-in: <strong>{item.formattedTime}</strong>
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Scheduled: {item.classItem?.schedule || 'N/A'} • Grace Period: {item.gracePeriodApplied} min
                              </p>
                            </div>
                          </div>

                          <div className="text-left sm:text-right shrink-0">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-black font-mono ${
                              isAbsent 
                                ? 'bg-red-100 text-red-700' 
                                : isLate 
                                ? 'bg-amber-500 text-slate-950 shadow-xs' 
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isAbsent 
                                ? 'Absent' 
                                : isLate 
                                ? `Late (+${item.delayMinutes} min)` 
                                : 'On Time'}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                              Type: {item.record.type === 'qrcode' ? '📱 QR Code' : '✍️ Manual'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ENROLLED CLASSES & TUITION COURSES */}
            {activeTab === 'enrolled_classes' && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900">Enrolled Academy Courses</h3>

                {enrolledClasses.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                    No active course enrollments found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {enrolledClasses.map((cls) => {
                      const classGrace = cls.gracePeriod !== undefined ? cls.gracePeriod : 5;
                      const isSuspendedInClass = student.classEnrollmentStatus?.[cls.id] === 'suspended';

                      return (
                        <div 
                          key={cls.id}
                          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                              {cls.subject}
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                              isSuspendedInClass ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isSuspendedInClass ? 'Suspended' : 'Active'}
                            </span>
                          </div>

                          <h4 className="text-xs font-black text-slate-900">{cls.title}</h4>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {cls.dayOfWeek} • {cls.timeSlot}
                          </p>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500">
                            <span>Tutor: <b>{cls.tutorName}</b></span>
                            <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                              Grace: {classGrace} mins
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Modal Footer */}
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              {punctualitySummary.isConsistentlyLate && (
                <span className="text-[11px] text-amber-800 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Late Arrival flag active
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowReminderBox(!showReminderBox)}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                id="btn_toggle_student_reminder"
              >
                <MessageSquare className="w-4 h-4" /> Message Student
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                id="btn_dismiss_student_profile"
              >
                Close Profile
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
