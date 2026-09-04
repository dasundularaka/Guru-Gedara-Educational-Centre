import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Home, 
  BookOpen, 
  GraduationCap, 
  User, 
  LogIn,
  Megaphone 
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
  onOpenProfile
}) => {
  const { currentUser, notifications, announcements } = useApp();

  const unreadCount = (notifications || []).filter(n => !n.isRead).length;
  const announcementCount = (announcements || []).length;

  const isTutor = currentUser?.role === 'tutor';
  const isStudent = currentUser?.role === 'student';
  const isAdmin = currentUser?.role === 'admin';
  const isGuest = !currentUser;

  // Build nav items dynamically based on login state
  // Explicit rule: "Don't show announcement tab in guest mode. Only students and tutors logins."
  const navItems = React.useMemo(() => {
    if (isGuest) {
      // Guest mode: Home, Classes, Faculty, Sign In (NO announcements)
      return [
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
        }
      ];
    }

    if (isTutor) {
      // Tutor login: Home, Announcements, Profile
      return [
        {
          id: 'home',
          label: 'Home',
          icon: Home,
          action: () => onChangeTab('home'),
          isActive: currentTab === 'home'
        },
        {
          id: 'announcements',
          label: 'Notices',
          icon: Megaphone,
          badge: announcementCount > 0 ? announcementCount : undefined,
          action: () => onChangeTab('announcements'),
          isActive: currentTab === 'announcements'
        }
      ];
    }

    // Student or Admin login: Home, Classes, Announcements, etc.
    const items = [
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
        id: 'announcements',
        label: 'Notices',
        icon: Megaphone,
        badge: announcementCount > 0 ? announcementCount : undefined,
        action: () => onChangeTab('announcements'),
        isActive: currentTab === 'announcements'
      }
    ];

    return items;
  }, [isGuest, isTutor, isStudent, isAdmin, currentTab, announcementCount, onChangeTab]);

  const totalCols = navItems.length + 1; // plus profile/login button
  const gridClass = totalCols === 3 ? 'grid-cols-3' : totalCols === 4 ? 'grid-cols-4' : 'grid-cols-5';

  return (
    <nav 
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] pb-safe"
      id="mobile_bottom_navigation"
      aria-label="Mobile Navigation"
    >
      <div className={`grid ${gridClass} items-center justify-around px-1 py-1 max-w-md mx-auto`}>
        {/* Core items */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <button
              key={item.id}
              onClick={item.action}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer select-none min-h-[50px] ${
                active 
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              id={`mobile_nav_${item.id}`}
              title={item.label}
            >
              {active && (
                <motion.div
                  layoutId="mobile_nav_active_pill"
                  className="absolute inset-1 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl -z-10 border border-indigo-100 dark:border-indigo-900/50"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}

              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-indigo-600 ring-2 ring-white dark:ring-slate-900 text-[8.5px] font-black text-white">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>

              <span className={`text-[10px] tracking-tight mt-1 leading-none transition-all ${
                active ? 'font-black scale-105' : 'font-semibold'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Profile / Sign In button */}
        {currentUser ? (
          <button
            onClick={() => {
              if (onOpenProfile) {
                onOpenProfile();
              } else {
                onChangeTab('dashboard');
              }
            }}
            className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer select-none min-h-[50px] ${
              currentTab === 'dashboard'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            id="mobile_nav_profile"
            title="View User Profile"
          >
            {currentTab === 'dashboard' && (
              <motion.div
                layoutId="mobile_nav_active_pill"
                className="absolute inset-1 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl -z-10 border border-indigo-100 dark:border-indigo-900/50"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}

            <div className="relative">
              {currentUser.photoURL ? (
                <img 
                  referrerPolicy="no-referrer"
                  src={currentUser.photoURL} 
                  alt={currentUser.name} 
                  className="w-5.5 h-5.5 rounded-full object-cover ring-2 ring-indigo-500/40 shadow-xs"
                />
              ) : (
                <div className="w-5.5 h-5.5 rounded-full bg-indigo-100 dark:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-black shadow-xs">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                </div>
              )}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900 text-[8px] font-bold text-white">
                  {unreadCount > 9 ? '•' : unreadCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] tracking-tight mt-1 leading-none transition-all truncate max-w-[50px] ${
              currentTab === 'dashboard' ? 'font-black scale-105' : 'font-semibold'
            }`}>
              Profile
            </span>
          </button>
        ) : (
          <button
            onClick={() => onChangeTab('auth')}
            className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer select-none min-h-[50px] ${
              currentTab === 'auth'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            id="mobile_nav_signin"
            title="Sign In"
          >
            {currentTab === 'auth' && (
              <motion.div
                layoutId="mobile_nav_active_pill"
                className="absolute inset-1 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl -z-10 border border-indigo-100 dark:border-indigo-900/50"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}

            <div className="relative">
              <LogIn className="w-5 h-5 stroke-[1.8]" />
            </div>
            <span className={`text-[10px] tracking-tight mt-1 leading-none transition-all ${
              currentTab === 'auth' ? 'font-black scale-105' : 'font-semibold'
            }`}>
              Sign In
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};

