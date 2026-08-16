import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { SyncStatusIndicator } from '../components/SyncTelemetryConsole';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { SyncBadge } from '../components/SyncBadge';
import { firestoreService } from '../lib/firestoreService';
import { Booking, Payment, NotificationItem, AttendanceRecord, ClassItem } from '../types';
import { CalendarView } from '../components/CalendarView';
import { ChatWidget } from '../components/ChatWidget';
import { StudentProgressTracker } from '../components/StudentProgressTracker';
import { StudentModuleRoadmap } from '../components/StudentModuleRoadmap';
import { ClassScheduleWidget } from '../components/ClassScheduleWidget';
import { UpcomingDeadlines } from '../components/UpcomingDeadlines';
import { CameraProfileCapture } from '../components/CameraProfileCapture';
import { ClassProfileModal } from '../components/ClassProfileModal';
import { StudentPaymentHistory } from '../components/StudentPaymentHistory';
import { ClassQRCodeAttendanceModal } from '../components/ClassQRCodeAttendanceModal';
import { ClassReminderCronPanel } from '../components/ClassReminderCronPanel';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  BookOpen, 
  CreditCard, 
  Calendar, 
  MessageSquare, 
  Bell, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  XOctagon, 
  Hourglass,
  Sliders,
  TrendingUp,
  Compass,
  Star,
  Camera,
  FileText,
  QrCode,
  Download,
  ChevronDown,
  Mail,
  Link as LinkIcon,
  Save,
  CheckCircle2
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { 
    currentUser, 
    showToast, 
    notifications, 
    refreshNotifications, 
    notificationSettings, 
    updateNotificationSettings, 
    classes, 
    refreshClasses, 
    refreshUserProfile, 
    createReview,
    bookings,
    payments,
    refreshBookings,
    refreshPayments,
    executeWriteWithRetry
  } = useApp();
  const { syncField, getFieldStatus, getFieldMessage } = useSyncStatus();
  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'classes' | 'chat' | 'notifications' | 'performance' | 'roadmap' | 'payments'>('schedule');
  const [isNavDropdownOpen, setIsNavDropdownOpen] = useState(false);
  
  const [studentBookings, setStudentBookings] = useState<Booking[]>([]);
  const [paymentsList, setPaymentsList] = useState<Payment[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [selectedClassForProfile, setSelectedClassForProfile] = useState<ClassItem | null>(null);

  // Review states
  const [showSubmitReviewModal, setShowSubmitReviewModal] = useState(false);
  const [reviewTargetBooking, setReviewTargetBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  // Custom state-driven cancellation confirm modal
  const [cancelConfirm, setCancelConfirm] = useState<{
    isOpen: boolean;
    bookingId: string;
    classId: string;
    classTitle: string;
  }>({
    isOpen: false,
    bookingId: '',
    classId: '',
    classTitle: ''
  });

  // Parent Email Linking & CC Settings State
  const [parentEmailInput, setParentEmailInput] = useState<string>(currentUser?.parentEmail || '');
  const [parentCcEnabled, setParentCcEnabled] = useState<boolean>(
    currentUser?.ccParentOnNotifications ?? currentUser?.isParentEmailLinked ?? (!!currentUser?.parentEmail)
  );
  const [parentCcAttendance, setParentCcAttendance] = useState<boolean>(
    currentUser?.parentEmailCcPreferences?.attendance ?? true
  );
  const [parentCcPayments, setParentCcPayments] = useState<boolean>(
    currentUser?.parentEmailCcPreferences?.payments ?? true
  );
  const [savingParentSettings, setSavingParentSettings] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser) {
      setParentEmailInput(currentUser.parentEmail || '');
      setParentCcEnabled(
        currentUser.ccParentOnNotifications ?? currentUser.isParentEmailLinked ?? (!!currentUser.parentEmail)
      );
      setParentCcAttendance(currentUser.parentEmailCcPreferences?.attendance ?? true);
      setParentCcPayments(currentUser.parentEmailCcPreferences?.payments ?? true);
    }
  }, [currentUser?.parentEmail, currentUser?.ccParentOnNotifications, currentUser?.isParentEmailLinked]);

  const handleSaveParentSettings = async (overrideCc?: boolean) => {
    if (!currentUser) return;
    const isCcActive = overrideCc !== undefined ? overrideCc : parentCcEnabled;
    const cleanEmail = parentEmailInput.trim();

    if (isCcActive && !cleanEmail) {
      showToast("Please provide a valid parent/guardian email address to enable automatic CC.", "info");
      return;
    }

    if (cleanEmail && !cleanEmail.includes('@')) {
      showToast("Please enter a valid email address containing @.", "error");
      return;
    }

    setSavingParentSettings(true);
    try {
      const updatedData: Partial<typeof currentUser> = {
        parentEmail: cleanEmail,
        isParentEmailLinked: isCcActive && !!cleanEmail,
        ccParentOnNotifications: isCcActive && !!cleanEmail,
        parentEmailCcPreferences: {
          attendance: parentCcAttendance,
          payments: parentCcPayments,
          general: true
        }
      };

      await firestoreService.updateUserProfile(currentUser.uid, updatedData);
      
      await firestoreService.addAuditLog({
        username: currentUser.name || currentUser.username || 'Student',
        action: 'PARENT_EMAIL_LINK_UPDATED',
        details: `Student updated parent email link (${cleanEmail || 'None'}) with Auto-CC=${isCcActive}`
      });

      if (refreshUserProfile) {
        await refreshUserProfile();
      }

      showToast(
        isCcActive && cleanEmail
          ? `Parent email linked! Attendance check-ins and payment alerts will be automatically CC'd to ${cleanEmail}.`
          : "Parent notification settings updated successfully.",
        "success"
      );
    } catch (err) {
      showToast("Failed to update parent link settings.", "error");
    } finally {
      setSavingParentSettings(false);
    }
  };

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 5: return "Excellent - Pure Excellence!";
      case 4: return "Good - Very Helpful";
      case 3: return "Average - Satisfactory";
      case 2: return "Poor - Needs Improvement";
      case 1: return "Very Poor - Disappointing";
      default: return "";
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !reviewTargetBooking) return;
    if (!reviewComment.trim()) {
      showToast("Please write a short comment about your experience.", "info");
      return;
    }

    setSubmittingReview(true);
    try {
      await createReview({
        studentId: currentUser.uid,
        studentName: currentUser.name,
        studentPhotoURL: currentUser.photoURL,
        tutorId: reviewTargetBooking.tutorId,
        tutorName: reviewTargetBooking.tutorName,
        classId: reviewTargetBooking.classId,
        classTitle: reviewTargetBooking.classTitle,
        rating: reviewRating,
        comment: reviewComment,
        status: 'pending' // Submitted to moderation queue first!
      });
      setShowSubmitReviewModal(false);
      setReviewComment("");
      setReviewRating(5);
      setReviewTargetBooking(null);
    } catch (err) {
      showToast("Error submitting review.", "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  const loadAttendanceRecords = async () => {
    if (!currentUser) return;
    try {
      const records = await firestoreService.getAttendance();
      const matched = records.filter(r => 
        isStudentMatch(r.studentId, (r as any).studentEmail) ||
        (r.studentName && currentUser.name && r.studentName.toLowerCase() === currentUser.name.toLowerCase())
      );
      setAttendanceRecords(matched);
    } catch (e) {
      console.warn("Failed loading student attendance records", e);
    }
  };

  const isStudentMatch = (studentId?: string, studentEmail?: string, studentName?: string) => {
    if (!currentUser) return false;
    if (studentId && (studentId === currentUser.uid || studentId === currentUser.username || studentId === (currentUser as any).id)) return true;
    if (studentEmail && currentUser.email && studentEmail.toLowerCase() === currentUser.email.toLowerCase()) return true;
    if (studentName && currentUser.name && studentName.toLowerCase() === currentUser.name.toLowerCase()) return true;
    return false;
  };

  const getMatchedStudentBookings = (): Booking[] => {
    if (!currentUser) return [];
    const matched = bookings.filter(b => isStudentMatch(b.studentId, (b as any).studentEmail, b.studentName) && b.status !== 'cancelled');
    
    // Synthesize enrollment records from selectedClasses
    const enrolledClassIds = currentUser.selectedClasses || [];
    const existingClassIds = new Set(matched.map(b => b.classId));

    enrolledClassIds.forEach(cId => {
      if (!existingClassIds.has(cId)) {
        const cls = classes.find(c => c.id === cId);
        if (cls) {
          matched.push({
            id: `enrolled_${currentUser.uid}_${cls.id}`,
            studentId: currentUser.uid,
            studentName: currentUser.name || currentUser.username || 'Student',
            studentEmail: currentUser.email,
            classId: cls.id,
            classTitle: cls.title,
            tutorId: cls.tutorId,
            tutorName: cls.tutorName,
            dayOfWeek: cls.dayOfWeek || 'Monday',
            timeSlot: cls.timeSlot || '09:00 AM',
            bookingDate: new Date().toISOString(),
            status: 'active'
          });
          existingClassIds.add(cls.id);
        }
      }
    });

    return matched;
  };

  const getMatchedStudentPayments = (matchedB: Booking[]): Payment[] => {
    if (!currentUser) return [];
    const matchedP = payments.filter(p => 
      isStudentMatch(p.studentId, (p as any).studentEmail, p.studentName) ||
      matchedB.some(b => b.classId === p.classId)
    );

    const matchedClassIds = new Set(matchedP.map(p => p.classId));
    const synthesizedP: Payment[] = [];

    matchedB.forEach(b => {
      if (!matchedClassIds.has(b.classId)) {
        const cls = classes.find(c => c.id === b.classId);
        synthesizedP.push({
          id: `pay_b_${b.id}`,
          studentId: currentUser.uid,
          studentName: currentUser.name || currentUser.username || 'Scholar Student',
          classId: b.classId,
          classTitle: b.classTitle || cls?.title || 'Enrolled Tuition Course',
          amount: cls?.price || 1500,
          paymentMethod: 'Online Tuition Portal',
          status: 'paid',
          date: b.bookingDate || new Date().toISOString(),
          dueDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });
        matchedClassIds.add(b.classId);
      }
    });

    (currentUser.selectedClasses || []).forEach(cId => {
      if (!matchedClassIds.has(cId)) {
        const cls = classes.find(c => c.id === cId);
        if (cls) {
          synthesizedP.push({
            id: `pay_sel_${currentUser.uid}_${cls.id}`,
            studentId: currentUser.uid,
            studentName: currentUser.name || currentUser.username || 'Scholar Student',
            classId: cls.id,
            classTitle: cls.title,
            amount: cls.price || 1500,
            paymentMethod: 'Online Tuition Portal',
            status: 'paid',
            date: new Date().toISOString(),
            dueDate: new Date(Date.now() + 86400000 * 7).toISOString()
          });
          matchedClassIds.add(cId);
        }
      }
    });

    let combined = [...matchedP, ...synthesizedP];
    return combined;
  };

  const fetchDashboardData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // 1. Sync immediately with matched bookings and payments
      const matchedB = getMatchedStudentBookings();
      setStudentBookings(matchedB);

      const matchedP = getMatchedStudentPayments(matchedB);
      setPaymentsList(matchedP);

      await loadAttendanceRecords();

      // 2. If the context is empty, execute a safe background refresh
      if (bookings.length === 0 || payments.length === 0 || classes.length === 0) {
        await Promise.all([
          refreshBookings(),
          refreshPayments(),
          refreshClasses()
        ]);
      }
    } catch (e) {
      console.warn("Failed retrieving student context ledger", e);
    } finally {
      setLoading(false);
    }
  };

  // Keep student dashboard state in sync with prefetched/updated context values
  useEffect(() => {
    if (currentUser) {
      const matchedB = getMatchedStudentBookings();
      setStudentBookings(matchedB);

      const matchedP = getMatchedStudentPayments(matchedB);
      setPaymentsList(matchedP);
    }
  }, [bookings, payments, classes, currentUser?.uid, currentUser?.selectedClasses?.length]);

  useEffect(() => {
    if (refreshUserProfile && currentUser) {
      refreshUserProfile().catch(console.warn);
    }
    fetchDashboardData();
    refreshClasses();
  }, [currentUser?.uid]);

  const handleCancelBooking = (bookingId: string, classId: string, classTitle: string) => {
    setCancelConfirm({
      isOpen: true,
      bookingId,
      classId,
      classTitle
    });
  };

  const executeCancellation = async () => {
    const { bookingId, classId, classTitle } = cancelConfirm;
    if (!bookingId) return;
    setLoading(true);
    try {
      await syncField(
        bookingId,
        `Cancel Booking: '${classTitle}'`,
        async () => {
          await firestoreService.cancelBooking(bookingId, classId);
          
          // Trigger notification alert
          await firestoreService.triggerNotification(
            currentUser!.uid,
            "Tuition Class Cancelled",
            `Your booking slot for '${classTitle}' has been successfully removed. Refund evaluation is on review.`,
            "reminder"
          );
        },
        async () => {
          try {
            if (firestoreService.isCloudConnected()) {
              const { doc, getDoc } = await import('firebase/firestore');
              const { db } = await import('../lib/firebase');
              const snap = await getDoc(doc(db, 'bookings', bookingId));
              return !snap.exists() || (snap.data() as any).status === 'cancelled';
            }
          } catch (e) {}
          return true;
        }
      );
      
      showToast("Class booking cancelled successfully.", "info");
      // Give 1.5 seconds for the user to see the "Saved & Verified" sync indicator in the cancel modal!
      setTimeout(async () => {
        setCancelConfirm({ isOpen: false, bookingId: '', classId: '', classTitle: '' });
        await fetchDashboardData();
      }, 1500);
    } catch (e) {
      showToast("Failed booking cancellation.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-slate-50/40 min-h-screen py-10"
      id="student_workspace"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Workspace Title Header with Profile Avatar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6 bg-white p-6 rounded-3xl border border-slate-150/80 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
          <div className="flex flex-col sm:flex-row items-center gap-5 w-full lg:w-auto">
            {/* Avatar container with direct click option */}
            <div className="relative group flex-shrink-0 cursor-pointer" onClick={() => setShowCameraModal(true)}>
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-indigo-600 shadow-md">
                <img 
                  id="student_profile_avatar"
                  src={currentUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.uid}`} 
                  alt={currentUser.name} 
                  className="w-full h-full object-cover transition-all group-hover:scale-105"
                />
              </div>
              <button 
                className="absolute inset-0 bg-slate-950/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold uppercase tracking-wider cursor-pointer"
              >
                Change
              </button>
            </div>

            <div className="text-center sm:text-left">
              <span className="text-[10px] font-mono font-bold text-indigo-650 uppercase tracking-widest block leading-none">Scholar Portal</span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-2">Welcome Back, {currentUser.name}!</h1>
              <p className="text-xs text-slate-400 mt-1.5">
                Grade Level: <span className="font-extrabold text-indigo-600">{currentUser.studentDetails?.grade || 'Grade 11'}</span> 
                • Access code: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-semibold">SYNCED_SCHOLAR</span>
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3 justify-center sm:justify-start">
                <button 
                  onClick={() => setShowCameraModal(true)}
                  className="text-xs text-indigo-650 hover:text-indigo-800 font-bold flex items-center gap-1.5 bg-indigo-50/50 hover:bg-indigo-50 px-3 py-1.5 border border-indigo-100/40 rounded-xl transition-all cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" /> Take Profile Photo
                </button>
                <button 
                  onClick={() => setShowQrModal(true)}
                  className="text-xs text-white font-bold flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer"
                  id="btn_student_view_my_qr"
                >
                  <QrCode className="w-3.5 h-3.5" /> View My Student Unique QR Code
                </button>
              </div>
            </div>
          </div>

          {/* Sub menu controls - Modern Dropdown Navigation */}
          <div className="relative">
            <button
              id="student_dashboard_nav_dropdown_trigger"
              onClick={() => setIsNavDropdownOpen(!isNavDropdownOpen)}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow transition-all flex items-center gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 text-xs font-black text-slate-800 dark:text-white">
                <span className="p-1.5 bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  {activeSubTab === 'schedule' && <Calendar className="w-4 h-4" />}
                  {activeSubTab === 'classes' && <BookOpen className="w-4 h-4" />}
                  {activeSubTab === 'payments' && <FileText className="w-4 h-4" />}
                  {activeSubTab === 'performance' && <TrendingUp className="w-4 h-4" />}
                  {activeSubTab === 'roadmap' && <Compass className="w-4 h-4" />}
                  {activeSubTab === 'chat' && <MessageSquare className="w-4 h-4" />}
                  {activeSubTab === 'notifications' && <Bell className="w-4 h-4" />}
                </span>
                <span className="capitalize">
                  {activeSubTab === 'schedule' && 'Calendar & Timetable'}
                  {activeSubTab === 'classes' && 'Classes & Enrolled Ledger'}
                  {activeSubTab === 'payments' && 'Payment History'}
                  {activeSubTab === 'performance' && 'Progress & Attendance'}
                  {activeSubTab === 'roadmap' && 'Syllabus Roadmap'}
                  {activeSubTab === 'chat' && 'Message Chat'}
                  {activeSubTab === 'notifications' && 'Alerts & System Notices'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-700 px-2 py-0.5 rounded-full font-bold ml-1">
                Navigation
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${isNavDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isNavDropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsNavDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 z-40 space-y-1">
                  <div className="px-3 py-1.5 text-[10px] font-mono font-extrabold uppercase text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60 mb-1">
                    Scholar Menu Options
                  </div>
                  {[
                    { id: 'schedule', label: 'Calendar & Timetable', icon: <Calendar className="w-4 h-4 text-indigo-500" /> },
                    { id: 'classes', label: 'Classes & Enrolled Ledger', icon: <BookOpen className="w-4 h-4 text-blue-500" /> },
                    { id: 'payments', label: 'Payment History', icon: <FileText className="w-4 h-4 text-emerald-500" /> },
                    { id: 'performance', label: 'Progress & Attendance', icon: <TrendingUp className="w-4 h-4 text-amber-500" /> },
                    { id: 'roadmap', label: 'Syllabus Roadmap', icon: <Compass className="w-4 h-4 text-purple-500" /> },
                    { id: 'chat', label: 'Message Chat', icon: <MessageSquare className="w-4 h-4 text-cyan-500" /> },
                    { id: 'notifications', label: 'Alerts', icon: <Bell className="w-4 h-4 text-rose-500" />, badge: notifications.filter(n => !n.isRead).length },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      id={`student_tab_${opt.id}`}
                      onClick={() => {
                        setActiveSubTab(opt.id as any);
                        setIsNavDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeSubTab === opt.id
                          ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs font-black'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </div>
                      {opt.badge && opt.badge > 0 ? (
                        <span className="px-1.5 py-0.5 text-[9px] bg-red-500 text-white rounded-full font-black animate-pulse">
                          {opt.badge}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Display boards */}
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            Synchronizing student dashboard states...
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* 1. Schedule View Tab */}
            {activeSubTab === 'schedule' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <UpcomingDeadlines />

                <ClassScheduleWidget />

                <CalendarView 
                  userRole="student" 
                  userBookings={studentBookings} 
                />
              </motion.div>
            )}

            {/* 2. Enrolled Classes & Receipts List Tab */}
            {activeSubTab === 'classes' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                
                {/* Bookings left col */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                  
                  {/* Enrolled Classes (My Courses) */}
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-150/50 space-y-3">
                    <h3 className="text-sm font-extrabold text-indigo-900 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-500" /> My Enrolled Classes
                    </h3>
                    
                    {(() => {
                      const assignedIds = currentUser.selectedClasses || [];
                      const assignedClasses = classes.filter(c => assignedIds.includes(c.id));
                      
                      if (assignedClasses.length === 0 && studentBookings.filter(b => b.status === 'active').length === 0) {
                        return (
                          <p className="text-slate-405 text-xs italic text-center py-4 bg-white rounded-xl border border-slate-100">
                            You are not enrolled in any classes yet. An administrator can enroll you, or you can browse classes.
                          </p>
                        );
                      }
                      
                      if (assignedClasses.length === 0) return null;

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {assignedClasses.map(c => (
                            <div key={c.id} className="p-3 bg-white border border-slate-150/70 rounded-xl space-y-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                              <div>
                                <span className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold uppercase tracking-wider">{c.subject}</span>
                                <h4 className="text-xs font-extrabold text-slate-850 leading-snug mt-1">{c.title}</h4>
                                <p className="text-[10px] text-slate-500">Instructor: <span className="font-semibold text-slate-700">{c.tutorName || "Faculty Instructor"}</span></p>
                              </div>
                              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] mt-1">
                                <span className="text-slate-500 font-bold font-mono">{c.schedule}</span>
                                <button
                                  onClick={() => setSelectedClassForProfile(c)}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] rounded-lg border border-indigo-100 transition-colors cursor-pointer"
                                >
                                  View Details
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <h3 className="text-base font-bold text-gray-900 border-b border-gray-50 pb-3 flex items-center gap-2 pt-2">
                    <BookOpen className="w-5 h-5 text-indigo-500" /> Active Enrolled Subject Classes
                  </h3>
                  
                  {studentBookings.filter(b => b.status === 'active').length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs">
                      You are not currently enrolled in any academic courses. Browse Classes to add subjects.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {studentBookings.filter(b => b.status === "active").map((b) => (
                        <div 
                          key={b.id} 
                          className="p-4 border border-blue-50 bg-blue-50/10 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all hover:border-blue-200"
                        >
                          <div>
                            <span className="text-[9px] font-bold font-mono tracking-wider text-blue-600 uppercase">Enrolled Course Slot</span>
                            <h4 className="text-sm font-bold text-blue-950 mt-1 leading-snug">{b.classTitle}</h4>
                            <p className="text-xs text-gray-500 mt-1">Instructor: <span className="font-semibold text-gray-800">{b.tutorName}</span></p>
                            <p className="text-[11px] text-blue-600 font-medium mt-1 font-mono">Sessions: {b.dayOfWeek}s at {b.timeSlot}</p>
                          </div>
                          
                          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                            <button
                              onClick={() => {
                                const matchedClass = classes.find(c => c.id === b.classId);
                                const targetClass: ClassItem = matchedClass || {
                                  id: b.classId,
                                  title: b.classTitle,
                                  subject: (b as any).subject || 'General',
                                  tutorId: b.tutorId,
                                  tutorName: b.tutorName,
                                  price: (b as any).price || 0,
                                  schedule: `${b.dayOfWeek}s ${b.timeSlot}`,
                                  dayOfWeek: b.dayOfWeek,
                                  timeSlot: b.timeSlot
                                };
                                setSelectedClassForProfile(targetClass);
                              }}
                              className="flex-1 sm:flex-initial px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-all cursor-pointer font-bold text-xs flex items-center justify-center gap-1.5 border border-indigo-100"
                              id={`btn_view_class_notes_${b.classId}`}
                            >
                              <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> View Notes & Details
                            </button>
                            <button
                              onClick={() => {
                                setReviewTargetBooking(b);
                                setReviewRating(5);
                                setReviewComment("");
                                setShowSubmitReviewModal(true);
                              }}
                              className="flex-1 sm:flex-initial px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 rounded-xl transition-all cursor-pointer font-bold text-xs flex items-center justify-center gap-1.5 border border-amber-100"
                            >
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Rate Class
                            </button>
                            <button
                              onClick={() => handleCancelBooking(b.id, b.classId, b.classTitle)}
                              className="flex-1 sm:flex-initial px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-800 rounded-xl transition-all cursor-pointer font-bold text-xs flex items-center justify-center gap-1.5 border border-red-100"
                            >
                              <XOctagon className="w-3.5 h-3.5" /> Cancel
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payments Receipts right col */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-base font-bold text-gray-900 border-b border-gray-50 pb-3 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-500" /> Tuition Payout Receipts Ledger
                  </h3>

                  <div className="mt-4 space-y-3 max-h-80 overflow-y-auto">
                    {paymentsList.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-xs text-sans">
                        No financial logs matching your user account.
                      </div>
                    ) : (
                      paymentsList.map((p) => {
                        const isSuccess = p.status === 'paid';
                        const isPending = p.status === 'pending';
                        return (
                          <div 
                            key={p.id} 
                            className="p-3 border border-gray-50 hover:border-gray-100 rounded-xl text-xs space-y-1 bg-gray-50/30"
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-gray-800 truncate pr-2" title={p.classTitle}>{p.classTitle}</span>
                              <span className="font-extrabold text-blue-700 font-mono text-xs">LKR {p.amount}</span>
                            </div>
                            
                            <div className="flex justify-between items-center text-[10px] text-gray-405 font-mono pt-1">
                              <span>Method: {p.paymentMethod || 'Scholar wallet'}</span>
                              <span>Date: {new Date(p.date).toLocaleDateString()}</span>
                            </div>

                            <div className="pt-2 flex justify-between items-center border-t border-dashed border-gray-100 mt-1">
                              <span className="text-[9px] text-gray-400 uppercase font-bold font-mono">ID: {p.id}</span>
                              {isSuccess && (
                                <span className="inline-flex items-center gap-1 py-0.5 px-2 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-semibold">
                                  <CheckCircle className="w-3 h-3" /> Paid
                                </span>
                              )}
                              {isPending && (
                                <span className="inline-flex items-center gap-1 py-0.5 px-2 bg-yellow-101 text-yellow-800 rounded-full text-[9px] font-semibold">
                                  <Hourglass className="w-3 h-3" /> Pending
                                </span>
                              )}
                              {!isSuccess && !isPending && (
                                <span className="inline-flex items-center gap-1 py-0.5 px-2 bg-red-100 text-red-850 rounded-full text-[9px] font-semibold">
                                  <AlertTriangle className="w-3 h-3" /> Failed
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </motion.div>
            )}

            {/* Academic Performance & Analytics Tab */}
            {activeSubTab === 'performance' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <StudentProgressTracker
                  currentUser={currentUser}
                  userBookings={studentBookings}
                  classes={classes}
                  attendanceRecords={attendanceRecords}
                  onAttendanceMarked={loadAttendanceRecords}
                  showToast={showToast}
                />
              </motion.div>
            )}

            {/* Syllabus Roadmap Tab */}
            {activeSubTab === 'roadmap' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <StudentModuleRoadmap
                  currentUser={currentUser}
                  userBookings={studentBookings}
                  classes={classes}
                />
              </motion.div>
            )}

            {/* Payment History Tab */}
            {activeSubTab === 'payments' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <StudentPaymentHistory />
              </motion.div>
            )}

            {/* 3. Direct Chat Panel Tab */}
            {activeSubTab === 'chat' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <ChatWidget currentUserId={currentUser.uid} currentUserRole="student" />
              </motion.div>
            )}

            {/* 4. Notifications tab */}
            {activeSubTab === 'notifications' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* 24-Hour Class Reminder Cron Trigger & Outbox Status */}
                <ClassReminderCronPanel />

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                  {/* Lists alerts */}
                  <div className="lg:col-span-3 bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded-2xl p-6">
                  <h3 className="text-base font-bold text-blue-900 flex items-center justify-between border-b pb-4 border-gray-50 mb-4">
                    <span>Notifications Dashboard</span>
                    {notifications.filter(n => !n.isRead).length > 0 && (
                      <span className="px-2.5 py-0.5 text-xs bg-red-500 text-white font-bold rounded-full">
                        {notifications.filter(n => !n.isRead).length} Unread
                      </span>
                    )}
                  </h3>

                  <div className="space-y-3.5">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-xs">
                        No notification logs found.
                      </div>
                    ) : (
                      notifications.map((not) => (
                        <div 
                          key={not.id}
                          className={`p-4 rounded-xl border flex justify-between items-start transition-all ${
                            !not.isRead 
                              ? 'bg-blue-50/20 border-blue-100/70 shadow-xs' 
                              : 'bg-white border-gray-100'
                          }`}
                        >
                          <div>
                            <span className="block text-xs font-bold text-blue-950 font-sans">{not.title}</span>
                            <span className="block text-xs text-gray-500 mt-1 leading-snug">{not.message}</span>
                            <span className="block text-[10px] text-gray-400 mt-2 font-mono">
                              Logged UTC: {new Date(not.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {!not.isRead && (
                            <button
                              onClick={async () => {
                                await executeWriteWithRetry(
                                  `Mark Notification Read: '${not.title}'`,
                                  async () => {
                                    await firestoreService.markNotificationRead(not.id);
                                    await refreshNotifications();
                                  },
                                  async () => {
                                    try {
                                      if (firestoreService.isCloudConnected()) {
                                        const { doc, getDoc } = await import('firebase/firestore');
                                        const { db } = await import('../lib/firebase');
                                        const snap = await getDoc(doc(db, 'notifications', not.id));
                                        return snap.exists() && (snap.data() as any).isRead === true;
                                      }
                                    } catch (e) {}
                                    return true;
                                  }
                                );
                              }}
                              className="p-1 px-2 hover:bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold border border-emerald-100 flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Read
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Alerts customization config settings */}
                <div className="bg-white border border-gray-150 rounded-2xl p-6">
                  <h3 className="text-base font-bold text-gray-900 border-b pb-4 border-gray-50 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4.5 h-4.5 text-blue-500" />
                      <span>Alert Handles</span>
                    </div>
                    <SyncStatusIndicator operationPatterns={['notification', 'settings']} />
                  </h3>
                  <p className="text-xs text-gray-400 mb-5">Manage personalized alerts sync settings:</p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Course Reminders</span>
                      <input 
                        type="checkbox" 
                        checked={notificationSettings.reminders}
                        onChange={(e) => updateNotificationSettings({ reminders: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Payments Alerts</span>
                      <input 
                        type="checkbox" 
                        checked={notificationSettings.payments}
                        onChange={(e) => updateNotificationSettings({ payments: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Tutor Messages</span>
                      <input 
                        type="checkbox" 
                        checked={notificationSettings.messages}
                        onChange={(e) => updateNotificationSettings({ messages: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                    </div>
                    
                    {/* Specific Email Triggers Section */}
                    <div className="border-t pt-4 border-dashed border-gray-100 space-y-3.5">
                      <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-650 font-mono">Email Notification Triggers</h4>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-750">Class revisions & timing alterations</span>
                          <span className="block text-[9px] text-gray-400">Receive alerts when schedule slots or links change</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={!!notificationSettings.emailClassRevisions}
                          onChange={(e) => updateNotificationSettings({ emailClassRevisions: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-750">Booking & enrollment receipts</span>
                          <span className="block text-[9px] text-gray-400">Receive confirmations on seat reservations</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={!!notificationSettings.emailBookingStatus}
                          onChange={(e) => updateNotificationSettings({ emailBookingStatus: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-750">New course worksheets & handouts</span>
                          <span className="block text-[9px] text-gray-400">Alert me when files or handouts are distributed</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={!!notificationSettings.emailStudyMaterials}
                          onChange={(e) => updateNotificationSettings({ emailStudyMaterials: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-750">Grade & performance analysis reports</span>
                          <span className="block text-[9px] text-gray-400">Receive monthly progress summaries and charts</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={!!notificationSettings.emailPerformanceLogs}
                          onChange={(e) => updateNotificationSettings({ emailPerformanceLogs: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t pt-4 border-dashed border-gray-100">
                      <div>
                        <span className="text-xs font-bold text-blue-700">Inbox Copy Sync</span>
                        <span className="block text-[9px] text-gray-400 leading-none mt-0.5">Route copy to email addresses</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={notificationSettings.emailSync}
                        onChange={(e) => updateNotificationSettings({ emailSync: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Parent / Guardian Email Linking & Notification Auto-CC Card */}
                <div className="bg-white border border-indigo-150 rounded-2xl p-6 shadow-xs" id="student_parent_linking_card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-indigo-50 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <LinkIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          Parent / Guardian Account Link
                          {parentCcEnabled && parentEmailInput && (
                            <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active CC
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-slate-400">Keep parents updated with automated CC on class check-ins & fee notices</p>
                      </div>
                    </div>

                    {/* Master Simple Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none bg-indigo-50/60 px-3 py-1.5 rounded-xl border border-indigo-200/70 hover:bg-indigo-100/60 transition-colors">
                      <span className="text-xs font-extrabold text-indigo-950">Auto-CC Parent</span>
                      <input 
                        type="checkbox"
                        id="student_toggle_parent_cc"
                        checked={parentCcEnabled}
                        onChange={(e) => setParentCcEnabled(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-8 space-y-1.5">
                        <label className="text-xs font-bold text-slate-750 flex items-center justify-between">
                          <span>Parent / Guardian Email Address</span>
                          <span className="text-[10px] text-slate-400 font-normal">Used for automated Carbon Copy (CC)</span>
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input 
                            type="email"
                            id="student_input_parent_email"
                            placeholder="e.g. parent.guardian@example.com"
                            value={parentEmailInput}
                            onChange={(e) => setParentEmailInput(e.target.value)}
                            className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-mono transition-all"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-4">
                        <button
                          type="button"
                          id="btn_student_save_parent_link"
                          onClick={() => handleSaveParentSettings()}
                          disabled={savingParentSettings}
                          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {savingParentSettings ? 'Saving Link...' : 'Save & Link Email'}
                        </button>
                      </div>
                    </div>

                    {/* Specific CC Notification Channels */}
                    <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 space-y-2.5 text-xs">
                      <span className="text-[10px] uppercase font-mono font-extrabold text-slate-500 block">
                        Included Parent CC Notification Types:
                      </span>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="checkbox"
                            checked={parentCcAttendance}
                            onChange={(e) => setParentCcAttendance(e.target.checked)}
                            disabled={!parentCcEnabled}
                            className="w-4 h-4 text-indigo-600 rounded cursor-pointer disabled:opacity-40"
                          />
                          <div>
                            <span className={`text-xs font-bold block ${parentCcEnabled ? 'text-slate-800' : 'text-slate-400'}`}>
                              Attendance & Tardiness Alerts
                            </span>
                            <span className="text-[10px] text-slate-400 block">Check-ins, late arrival badges & absence notices</span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="checkbox"
                            checked={parentCcPayments}
                            onChange={(e) => setParentCcPayments(e.target.checked)}
                            disabled={!parentCcEnabled}
                            className="w-4 h-4 text-indigo-600 rounded cursor-pointer disabled:opacity-40"
                          />
                          <div>
                            <span className={`text-xs font-bold block ${parentCcEnabled ? 'text-slate-800' : 'text-slate-400'}`}>
                              Tuition Invoices & Receipts
                            </span>
                            <span className="text-[10px] text-slate-400 block">Payment receipts, due dates & monthly fee invoices</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          </div>
        )}

      </div>

      {/* Interactive Review & Rating Submission Modal Overlay */}
      {showSubmitReviewModal && reviewTargetBooking && (
        <div className="fixed inset-0 z-55 overflow-y-auto bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4" id="submit_review_form_overlay">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-150 shadow-2xl relative font-sans">
            <button 
              onClick={() => {
                setShowSubmitReviewModal(false);
                setReviewTargetBooking(null);
              }}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-650 p-1.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <span className="text-[9px] uppercase font-mono text-indigo-600 font-bold tracking-wider block">Write a Review</span>
              <h3 className="text-base font-extrabold text-slate-900 mt-1 leading-snug">Share Your Academic Feedback</h3>
              <p className="text-xs text-slate-400 mt-1">Submit feedback for your class to guide scholars and help educators improve.</p>
            </div>

            <div className="bg-indigo-50/30 p-3.5 rounded-2xl border border-indigo-100/40 mb-4 text-xs">
              <span className="text-[9px] uppercase font-mono text-indigo-600 font-bold tracking-wider block">Course Title</span>
              <p className="font-bold text-slate-800 mt-0.5">{reviewTargetBooking.classTitle}</p>
              <p className="text-slate-500 mt-1 text-[10px]">Instructor: <span className="font-semibold text-slate-700">{reviewTargetBooking.tutorName}</span></p>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Star Selector */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-2">Your Rating Grade:</label>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star 
                          className={`w-7 h-7 ${
                            star <= reviewRating 
                              ? 'fill-amber-400 text-amber-400' 
                              : 'text-slate-200 fill-slate-200'
                          }`} 
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] font-bold text-amber-600 ml-1">
                    {getRatingLabel(reviewRating)}
                  </span>
                </div>
              </div>

              {/* Comment text area */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-2">Written Review Comments:</label>
                <textarea
                  required
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="How was the teaching style? Were the custom slide workbook exercises useful? Explain what went well or what could be improved..."
                  className="w-full text-xs rounded-xl p-3 border border-slate-200 outline-none focus:border-indigo-600 font-sans leading-relaxed bg-slate-50 focus:bg-white transition-all focus:ring-4 focus:ring-indigo-100"
                ></textarea>
              </div>

              {/* Terms hint */}
              <p className="text-[10px] text-slate-400 italic">
                * Note: To prevent spamming, your submitted review enters our admin moderation pipeline and will display publicly once approved.
              </p>

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-2 font-sans">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] text-slate-400 font-mono">Sync status:</span>
                  <SyncStatusIndicator operationPatterns={['review', 'feedback']} />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubmitReviewModal(false);
                      setReviewTargetBooking(null);
                    }}
                    className="w-1/2 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-650 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview || !reviewComment.trim()}
                    className="w-1/2 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom state-driven cancellation confirmation modal */}
      {cancelConfirm.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-100 shadow-2xl text-center relative animate-fade-in font-sans">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mx-auto mb-4 animate-bounce">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-2">Cancel Enrollment</h2>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Are you sure you want to withdraw and cancel your tuition seat in <span className="font-extrabold text-indigo-950">"{cancelConfirm.classTitle}"</span>? Refund evaluations are subject to review.
            </p>

            {getFieldStatus(cancelConfirm.bookingId) !== 'idle' && (
              <div className="flex justify-center items-center py-2.5 mb-4 bg-slate-50 rounded-xl border border-slate-100/60">
                <SyncBadge status={getFieldStatus(cancelConfirm.bookingId)} message={getFieldMessage(cancelConfirm.bookingId)} showText />
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setCancelConfirm({ isOpen: false, bookingId: '', classId: '', classTitle: '' })}
                className="w-1/2 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={executeCancellation}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                Yes, Cancel Seat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Profile Capture Modal */}
      <CameraProfileCapture 
        isOpen={showCameraModal} 
        onClose={() => setShowCameraModal(false)} 
      />

      {/* Student Personal Unique QR Code Modal */}
      {showQrModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowQrModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-5 border border-slate-150 shadow-2xl relative font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest font-mono block">Official Student Identity Pass</span>
              <h3 className="text-lg font-extrabold text-slate-900 mt-1">{currentUser.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Unique ID: <span className="font-mono font-bold text-slate-800">{currentUser.username || currentUser.uid}</span></p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block shadow-inner">
              <QRCodeCanvas 
                id="student_personal_qr_canvas"
                value={currentUser.username || currentUser.uid}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Show this QR code pass to your tutors at class check-in or scan for attendance validation.
            </p>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const canvas = document.getElementById('student_personal_qr_canvas') as HTMLCanvasElement;
                  if (canvas) {
                    const url = canvas.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.download = `Student_QR_${currentUser.username || currentUser.uid}.png`;
                    link.href = url;
                    link.click();
                    showToast("QR Code downloaded successfully!", "success");
                  }
                }}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                id="btn_download_student_qr"
              >
                <Download className="w-4 h-4" /> Download QR Code Pass
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Class Profile Modal for Students */}
      {selectedClassForProfile && (
        <ClassProfileModal
          isOpen={!!selectedClassForProfile}
          onClose={() => setSelectedClassForProfile(null)}
          classItem={selectedClassForProfile}
          currentUser={currentUser}
          bookings={bookings}
          allUsers={[]}
          payments={payments}
          attendanceRecords={attendanceRecords}
          showToast={showToast}
          onUpdateData={fetchDashboardData}
        />
      )}
    </motion.div>
  );
};
