import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Home, 
  BookOpen, 
  GraduationCap, 
  LayoutDashboard, 
  User, 
  LogIn, 
  Bell, 
  ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';

interface MobileBottomNavProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ 
  currentTab, 
  onChangeTab,
  onOpenNotifications,
  onOpenProfile
}) => {
  const { currentUser, notifications } = useApp();

  const unreadCount = (notifications || []).filter(n => !n.isRead).length;

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      action: () => onChangeTab('home'),
      isActive: currentTab === 'home'
    },
    {
      id: 'classes',
      label: 'Classes',
      icon: BookOpen,
      action: () => onChangeTab('classes'),
      isActive: currentTab === 'classes'
    },
    {
      id: 'tutors',
      label: 'Faculty',
      icon: GraduationCap,
      action: () => onChangeTab('tutors'),
      isActive: currentTab === 'tutors'
    },
    {
      id: currentUser ? 'dashboard' : 'auth',
      label: currentUser 
        ? (currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'tutor' ? 'Tutor' : 'Portal')
        : 'Sign In',
      icon: currentUser 
        ? (currentUser.role === 'admin' ? ShieldCheck : LayoutDashboard) 
        : LogIn,
      action: () => {
        if (currentUser) {
          onChangeTab('dashboard');
        } else {
          onChangeTab('auth');
        }
      },
      isActive: currentTab === 'dashboard' || currentTab === 'auth'
    }
  ];

  return (
    <div 
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-250 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] safe-bottom"
      id="mobile_bottom_navigation"
    >
      <div className="flex items-center justify-around px-2 py-1.5 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <button
              key={item.id}
              onClick={item.action}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer select-none min-w-[56px] min-h-[48px] ${
                active 
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              id={`mobile_nav_${item.id}`}
            >
              {/* Active pill glow background */}
              {active && (
                <motion.div
                  layoutId="mobile_nav_active_pill"
                  className="absolute inset-0 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl -z-10 border border-indigo-100 dark:border-indigo-900/50"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                
                {/* Special Notification count badge on Dashboard/Portal if unread */}
                {item.id === 'dashboard' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-extrabold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>

              <span className={`text-[10px] tracking-tight mt-0.5 leading-none transition-all ${
                active ? 'font-black scale-105' : 'font-medium'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* 5th Icon: User Avatar or Quick Profile Trigger */}
        {currentUser ? (
          <button
            onClick={() => {
              if (onOpenProfile) onOpenProfile();
              else onChangeTab('dashboard');
            }}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all cursor-pointer min-w-[56px] min-h-[48px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            id="mobile_nav_profile"
          >
            <div className="relative">
              {currentUser.photoURL ? (
                <img 
                  referrerPolicy="no-referrer"
                  src={currentUser.photoURL} 
                  alt={currentUser.name} 
                  className="w-5.5 h-5.5 rounded-full object-cover ring-1.5 ring-indigo-500/40"
                />
              ) : (
                <div className="w-5.5 h-5.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-black">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                </div>
              )}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 ring-1 ring-white dark:ring-slate-900" />
              )}
            </div>
            <span className="text-[10px] font-medium tracking-tight mt-0.5 leading-none truncate max-w-[52px]">
              Profile
            </span>
          </button>
        ) : (
          <button
            onClick={() => {
              if (onOpenNotifications) onOpenNotifications();
              else onChangeTab('classes');
            }}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all cursor-pointer min-w-[56px] min-h-[48px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            id="mobile_nav_alerts"
          >
            <Bell className="w-5 h-5 stroke-[1.8]" />
            <span className="text-[10px] font-medium tracking-tight mt-0.5 leading-none">
              Alerts
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
