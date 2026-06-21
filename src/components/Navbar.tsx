import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BookOpen, 
  Bell, 
  Settings, 
  Database, 
  LogOut, 
  Menu, 
  X, 
  User, 
  Check, 
  CreditCard, 
  Mail, 
  Shield 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { firestoreService } from '../lib/firestoreService';

interface NavbarProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onChangeTab }) => {
  const { 
    currentUser, 
    logout, 
    cloudSync, 
    notifications, 
    refreshNotifications,
    notificationSettings,
    updateNotificationSettings,
    showToast,
    updateProfile
  } = useApp();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfileDetails, setShowProfileDetails] = useState(false);

  // Editable profile state hooks with default fallback values
  const [profileName, setProfileName] = useState("");
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Synchronize internal form fields when profile is toggled
  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || "");
      setProfileDisplayName(currentUser.displayName || currentUser.name || "");
      setProfilePhoto(currentUser.photoURL || "");
    }
  }, [currentUser, showProfileDetails]);

  // Setup periodic refresh for notifications
  useEffect(() => {
    if (currentUser) {
      refreshNotifications();
      const interval = setInterval(() => {
        refreshNotifications();
      }, 15000); // 15s checks
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const toggleNotificationRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await firestoreService.markNotificationRead(id);
      await refreshNotifications();
    } catch (err) {
      console.warn(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const PRESET_PHOTOS = [
    { name: "Scholar Male 1", url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop" },
    { name: "Scholar Female 1", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop" },
    { name: "Scholar Male 2", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop" },
    { name: "Scholar Female 2", url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop" }
  ];

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setIsSavingProfile(true);
    try {
      const isStudent = currentUser.role === 'student';
      const updates: any = {
        name: profileName,
        displayName: profileDisplayName
      };

      if (isStudent) {
        if (profilePhoto !== currentUser.photoURL) {
          // Send for approval
          updates.pendingPhotoURL = profilePhoto;
          // Trigger notification
          await firestoreService.triggerNotification(
            currentUser.uid,
            "Photo approval submitted",
            "Your profile photo update request has been submitted for administrator review and manual approval.",
            "announcement"
          );
        }
      } else {
        // Tutors and admins can change photoURL directly
        updates.photoURL = profilePhoto;
      }

      await updateProfile(updates);
      showToast(isStudent && profilePhoto !== currentUser.photoURL 
        ? "Display details updated. Profile photo request has been sent for Admin approval!" 
        : "Profile update saved successfully!", "success");
      setShowProfileDetails(false);
    } catch (e: any) {
      showToast("Failed to update profile: " + e.message, "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Render correct badge for roles
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">Admin</span>;
      case 'tutor':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Tutor</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">Student</span>;
    }
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-250 sticky top-0 z-50 shadow-[0_1px_2px_rgba(0,0,0,0.01)]" id="main_navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo */}
            <div 
              className="flex-shrink-0 flex items-center gap-2.5 cursor-pointer" 
              onClick={() => onChangeTab('home')}
              id="brand_logo"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-extrabold shadow-sm">
                <BookOpen className="w-4.5 h-4.5 text-indigo-400" />
              </div>
              <div>
                <span className="text-sm font-extrabold font-sans tracking-tight text-slate-900 block leading-tight">
                  Guru<span className="text-indigo-600">Gedara</span>
                </span>
                <span className="text-[9px] font-mono font-semibold text-slate-400 uppercase tracking-widest block leading-none mt-0.5">
                  Educational Centre
                </span>
              </div>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex md:ml-10 md:space-x-2.5">
              <button
                onClick={() => onChangeTab('home')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentTab === 'home' 
                    ? 'bg-slate-100 text-slate-900 font-extrabold border border-slate-200/60' 
                    : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
                }`}
                id="tab_home_btn"
              >
                Home
              </button>
              <button
                onClick={() => onChangeTab('classes')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentTab === 'classes' 
                    ? 'bg-slate-100 text-slate-900 font-extrabold border border-slate-200/60' 
                    : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
                }`}
                id="tab_classes_btn"
              >
                Classes
              </button>
              <button
                onClick={() => onChangeTab('tutors')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentTab === 'tutors' 
                    ? 'bg-slate-100 text-slate-900 font-extrabold border border-slate-200/60' 
                    : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
                }`}
                id="tab_tutors_btn"
              >
                Tutors
              </button>
              

            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {/* Sync connection status indicators */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-100 text-xs text-gray-500 font-mono">
              <Database className={`w-3.5 h-3.5 ${cloudSync ? 'text-emerald-500 animate-pulse' : 'text-orange-500'}`} />
              <span>{cloudSync ? 'Live Sync' : 'Sandbox (Offline)'}</span>
            </div>

            {currentUser ? (
              <>
                {/* Notification Bell */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      setShowSettings(false);
                    }}
                    className="p-1.5 rounded-full text-gray-400 hover:text-blue-600 hover:bg-gray-100 transition-colors relative"
                    id="notifications_bell_btn"
                  >
                    <Bell className="w-5.5 h-5.5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 block h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white text-center leading-4 animate-bounce">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Overlay Menu */}
                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="origin-top-right absolute right-0 mt-2 w-80 rounded-xl shadow-xl bg-white ring-1 ring-black/5 divide-y divide-gray-100 z-50 text-left border border-blue-50 overflow-hidden"
                      >
                        <div className="p-3 bg-blue-50/50 flex justify-between items-center bg-blue-50">
                          <span className="text-sm font-bold text-blue-900">Notifications</span>
                          <button 
                            onClick={() => {
                              setShowSettings(true);
                              setShowNotifications(false);
                            }}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Settings className="w-3.5 h-3.5" /> Manage Settings
                          </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-6 text-center text-gray-400 text-xs">
                              All caught up! No recent notifications.
                            </div>
                          ) : (
                            notifications.map((not) => (
                              <div 
                                key={not.id} 
                                className={`p-3 relative cursor-pointer hover:bg-gray-50 flex gap-2.5 items-start ${!not.isRead ? 'bg-blue-50/20' : ''}`}
                              >
                                <div className="mt-0.5">
                                  {not.type === 'payment' && <CreditCard className="w-4 h-4 text-emerald-500" />}
                                  {not.type === 'message' && <Mail className="w-4 h-4 text-blue-500" />}
                                  {not.type === 'announcement' && <Shield className="w-4 h-4 text-purple-500" />}
                                  {not.type === 'reminder' && <Bell className="w-4 h-4 text-yellow-500" />}
                                </div>
                                <div className="flex-1 pr-4">
                                  <p className="text-xs font-bold text-gray-800 leading-tight">{not.title}</p>
                                  <p className="text-[11px] text-gray-500 mt-1 leading-snug">{not.message}</p>
                                  <span className="text-[9px] text-gray-400 mt-1 block font-mono">
                                    {new Date(not.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                {!not.isRead && (
                                  <button
                                    onClick={(e) => toggleNotificationRead(not.id, e)}
                                    className="p-1 rounded hover:bg-blue-50 text-blue-500 absolute top-2 right-2"
                                    title="Mark as read"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Account details */}
                <div className="flex items-center gap-3 pl-2 border-l border-gray-100">
                  <div className="text-right">
                    <span className="block text-sm font-bold text-gray-800 leading-tight">{currentUser.name}</span>
                    <span className="block">{getRoleBadge(currentUser.role)}</span>
                  </div>
                  {currentUser.photoURL ? (
                    <img 
                      referrerPolicy="no-referrer"
                      className="h-9 w-9 rounded-full object-cover ring-2 ring-blue-100 cursor-pointer hover:scale-105 transition-transform" 
                      src={currentUser.photoURL} 
                      alt={currentUser.name} 
                      onClick={() => setShowProfileDetails(true)}
                    />
                  ) : (
                    <div 
                      className="h-9 w-9 bg-blue-100 text-blue-700 flex items-center justify-center font-bold rounded-full border border-blue-200 cursor-pointer hover:bg-blue-250 transition-colors"
                      onClick={() => setShowProfileDetails(true)}
                    >
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Log Out"
                    id="nav_logout_btn"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => onChangeTab('auth')}
                className="inline-flex items-center justify-center px-4 py-2 border border-blue-600 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                id="nav_login_btn"
              >
                Log In / Register
              </button>
            )}
          </div>

          {/* Mobile hamburger menu */}
          <div className="flex md:hidden items-center gap-3">
            {currentUser && (
              <div className="p-1 text-gray-400 relative">
                <Bell className="w-5.5 h-5.5" onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowSettings(false);
                }} />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 text-[8px] font-bold text-white text-center leading-3">
                    {unreadCount}
                  </span>
                )}
              </div>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              id="mobile_menu_trigger"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menus */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-100 bg-white"
            id="mobile_dropdown_menu"
          >
            <div className="pt-2 pb-3 px-4 space-y-1">
              <button
                onClick={() => { onChangeTab('home'); setIsOpen(false); }}
                className="block text-left w-full px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700"
              >
                Home
              </button>
              <button
                onClick={() => { onChangeTab('classes'); setIsOpen(false); }}
                className="block text-left w-full px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700"
              >
                Classes
              </button>
              <button
                onClick={() => { onChangeTab('tutors'); setIsOpen(false); }}
                className="block text-left w-full px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700"
              >
                Tutors
              </button>
              

            </div>

            {/* User status */}
            <div className="pt-4 pb-3 border-t border-gray-100 px-4">
              {currentUser ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {currentUser.photoURL ? (
                      <img 
                        className="h-10 w-10 rounded-full cursor-pointer hover:scale-105 transition-transform" 
                        src={currentUser.photoURL} 
                        alt="" 
                        onClick={() => { setShowProfileDetails(true); setIsOpen(false); }}
                      />
                    ) : (
                      <div 
                        className="h-10 w-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold cursor-pointer hover:bg-blue-200 transition-all"
                        onClick={() => { setShowProfileDetails(true); setIsOpen(false); }}
                      >
                        <User className="w-5.5 h-5.5" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-gray-800">{currentUser.name}</p>
                      <p className="text-xs text-gray-500">{currentUser.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowLogoutConfirm(true); setIsOpen(false); }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <LogOut className="w-5.5 h-5.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { onChangeTab('auth'); setIsOpen(false); }}
                  className="w-full text-center py-2.5 px-4 bg-blue-600 text-white font-bold rounded-lg"
                >
                  Log In / Sign Up
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Settings Panel Dialog overlay */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-55 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 border border-blue-50 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowSettings(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2 text-blue-900 font-bold text-lg mb-4">
                <Settings className="w-5.5 h-5.5 text-blue-600" />
                <h2>Notification Configurations</h2>
              </div>
              <p className="text-xs text-gray-500 mb-5">
                Customize which events triggers push notices or alerts directly on your active viewport.
              </p>

              <div className="space-y-4 font-sans">
                <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50">
                  <div>
                    <span className="block text-sm font-bold text-gray-800">Lessons Reminders</span>
                    <span className="block text-[11px] text-gray-500">Get alerts 24 hours prior to booked tuition slots.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notificationSettings.reminders}
                    onChange={(e) => updateNotificationSettings({ reminders: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50">
                  <div>
                    <span className="block text-sm font-bold text-gray-800">Payments & Receipts</span>
                    <span className="block text-[11px] text-gray-500">Immediate confirmations for transactions status.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notificationSettings.payments}
                    onChange={(e) => updateNotificationSettings({ payments: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50">
                  <div>
                    <span className="block text-sm font-bold text-gray-800">Faculty Announcements</span>
                    <span className="block text-[11px] text-gray-500">Global alerts for schedules updates, holidays, etc.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notificationSettings.announcements}
                    onChange={(e) => updateNotificationSettings({ announcements: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50">
                  <div>
                    <span className="block text-sm font-bold text-gray-800">Direct Chat Messages</span>
                    <span className="block text-[11px] text-gray-500">Instant warnings on receiving direct messaging logs.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notificationSettings.messages}
                    onChange={(e) => updateNotificationSettings({ messages: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 border-t border-dashed border-gray-100 pt-4">
                  <div>
                    <span className="block text-sm font-bold text-blue-900">Email Synchronizer Sync</span>
                    <span className="block text-[11px] text-gray-500">Bypass client to send alerts duplicates to your inbox.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notificationSettings.emailSync}
                    onChange={(e) => updateNotificationSettings({ emailSync: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 animate-pulse"
                  />
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="mt-6 w-full text-center py-2 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700"
              >
                Save Preferences
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Profile Details Modal */}
      <AnimatePresence>
        {showProfileDetails && currentUser && (
          <div className="fixed inset-0 z-55 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-150 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setShowProfileDetails(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-650 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-4 border-b border-gray-100 pb-5 mb-5">
                {currentUser.photoURL ? (
                  <img className="h-16 w-16 rounded-full object-cover ring-4 ring-indigo-50" src={currentUser.photoURL} alt={currentUser.name} />
                ) : (
                  <div className="h-16 w-16 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-2xl">
                    {currentUser.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 leading-tight">{currentUser.name}</h2>
                  {currentUser.displayName && currentUser.displayName !== currentUser.name && (
                    <p className="text-xs text-slate-500 font-sans">Displaying as: <span className="font-bold text-slate-755">"{currentUser.displayName}"</span></p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {getRoleBadge(currentUser.role)}
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full font-mono uppercase ${
                      currentUser.status === 'pending' 
                        ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-250'
                    }`}>
                      {currentUser.status || 'Active'}
                    </span>
                  </div>
                  {currentUser.pendingPhotoURL && (
                    <div className="mt-2 text-[9px] text-amber-800 bg-amber-50 rounded-lg p-1.5 leading-tight border border-amber-100 font-mono">
                      ⏳ Pending Photo Verification...
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 text-xs font-sans">
                {/* Profile fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono">System Username</span>
                    <span className="block font-bold text-slate-800 mt-0.5 font-mono text-xs">
                      {currentUser.username || (currentUser.status === 'pending' ? 'Pending Approval (LOCKED)' : 'GG' + currentUser.uid.slice(0, 8).toUpperCase())}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono">Email Address</span>
                    <span className="block font-medium text-slate-800 mt-0.5 font-mono">{currentUser.email}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono">Contact Phone</span>
                    <span className="block font-medium text-slate-800 mt-0.5 font-mono">{currentUser.phone || 'Not Provided'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono">Gender</span>
                    <span className="block font-medium text-slate-800 mt-0.5 capitalize">{currentUser.gender || 'Not Provided'}</span>
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono">School / Residential Address</span>
                  <span className="block font-medium text-slate-800 mt-0.5 leading-relaxed">{currentUser.address || 'Not Provided'}</span>
                </div>

                {/* Role specific section details */}
                {currentUser.role === 'student' && (
                  <div className="pt-4 border-t border-dashed border-gray-150 space-y-4">
                    <h3 className="font-bold text-slate-900 text-xs">Student Particular Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono">Grade Level</span>
                        <span className="block font-bold text-slate-800 mt-0.5">{currentUser.studentDetails?.grade || 'Not Provided'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono">Guardian/Parent Name</span>
                        <span className="block font-bold text-slate-800 mt-0.5">{currentUser.guardianName || 'Not Provided'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono">Guardian Mobile Contact</span>
                        <span className="block font-bold text-slate-800 mt-0.5 font-mono">{currentUser.guardianPhone || 'Not Provided'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {currentUser.role === 'tutor' && currentUser.tutorDetails && (
                  <div className="pt-4 border-t border-dashed border-gray-150 space-y-3">
                    <h3 className="font-bold text-slate-900 text-xs">Tutor Academic Qualifications</h3>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono">Subject Bio Narrative</span>
                      <p className="text-slate-650 mt-1 italic leading-normal">"{currentUser.tutorDetails.bio}"</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono">Syllabus Course Fields</span>
                        <span className="block font-bold text-indigo-750 mt-0.5">{currentUser.tutorDetails.subjects.join(', ')}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono">Teaching Experience</span>
                        <span className="block font-bold text-slate-800 mt-0.5">{currentUser.tutorDetails.experience} Years</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Save & Profile Editing form section */}
              <div className="pt-4 border-t border-slate-150 space-y-3 mt-4">
                <h3 className="font-extrabold text-slate-900 text-xs tracking-tight text-indigo-755 uppercase">Modify Identity & Display Settings</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">Full Legal Name</label>
                    <input 
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-sans text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">Account Display Name</label>
                    <input 
                      type="text"
                      value={profileDisplayName}
                      onChange={(e) => setProfileDisplayName(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-sans text-xs"
                    />
                  </div>
                </div>

                {/* Profile pictures updates */}
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">Select Profile Photo Avatar</label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {PRESET_PHOTOS.map(ph => (
                      <button
                        key={ph.url}
                        type="button"
                        onClick={() => setProfilePhoto(ph.url)}
                        className={`relative rounded-xl overflow-hidden border-2 transition-all p-0.5 cursor-pointer h-11 ${
                          profilePhoto === ph.url ? 'border-indigo-650 scale-102 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={ph.url} alt={ph.name} className="w-full h-full object-cover rounded-lg" />
                      </button>
                    ))}
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-[9px] text-slate-400">Or Paste Image URL Address:</label>
                    <input 
                      type="text"
                      value={profilePhoto}
                      onChange={(e) => setProfilePhoto(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-mono text-[10px] lowercase"
                    />
                  </div>

                  {currentUser.role === 'student' && profilePhoto !== currentUser.photoURL && (
                    <p className="mt-2 text-[10px] text-amber-700 bg-amber-50 rounded-lg p-2 leading-tight border border-amber-200/50">
                      ⚠️ <strong>Verification Notice:</strong> Image updates for students require administrative audit & approval prior to displaying publicly.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowProfileDetails(false)}
                  className="w-1/2 text-center py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Close Profile
                </button>
                <button
                  type="button"
                  disabled={isSavingProfile}
                  onClick={handleSaveProfile}
                  className="w-1/2 text-center py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50 font-sans"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-55 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-100 shadow-2xl text-center relative"
            >
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mx-auto mb-4">
                <LogOut className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-2">Confirm Logout</h2>
              <p className="text-xs text-slate-500 mb-6">
                Are you sure you want to securely logout from Guru Gedara Educational Centre?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setShowLogoutConfirm(false);
                    await logout();
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  Log Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </nav>
  );
};
