import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../lib/firestoreService';
import { auth } from '../lib/firebase';
import { updatePassword } from 'firebase/auth';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Check, 
  ArrowRight, 
  RefreshCw,
  GraduationCap,
  KeyRound,
  LogOut
} from 'lucide-react';
import { motion } from 'motion/react';

export const RestrictedPasswordReset: React.FC = () => {
  const { currentUser, showToast, updateProfile, logout } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // Real-time dynamic checks
  const isMinLength = newPassword.length >= 6;
  const hasNumber = /\d/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email) {
      showToast("User context email trace not found. Please log in again.", "error");
      return;
    }

    if (!isMinLength) {
      showToast("Security passwords must contain at least 6 characters.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("The entered confirmation password does not match.", "error");
      return;
    }

    setLoading(true);
    try {
      // 1. Update Firebase Auth authentication layer if available
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
      }

      // 2. Update Firestore document (this changes password and sets isPasswordResetRequired to false)
      const success = await firestoreService.changeUserPassword(currentUser.email, newPassword);
      
      if (success) {
        // 3. Update the context user profile state to unblock immediate dashboard rendering
        await updateProfile({
          isPasswordResetRequired: false,
          password: newPassword
        });

        showToast("Password updated successfully! Welcome to your educational workspace.", "success");
      } else {
        throw new Error("Could not update secure profile record database.");
      }
    } catch (err: any) {
      console.error("Restricted password reset error:", err);
      showToast(err.message || "An error occurred while updating security specifications.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] py-12 px-4 flex items-center justify-center bg-slate-50 font-sans" id="restricted_reset_container">
      <div className="w-full max-w-md" id="restricted_reset_card">
        {/* Academy Branding Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-150 mb-4">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Guru Gedara Academy</h2>
          <p className="text-xs text-slate-500 font-medium font-sans mt-1">Securing Academic Accounts & Profiles</p>
        </div>

        {/* Security Warning Message Panel */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-6 text-xs leading-relaxed text-amber-900"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-extrabold text-amber-950 mb-0.5">Secure Password Required</h4>
              <p>
                An Administrator has created your professional profile with a temporary, system-generated passcode. To protect your learning record and active bookings, you must configure a secure personal password before entering your dashboard.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Form Container Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50">
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {/* Display logged in user details */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-2">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">AUTHORIZED SCHOLAR</span>
              <span className="block text-xs font-bold text-slate-800 font-sans mt-0.5">{currentUser?.name}</span>
              <span className="block text-xs text-slate-500 font-mono mt-0.5">{currentUser?.email}</span>
            </div>

            {/* Password input */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-500" /> New Password
              </label>
              <div className="relative">
                <input
                  required
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono"
                  id="restricted_new_password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password input */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-500" /> Confirm New Password
              </label>
              <div className="relative">
                <input
                  required
                  type={showConfirmPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono"
                  id="restricted_confirm_password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Dynamic Security Requirements List */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5">
              <h5 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">Password Standards</h5>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${isMinLength ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-405'}`}>
                    <Check className="w-2.5 h-2.5 font-bold" />
                  </div>
                  <span className={isMinLength ? 'text-slate-700 font-semibold' : 'text-slate-400'}>6+ characters</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${hasNumber ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-405'}`}>
                    <Check className="w-2.5 h-2.5 font-bold" />
                  </div>
                  <span className={hasNumber ? 'text-slate-700 font-semibold' : 'text-slate-400'}>At least 1 number</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${hasUpper ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-405'}`}>
                    <Check className="w-2.5 h-2.5 font-bold" />
                  </div>
                  <span className={hasUpper ? 'text-slate-700 font-semibold' : 'text-slate-400'}>1 capital letter</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${passwordsMatch ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-450'}`}>
                    <Check className="w-2.5 h-2.5 font-bold" />
                  </div>
                  <span className={passwordsMatch ? 'text-slate-700 font-semibold' : 'text-slate-400'}>Passwords match</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="submit"
                disabled={loading || !isMinLength || !passwordsMatch}
                className={`w-full py-2.5 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                  (loading || !isMinLength || !passwordsMatch)
                    ? 'bg-slate-350 cursor-not-allowed opacity-70'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
                id="restricted_save_password_btn"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Completing Securing...
                  </>
                ) : (
                  <>
                    Activate My Account <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => logout()}
                className="w-full py-2 px-4 text-slate-500 hover:text-slate-800 transition-colors text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100"
                id="restricted_sign_out_btn"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-450" /> Log Out / Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
