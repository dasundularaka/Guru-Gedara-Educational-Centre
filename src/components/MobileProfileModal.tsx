import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  GraduationCap, 
  LogOut, 
  Check, 
  Sparkles, 
  BadgeCheck, 
  Edit3, 
  Sun,
  Moon,
  School,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserProfile } from '../types';
import { firestoreService } from '../lib/firestoreService';

interface MobileProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenIdCard?: () => void;
  onOpenQrPass?: () => void;
  onNavigateTab?: (tab: string) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200'
];

export const MobileProfileModal: React.FC<MobileProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenIdCard,
  onOpenQrPass,
  onNavigateTab
}) => {
  const { currentUser, updateProfile, showToast, logout, darkMode, toggleDarkMode } = useApp();
  
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState<string>(currentUser?.name || currentUser?.displayName || '');
  const [selectedPhoto, setSelectedPhoto] = useState<string>(currentUser?.photoURL || '');
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  if (!currentUser) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showToast("Display name cannot be empty.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const finalPhoto = customPhotoUrl.trim() || selectedPhoto || currentUser.photoURL;
      
      const updates: Partial<UserProfile> = {
        name: displayName.trim(),
        displayName: displayName.trim()
      };

      if (finalPhoto && finalPhoto !== currentUser.photoURL) {
        if (currentUser.role === 'student') {
          // If student, submit photo for moderation/audit approval
          await firestoreService.submitProfilePhotoForApproval(currentUser.uid, finalPhoto);
          showToast("Profile name updated. Photo submitted for faculty moderation approval.", "info");
        } else {
          updates.photoURL = finalPhoto;
        }
      }

      await updateProfile(updates);
      showToast("Profile details updated successfully!", "success");
      setIsEditing(false);
      setCustomPhotoUrl('');
    } catch (err: any) {
      showToast(err?.message || "Failed to update profile.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">
            <ShieldCheck className="w-3 h-3" /> System Admin
          </span>
        );
      case 'tutor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <GraduationCap className="w-3 h-3" /> Faculty Tutor
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <Sparkles className="w-3 h-3" /> Enrolled Student
          </span>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Modal / Sheet Canvas */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col z-10 overflow-hidden"
            id="mobile_profile_sheet"
          >
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0 sm:hidden" />

            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                    User Profile & Identity
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500">
                    Guru Gedara Member Account
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors touch-target flex items-center justify-center cursor-pointer"
                title="Close Profile"
                id="btn_close_mobile_profile"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 overscroll-contain">
              {/* Profile Card Summary */}
              <div className="p-4 bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-850 dark:to-indigo-950/20 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center gap-4">
                <div className="relative shrink-0">
                  {currentUser.photoURL ? (
                    <img
                      referrerPolicy="no-referrer"
                      src={currentUser.photoURL}
                      alt={currentUser.name}
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-500/40 shadow-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-sm">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900" title="Online & Synced" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getRoleBadge(currentUser.role)}
                  </div>
                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                    {currentUser.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    <span>ID:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {currentUser.username || currentUser.uid.substring(0, 10)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* ID Card Shortcut */}
                {onOpenIdCard && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenIdCard();
                    }}
                    className="p-3 bg-slate-900 hover:bg-slate-950 dark:bg-slate-800 dark:hover:bg-slate-750 text-white rounded-2xl flex items-center gap-2.5 transition-all shadow-sm active:scale-95 cursor-pointer touch-target"
                    id="btn_mobile_profile_open_id_card"
                  >
                    <GraduationCap className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="text-left min-w-0">
                      <span className="block text-[11px] font-black leading-tight">Digital ID Card</span>
                      <span className="block text-[9px] text-slate-400 truncate">QR & Barcode</span>
                    </div>
                  </button>
                )}

                {/* Dashboard Jump */}
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateTab('dashboard');
                    }}
                    className="p-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center gap-2.5 transition-all active:scale-95 cursor-pointer touch-target"
                    id="btn_mobile_profile_goto_dashboard"
                  >
                    <BadgeCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div className="text-left min-w-0">
                      <span className="block text-[11px] font-black leading-tight">Dashboard</span>
                      <span className="block text-[9px] text-indigo-500 dark:text-indigo-400 truncate">Workspace Views</span>
                    </div>
                  </button>
                )}
              </div>

              {/* Details & Information List */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                    <Mail className="w-4 h-4" />
                    <span className="font-medium">Email Address</span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                    {currentUser.email || 'None registered'}
                  </span>
                </div>

                {currentUser.phone && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                      <Phone className="w-4 h-4" />
                      <span className="font-medium">Contact Phone</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {currentUser.phone}
                    </span>
                  </div>
                )}

                {currentUser.studentDetails?.grade && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                      <School className="w-4 h-4" />
                      <span className="font-medium">Academic Grade</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Grade {currentUser.studentDetails.grade}
                    </span>
                  </div>
                )}
              </div>

              {/* Edit Profile Form Toggle */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDisplayName(currentUser.name || currentUser.displayName || '');
                      setSelectedPhoto(currentUser.photoURL || '');
                      setIsEditing(true);
                    }}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer touch-target"
                    id="btn_mobile_profile_edit"
                  >
                    <Edit3 className="w-4 h-4" /> Edit Display Name & Avatar
                  </button>
                ) : (
                  <form onSubmit={handleSaveProfile} className="space-y-4 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        Edit Profile Details
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase font-bold text-slate-400 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                        placeholder="Enter your name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase font-bold text-slate-400 mb-2">
                        Select Avatar Preset
                      </label>
                      <div className="grid grid-cols-6 gap-2">
                        {PRESET_AVATARS.map((avatar, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedPhoto(avatar);
                              setCustomPhotoUrl('');
                            }}
                            className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                              selectedPhoto === avatar && !customPhotoUrl
                                ? 'border-indigo-600 scale-105 shadow-md'
                                : 'border-transparent opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={avatar} alt="Preset" className="w-full h-full object-cover" />
                            {selectedPhoto === avatar && !customPhotoUrl && (
                              <div className="absolute inset-0 bg-indigo-600/40 flex items-center justify-center text-white">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase font-bold text-slate-400 mb-1">
                        Or Custom Image URL
                      </label>
                      <input
                        type="url"
                        value={customPhotoUrl}
                        onChange={(e) => setCustomPhotoUrl(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                        placeholder="https://..."
                      />
                    </div>

                    {currentUser.role === 'student' && (
                      <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-2 text-[10px] text-amber-800 dark:text-amber-300">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                        <span>Student photo updates are submitted for official moderation to ensure academic ID card compliance.</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50 touch-target"
                      id="btn_save_mobile_profile"
                    >
                      {isSaving ? "Saving..." : "Save Profile Updates"}
                    </button>
                  </form>
                )}
              </div>

              {/* Study Mode & Theme */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 text-xs">
                  {darkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                  <span className="font-semibold">{darkMode ? "Night Study Mode" : "Day Study Mode"}</span>
                </div>
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Switch
                </button>
              </div>

              {/* Sign Out Button */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                {!showLogoutConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer touch-target"
                    id="btn_mobile_profile_logout"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out of Guru Gedara
                  </button>
                ) : (
                  <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-2xl space-y-2 text-center">
                    <p className="text-xs font-bold text-red-700 dark:text-red-300">
                      Are you sure you want to sign out?
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowLogoutConfirm(false)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          onClose();
                          await logout();
                          showToast("You have been signed out.", "info");
                        }}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        id="btn_confirm_logout_mobile"
                      >
                        Confirm Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
