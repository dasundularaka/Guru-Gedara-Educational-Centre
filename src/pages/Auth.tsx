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
  EyeOff
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
  const { loginWithGoogle, loginWithEmail, registerWithEmail, classes, refreshClasses, showToast, currentUser } = useApp();
  
  // Available tabs: login, register, change_pw
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'change_pw'>('login');
  const [role, setRole] = useState<'student' | 'tutor'>('student');
  const [loading, setLoading] = useState(false);

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
  const [photoURL, setPhotoURL] = useState(PRESET_PHOTOS[0].url);
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [grade, setGrade] = useState("11");

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
    try {
      if (activeTab === 'login') {
        const uProfile = await loginWithEmail(email, password);
        if (uProfile && uProfile.isPasswordResetRequired) {
          showToast("Your password was system-generated by an Admin. Please update your password to proceed.", "info");
          setActiveTab('change_pw');
          setNewPassword("");
          setConfirmPassword("");
          return;
        }
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

        const registeredProfile = await registerWithEmail(email, password, fullName, role, details);
        
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
    try {
      const user = await loginWithGoogle();
      if (user) {
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
        <div className="text-center pb-6">
          <span className="text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full tracking-widest font-mono">
            Guru Gedara Portal
          </span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-3">Welcome to Guru Gedara</h2>
          <p className="text-[11px] text-gray-500 mt-1">Centre of Academic & Educational Excellence</p>
        </div>

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
                    placeholder="alex@gg.com"
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
                    placeholder="alex@gg.com"
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
                placeholder="alex@gg.com"
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

                    {/* SELECT PROFILE PHOTO */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                        <Image className="w-3.5 h-3.5 text-indigo-550" /> Select Profile Photo:
                      </label>
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
                        placeholder="Or enter customized Photo URL"
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
