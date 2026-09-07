import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  QrCode, 
  Camera, 
  Search, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard,
  GraduationCap
} from 'lucide-react';
import { UserProfile } from '../types';
import jsQR from 'jsqr';

interface AdminQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  users?: UserProfile[];
  allUsers?: UserProfile[];
  onSelectUser?: (user: UserProfile) => void;
  onSelectStudent?: (student: UserProfile) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminQRScannerModal: React.FC<AdminQRScannerModalProps> = ({
  isOpen,
  onClose,
  users,
  allUsers,
  onSelectUser,
  onSelectStudent,
  showToast
}) => {
  const effectiveUsers = users || allUsers || [];
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [matchingResults, setMatchingResults] = useState<UserProfile[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API not accessible in this browser context.');
        return;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        });
      } catch (innerErr) {
        // Fallback to standard video
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsScanning(true);
        requestAnimationFrame(tickScan);
      }
    } catch (err: any) {
      console.warn('Camera open failed:', err);
      setCameraError('Unable to open camera. You can manually enter the user name, username, or ID below.');
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const emitSelectedUser = (user: UserProfile) => {
    if (onSelectUser) {
      onSelectUser(user);
    } else if (onSelectStudent) {
      onSelectStudent(user);
    }
  };

  const handleScannedValue = (scannedText: string) => {
    if (!scannedText) return;
    const clean = scannedText.trim();
    const cleanNoPrefix = clean.replace(/^(stu|tut|adm|usr)[_-]?/i, '');
    
    // Find matching user (Student, Tutor, or Admin)
    const user = effectiveUsers.find(u => 
      (u.username && u.username.toLowerCase() === clean.toLowerCase()) ||
      (u.username && u.username.replace(/^(stu|tut|adm|usr)[_-]?/i, '').toLowerCase() === cleanNoPrefix.toLowerCase()) ||
      u.uid.toLowerCase() === clean.toLowerCase() ||
      (u.email && u.email.toLowerCase() === clean.toLowerCase()) ||
      clean.toLowerCase().includes((u.username || '___').toLowerCase()) ||
      clean.toLowerCase().includes(u.uid.toLowerCase())
    );

    if (user) {
      stopCamera();
      showToast(`Found ${user.role} profile: ${user.name} (@${user.username || user.uid})`, 'success');
      emitSelectedUser(user);
      onClose();
    } else {
      showToast(`No registered user found matching scanned code: "${clean}"`, 'error');
    }
  };

  const tickScan = () => {
    if (!videoRef.current) return;
    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
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
          handleScannedValue(code.data);
          return; // Stop animation loop once found
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(tickScan);
  };

  const handleManualSearch = (query: string) => {
    setManualInput(query);
    if (!query.trim()) {
      setMatchingResults([]);
      return;
    }
    const q = query.toLowerCase().trim();
    const matches = effectiveUsers.filter(u => 
      (u.username && u.username.toLowerCase().includes(q)) ||
      u.name.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.uid.toLowerCase().includes(q) ||
      (u.role && u.role.toLowerCase().includes(q))
    ).slice(0, 6);
    setMatchingResults(matches);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-2xl border border-white/15">
                <QrCode className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                  Universal User QR Scanner
                </h3>
                <p className="text-[11px] text-slate-300">
                  Instant lookup for Students, Tutors & Staff
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scanner Body */}
          <div className="p-5 space-y-4">
            {/* Viewfinder */}
            <div className="relative w-full h-56 bg-slate-950 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-inner flex items-center justify-center">
              <video 
                ref={videoRef} 
                playsInline 
                muted 
                className="w-full h-full object-cover" 
              />
              
              {/* Overlay target frame */}
              <div className="absolute inset-0 border-2 border-dashed border-amber-400/80 m-7 rounded-2xl pointer-events-none flex items-center justify-center">
                <span className="text-[10px] font-mono font-bold text-white bg-slate-900/80 px-3 py-1 rounded-full backdrop-blur-md border border-slate-700 shadow-lg">
                  Align Any User QR Inside Box
                </span>
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-slate-900/90 p-4 flex flex-col items-center justify-center text-center text-amber-300 text-xs">
                  <AlertCircle className="w-6 h-6 mb-2 text-amber-400" />
                  <p className="text-[11px] leading-relaxed max-w-xs">{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs"
                  >
                    Retry Camera
                  </button>
                </div>
              )}
            </div>

            {/* Manual Entry Form */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-[10px] font-extrabold text-slate-600 uppercase font-mono">
                Or Search by Name, Username or ID (All Users):
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search students, faculty tutors, administrators..."
                  value={manualInput}
                  onChange={(e) => handleManualSearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white font-sans"
                />
              </div>

              {/* Match Results */}
              {matchingResults.length > 0 && (
                <div className="mt-2 divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  {matchingResults.map(matchedUser => (
                    <button
                      key={matchedUser.uid}
                      onClick={() => {
                        stopCamera();
                        emitSelectedUser(matchedUser);
                        onClose();
                      }}
                      className="w-full p-2.5 text-left hover:bg-indigo-50/70 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          matchedUser.role === 'tutor' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : matchedUser.role === 'admin'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {matchedUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-900 truncate">{matchedUser.name}</p>
                            <span className={`px-1.5 py-0.2 text-[8px] font-black rounded uppercase tracking-wider ${
                              matchedUser.role === 'tutor'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : matchedUser.role === 'admin'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}>
                              {matchedUser.role}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono truncate">
                            @{matchedUser.username || matchedUser.uid.slice(0, 8)} • {matchedUser.email}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg shrink-0 ml-2">
                        View Profile &rarr;
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
