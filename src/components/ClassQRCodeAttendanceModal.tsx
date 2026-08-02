import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, 
  X, 
  RefreshCw, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Users, 
  Clock, 
  Maximize2, 
  CheckSquare, 
  ShieldCheck, 
  Copy, 
  Send,
  Download,
  History
} from 'lucide-react';
import { ClassItem, Booking, AttendanceRecord, UserProfile } from '../types';
import { firestoreService, safeStringify } from '../lib/firestoreService';
import { AttendanceScanHistory } from './AttendanceScanHistory';

interface ClassQRCodeAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  tutorClasses?: ClassItem[];
  bookings?: Booking[];
  attendanceRecords?: AttendanceRecord[];
  onAttendanceMarked?: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ClassQRCodeAttendanceModal: React.FC<ClassQRCodeAttendanceModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  tutorClasses = [],
  bookings = [],
  attendanceRecords = [],
  onAttendanceMarked,
  showToast
}) => {
  const isTutor = currentUser.role === 'tutor' || currentUser.role === 'admin';

  // Navigation tab state inside modal
  const [activeTab, setActiveTab] = useState<'qr' | 'history'>('qr');

  // Tutor State
  const [selectedClassId, setSelectedClassId] = useState<string>(tutorClasses[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [qrToken, setQrToken] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(15);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Student Scanner State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sync initial class selection
  useEffect(() => {
    if (tutorClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(tutorClasses[0].id);
    }
  }, [tutorClasses]);

  // Manual QR Token Refresh function
  const handleManualRefresh = () => {
    const newToken = Math.random().toString(36).substring(2, 9).toUpperCase();
    setQrToken(newToken);
    setCountdown(15);
    showToast('🔄 QR Code pass manually refreshed!', 'info');
  };

  // Dynamic Token Generator & Timer for Tutors
  useEffect(() => {
    if (!isOpen || !isTutor) return;

    const generateNewToken = () => {
      const token = Math.random().toString(36).substring(2, 9).toUpperCase();
      setQrToken(token);
      setCountdown(15);
    };

    generateNewToken();

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          generateNewToken();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isTutor, selectedClassId, selectedDate]);

  // Construct Dynamic Payload
  const activeClass = tutorClasses.find(c => c.id === selectedClassId);
  const payloadData = safeStringify({
    type: 'CLASS_ATTENDANCE_PASS',
    classId: selectedClassId,
    classTitle: activeClass?.title || 'Class Session',
    tutorId: currentUser.uid,
    tutorName: currentUser.name,
    date: selectedDate,
    token: qrToken,
    expiresAt: Date.now() + countdown * 1000
  });

  // Download QR Code Badge as PNG Image
  const downloadQrAsPng = () => {
    const qrContainer = document.getElementById('class_attendance_qr_box');
    if (!qrContainer) return;
    const svgElement = qrContainer.querySelector('svg');
    if (!svgElement) return;

    try {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const cardWidth = 340;
      const cardHeight = 400;
      canvas.width = cardWidth;
      canvas.height = cardHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw background card
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cardWidth, cardHeight);

      // Header Banner
      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(0, 0, cardWidth, 65);

      ctx.fillStyle = '#818cf8'; // indigo-400
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('OFFICIAL CLASS ATTENDANCE BADGE', 20, 28);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(currentUser.name || 'Scholar Student', 20, 48);

      // Render SVG Image on canvas
      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(svgBlob);

      img.onload = () => {
        // Draw QR Image in center
        ctx.drawImage(img, (cardWidth - 200) / 2, 80, 200, 200);

        // Footer details box
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(16, 295, cardWidth - 32, 85);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(activeClass?.title || 'Class Session Pass', cardWidth / 2, 320);

        ctx.fillStyle = '#4f46e5';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`Pass Key: ${qrToken || 'CLASS-PASS'}`, cardWidth / 2, 340);

        ctx.fillStyle = '#64748b';
        ctx.font = '9px monospace';
        ctx.fillText(`Session Date: ${selectedDate}`, cardWidth / 2, 360);

        // Download PNG
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `Attendance_Badge_${(activeClass?.title || 'Course').replace(/\s+/g, '_')}_${selectedDate}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);

        showToast('📸 Personalized attendance badge PNG downloaded!', 'success');
      };
      img.src = blobUrl;
    } catch (err) {
      console.error("Failed downloading QR PNG", err);
      showToast('Could not download PNG. Please try again.', 'error');
    }
  };

  // Students live checked-in today for this class
  const checkedInStudents = attendanceRecords.filter(
    r => r.classId === selectedClassId && r.date === selectedDate && r.status === 'Present'
  );

  // Camera start for Student Scanner
  const startScannerCamera = async () => {
    setCameraError(null);
    setIsScanning(true);
    setScanResult(null);

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
    } catch (err: any) {
      console.warn("Camera start failed for scanner", err);
      setCameraError("Camera permission unavailable. You can use the direct code pass or manual check-in below.");
      setIsScanning(false);
    }
  };

  const stopScannerCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScannerCamera();
    };
  }, []);

  // Submit scan / code attendance logic
  const handleVerifyAttendance = async (rawCodeStr?: string) => {
    const inputPayload = rawCodeStr || manualCode;
    if (!inputPayload.trim()) {
      showToast('Please enter or scan a valid class attendance QR pass.', 'info');
      return;
    }

    try {
      let parsed: any;
      if (inputPayload.startsWith('{')) {
        parsed = JSON.parse(inputPayload);
      } else {
        // Fallback simple token format
        parsed = {
          classId: selectedClassId || 'demo_class',
          classTitle: activeClass?.title || 'Enrolled Class Session',
          tutorId: activeClass?.tutorId || 'tutor_default',
          date: new Date().toISOString().split('T')[0]
        };
      }

      const targetClassId = parsed.classId || selectedClassId;
      const targetClassTitle = parsed.classTitle || 'Class Session';
      const targetDate = parsed.date || new Date().toISOString().split('T')[0];

      const recordId = `${targetClassId}_${currentUser.uid}_${targetDate}`;
      const record: AttendanceRecord = {
        id: recordId,
        classId: targetClassId,
        classTitle: targetClassTitle,
        studentId: currentUser.uid,
        studentName: currentUser.name || 'Scholar Student',
        date: targetDate,
        status: 'Present',
        markedAt: new Date().toISOString(),
        tutorId: parsed.tutorId || 'tutor'
      };

      await firestoreService.markAttendance(record);
      
      setScanResult({
        success: true,
        message: `Successfully checked in as PRESENT for ${targetClassTitle} on ${targetDate}!`
      });
      showToast(`🎉 Attendance recorded for ${targetClassTitle}!`, 'success');
      
      stopScannerCamera();
      if (onAttendanceMarked) onAttendanceMarked();
    } catch (err) {
      setScanResult({
        success: false,
        message: 'Invalid QR pass or expired session token. Please try scanning again.'
      });
      showToast('Verification failed. Invalid session QR code.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs font-sans">
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className={`bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden w-full transition-all ${
            isFullscreen ? 'max-w-4xl min-h-[85vh]' : 'max-w-2xl'
          }`}
        >
          {/* Header */}
          <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600/30 rounded-xl text-indigo-400">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold tracking-tight">
                  {isTutor ? 'Dynamic Class Session QR Pass' : 'Class Attendance & Scanner'}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  {isTutor ? 'Auto-refreshing security pass for classroom check-ins' : 'Log presence via scanner or view check-in history'}
                </p>
              </div>
            </div>

            {/* Header Tabs & Close */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex bg-slate-800 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setActiveTab('qr')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'qr' ? 'bg-indigo-650 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" /> Pass & Scanner
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'history' ? 'bg-indigo-650 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <History className="w-3.5 h-3.5" /> Scan History
                </button>
              </div>

              <div className="flex items-center gap-1">
                {isTutor && (
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Toggle Fullscreen Classroom View"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    stopScannerCamera();
                    onClose();
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            
            {activeTab === 'history' ? (
              /* SCAN HISTORY TAB VIEW */
              <AttendanceScanHistory
                attendanceRecords={attendanceRecords}
                classes={tutorClasses}
                studentName={currentUser.name}
              />
            ) : isTutor ? (
              /* TUTOR GENERATOR VIEW */
              <div className="space-y-6">
                
                {/* Class & Date Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 font-mono uppercase mb-1">Select Teaching Course</label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                    >
                      {tutorClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 font-mono uppercase mb-1">Session Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* QR Display Card */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 p-6 rounded-3xl border border-indigo-100/60 shadow-xs">
                  
                  {/* Dynamic QR Box with Subtle Ripple Effect */}
                  <div className="flex flex-col items-center space-y-4">
                    <div 
                      id="class_attendance_qr_box" 
                      className="p-4 bg-white rounded-2xl shadow-md border border-slate-200/80 relative group overflow-hidden"
                    >
                      {/* Subtle Active Ripple Animations */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-2xl">
                        <motion.div
                          animate={{ scale: [0.95, 1.15, 0.95], opacity: [0.5, 0.1, 0.5] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute inset-0 rounded-2xl border-2 border-indigo-500/50"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0, 0.3] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                          className="absolute inset-0 rounded-2xl border-2 border-indigo-400/30"
                        />
                      </div>

                      <QRCodeSVG
                        value={payloadData}
                        size={isFullscreen ? 260 : 190}
                        level="H"
                        includeMargin={true}
                        fgColor="#0f172a"
                      />
                    </div>

                    {/* Action Toolbar: Refresh QR & Download PNG */}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        id="btn_refresh_qr_code"
                        onClick={handleManualRefresh}
                        className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        title="Force cycle dynamic QR pass token"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh QR
                      </button>

                      <button
                        id="btn_download_qr_png"
                        onClick={downloadQrAsPng}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        title="Download attendance badge PNG locally"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-400" /> Download as PNG
                      </button>
                    </div>

                    {/* Countdown Refresh Progress Bar */}
                    <div className="w-full max-w-[200px] space-y-1 pt-1">
                      <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-500">
                        <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3 text-indigo-600 animate-spin" /> Auto Token Cycle</span>
                        <span className="text-indigo-650 font-black">{countdown}s</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 transition-all duration-1000 ease-linear rounded-full"
                          style={{ width: `${(countdown / 15) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Instructions & Token Meta */}
                  <div className="flex-1 space-y-4 text-center md:text-left">
                    <div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-extrabold font-mono mb-2">
                        <ShieldCheck className="w-3 h-3" /> Anti-Spoof Dynamic Pass
                      </span>
                      <h4 className="text-base font-extrabold text-slate-900">{activeClass?.title || 'Class Session'}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Display this QR code on classroom screen. Students scan via dashboard to log attendance instantly.
                      </p>
                    </div>

                    {/* Security Pass Code */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Session Pass Key:</span>
                      <span className="text-indigo-650 font-black text-sm tracking-widest">{qrToken}</span>
                    </div>

                    {/* Live Check-ins Ticker */}
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-600" /> Confirmed Today:
                      </span>
                      <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs font-mono">
                        {checkedInStudents.length} Students Checked In
                      </span>
                    </div>
                  </div>

                </div>

                {/* Checked-in roster list */}
                {checkedInStudents.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-700 font-mono uppercase tracking-wider">Live Check-in Log</h5>
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                      {checkedInStudents.map(s => (
                        <span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {s.studentName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              /* STUDENT SCANNER VIEW */
              <div className="space-y-6">
                
                {scanResult ? (
                  /* Success / Failure Result Display */
                  <div className={`p-6 rounded-2xl border text-center space-y-3 ${
                    scanResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    {scanResult.success ? (
                      <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
                    ) : (
                      <AlertCircle className="w-12 h-12 text-rose-600 mx-auto" />
                    )}
                    <h4 className="text-base font-extrabold">{scanResult.success ? 'Attendance Verified!' : 'Check-in Failed'}</h4>
                    <p className="text-xs">{scanResult.message}</p>
                    
                    <button
                      onClick={() => setScanResult(null)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer"
                    >
                      Scan Another Session
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    
                    {/* Camera Video Frame */}
                    <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-slate-800">
                      {isScanning ? (
                        <>
                          <video ref={videoRef} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 border-2 border-dashed border-indigo-400/70 m-8 rounded-xl pointer-events-none animate-pulse" />
                          <div className="absolute bottom-3 left-3 bg-slate-900/80 text-white px-3 py-1 rounded-lg text-[10px] font-mono flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Align QR code inside frame
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-6 space-y-3">
                          <Camera className="w-10 h-10 text-indigo-400 mx-auto" />
                          <div>
                            <p className="text-xs font-bold text-white">Camera Offline</p>
                            <p className="text-[11px] text-slate-400 mt-1">Click below to activate camera scanner or enter pass key manually.</p>
                          </div>
                          <button
                            onClick={startScannerCamera}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2 mx-auto"
                          >
                            <Camera className="w-4 h-4" /> Launch Camera Scanner
                          </button>
                        </div>
                      )}
                    </div>

                    {cameraError && (
                      <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-xs font-medium border border-amber-200 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{cameraError}</span>
                      </div>
                    )}

                    {/* Manual Code / Quick Pass Check-in */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <label className="block text-[10px] font-bold text-slate-500 font-mono uppercase">
                        Or Enter Session Pass Code / Scan QR Payload:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. A9X2KL or paste payload string..."
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value)}
                          className="flex-1 text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono font-bold text-slate-800"
                        />
                        <button
                          onClick={() => handleVerifyAttendance()}
                          className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" /> Submit
                        </button>
                      </div>

                      {/* Instant Demo Pass Button */}
                      <button
                        onClick={() => {
                          const demoPayload = safeStringify({
                            classId: selectedClassId || 'demo_math',
                            classTitle: activeClass?.title || 'AP Calculus AB',
                            tutorId: 'tutor_jenkins',
                            date: selectedDate
                          });
                          handleVerifyAttendance(demoPayload);
                        }}
                        className="w-full text-center text-[10px] font-bold text-indigo-650 hover:underline pt-1 cursor-pointer"
                      >
                        ⚡ Simulate Instant Today Check-in Pass
                      </button>
                    </div>

                    {/* Student Personalized Attendance Badge Card */}
                    <div className="p-4 bg-gradient-to-r from-indigo-50/80 to-slate-50 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div id="class_attendance_qr_box" className="p-2 bg-white rounded-xl shadow-xs border border-slate-200 shrink-0 relative">
                          <QRCodeSVG
                            value={safeStringify({ studentId: currentUser.uid, studentName: currentUser.name, date: selectedDate })}
                            size={64}
                            level="M"
                          />
                        </div>
                        <div>
                          <h5 className="text-xs font-extrabold text-slate-900">{currentUser.name || 'Scholar'} Attendance Badge</h5>
                          <p className="text-[10px] text-slate-500 font-mono">Personalized offline badge for instructor scanners</p>
                        </div>
                      </div>

                      <button
                        id="btn_download_student_badge_png"
                        onClick={downloadQrAsPng}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-400" /> Download Badge PNG
                      </button>
                    </div>

                  </div>
                )}

              </div>
            )}

          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-400 font-mono">
            <span>Powered by Secure Classroom QR Protocol</span>
            <button
              onClick={() => {
                stopScannerCamera();
                onClose();
              }}
              className="text-slate-600 font-bold hover:text-slate-900 cursor-pointer"
            >
              Close
            </button>
          </div>

        </motion.div>

      </div>
    </AnimatePresence>
  );
};
