import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../lib/firestoreService';
import { auth } from '../lib/firebase';
import { optimizeImage } from '../lib/imageOptimizer';
import { sendPasswordResetEmail } from 'firebase/auth';
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  Smartphone, 
  Home, 
  Image as ImageIcon, 
  Users, 
  CheckSquare, 
  Square,
  RefreshCw,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  RotateCcw,
  AlertCircle,
  GraduationCap,
  Sparkles,
  BookOpen,
  Upload,
  Calendar,
  BadgeCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  
  // Available tabs: login, register, change_pw (forgot password)
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'change_pw'>('login');
  const [role] = useState<'student'>('student');
  const [loading, setLoading] = useState(false);

  // Common authentication credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Direct password update for initial admin-provisioned forced reset (if already authenticated)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Student registration fields
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

  // Toggle password visibility
  const [showPw, setShowPw] = useState(false);

  // Password reset email state
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetSentEmail, setResetSentEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown countdown for resending password reset email
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast("Please upload a PNG or JPG image file.", "error");
        return;
      }
      try {
        const optimized = await optimizeImage(file, { maxWidth: 600, maxHeight: 600, quality: 0.82 });
        if (optimized) {
          setPhotoURL(optimized);
          showToast("Profile image uploaded and optimized for cloud sync!", "success");
        }
      } catch (err) {
        showToast("Failed to process image. Please try another.", "error");
      }
    }
  };

  const handleClassToggle = (classId: string) => {
    if (selectedClasses.includes(classId)) {
      setSelectedClasses(prev => prev.filter(id => id !== classId));
    } else {
      setSelectedClasses(prev => [...prev, classId]);
    }
  };

  // Handler for mandatory first-time password change if requested by Admin
  const handleForcedPasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !newPassword || !confirmPassword) {
      showToast("All fields are mandatory.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Password must include at least 6 characters.", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await firestoreService.changeUserPassword(email, newPassword);
      if (res) {
        if (currentUser) {
          currentUser.isPasswordResetRequired = false;
          showToast("Password updated successfully! Welcome to your dashboard.", "success");
          onAuthSuccess();
        } else {
          showToast("Password updated! Please sign in with your new password.", "success");
          setActiveTab('login');
          setPassword(newPassword);
          setNewPassword("");
          setConfirmPassword("");
        }
      } else {
        showToast("Account matching specified email not found.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed password update request", "error");
    } finally {
      setLoading(false);
    }
  };

  // Standard email-only password reset handler
  const handleSendResetEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetEmail = email.trim();
    if (!targetEmail) {
      showToast("Please enter your registered email address.", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      showToast("Please enter a valid email address format (e.g., student@example.com).", "error");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setResetSuccess(true);
      setResetSentEmail(targetEmail);
      setResendCooldown(30);
      showToast("Password recovery link sent successfully! Check your email inbox.", "success");
    } catch (err: any) {
      console.error("Firebase reset email error:", err);
      let message = "Unable to process password reset request. Please try again.";
      if (err.code === "auth/user-not-found") {
        message = "No registered account found with this email address. Please check spelling or register a student account.";
      } else if (err.code === "auth/invalid-email") {
        message = "The email address entered is invalid. Please check and try again.";
      } else if (err.code === "auth/missing-email") {
        message = "Please provide your email address to receive the password reset link.";
      } else if (err.code === "auth/too-many-requests") {
        message = "Too many password reset requests. Please wait a few moments before trying again.";
      } else if (err.code === "auth/network-request-failed") {
        message = "Network connectivity error. Please check your internet connection.";
      } else if (err.message) {
        message = err.message;
      }
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Common Validations
    if (!email || !password) {
      showToast("Email address and password are required.", "error");
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'login') {
        const uProfile = await loginWithEmail(email, password);
        if (uProfile && uProfile.isPasswordResetRequired) {
          showToast("Your password was system-generated by an Admin. Please set your new password.", "info");
          setActiveTab('change_pw');
          setNewPassword("");
          setConfirmPassword("");
          return;
        }
        onAuthSuccess();
      } else {
        // Register Student Validations
        if (!fullName.trim() || !phone.trim()) {
          showToast("Full name and mobile phone number are required.", "error");
          setLoading(false);
          return;
        }

        if (!address.trim() || !guardianName.trim() || !guardianPhone.trim() || !photoURL) {
          showToast("Please provide address, guardian details, and a profile photo.", "error");
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          showToast("Password must be at least 6 characters long.", "error");
          setLoading(false);
          return;
        }

        const details = {
          gender,
          address,
          dob,
          notes,
          photoURL,
          password,
          guardianName,
          guardianPhone,
          selectedClasses,
          status: 'pending', // Pending administrator approval
          studentDetails: {
            grade,
            parentContact: guardianPhone,
            interests: selectedClasses
          }
        };

        await registerWithEmail(email, password, fullName, 'student', details);
        
        showToast("Registration submitted successfully! Pending Administrator approval.", "info");
        setActiveTab('login');
        setEmail(email);
        setPassword(password);
      }
    } catch (err: any) {
      showToast(err.message || "Failed credentials verification.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      if (user) {
        onAuthSuccess();
      }
    } catch {
      // handled in context
    } finally {
      setLoading(false);
    }
  };

  const isWideForm = activeTab === 'register';

  return (
    <div className="bg-slate-50/60 min-h-screen py-12 px-4 flex items-center justify-center font-sans" id="auth_portal">
      <div 
        className={`w-full transition-all duration-300 ${
          isWideForm ? 'max-w-2xl' : 'max-w-md'
        } bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 sm:p-9 relative overflow-hidden`}
      >
        
        {/* Sleek Brand Header */}
        <div className="text-center pb-6 border-b border-slate-100/80 mb-6">
          <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest font-mono shadow-2xs">
            <Sparkles className="w-3 h-3 text-indigo-600" />
            Guru Gedara Academy
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-2.5">
            {activeTab === 'login' && "Welcome Back"}
            {activeTab === 'register' && "Student Registration"}
            {activeTab === 'change_pw' && "Reset Your Password"}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {activeTab === 'login' && "Sign in to access your classroom, learning materials, and live schedule."}
            {activeTab === 'register' && "Join our educational community to enroll in courses and track attendance."}
            {activeTab === 'change_pw' && "We'll send an encrypted reset link directly to your registered email."}
          </p>
        </div>

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

        {/* Tab Selection Bar (Only Sign In and Register Student - No Reset Password tab) */}
        {currentUser?.isPasswordResetRequired ? (
          <div className="bg-orange-50 border border-orange-200 text-orange-900 p-4 rounded-2xl mb-6 text-xs leading-normal">
            <h4 className="font-extrabold mb-1 flex items-center gap-1.5 text-orange-950">
              <Lock className="w-4 h-4 text-orange-600 animate-pulse" /> Security Update Required
            </h4>
            An Administrator has enrolled your account with a temporary password. Please set your new private password below to finalize your educational workspace.
          </div>
        ) : activeTab === 'change_pw' ? (
          /* Sleek Breadcrumb / Back button when in Password Reset mode */
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setResetSuccess(false);
              }}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer group"
              id="back_to_login_btn"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Sign In</span>
            </button>
            <span className="text-[10px] font-mono font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full">
              Account Recovery
            </span>
          </div>
        ) : (
          /* Primary 2-Tab Navigation: Sign In & Register Student */
          <div className="flex border border-slate-200/80 mb-6 bg-slate-100/70 p-1 rounded-2xl" id="auth_main_tabs">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setResetSuccess(false);
              }}
              className={`flex-1 text-center py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'login' 
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-100' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              id="tab_sign_in"
            >
              <User className="w-3.5 h-3.5 text-indigo-600" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setResetSuccess(false);
              }}
              className={`flex-1 text-center py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'register' 
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-100' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              id="tab_register_student"
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              Register Student
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: PASSWORD RESET (Email Recovery Flow Only - No Direct Update)       */}
        {/* ========================================================================= */}
        {activeTab === 'change_pw' && (
          <div className="space-y-4" id="password_reset_flow_container">
            {currentUser?.isPasswordResetRequired ? (
              /* Forced Admin Password Update for Logged-In User */
              <form onSubmit={handleForcedPasswordChangeSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" /> Email Address:
                  </label>
                  <input
                    required
                    type="email"
                    value={email}
                    readOnly
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl outline-none font-mono text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-indigo-600" /> New Security Password:
                  </label>
                  <input
                    required
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-indigo-600" /> Confirm New Password:
                  </label>
                  <input
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-100"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Updating Password...</span>
                  ) : (
                    <>Set New Password <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>
            ) : resetSuccess ? (
              /* Success Confirmation Box */
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-6 text-center space-y-4 shadow-xs" id="password_reset_success_box">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-emerald-950">Password Reset Email Sent!</h3>
                  <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                    We have dispatched an encrypted recovery email to:
                  </p>
                  <div className="mt-2.5 inline-block bg-white border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold text-slate-800 break-all shadow-xs">
                    {resetSentEmail || email}
                  </div>
                </div>

                <div className="bg-white/95 border border-emerald-100 rounded-2xl p-4 text-left space-y-2.5 text-xs text-slate-600 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Check your email inbox (and spam/junk folder) for the recovery message.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Click the secure Firebase recovery link to choose your new password.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>Return here and sign in with your updated password.</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('login');
                      setResetSuccess(false);
                    }}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    id="reset_return_to_login_btn"
                  >
                    <ArrowLeft className="w-4 h-4" /> Return to Sign In
                  </button>
                  
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      disabled={loading || resendCooldown > 0}
                      onClick={() => handleSendResetEmail()}
                      className={`text-xs font-bold transition-all flex items-center gap-1.5 ${
                        resendCooldown > 0 || loading 
                          ? 'text-slate-400 cursor-not-allowed' 
                          : 'text-indigo-600 hover:text-indigo-800 underline cursor-pointer'
                      }`}
                      id="reset_resend_email_btn"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Recovery Email'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setResetSuccess(false);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Use different email
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Email Password Reset Form */
              <div className="space-y-4" id="password_reset_request_view">
                <div className="bg-indigo-50/80 border border-indigo-100 p-4 rounded-2xl text-xs leading-relaxed text-indigo-950">
                  <div className="flex items-center gap-2 font-bold mb-1 text-indigo-900">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Secure Email Password Recovery</span>
                  </div>
                  <p className="text-[11px] text-indigo-800/90 leading-normal">
                    Enter the email address associated with your account. We will send a secure link to reset your password.
                  </p>
                </div>

                <form onSubmit={handleSendResetEmail} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-600" /> Account Email Address:
                    </label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. scholar@example.com"
                      className="w-full text-xs px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono shadow-2xs bg-white"
                      id="password_reset_email_input"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      The password reset link remains active for 1 hour for your security.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-100 hover:shadow-lg"
                    id="password_reset_submit_btn"
                  >
                    {loading ? (
                      <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sending Recovery Email...</span>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        Send Password Reset Email
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveTab('login')}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Return to Sign In
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: SIGN IN                                                           */}
        {/* ========================================================================= */}
        {activeTab === 'login' && (
          <form onSubmit={handleSubmit} className="space-y-4" id="sign_in_form">
            {/* Email / Username / Name Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-600" /> Email, Username, or Full Name:
              </label>
              <input
                required
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. dasundularaka@gmail.com, dasun_dularaka, or Dasun Dularaka"
                className="w-full text-xs px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-sans shadow-2xs"
                id="login_email_input"
              />
            </div>

            {/* Password Field with Forgot Password Link */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" /> Password:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('change_pw');
                    setResetSuccess(false);
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer hover:underline"
                  id="login_forgot_password_link"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  required
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono shadow-2xs pr-10"
                  id="login_password_input"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full py-3 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-slate-200"
              id="login_submit_btn"
            >
              {loading ? (
                <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Signing In...</span>
              ) : (
                <>Sign In Securely <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            {/* Switch to Register link */}
            <div className="pt-2 text-center text-xs text-slate-500">
              Don't have a student account?{' '}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setResetSuccess(false);
                }}
                className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer ml-1"
                id="switch_to_register_link"
              >
                Register as Student
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: USER-FRIENDLY STUDENT SIGN UP UI (Styled like Password Reset)      */}
        {/* ========================================================================= */}
        {activeTab === 'register' && (
          <form onSubmit={handleSubmit} className="space-y-6" id="student_registration_form">
            
            {/* Friendly Registration Banner */}
            <div className="bg-indigo-50/80 border border-indigo-100 p-4 rounded-2xl text-xs leading-relaxed text-indigo-950">
              <div className="flex items-center gap-2 font-bold mb-1 text-indigo-900">
                <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Student Intake Registration</span>
              </div>
              <p className="text-[11px] text-indigo-800/90 leading-normal">
                Fill in your details below to register your student profile. Once submitted, your registration will be reviewed by academy administrators.
              </p>
            </div>

            {/* SECTION 1: ACCOUNT CREDENTIALS */}
            <div className="bg-slate-50/80 border border-slate-100 p-4 sm:p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 pb-2 border-b border-slate-200/80">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>1. Account & Contact Credentials</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" /> Full Name: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Kasun Perera"
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-sans shadow-2xs"
                    id="register_fullname_input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-600" /> Mobile Phone: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +94 77 123 4567"
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono shadow-2xs"
                    id="register_phone_input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" /> Email Address: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. scholar@example.com"
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono shadow-2xs"
                    id="register_email_input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-600" /> Password: <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono shadow-2xs pr-10"
                      id="register_password_input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: ACADEMIC & RESIDENTIAL DETAILS */}
            <div className="bg-slate-50/80 border border-slate-100 p-4 sm:p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 pb-2 border-b border-slate-200/80">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>2. Academic & Personal Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Grade Level: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-sans shadow-2xs cursor-pointer"
                    id="register_grade_select"
                  >
                    {["06", "07", "08", "09", "10", "11", "12 (A/L)", "13 (A/L)", "Other"].map(g => (
                      <option key={g} value={g}>{g.includes('(') || g === 'Other' ? g : `Grade ${g}`}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Gender: <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGender('male')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        gender === 'male' 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('female')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        gender === 'female' 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Female
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> Date of Birth: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-sans shadow-2xs cursor-pointer"
                    id="register_dob_input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-indigo-600" /> Residential Address: <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. No. 45, Temple Road, Colombo 05"
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-sans shadow-2xs"
                  id="register_address_input"
                />
              </div>
            </div>

            {/* SECTION 3: GUARDIAN INFORMATION */}
            <div className="bg-slate-50/80 border border-slate-100 p-4 sm:p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 pb-2 border-b border-slate-200/80">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>3. Parent / Guardian Contact Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Guardian Name: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    placeholder="e.g. Mr. S. de Silva"
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-sans shadow-2xs"
                    id="register_guardian_name_input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Guardian Contact Phone: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="tel"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    placeholder="e.g. +94 71 999 8811"
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono shadow-2xs"
                    id="register_guardian_phone_input"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: PROFILE AVATAR PHOTO */}
            <div className="bg-slate-50/80 border border-slate-100 p-4 sm:p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  <span>4. Student Profile Photo</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Select preset or upload</span>
              </div>

              {/* Preset Avatars Selection */}
              <div className="grid grid-cols-4 gap-2.5">
                {PRESET_PHOTOS.map((ph, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setPhotoURL(ph.url)}
                    className={`relative rounded-2xl overflow-hidden cursor-pointer border-2 transition-all p-0.5 bg-white ${
                      photoURL === ph.url ? 'border-indigo-600 ring-2 ring-indigo-200 shadow-sm scale-102' : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={ph.url} alt={ph.name} className="w-full h-14 object-cover rounded-xl" />
                    {photoURL === ph.url && (
                      <div className="absolute top-1.5 right-1.5 bg-indigo-600 text-white rounded-full p-0.5 shadow-2xs">
                        <CheckSquare className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Upload Custom Avatar Button */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1 items-center">
                <label className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer text-center flex items-center justify-center gap-2 shrink-0 shadow-2xs transition-colors">
                  <Upload className="w-3.5 h-3.5 text-indigo-600" />
                  Upload Custom Image
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/jpg" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                </label>
                <input
                  type="text"
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                  placeholder="Or paste image URL (https://...)"
                  className="w-full text-[11px] px-3.5 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono shadow-2xs text-slate-600"
                />
              </div>
            </div>

            {/* SECTION 5: TUITION CLASS ENROLLMENT INTERESTS */}
            <div className="bg-slate-50/80 border border-slate-100 p-4 sm:p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>5. Select Preferred Tuition Classes</span>
                </div>
                {selectedClasses.length > 0 && (
                  <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                    {selectedClasses.length} Selected
                  </span>
                )}
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200/80 rounded-2xl p-2.5 bg-white shadow-2xs">
                {classes && classes.length > 0 ? (
                  classes.map((c) => {
                    const isSelected = selectedClasses.includes(c.id);
                    return (
                      <div 
                        key={c.id}
                        onClick={() => handleClassToggle(c.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                          isSelected 
                            ? 'bg-indigo-50/50 border-indigo-200 shadow-2xs' 
                            : 'bg-slate-50/50 border-transparent hover:bg-slate-100/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <div>
                            <span className="block text-xs font-bold text-slate-800 leading-tight">{c.title}</span>
                            <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                              {c.subject} • {c.dayOfWeek || c.schedule} {c.timeSlot ? `(${c.timeSlot})` : ''}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg shrink-0">
                          {c.tutorName || 'Guru Gedara'}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-slate-400 py-3 text-center">Loading academy courses...</div>
                )}
              </div>
            </div>

            {/* SECTION 6: OPTIONAL NOTES */}
            <div className="bg-slate-50/80 border border-slate-100 p-4 sm:p-5 rounded-2xl space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Additional Notes or Special Requests (Optional):
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., previous exam results, subject strengths, or transport arrangements..."
                className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-sans resize-none shadow-2xs"
              />
            </div>

            {/* Submit Registration Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-100 hover:shadow-indigo-200"
              id="submit_registration_btn"
            >
              {loading ? (
                <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Submitting Enrollment...</span>
              ) : (
                <>
                  <BadgeCheck className="w-4 h-4" />
                  Submit Student Enrollment Registration
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Switch to Login link */}
            <div className="pt-2 text-center text-xs text-slate-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setResetSuccess(false);
                }}
                className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer ml-1"
                id="switch_to_login_from_register_btn"
              >
                Sign In here
              </button>
            </div>
          </form>
        )}

        {/* Social Authentication (Google) - shown on Login tab */}
        {activeTab === 'login' && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="relative mb-4 text-center">
              <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider bg-white px-2">
                Or continue with Google
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3 px-4 border border-slate-200 hover:border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-2.5 cursor-pointer shadow-2xs transition-colors"
              id="google_signin_btn"
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
        )}

      </div>
    </div>
  );
};
