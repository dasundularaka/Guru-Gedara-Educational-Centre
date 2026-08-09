import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, 
  X, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Undo2, 
  User, 
  Clock, 
  Sparkles,
  BookOpen,
  ShieldCheck,
  UserCheck,
  Send,
  AlertTriangle
} from 'lucide-react';
import jsQR from 'jsqr';
import { ClassItem, Booking, UserProfile, AttendanceRecord } from '../types';
import { firestoreService } from '../lib/firestoreService';
import { sendAttendanceNotifications, parseClassScheduleTimes } from '../lib/attendanceNotification';
import { 
  validateQRAttendanceWindow, 
  getActiveExtraClassSession, 
  saveExtraClassSession, 
  removeExtraClassSession, 
  isTodayClassDay, 
  isCurrentTimeInClassWindow, 
  parseScheduleTimes, 
  parseTimeToTodayDate,
  ExtraClassSession 
} from '../lib/classScheduleUtils';

interface ClassAttendanceQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  initialClass?: ClassItem | null;
  tutorClasses?: ClassItem[];
  bookings?: Booking[];
  allUsers?: UserProfile[];
  attendanceRecords?: AttendanceRecord[];
  onAttendanceMarked?: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ClassAttendanceQRScannerModal: React.FC<ClassAttendanceQRScannerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialClass = null,
  tutorClasses = [],
  bookings = [],
  allUsers = [],
  attendanceRecords = [],
  onAttendanceMarked,
  showToast
}) => {
  const isTutorOrAdmin = currentUser.role === 'tutor' || currentUser.role === 'admin';

  // Fixed Target Class and Date (no selectors)
  const targetClass = initialClass || (tutorClasses.length > 0 ? tutorClasses[0] : null);
  const selectedDate = new Date().toISOString().split('T')[0];

  // Scanner & Input State
  const [manualInputStr, setManualInputStr] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Manual Confirmation Modal state (when QR scanner can't read or manual entry used)
  const [pendingManualStudent, setPendingManualStudent] = useState<{
    user?: UserProfile;
    booking?: Booking;
    inputIdentifier: string;
    studentName: string;
    studentUid: string;
    studentUsername: string;
  } | null>(null);

  // Scan Result Error/Notice
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Extra Class Prompt & Temporary Schedule Configurator States
  const [showExtraClassPrompt, setShowExtraClassPrompt] = useState<boolean>(false);
  const [showTimeSlotConfigurator, setShowTimeSlotConfigurator] = useState<boolean>(false);
  const [extraClassSession, setExtraClassSession] = useState<ExtraClassSession | null>(null);
  const [tempTimeSlotInput, setTempTimeSlotInput] = useState<string>('02:00 PM - 04:00 PM');

  // Check extra class session when targetClass changes or modal opens
  useEffect(() => {
    if (isOpen && targetClass) {
      const activeExtra = getActiveExtraClassSession(targetClass.id);
      setExtraClassSession(activeExtra);

      const isToday = isTodayClassDay(targetClass.dayOfWeek, targetClass.schedule);
      const { isInWindow } = isCurrentTimeInClassWindow(targetClass.timeSlot, targetClass.schedule);

      // Prompt if outside regular schedule AND no active extra class session exists
      if ((!isToday || !isInWindow) && !activeExtra) {
        setShowExtraClassPrompt(true);
      } else {
        setShowExtraClassPrompt(false);
      }
    }
  }, [isOpen, targetClass]);

  // Periodic check to auto-remove expired extra class session
  useEffect(() => {
    if (!targetClass) return;
    const interval = setInterval(() => {
      const activeExtra = getActiveExtraClassSession(targetClass.id);
      setExtraClassSession(activeExtra);
    }, 5000);
    return () => clearInterval(interval);
  }, [targetClass]);

  // Verification 5-Second Undo Window & Auto-Disappear Timer
  const [lastScannedRecord, setLastScannedRecord] = useState<AttendanceRecord | null>(null);
  const [lastScannedStudent, setLastScannedStudent] = useState<UserProfile | null>(null);
  const [lastPunctualityStatus, setLastPunctualityStatus] = useState<string>('On Time');
  const [undoCountdown, setUndoCountdown] = useState<number>(5);
  const [isReverting, setIsReverting] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanAnimFrameRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  // 5-second countdown timer for attendance verification undo window & auto-disappear
  useEffect(() => {
    if (!lastScannedRecord) return;

    setUndoCountdown(5);
    const interval = setInterval(() => {
      setUndoCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setLastScannedRecord(null);
          setLastScannedStudent(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lastScannedRecord]);

  // Clean up camera on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        requestAnimationFrame(tickScanner);
      }
    } catch (err) {
      setCameraError('Camera access unavailable. Use manual username/UID input below.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (scanAnimFrameRef.current) {
      cancelAnimationFrame(scanAnimFrameRef.current);
      scanAnimFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Real Camera QR Scanning Frame Reader using jsQR
  const tickScanner = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      scanAnimFrameRef.current = requestAnimationFrame(tickScanner);
      return;
    }

    if (isProcessingRef.current) {
      scanAnimFrameRef.current = requestAnimationFrame(tickScanner);
      return;
    }

    const video = videoRef.current;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data) {
        isProcessingRef.current = true;
        // Real QR scanned successfully!
        handleProcessScan(code.data, 'qrcode');
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 2000);
        return;
      }
    }

    scanAnimFrameRef.current = requestAnimationFrame(tickScanner);
  };

  if (!isOpen || !isTutorOrAdmin) return null;

  // Save temporary Extra Class session with expiration
  const handleSaveExtraClassSession = () => {
    if (!targetClass) return;
    const timeSlotStr = tempTimeSlotInput.trim() || '02:00 PM - 04:00 PM';
    const { startTimeStr, endTimeStr } = parseScheduleTimes(timeSlotStr);

    const now = new Date();
    const endD = parseTimeToTodayDate(endTimeStr, now);
    if (endD.getTime() <= now.getTime()) {
      endD.setHours(now.getHours() + 2);
    }

    const session: ExtraClassSession = {
      classId: targetClass.id,
      classTitle: targetClass.title,
      date: selectedDate,
      startTime: startTimeStr,
      endTime: endTimeStr,
      timeSlotStr: timeSlotStr,
      expiresAt: endD.getTime(),
      createdAt: new Date().toISOString()
    };

    saveExtraClassSession(session);
    setExtraClassSession(session);
    setShowTimeSlotConfigurator(false);
    setErrorNotice(null);
    showToast(`🎉 Extra Class session activated for ${targetClass.title} (${timeSlotStr})!`, 'success');
  };

  // Process QR / Student Identity Payload
  const handleProcessScan = async (rawInputStr: string, scanType: 'qrcode' | 'manual' = 'qrcode') => {
    setErrorNotice(null);
    const input = rawInputStr.trim();
    if (!input) {
      showToast('Please enter or scan a valid student QR code or username.', 'info');
      return;
    }

    if (!targetClass) {
      showToast('No class selected for attendance.', 'error');
      return;
    }

    // --- CONDITION 0: CLASS DATE AND CLASS TIME WINDOW VALIDATION ---
    const scheduleValidation = validateQRAttendanceWindow(targetClass);
    if (!scheduleValidation.allowed) {
      const msg = `❌ Attendance Restricted: ${scheduleValidation.reason}`;
      setErrorNotice(msg);
      showToast(msg, 'error');
      return;
    }

    // 1. Extract Student Identifiers
    let scannedId = input;
    let scannedName = '';
    if (input.startsWith('{')) {
      try {
        const parsed = JSON.parse(input);
        scannedId = parsed.studentId || parsed.username || parsed.uid || input;
        scannedName = parsed.name || parsed.studentName || '';
      } catch (e) {
        // raw text payload
      }
    }

    // Match student profile in database
    const matchedUser = allUsers.find(u => 
      u.uid === scannedId || 
      (u.username && u.username.toLowerCase() === scannedId.toLowerCase()) || 
      (scannedName && u.name.toLowerCase() === scannedName.toLowerCase()) ||
      u.name.toLowerCase() === scannedId.toLowerCase() ||
      u.email.toLowerCase() === scannedId.toLowerCase()
    );

    const matchedBooking = bookings.find(b => 
      b.classId === targetClass.id && 
      (b.studentId === scannedId || b.studentId === matchedUser?.uid || b.studentName.toLowerCase() === scannedId.toLowerCase())
    );

    const studentUid = matchedUser?.uid || matchedBooking?.studentId || scannedId;
    const studentName = matchedUser?.name || matchedBooking?.studentName || scannedName || scannedId;
    const studentUsername = matchedUser?.username || matchedUser?.uid || studentUid;

    // --- CONDITION 1: ENROLMENT VALIDATION ---
    const isEnrolled = !!matchedBooking || (matchedUser?.selectedClasses?.includes(targetClass.id));
    if (!isEnrolled) {
      const msg = `❌ Attendance Denied: Student '${studentName}' is NOT enrolled in active roster for '${targetClass.title}'.`;
      setErrorNotice(msg);
      showToast(msg, 'error');
      return;
    }

    // --- CONDITION 2: ACTIVE STATUS VALIDATION ---
    const isSuspendedInClass = matchedUser?.classEnrollmentStatus?.[targetClass.id] === 'suspended' || matchedUser?.status === 'suspended';
    if (isSuspendedInClass) {
      const msg = `❌ Attendance Denied: Student '${studentName}' enrollment is SUSPENDED for '${targetClass.title}'.`;
      setErrorNotice(msg);
      showToast(msg, 'error');
      return;
    }

    // --- CONDITION 3: PREVENT DUPLICATE SCAN FOR TODAY ---
    const existingRecord = attendanceRecords.find(a => 
      a.classId === targetClass.id && 
      a.studentId === studentUid && 
      a.date === selectedDate && 
      a.status === 'Present'
    );

    if (existingRecord) {
      const formattedTime = new Date(existingRecord.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const msg = `⚠️ Duplicate Scan Prevented: Student '${studentName}' was ALREADY marked Present today (${selectedDate}) at ${formattedTime}.`;
      setErrorNotice(msg);
      showToast(msg, 'info');
      return;
    }

    // If scanType === 'manual' (typed username because scanner couldn't read), open confirmation dialog!
    if (scanType === 'manual') {
      setPendingManualStudent({
        user: matchedUser,
        booking: matchedBooking,
        inputIdentifier: input,
        studentName,
        studentUid,
        studentUsername
      });
      return;
    }

    // Directly execute marking for real QR code camera scan
    await executeMarkAttendance(studentUid, studentName, matchedUser || null, 'qrcode');
  };

  // Execute marking attendance and triggering auto email/messaging
  const executeMarkAttendance = async (
    studentUid: string,
    studentName: string,
    studentUser: UserProfile | null,
    type: 'qrcode' | 'manual'
  ) => {
    if (!targetClass) return;

    try {
      const recordId = `att_${targetClass.id}_${studentUid}_${selectedDate}`;
      const markedAtIso = new Date().toISOString();

      const activeExtra = getActiveExtraClassSession(targetClass.id);

      const record: AttendanceRecord = {
        id: recordId,
        classId: targetClass.id,
        classTitle: targetClass.title,
        studentId: studentUid,
        studentName: studentName,
        date: selectedDate,
        status: 'Present',
        markedAt: markedAtIso,
        tutorId: currentUser.uid,
        type: type,
        scannedByName: currentUser.name || currentUser.username || 'Tutor',
        isExtraClass: !!activeExtra,
        extraClassTimeSlot: activeExtra ? activeExtra.timeSlotStr : undefined,
        notes: activeExtra ? `Extra Class Session (${activeExtra.timeSlotStr})` : undefined
      };

      await firestoreService.markAttendance(record);

      // Trigger Auto Email, Message & System Notification
      const notifResult = await sendAttendanceNotifications(record, targetClass, studentUser, currentUser);

      // Audit Log
      await firestoreService.addAuditLog({
        username: currentUser.name || currentUser.username || 'Tutor',
        action: type === 'qrcode' ? 'QR_ATTENDANCE_SCANNED' : 'MANUAL_ATTENDANCE_OVERRIDE',
        details: `Marked attendance (${type}) for ${notifResult.studentFullIdentifier} in ${targetClass.title} - ${notifResult.punctualityStatus}`
      });

      // Set state for 3-second verification overlay
      setLastScannedRecord(record);
      setLastScannedStudent(studentUser);
      setLastPunctualityStatus(notifResult.punctualityStatus);
      setManualInputStr('');
      setPendingManualStudent(null);
      stopCamera();

      showToast(`🎉 Attendance Marked & Alert Sent: ${notifResult.studentFullIdentifier} [${notifResult.punctualityStatus}]`, 'success');
      if (onAttendanceMarked) onAttendanceMarked();
    } catch (err) {
      showToast('Failed to mark attendance. Please try again.', 'error');
    }
  };

  // REVERSE / UNDO ATTENDANCE ACTION
  const handleReverseAttendance = async () => {
    if (!lastScannedRecord) return;
    setIsReverting(true);

    try {
      await firestoreService.deleteAttendance(lastScannedRecord.id);

      // Audit log for reversion
      await firestoreService.addAuditLog({
        username: currentUser.name || currentUser.username || 'Tutor',
        action: 'ATTENDANCE_REVERTED',
        details: `Reverted attendance mark for ${lastScannedRecord.studentName} in ${lastScannedRecord.classTitle}`
      });

      showToast(`↩️ Attendance mark reverted for ${lastScannedRecord.studentName}!`, 'info');
      setLastScannedRecord(null);
      setLastScannedStudent(null);
      if (onAttendanceMarked) onAttendanceMarked();
    } catch (err) {
      showToast('Failed to revert attendance.', 'error');
    } finally {
      setIsReverting(false);
    }
  };

  const scheduleTimes = parseClassScheduleTimes(targetClass?.schedule);
  const formattedToday = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs font-sans animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-150 overflow-hidden w-full max-w-2xl relative flex flex-col"
          id="tutor_qr_scanner_modal"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600/30 rounded-xl text-indigo-400 border border-indigo-500/20">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold tracking-tight flex items-center gap-2">
                  Live Attendance QR Scanner
                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 font-mono text-[9px] rounded-full uppercase border border-indigo-400/30">
                    Real-time Scan
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  Scan student identity QR code to mark attendance & send instant notification
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              id="btn_close_tutor_qr_scanner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">

            {/* Locked Fixed Class & Date Banner */}
            {targetClass && (
              <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-mono font-bold text-[9px] rounded uppercase border border-blue-400/30">
                      {targetClass.subject}
                    </span>
                    {extraClassSession ? (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-mono font-bold text-[9px] rounded uppercase border border-amber-400/40 flex items-center gap-1 animate-pulse">
                        <Sparkles className="w-3 h-3 text-amber-300" /> Extra Class Session
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                        <Clock className="w-3 h-3" /> Schedule: {scheduleTimes.startTimeStr} - {scheduleTimes.endTimeStr} ({targetClass.dayOfWeek})
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-extrabold text-white leading-tight">
                    {targetClass.title}
                  </h4>
                  {extraClassSession && (
                    <p className="text-[11px] text-amber-300 font-mono font-semibold flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> Temporary Slot: {extraClassSession.timeSlotStr}
                      <span className="text-[9px] bg-amber-950 text-amber-200 px-2 py-0.5 rounded-full border border-amber-800/60">
                        Disappears at end
                      </span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4 shrink-0 font-mono">
                  {extraClassSession ? (
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTempTimeSlotInput(extraClassSession.timeSlotStr);
                          setShowTimeSlotConfigurator(true);
                        }}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] font-mono rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1"
                        id="btn_edit_extra_class_slot"
                      >
                        <Clock className="w-3 h-3" /> Change Slot
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          removeExtraClassSession(targetClass.id);
                          setExtraClassSession(null);
                          showToast('Extra class session ended.', 'info');
                        }}
                        className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] font-mono rounded-xl transition-all cursor-pointer"
                        id="btn_end_extra_class_session"
                      >
                        End
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTempTimeSlotInput("02:00 PM - 04:00 PM");
                        setShowTimeSlotConfigurator(true);
                      }}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-extrabold text-[10px] font-mono rounded-xl transition-all cursor-pointer flex items-center gap-1"
                      id="btn_open_extra_class_config"
                    >
                      <Sparkles className="w-3 h-3 text-amber-300" /> Extra Class
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ERROR / WARNING NOTIFICATION BANNER */}
            {errorNotice && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-bold flex items-start gap-2.5 animate-pulse">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p>{errorNotice}</p>
                </div>
                <button onClick={() => setErrorNotice(null)} className="text-red-400 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* --- 5-SECOND VERIFICATION OVERLAY & UNDO WINDOW --- */}
            <AnimatePresence>
              {lastScannedRecord && (
                <motion.div 
                  key={`student_verification_${lastScannedRecord.id}`}
                  initial={{ opacity: 0, scale: 0.85, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: -10 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                  className="bg-emerald-50 border-2 border-emerald-400 p-5 rounded-3xl space-y-4 shadow-xl relative overflow-hidden"
                  id="student_verification_popup"
                >
                  
                  {/* 5-Second Success Animated Progress Indicator Bar */}
                  <div className="w-full bg-emerald-200/80 h-2 rounded-full overflow-hidden shadow-inner relative">
                    <motion.div 
                      key={`progress_bar_${lastScannedRecord.id}`}
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: 5, ease: 'linear' }}
                      className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 h-full rounded-full shadow-sm"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 text-left">
                      <div className="relative shrink-0">
                        {lastScannedStudent?.photoURL ? (
                          <img 
                            referrerPolicy="no-referrer"
                            src={lastScannedStudent.photoURL} 
                            alt={lastScannedRecord.studentName} 
                            className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-xl flex items-center justify-center border-2 border-emerald-500 shadow-md">
                            {lastScannedRecord.studentName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 p-1 bg-emerald-600 text-white rounded-full shadow-sm border border-white">
                          <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" />
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 bg-emerald-600 text-white font-mono font-bold text-[9px] uppercase rounded-full tracking-wider flex items-center gap-1 shadow-xs">
                            <CheckCircle2 className="w-3 h-3" /> Attendance Verified
                          </span>
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-mono font-bold text-[9px] rounded-full">
                            {lastPunctualityStatus}
                          </span>
                          <span className="text-[10px] font-mono font-extrabold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300/60 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-600 animate-spin" /> Disappears in {undoCountdown}s
                          </span>
                        </div>
                        <h4 className="text-base font-black text-emerald-950 mt-1 leading-tight">
                          {lastScannedRecord.studentName}
                          <span className="text-xs font-mono font-normal text-emerald-700 ml-1.5">
                            ({lastScannedStudent?.username || lastScannedRecord.studentId})
                          </span>
                        </h4>
                        <p className="text-[11px] text-emerald-800 font-mono mt-0.5 flex items-center gap-1">
                          <Send className="w-3 h-3 text-emerald-600" /> Auto Email & Messaging dispatched
                        </p>
                      </div>
                    </div>

                    {/* REVERSE / UNDO BUTTON (View time: 5s, then disappears with profile) */}
                    <button
                      onClick={handleReverseAttendance}
                      disabled={isReverting}
                      className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-red-400 shrink-0"
                      id="btn_reverse_attendance"
                    >
                      <Undo2 className="w-4 h-4" />
                      {isReverting ? 'Reverting...' : 'REVERSE / UNDO'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* SCANNER CAMERA & MANUAL USERNAME ENTRY */}
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 uppercase font-mono tracking-wider flex items-center gap-2">
                  <Camera className="w-4 h-4 text-indigo-600" /> Real Camera QR Code Scan
                </span>

                <button
                  type="button"
                  onClick={isCameraActive ? stopCamera : startCamera}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isCameraActive 
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                  }`}
                  id="btn_toggle_scanner_camera"
                >
                  <Camera className="w-3.5 h-3.5" /> {isCameraActive ? 'Stop Camera' : 'Start Camera Scanner'}
                </button>
              </div>

              {/* Camera Viewfinder */}
              {isCameraActive && (
                <div className="relative w-full h-60 bg-slate-950 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-inner flex items-center justify-center">
                  <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-dashed border-indigo-400 m-8 rounded-2xl pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] font-mono font-bold text-white bg-slate-900/80 px-3 py-1.5 rounded-full backdrop-blur-md border border-slate-700">
                      Align student QR code inside frame
                    </span>
                  </div>
                </div>
              )}

              {cameraError && (
                <p className="text-[11px] text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 font-medium">
                  {cameraError}
                </p>
              )}

              {/* Manual Username / UID Entry when scanner can't read */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-extrabold text-slate-700 uppercase font-mono">
                    Manual Student Username or UID Input:
                  </label>
                  <span className="text-[9px] text-indigo-600 font-mono font-bold">
                    Requires Tutor/Admin Confirmation
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInputStr}
                    onChange={(e) => setManualInputStr(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleProcessScan(manualInputStr, 'manual');
                      }
                    }}
                    placeholder="Enter student username (e.g. john_doe or UID)..."
                    className="flex-1 text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono"
                    id="input_manual_student_uid"
                  />
                  <button
                    type="button"
                    onClick={() => handleProcessScan(manualInputStr, 'manual')}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                    id="btn_submit_manual_student_scan"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                    Verify & Confirm
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  If QR code is damaged or unreadable, enter the student username above. A confirmation step will be required.
                </p>
              </div>
            </div>

          </div>
        </motion.div>
      </div>

      {/* CONFIRMATION MODAL FOR MANUAL USERNAME ADDING */}
      {pendingManualStudent && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs font-sans animate-fade-in">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden w-full max-w-md p-6 space-y-5"
            id="modal_manual_attendance_confirmation"
          >
            <div className="flex items-center gap-3 border-b border-slate-150 pb-4">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl border border-amber-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Confirm Manual Attendance</h3>
                <p className="text-[10px] font-mono text-slate-500">
                  QR Scanner Override Confirmation
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                {pendingManualStudent.user?.photoURL ? (
                  <img 
                    referrerPolicy="no-referrer"
                    src={pendingManualStudent.user.photoURL} 
                    alt={pendingManualStudent.studentName} 
                    className="w-12 h-12 rounded-xl object-cover border border-slate-300"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-lg">
                    {pendingManualStudent.studentName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-black text-slate-900 leading-tight">
                    {pendingManualStudent.studentName}
                  </h4>
                  <p className="text-xs font-mono font-bold text-indigo-600 mt-0.5">
                    ({pendingManualStudent.studentUsername})
                  </p>
                </div>
              </div>

              <div className="text-xs space-y-1 pt-2 border-t border-slate-200 text-slate-700 font-mono">
                <p>Class: <span className="font-bold text-slate-900">{targetClass?.title}</span></p>
                <p>Tutor/Admin Signature: <span className="font-bold text-indigo-700">{currentUser.name || currentUser.username} ({currentUser.role})</span></p>
                <p>Date: <span className="font-bold text-slate-900">{selectedDate}</span></p>
              </div>
            </div>

            <p className="text-[11px] text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 font-medium leading-relaxed">
              ⚠️ You are manually overriding attendance because the QR code could not be scanned. An automated email, direct message, and system alert will be sent to <strong>{pendingManualStudent.studentName} ({pendingManualStudent.studentUsername})</strong>.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingManualStudent(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                id="btn_cancel_manual_attendance"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  executeMarkAttendance(
                    pendingManualStudent.studentUid,
                    pendingManualStudent.studentName,
                    pendingManualStudent.user || null,
                    'manual'
                  );
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                id="btn_confirm_manual_attendance"
              >
                <ShieldCheck className="w-4 h-4" />
                Confirm & Send Alert
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* EXTRA CLASS PROMPT MODAL (YES / NO POPUP) */}
      {showExtraClassPrompt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs font-sans animate-fade-in">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden w-full max-w-md p-6 space-y-5 relative"
            id="modal_extra_class_prompt"
          >
            <div className="flex items-center gap-3 border-b border-slate-150 pb-4">
              <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl border border-amber-500/20">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Is this an Extra Class?</h3>
                <p className="text-[10px] font-mono text-slate-500">
                  Schedule Verification Prompt
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <p className="text-slate-800 font-semibold leading-relaxed">
                The regular schedule for <strong className="text-indigo-600">{targetClass?.title}</strong> is <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold">{targetClass?.dayOfWeek || 'Scheduled Day'} @ {targetClass?.timeSlot || 'Scheduled Time'}</span>.
              </p>
              <p className="text-slate-600 font-medium">
                Would you like to launch an <strong>Extra Class session</strong> for today and configure a temporary time slot?
              </p>
            </div>

            <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 text-[11px] text-indigo-900 font-mono leading-tight flex items-start gap-2">
              <Clock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>Temporary Schedule:</strong> Extra class time slots are temporary and will automatically expire and disappear once the session time is over.
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowExtraClassPrompt(false);
                  showToast('Standard schedule active. Attendance marking restricted to scheduled time slot.', 'info');
                }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                id="btn_extra_class_no"
              >
                No, Standard Class
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExtraClassPrompt(false);
                  setShowTimeSlotConfigurator(true);
                }}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                id="btn_extra_class_yes"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                Yes, Start Extra Class
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* TEMPORARY EXTRA CLASS TIME SLOT CONFIGURATOR MODAL */}
      {showTimeSlotConfigurator && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs font-sans animate-fade-in">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden w-full max-w-md p-6 space-y-5"
            id="modal_extra_class_time_configurator"
          >
            <div className="flex items-center justify-between border-b border-slate-150 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Set Extra Class Time Slot</h3>
                  <p className="text-[10px] font-mono text-indigo-600 font-bold">
                    Temporary Schedule (Disappears when finished)
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowTimeSlotConfigurator(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase font-mono mb-1">
                  Class Title:
                </label>
                <p className="text-sm font-black text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {targetClass?.title}
                </p>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase font-mono mb-1">
                  Extra Class Temporary Time Slot:
                </label>
                <input
                  type="text"
                  value={tempTimeSlotInput}
                  onChange={(e) => setTempTimeSlotInput(e.target.value)}
                  placeholder="e.g. 02:00 PM - 04:00 PM or 04:30 PM - 06:30 PM"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:border-indigo-600 outline-none shadow-xs"
                  id="input_extra_class_time_slot"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase font-mono mb-1.5">
                  Quick Time Slot Presets:
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "02:00 PM - 04:00 PM",
                    "04:00 PM - 06:00 PM",
                    "06:00 PM - 08:00 PM",
                    "08:00 AM - 10:00 AM",
                    "10:00 AM - 12:00 PM"
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTempTimeSlotInput(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                        tempTimeSlotInput === preset 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 font-medium">
                ⏳ <strong>Temporary Active Duration:</strong> Once saved, this extra class session will remain open for attendance check-ins until the end time of the specified time slot. After the time is over, this extra class configuration will automatically disappear.
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowTimeSlotConfigurator(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                id="btn_cancel_extra_class_config"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveExtraClassSession}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                id="btn_save_extra_class_config"
              >
                <ShieldCheck className="w-4 h-4" />
                Save & Launch Session
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
