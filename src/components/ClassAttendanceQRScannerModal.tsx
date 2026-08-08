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
  Search, 
  Users, 
  ShieldAlert, 
  Clock, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import { ClassItem, Booking, UserProfile, AttendanceRecord } from '../types';
import { firestoreService } from '../lib/firestoreService';

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

  // Target class selection
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClass?.id || tutorClasses[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Scanner state
  const [manualStudentCode, setManualStudentCode] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Scan Result Error/Notice
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Verification 3-Second Undo Popup State
  const [lastScannedRecord, setLastScannedRecord] = useState<AttendanceRecord | null>(null);
  const [lastScannedStudent, setLastScannedStudent] = useState<UserProfile | null>(null);
  const [undoCountdown, setUndoCountdown] = useState<number>(3);
  const [isReverting, setIsReverting] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Keep target class synced when props update
  useEffect(() => {
    if (initialClass?.id) {
      setSelectedClassId(initialClass.id);
    } else if (tutorClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(tutorClasses[0].id);
    }
  }, [initialClass, tutorClasses]);

  // 3-second countdown timer for attendance verification undo window
  useEffect(() => {
    if (!lastScannedRecord) return;

    setUndoCountdown(3);
    const interval = setInterval(() => {
      setUndoCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lastScannedRecord]);

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
      }
    } catch (err) {
      setCameraError('Camera permission unavailable. You can use manual student UID entry or select a student below.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!isOpen || !isTutorOrAdmin) return null;

  const targetClass = tutorClasses.find(c => c.id === selectedClassId) || initialClass;

  // Process QR / Student Code Input
  const handleProcessScan = async (rawInputStr: string) => {
    setErrorNotice(null);
    const input = rawInputStr.trim();
    if (!input) {
      showToast('Please enter or scan a valid student QR code.', 'info');
      return;
    }

    if (!targetClass) {
      showToast('Please select a valid teaching class to mark attendance.', 'error');
      return;
    }

    // 1. Extract Student Identifiers from Payload
    let scannedId = input;
    let scannedName = '';
    if (input.startsWith('{')) {
      try {
        const parsed = JSON.parse(input);
        scannedId = parsed.studentId || parsed.username || parsed.uid || input;
        scannedName = parsed.name || parsed.studentName || '';
      } catch (e) {
        // raw text
      }
    }

    // Match student profile from allUsers or bookings
    const matchedUser = allUsers.find(u => 
      u.uid === scannedId || 
      u.username === scannedId || 
      (scannedName && u.name.toLowerCase() === scannedName.toLowerCase()) ||
      u.name.toLowerCase() === scannedId.toLowerCase()
    );

    const matchedBooking = bookings.find(b => 
      b.classId === targetClass.id && 
      (b.studentId === scannedId || b.studentId === matchedUser?.uid || b.studentName.toLowerCase() === scannedId.toLowerCase())
    );

    const studentUid = matchedUser?.uid || matchedBooking?.studentId || scannedId;
    const studentName = matchedUser?.name || matchedBooking?.studentName || scannedName || scannedId;
    const studentPhoto = matchedUser?.photoURL;

    // --- CONDITION 1: ENROLMENT VALIDATION ---
    const isEnrolled = !!matchedBooking || (matchedUser?.selectedClasses?.includes(targetClass.id));
    if (!isEnrolled) {
      const msg = `❌ Attendance Denied: Student '${studentName}' is NOT enrolled in '${targetClass.title}'.`;
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

    // --- SUCCESS: MARK ATTENDANCE IN DATABASE ---
    try {
      const recordId = `att_${targetClass.id}_${studentUid}_${selectedDate}`;
      const record: AttendanceRecord = {
        id: recordId,
        classId: targetClass.id,
        classTitle: targetClass.title,
        studentId: studentUid,
        studentName: studentName,
        date: selectedDate,
        status: 'Present',
        markedAt: new Date().toISOString(),
        tutorId: currentUser.uid,
        type: 'qrcode',
        scannedByName: currentUser.name || 'Tutor'
      };

      await firestoreService.markAttendance(record);

      // Audit Log
      await firestoreService.addAuditLog({
        username: currentUser.name,
        action: 'QR_ATTENDANCE_SCANNED',
        details: `Scanned student QR for ${studentName} (${studentUid}) in class ${targetClass.title} by ${currentUser.name}`
      });

      // Set state for 3-second verification card overlay
      setLastScannedRecord(record);
      setLastScannedStudent(matchedUser || null);
      setManualStudentCode('');
      stopCamera();

      showToast(`🎉 Attendance Marked: ${studentName} set as PRESENT!`, 'success');
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
        username: currentUser.name,
        action: 'ATTENDANCE_REVERTED',
        details: `Reverted attendance mark for ${lastScannedRecord.studentName} in ${lastScannedRecord.classTitle} by ${currentUser.name}`
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

  // Enrolled active students list for quick testing
  const enrolledBookings = bookings.filter(b => b.classId === selectedClassId && b.status === 'active');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans animate-fade-in">
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
              <div className="p-2 bg-indigo-600/30 rounded-xl text-indigo-400">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold tracking-tight">Class Attendance QR Scanner</h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  Scan student identity QR code to verify enrolment & record presence
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

            {/* Target Class & Date Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 font-mono uppercase mb-1">Target Class</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 cursor-pointer"
                  id="select_scanner_class"
                >
                  {tutorClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.title} ({c.subject})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 font-mono uppercase mb-1">Session Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 cursor-pointer font-mono"
                />
              </div>
            </div>

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

            {/* --- 3-SECOND VERIFICATION OVERLAY & UNDO WINDOW --- */}
            {lastScannedRecord && (
              <div className="bg-emerald-50 border-2 border-emerald-400 p-5 rounded-3xl space-y-4 shadow-lg animate-fade-in relative overflow-hidden">
                
                {/* 3-Second Animated Progress Bar */}
                <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 3, ease: 'linear' }}
                    className="bg-emerald-600 h-full"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-left">
                    {lastScannedStudent?.photoURL ? (
                      <img 
                        referrerPolicy="no-referrer"
                        src={lastScannedStudent.photoURL} 
                        alt={lastScannedRecord.studentName} 
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-md shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center border-2 border-emerald-500 shadow-md shrink-0">
                        {lastScannedRecord.studentName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-emerald-600 text-white font-mono font-bold text-[9px] uppercase rounded-full tracking-wider">
                          ✓ Attendance Verified
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-emerald-800">
                          {undoCountdown > 0 ? `Verify Window: ${undoCountdown}s` : 'Marked Saved'}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-emerald-950 mt-1 leading-tight">
                        {lastScannedRecord.studentName}
                      </h4>
                      <p className="text-xs text-emerald-800 font-mono mt-0.5">
                        UID: {lastScannedRecord.studentId} • Scanned by {lastScannedRecord.scannedByName}
                      </p>
                    </div>
                  </div>

                  {/* REVERSE / UNDO BUTTON */}
                  <button
                    onClick={handleReverseAttendance}
                    disabled={isReverting}
                    className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-red-400"
                    id="btn_reverse_attendance"
                  >
                    <Undo2 className="w-4 h-4" />
                    {isReverting ? 'Reverting...' : 'REVERSE / UNDO'}
                  </button>
                </div>
              </div>
            )}

            {/* SCANNER CAMERA & MANUAL INPUT AREA */}
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 uppercase font-mono tracking-wider flex items-center gap-2">
                  <Camera className="w-4 h-4 text-indigo-600" /> Live Student QR Code Scan
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
                <div className="relative w-full h-56 bg-slate-950 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-inner flex items-center justify-center">
                  <video ref={videoRef} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-dashed border-indigo-400/80 m-8 rounded-2xl pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] font-mono font-bold text-white bg-slate-900/80 px-3 py-1 rounded-full backdrop-blur-md">
                      Center Student QR Code inside frame
                    </span>
                  </div>
                </div>
              )}

              {cameraError && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                  {cameraError}
                </p>
              )}

              {/* Manual Code / Student ID Input */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="block text-[10px] font-extrabold text-slate-650 uppercase font-mono">
                  Manual Student UID / QR Code String Input:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualStudentCode}
                    onChange={(e) => setManualStudentCode(e.target.value)}
                    placeholder="Enter student UID or scan code..."
                    className="flex-1 text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono"
                    id="input_manual_student_uid"
                  />
                  <button
                    type="button"
                    onClick={() => handleProcessScan(manualStudentCode)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
                    id="btn_submit_manual_student_scan"
                  >
                    Verify & Mark
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Testing Student Selector Roster */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-wider block">
                Quick Select Enrolled Student for Demo Scan:
              </span>

              {enrolledBookings.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No enrolled active students for this class.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {enrolledBookings.map(booking => (
                    <button
                      key={booking.id}
                      type="button"
                      onClick={() => handleProcessScan(booking.studentId)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-800 hover:text-indigo-800 rounded-xl text-xs font-bold border border-slate-200 hover:border-indigo-200 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      {booking.studentName}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
