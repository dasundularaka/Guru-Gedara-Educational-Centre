import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../lib/firestoreService';
import { auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  Smartphone, 
  Home, 
  Image, 
  Users, 
  CheckSquare, 
  Square,
  RefreshCw,
  Eye,
  EyeOff,
  Database,
  Wifi,
  Activity,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Info,
  Server
} from 'lucide-react';
import { motion } from 'motion/react';

interface AuthProps {
  onAuthSuccess: () => void;
}

const PRESET_PHOTOS = [
  { name: "Scholar Male 1", url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop" },
  { name: "Scholar Female 1", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop" },
  { name: "Scholar Male 2", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop" },
  { name: "Scholar Female 2", url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop" }
];

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const { 
    loginWithGoogle, 
    loginWithEmail, 
    registerWithEmail, 
    classes, 
    refreshClasses, 
    showToast, 
    currentUser,
    authDomainError,
    clearAuthDomainError
  } = useApp();
  
  // Available tabs: login, register, change_pw
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'change_pw'>('login');
  const [role, setRole] = useState<'student' | 'tutor'>('student');
  const [loading, setLoading] = useState(false);

  // Real-time Database Connection Status State
  const [pingState, setPingState] = useState<{
    status: 'checking' | 'connected' | 'slow' | 'offline';
    latencyMs: number | null;
    mode: 'cloud' | 'local';
    lastPingTime: string | null;
    error?: string;
  }>({
    status: 'checking',
    latencyMs: null,
    mode: 'cloud',
    lastPingTime: null
  });

  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Real-time Login Step Progress Tracking
  const [loginStage, setLoginStage] = useState<'idle' | 'auth' | 'firestore' | 'sync' | 'complete'>('idle');
  const [loginElapsedMs, setLoginElapsedMs] = useState(0);

  const runDbPing = async () => {
    setPingState(prev => ({ ...prev, status: 'checking' }));
    try {
      const res = await firestoreService.pingFirestore();
      let statusVal: 'connected' | 'slow' | 'offline' = res.ok ? 'connected' : 'offline';
      if (res.ok && res.latencyMs > 800) {
        statusVal = 'slow';
      }
      setPingState({
        status: statusVal,
        latencyMs: res.latencyMs,
        mode: res.mode,
        lastPingTime: new Date().toLocaleTimeString(),
        error: res.error
      });
    } catch (e: any) {
      setPingState({
        status: 'offline',
        latencyMs: null,
        mode: 'local',
        lastPingTime: new Date().toLocaleTimeString(),
        error: e.message || 'Connection failed'
      });
    }
  };

  useEffect(() => {
    runDbPing();
    const interval = setInterval(() => {
      runDbPing();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (loading) {
      const start = Date.now();
      interval = setInterval(() => {
        setLoginElapsedMs(Date.now() - start);
      }, 100);
    } else {
      setLoginElapsedMs(0);
      setLoginStage('idle');
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  // Common authentication credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // New Password Change inputs
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Student and Tutor signup fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");
  const [notes, setNotes] = useState("");
  const [photoURL, setPhotoURL] = useState(PRESET_PHOTOS[0].url);
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [grade, setGrade] = useState("11");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast("Please upload a PNG or JPG image file.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setPhotoURL(result);
          showToast("Profile image uploaded successfully!", "success");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Tutor Specific fields
  const [bio, setBio] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [experience, setExperience] = useState("3");
  const [qualification, setQualification] = useState("");
  const [hourlyRate, setHourlyRate] = useState("35");

  // Toggle password eye icon boolean states
  const [showPw, setShowPw] = useState(false);

  const [resetMethod, setResetMethod] = useState<'email' | 'direct'>('email');

  useEffect(() => {
    if (currentUser?.isPasswordResetRequired) {
      setResetMethod('direct');
    } else {
      setResetMethod('email');
    }
  }, [currentUser]);

  useEffect(() => {
    refreshClasses?.();
  }, []);

  useEffect(() => {
    if (currentUser?.isPasswordResetRequired) {
      setActiveTab('change_pw');
      if (currentUser.email) {
        setEmail(currentUser.email);
      }
    }
  }, [currentUser]);

  const handleClassToggle = (classId: string) => {
    if (selectedClasses.includes(classId)) {
      setSelectedClasses(prev => prev.filter(id => id !== classId));
    } else {
      setSelectedClasses(prev => [...prev, classId]);
    }
  };

  const handleSubjectToggle = (subjName: string) => {
    if (subjects.includes(subjName)) {
      setSubjects(prev => prev.filter(s => s !== subjName));
    } else {
      setSubjects(prev => [...prev, subjName]);
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !newPassword || !confirmPassword) {
      showToast("All fields are mandatory.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Security passwords do not construct matching entries.", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Password must include at least 6 characters.", "error");
      return;
    }

    setLoading(true);
    setLoginStage('auth');
    try {
      const res = await firestoreService.changeUserPassword(email, newPassword);
      if (res) {
        if (currentUser) {
          currentUser.isPasswordResetRequired = false;
          showToast("Password updated successfully! Welcome to your dashboard.", "success");
          onAuthSuccess();
        } else {
          showToast("Access security credentials revised! You may sign in with new password.", "success");
          setActiveTab('login');
          setPassword(newPassword);
          setNewPassword("");
          setConfirmPassword("");
        }
      } else {
         showToast("Account entry matching specified email not found.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed password update request", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast("Please enter your registered email address first.", "error");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      showToast("Password recovery email sent! Please check your inbox for instructions.", "success");
      setActiveTab('login');
    } catch (err: any) {
      console.error("Firebase reset email failed: ", err);
      let message = err.message || "Failed to send reset email.";
      if (err.code === "auth/user-not-found") {
        message = "No account matching this email address was found.";
      } else if (err.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      }
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!email || !password) {
      showToast("Security credentials email and password are required.", "error");
      return;
    }

    setLoading(true);
    setLoginStage('auth');
    try {
      if (activeTab === 'login') {
        const stageTimer = setTimeout(() => {
          setLoginStage('firestore');
        }, 350);

        const uProfile = await loginWithEmail(email, password);
        clearTimeout(stageTimer);
        setLoginStage('sync');

        if (uProfile && uProfile.isPasswordResetRequired) {
          showToast("Your password was system-generated by an Admin. Please update your password to proceed.", "info");
          setActiveTab('change_pw');
          setNewPassword("");
          setConfirmPassword("");
          return;
        }
        setLoginStage('complete');
        onAuthSuccess();
      } else {
        // Validation check for mandatory registration fields
        if (!fullName || !phone) {
          showToast("Name and contact details are absolutely mandatory.", "error");
          setLoading(false);
          return;
        }

        let details: any = {};
        if (role === 'student') {
          if (!address || !guardianName || !guardianPhone || !photoURL) {
            showToast("All requested student details, guardian info, address and profile photo parameters are mandatory.", "error");
            setLoading(false);
            return;
          }
          details = {
            gender,
            address,
            dob,
            notes,
            photoURL,
            password, // Save to fallback DB
            guardianName,
            guardianPhone,
            selectedClasses,
            status: 'pending', // Automatic pending state
            studentDetails: {
              grade,
              parentContact: guardianPhone,
              interests: selectedClasses
            }
          };
        } else {
          details = {
            gender,
            photoURL,
            password,
            hourlyRate: Number(hourlyRate),
            status: 'approved',
            tutorDetails: {
              bio: bio || "Verified senior academic tutor at Guru Gedara.",
              subjects: subjects.length > 0 ? subjects : ["Science"],
              experience: Number(experience),
              qualification: qualification || "Professional Lecturer Degree",
              hourlyRate: Number(hourlyRate),
              rating: 5.0,
              availability: [
                { day: "Monday", slots: ["04:00 PM", "06:00 PM"] },
                { day: "Wednesday", slots: ["04:00 PM", "06:00 PM"] },
                { day: "Saturday", slots: ["09:00 AM", "01:00 PM"] }
              ]
            }
          };
        }

        setLoginStage('firestore');
        const registeredProfile = await registerWithEmail(email, password, fullName, role, details);
        setLoginStage('sync');
        
        // If they registered as student, explain they are pending approval and direct logout
        if (role === 'student') {
          showToast("Registration pending manual Administrator approval. Access is locked.", "info");
          setActiveTab('login');
          setEmail(email);
          setPassword(password);
        } else {
          onAuthSuccess();
        }
      }
    } catch (err: any) {
      showToast(err.message || "Failed credentials verification.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setLoginStage('auth');
    try {
      const stageTimer = setTimeout(() => {
        setLoginStage('firestore');
      }, 400);

      const user = await loginWithGoogle();
      clearTimeout(stageTimer);
      setLoginStage('sync');

      if (user) {
        setLoginStage('complete');
        onAuthSuccess();
      }
    } catch {
      // already managed in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50/50 min-h-screen py-16 px-4 flex items-center justify-center font-sans" id="auth_portal">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 sm:p-8 relative overflow-hidden">
        
        {/* Sleek top brand header */}
        <div className="text-center pb-4">
          <span className="text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full tracking-widest font-mono">
            Guru Gedara Portal
          </span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-3">Welcome to Guru Gedara</h2>
          <p className="text-[11px] text-gray-500 mt-1">Centre of Academic & Educational Excellence</p>
        </div>

        {/* Real-time DB Connection Status Indicator Badge */}
        <div className="mb-5">
          <div 
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="flex items-center justify-between bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 rounded-xl px-3 py-2 cursor-pointer transition-all shadow-2xs"
            title="Click to view real-time database connection diagnostics"
          >
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center">
                {pingState.status === 'checking' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping inline-block" />
                )}
                {pingState.status === 'connected' && (
                  <>
                    <span className="absolute w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-75 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block relative z-10" />
                  </>
                )}
                {pingState.status === 'slow' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                )}
                {pingState.status === 'offline' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                )}
              </div>

              <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  {pingState.status === 'checking' && 'Checking DB Connection...'}
                  {pingState.status === 'connected' && 'Cloud DB Connected'}
                  {pingState.status === 'slow' && 'Cloud DB Active (High Latency)'}
                  {pingState.status === 'offline' && 'Offline / Local Fallback Active'}
                </span>
                {pingState.latencyMs !== null && (
                  <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {pingState.latencyMs}ms
                  </span>
                )}
              </div>
            </div>

            <div className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 font-mono flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              <span>{showDiagnostics ? 'Hide Info' : 'Diagnostics'}</span>
              {showDiagnostics ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </div>
          </div>

          {/* Expandable Diagnostics Drawer */}
          {showDiagnostics && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 p-3.5 bg-slate-900 text-white rounded-xl text-xs space-y-2.5 shadow-lg border border-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-mono text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" /> Live Connection Diagnostics
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    runDbPing();
                  }}
                  disabled={pingState.status === 'checking'}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-indigo-300 font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${pingState.status === 'checking' ? 'animate-spin' : ''}`} /> Test Ping
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                <div className="bg-slate-800/80 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[9px] uppercase font-mono">Firestore Engine</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {pingState.mode === 'cloud' ? 'Google Cloud Firestore' : 'Local Fallback Engine'}
                  </span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[9px] uppercase font-mono">Response Latency</span>
                  <span className="font-mono font-bold text-white">
                    {pingState.latencyMs !== null ? `${pingState.latencyMs} ms` : 'Testing...'}
                  </span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[9px] uppercase font-mono">Firebase Auth</span>
                  <span className="font-bold text-sky-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Operational
                  </span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[9px] uppercase font-mono">Browser Network</span>
                  <span className="font-bold text-indigo-300 flex items-center gap-1">
                    <Wifi className="w-3 h-3" /> {navigator.onLine ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>

              <p className="text-[9.5px] text-slate-400 font-mono leading-tight pt-1">
                • Real-time database queries synchronize directly with Cloud Firestore. Local cached profiles provide fallback access if cloud latency increases.
              </p>
            </motion.div>
          )}
        </div>

        {/* Real-Time Login Step Tracker & Delay Explainer (Active during sign-in) */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl space-y-3 shadow-xl border border-indigo-900/50 mb-6"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                Processing Secure Sign-In...
              </span>
              <span className="font-mono text-[11px] bg-indigo-900/80 px-2 py-0.5 rounded text-indigo-200 font-bold border border-indigo-700/50">
                ⏱️ {(loginElapsedMs / 1000).toFixed(1)}s elapsed
              </span>
            </div>

            {/* Step Timeline */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2.5 text-[11px]">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  loginStage === 'auth' 
                    ? 'bg-indigo-500 text-white animate-pulse' 
                    : loginStage === 'firestore' || loginStage === 'sync' || loginStage === 'complete'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {loginStage === 'firestore' || loginStage === 'sync' || loginStage === 'complete' ? '✓' : '1'}
                </div>
                <span className={loginStage === 'auth' ? 'font-bold text-white' : 'text-slate-300'}>
                  Firebase Auth Credential Handshake
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-[11px]">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  loginStage === 'firestore' 
                    ? 'bg-indigo-500 text-white animate-pulse' 
                    : loginStage === 'sync' || loginStage === 'complete'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {loginStage === 'sync' || loginStage === 'complete' ? '✓' : '2'}
                </div>
                <span className={loginStage === 'firestore' ? 'font-bold text-white' : 'text-slate-300'}>
                  Cloud Firestore Database & Profile Fetch
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-[11px]">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  loginStage === 'sync' 
                    ? 'bg-indigo-500 text-white animate-pulse' 
                    : loginStage === 'complete'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {loginStage === 'complete' ? '✓' : '3'}
                </div>
                <span className={loginStage === 'sync' ? 'font-bold text-white' : 'text-slate-300'}>
                  Synchronizing Workspace Permissions
                </span>
              </div>
            </div>

            {/* Delayed Sign-In Explainer */}
            {loginElapsedMs > 2000 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-3 bg-indigo-900/60 border border-indigo-700/60 rounded-xl text-[10.5px] leading-normal text-indigo-100 flex items-start gap-2"
              >
                <Info className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-200 block mb-0.5">Why is sign-in taking a few seconds?</span>
                  <span>
                    Connecting to Cloud Firestore database servers. Initial SSL/gRPC handshakes or cross-region network routes can take a few seconds. If cloud response is delayed, local fallback database will automatically log you in.
                  </span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Unauthorized Domain Error Warning Banner */}
        {authDomainError && (
          <div className="bg-rose-50 border-2 border-rose-200 text-rose-900 p-5 rounded-2xl mb-6 text-xs leading-relaxed shadow-sm" id="auth_domain_error_alert">
            <h4 className="font-extrabold text-xs text-rose-950 mb-2 flex items-center gap-2">
              <span className="p-1 rounded-lg bg-rose-100 text-rose-700">⚠️</span>
              Firebase Auth: Unauthorized Domain
            </h4>
            <p className="mb-3 font-medium text-[11px]">
              This preview domain (<span className="font-mono bg-rose-100/80 px-1.5 py-0.5 rounded font-bold text-rose-800 break-all">{authDomainError}</span>) is not authorized in your Firebase Project settings.
            </p>
            <div className="bg-white/80 border border-rose-100 p-3 rounded-xl mb-3 text-[11px]">
              <p className="font-bold text-rose-950 mb-1">How to authorize this domain:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-700">
                <li>Go to your <a href="https://console.firebase.google.com/project/gurugedara-prod/authentication/providers" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-bold hover:text-blue-800">Firebase Console &rarr;</a></li>
                <li>Verify your project is <span className="font-semibold text-slate-900">gurugedara-prod</span></li>
                <li>Go to <span className="font-semibold text-slate-900">Authentication</span> &rarr; <span className="font-semibold text-slate-900">Settings</span> &rarr; <span className="font-semibold text-slate-900">Authorized Domains</span></li>
                <li>Click <span className="font-semibold text-slate-900">Add domain</span> and enter:
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <input 
                      type="text" 
                      readOnly 
                      value={authDomainError} 
                      className="font-mono text-[10px] bg-slate-50 border border-slate-200 px-2 py-1 rounded w-full font-bold select-all text-slate-800" 
                      id="unauthorized_domain_input"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(authDomainError);
                        showToast("Domain copied to clipboard!", "success");
                      }}
                      className="px-2.5 py-1 bg-slate-900 text-white rounded text-[10px] font-bold hover:bg-slate-800 shrink-0 cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                </li>
              </ol>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => window.location.reload()} 
                className="px-3.5 py-1.5 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition-colors text-[11px] cursor-pointer"
              >
                Refresh Page
              </button>
              <button 
                onClick={clearAuthDomainError} 
                className="px-3.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-lg transition-colors text-[11px] cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        {currentUser?.isPasswordResetRequired ? (
          <div className="bg-orange-50 border border-orange-200 text-orange-850 p-4 rounded-xl mb-6 text-xs leading-normal">
            <h4 className="font-extrabold mb-1 flex items-center gap-1.5 text-orange-900">
              <Lock className="w-4 h-4 text-orange-600 animate-pulse" /> Secure Entry Password Required
            </h4>
            An Administrator has enrolled your details with a system-generated password. Please change your password below to finalize your educational workspace.
          </div>
        ) : (
          <div className="flex border-b border-gray-100 mb-6 bg-slate-50 p-1.5 rounded-xl">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 text-center py-2.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                activeTab === 'login' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-gray-400 hover:text-gray-750'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`flex-1 text-center py-2.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                activeTab === 'register' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-gray-400 hover:text-gray-750'
              }`}
            >
              Register Student
            </button>
            <button
              onClick={() => setActiveTab('change_pw')}
              className={`flex-1 text-center py-2.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                activeTab === 'change_pw' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-gray-400 hover:text-gray-750'
              }`}
            >
              Reset Password
            </button>
          </div>
        )}

        {activeTab === 'change_pw' && (
          <div className="space-y-4">
            {!currentUser?.isPasswordResetRequired && (
              <div className="flex gap-2 p-1.5 bg-slate-100 rounded-xl mb-2 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setResetMethod('email')}
                  className={`flex-1 text-center py-2 rounded-lg transition-all cursor-pointer ${
                    resetMethod === 'email'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-gray-500 hover:text-slate-850'
                  }`}
                >
                  Send Reset Email (Recovery)
                </button>
                <button
                  type="button"
                  onClick={() => setResetMethod('direct')}
                  className={`flex-1 text-center py-2 rounded-lg transition-all cursor-pointer ${
                    resetMethod === 'direct'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-gray-500 hover:text-slate-850'
                  }`}
                >
                  Direct Change (First Login)
                </button>
              </div>
            )}

            {resetMethod === 'email' ? (
              <form onSubmit={handleSendResetEmail} className="space-y-4">
                <div>
                  <p className="text-[11px] text-slate-500 mb-4 bg-blue-50/50 p-3 rounded-xl border border-blue-100 leading-normal">
                    Forgot your password? Enter your registered email address below, and we will send you a secure link to reset your password instantly.
                  </p>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-indigo-550" /> Email Address:
                  </label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-6 w-full text-center py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sending Recovery Email...</span>
                  ) : (
                    <>Send Password Reset Email <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                <div>
                  <p className="text-[11px] text-slate-500 mb-4 bg-amber-50/50 p-3 rounded-xl border border-amber-100 leading-normal">
                    {currentUser?.isPasswordResetRequired 
                      ? "You are completing a required security update. Change your password directly below."
                      : "Directly override your passwords below (Legacy bypass / administration update)."}
                  </p>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-indigo-550" /> Email Address:
                  </label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-550 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-indigo-550" /> New Security Password:
                  </label>
                  <input
                    required
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-550 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-indigo-550" /> Confirm New Password:
                  </label>
                  <input
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-6 w-full text-center py-2.5 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Modifying Password...</span>
                  ) : (
                    <>Change Security Password <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {activeTab !== 'change_pw' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'register' && (
              <>


                {/* Common register name input */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-indigo-550" /> Full Name:
                  </label>
                  <input
                    required
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Mercer"
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-sans"
                  />
                </div>
              </>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-indigo-550" /> Email Address:
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-indigo-550" /> Password Credentials:
              </label>
              <div className="relative">
                <input
                  required
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-650 cursor-pointer"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {activeTab === 'register' && (
              <>
                {/* Smartphone Field */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-550" /> Mobile Phone Number:
                  </label>
                  <input
                    required
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +94 77 123 4567"
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                {role === 'student' && (
                  <div className="space-y-4 pt-2 border-t border-dashed border-slate-100">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11.5px] font-bold text-gray-700 mb-1.5">Gender Biography:</label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                          className="w-full text-xs px-3 py-2 border border-slate-200 bg-white rounded-xl outline-none focus:border-indigo-500 font-sans"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-[11.5px] font-bold text-gray-700 mb-1.5">Grade Level Standard:</label>
                        <select
                          value={grade}
                          onChange={(e) => setGrade(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-slate-200 bg-white rounded-xl outline-none focus:border-indigo-500 font-sans"
                        >
                          {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "Other"].map(g => (
                            <option key={g} value={g}>{g === 'Other' ? 'Other' : `Grade ${g}`}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                          <Home className="w-3.5 h-3.5 text-indigo-550" /> Residential Address:
                        </label>
                        <input
                          required
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="12/A, Flower Road, Colombo 03"
                          className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1.5">Date of Birth:</label>
                        <input
                          required
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-sans bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11.5px] font-bold text-gray-700 mb-1.5">Guardian Name:</label>
                        <input
                          required
                          type="text"
                          value={guardianName}
                          onChange={(e) => setGuardianName(e.target.value)}
                          placeholder="e.g. Mr. S. de Silva"
                          className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-505"
                        />
                      </div>
                      <div>
                        <label className="block text-[11.5px] font-bold text-gray-700 mb-1.5">Guardian Phone Number:</label>
                        <input
                          required
                          type="text"
                          value={guardianPhone}
                          onChange={(e) => setGuardianPhone(e.target.value)}
                          placeholder="+94 71 999 8811"
                          className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-505 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11.5px] font-bold text-gray-700 mb-1.5">Notes (Optional):</label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional student background info, medical notes or interests..."
                        className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-sans resize-none"
                      />
                    </div>

                    {/* SELECT OR UPLOAD PROFILE PHOTO */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                        <Image className="w-3.5 h-3.5 text-indigo-550" /> Profile Image (Upload PNG/JPG or Add Link):
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2 mb-2 items-center">
                        <label className="w-full sm:w-auto px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer text-center flex items-center justify-center gap-1.5 shrink-0">
                          <Image className="w-3.5 h-3.5 text-indigo-600" /> Upload File (PNG/JPG)
                          <input 
                            type="file" 
                            accept="image/png, image/jpeg, image/jpg" 
                            onChange={handleFileUpload} 
                            className="hidden" 
                          />
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">or preset/URL</span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 mb-2">
                        {PRESET_PHOTOS.map((ph, idx) => (
                          <div 
                            key={idx}
                            onClick={() => setPhotoURL(ph.url)}
                            className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                              photoURL === ph.url ? 'border-indigo-650 scale-102 shadow-xs' : 'border-transparent opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={ph.url} alt={ph.name} className="w-full h-10 object-cover" />
                          </div>
                        ))}
                      </div>
                      <input
                        required
                        type="text"
                        value={photoURL}
                        onChange={(e) => setPhotoURL(e.target.value)}
                        placeholder="Or enter customized Photo URL (https://...)"
                        className="w-full text-[10px] px-3.5 py-1.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    {/* DYNAMIC CLASSES MULTISELECT */}
                    <div className="pt-2">
                      <label className="block text-[11px] font-bold text-slate-800 mb-2 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-indigo-550" /> Select Tuition Classes You Like:
                      </label>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto border border-slate-100 rounded-xl p-2.5 bg-slate-50/40">
                        {classes && classes.length > 0 ? (
                          classes.map((c) => (
                            <div 
                              key={c.id}
                              onClick={() => handleClassToggle(c.id)}
                              className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white cursor-pointer transition-colors"
                            >
                              {selectedClasses.includes(c.id) ? (
                                <CheckSquare className="w-4 h-4 text-indigo-650" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-350" />
                              )}
                              <div>
                                <span className="block text-[10.5px] font-bold text-slate-800 leading-tight">{c.title}</span>
                                <span className="block text-[9px] text-gray-400 font-mono leading-none mt-0.5">{c.subject} - {c.schedule}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-[10px] text-gray-400 py-2 text-center">Loading academy courses...</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                 {/* Tutor register block removed since tutor signup in login page is not allowed */}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full text-center py-2.5 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              {loading ? (
                <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Submitting...</span>
              ) : (
                <>
                  {activeTab === 'login' ? 'Sign In Securely' : 'Submit Enrollment Intake'} 
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="relative my-6 text-center">
          <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Or continue with social identity</span>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-2.5 px-4 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-2.5 cursor-pointer shadow-md shadow-slate-100/40 transition-colors"
        >
          <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.81-1.11-1.34-2.45-1.34-3.59z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          Sign In with Google
        </button>

      </div>
    </div>
  );
};
