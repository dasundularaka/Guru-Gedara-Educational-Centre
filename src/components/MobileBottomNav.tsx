import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Home, 
  BookOpen, 
  GraduationCap, 
  User, 
  LogIn,
  Megaphone,
  Calendar,
  CreditCard,
  MessageSquare,
  TrendingUp,
  Compass,
  UserCheck,
  ShieldCheck,
  Layers,
  Image as ImageIcon,
  Shield,
  Star,
  Users
} from 'lucide-react';
import { getAudienceFilteredAnnouncements } from '../lib/announcementUtils';

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
  const { currentUser, notifications, announcements, classes, bookings } = useApp();
  const [activeSubSection, setActiveSubSection] = useState<string>('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const unreadCount = (notifications || []).filter(n => !n.isRead).length;

  // Filter announcements strictly by current user recipient audience
  const audienceAnnouncements = React.useMemo(() => {
    return getAudienceFilteredAnnouncements(announcements || [], currentUser, bookings || [], classes || []);
  }, [announcements, currentUser, bookings, classes]);

  const announcementCount = audienceAnnouncements.length;
  const isGuest = !currentUser;

  // Clear activeSubSection when leaving home/dashboard tab
  useEffect(() => {
    if (currentTab !== 'home' && currentTab !== 'dashboard') {
      setActiveSubSection('');
    }
  }, [currentTab]);

  // Build section navigation items dynamically based on user role
  // Rule: All section navigations with suitable icons and matching word
  // Rule: Do not replace tutors (faculty) from announcements (notices). Both are needed!
  const navItems = React.useMemo(() => {
    if (isGuest) {
      return [
        {
          id: 'home',
          label: 'Home',
          icon: Home,
          action: () => {
            setActiveSubSection('');
            onChangeTab('home');
          },
          isActive: currentTab === 'home' && !activeSubSection
        },
        {
          id: 'classes',
          label: 'Classes',
          icon: BookOpen,
          action: () => {
            setActiveSubSection('');
            onChangeTab('classes');
          },
          isActive: currentTab === 'classes'
        },
        {
          id: 'tutors',
          label: 'Faculty',
          icon: GraduationCap,
          action: () => {
            setActiveSubSection('');
            onChangeTab('tutors');
          },
          isActive: currentTab === 'tutors'
        },
        {
          id: 'announcements',
          label: 'Notices',
          icon: Megaphone,
          badge: announcementCount > 0 ? announcementCount : undefined,
          action: () => {
            setActiveSubSection('');
            onChangeTab('announcements');
          },
          isActive: currentTab === 'announcements'
        }
      ];
    }

    // Student Navigation
    if (currentUser?.role === 'student') {
      return [
        {
          id: 'home',
          label: 'Home',
          icon: Home,
          action: () => {
            setActiveSubSection('schedule');
            onChangeTab('home');
            window.dispatchEvent(new CustomEvent('app_navigate_student_subtab', { detail: { studentTab: 'schedule' } }));
          },
          isActive: currentTab === 'home' && (!activeSubSection || activeSubSection === 'schedule')
        },
        {
          id: 'classes',
          label: 'Classes',
          icon: BookOpen,
          action: () => {
            setActiveSubSection('');
            onChangeTab('classes');
          },
          isActive: currentTab === 'classes'
        },
        {
          id: 'tutors',
          label: 'Faculty',
          icon: GraduationCap,
          action: () => {
            setActiveSubSection('');
            onChangeTab('tutors');
          },
          isActive: currentTab === 'tutors'
        },
        {
          id: 'announcements',
          label: 'Notices',
          icon: Megaphone,
          badge: announcementCount > 0 ? announcementCount : undefined,
          action: () => {
            setActiveSubSection('');
            onChangeTab('announcements');
          },
          isActive: currentTab === 'announcements'
        },
        {
          id: 'student_progress',
          label: 'Progress',
          icon: TrendingUp,
          action: () => {
            setActiveSubSection('performance');
            onChangeTab('home');
            window.dispatchEvent(new CustomEvent('app_navigate_student_subtab', { detail: { studentTab: 'performance' } }));
          },
          isActive: currentTab === 'home' && activeSubSection === 'performance'
        },
        {
          id: 'student_payments',
          label: 'Payments',
          icon: CreditCard,
          action: () => {
            setActiveSubSection('payments');
            onChangeTab('home');
            window.dispatchEvent(new CustomEvent('app_navigate_student_subtab', { detail: { studentTab: 'payments' } }));
          },
          isActive: currentTab === 'home' && activeSubSection === 'payments'
        },
        {
          id: 'student_roadmap',
          label: 'Roadmap',
          icon: Compass,
          action: () => {
            setActiveSubSection('roadmap');
            onChangeTab('home');
            window.dispatchEvent(new CustomEvent('app_navigate_student_subtab', { detail: { studentTab: 'roadmap' } }));
          },
          isActive: currentTab === 'home' && activeSubSection === 'roadmap'
        },
        {
          id: 'student_chat',
          label: 'Chat',
          icon: MessageSquare,
          action: () => {
            setActiveSubSection('chat');
            onChangeTab('home');
            window.dispatchEvent(new CustomEvent('app_navigate_student_subtab', { detail: { studentTab: 'chat' } }));
          },
          isActive: currentTab === 'home' && activeSubSection === 'chat'
        }
      ];
    }

    // Tutor Navigation
    if (currentUser?.role === 'tutor') {
      return [
        {
          id: 'home',
          label: 'Home',
          icon: Home,
          action: () => {
            setActiveSubSection('schedule');
            onChangeTab('home');
            window.dispatchEvent(new CustomEvent('app_navigate_tutor_subtab', { detail: { tutorTab: 'schedule' } }));
          },
          isActive: currentTab === 'home' && (!activeSubSection || activeSubSection === 'schedule')
        },
        {
          id: 'classes',
          label: 'Classes',
          icon: BookOpen,
          action: () => {
            setActiveSubSection('');
            onChangeTab('classes');
          },
          isActive: currentTab === 'classes'
        },
        {
          id: 'tutors',
          label: 'Faculty',
          icon: GraduationCap,
          action: () => {
            setActiveSubSection('');
            onChangeTab('tutors');
          },
          isActive: currentTab === 'tutors'
        },
        {
          id: 'announcements',
          label: 'Notices',
          icon: Megaphone,
          badge: announcementCount > 0 ? announcementCount : undefined,
          action: () => {
            setActiveSubSection('');
            onChangeTab('announcements');
          },
          isActive: currentTab === 'announcements'
        },
        {
          id: 'tutor_attendance',
          label: 'Attendance',
          icon: UserCheck,
          action: () => {
            setActiveSubSection('attendance');
            onChangeTab('home');
            window.dispatchEvent(new CustomEvent('app_navigate_tutor_subtab', { detail: { tutorTab: 'attendance' } }));
          },
          isActive: currentTab === 'home' && activeSubSection === 'attendance'
        },
        {
          id: 'tutor_scholars',
          label: 'Scholars',
          icon: Users,
          action: () => {
            setActiveSubSection('students');
            onChangeTab('home');
            window.dispatchEvent(new CustomEvent('app_navigate_tutor_subtab', { detail: { tutorTab: 'students' } }));
          },
          isActive: currentTab === 'home' && activeSubSection === 'students'
        },
        {
          id: 'tutor_schedule',
          label: 'Schedule',
          icon: Calendar,
          action: () => {
            setActiveSubSection('schedule');
            onChangeTab('home');
            window.dispatchEvent(new CustomEvent('app_navigate_tutor_subtab', { detail: { tutorTab: 'schedule' } }));
          },
          isActive: currentTab === 'home' && activeSubSection === 'schedule'
        },
        {
          id: 'tutor_chat',
          label: 'Chat',
          icon: MessageSquare,
          action: () => {
            setActiveSubSection('chat');
            onChangeTab('home');
            window.dispatchEvent(new CustomEvent('app_navigate_tutor_subtab', { detail: { tutorTab: 'chat' } }));
          },
          isActive: currentTab === 'home' && activeSubSection === 'chat'
        }
      ];
    }

    // Admin Navigation
    return [
      {
        id: 'home',
        label: 'Home',
        icon: Home,
        action: () => {
          setActiveSubSection('analytics');
          onChangeTab('home');
          window.dispatchEvent(new CustomEvent('app_navigate_admin_subtab', { detail: { adminTab: 'analytics' } }));
        },
        isActive: currentTab === 'home' && (!activeSubSection || activeSubSection === 'analytics')
      },
      {
        id: 'classes',
        label: 'Classes',
        icon: BookOpen,
        action: () => {
          setActiveSubSection('');
          onChangeTab('classes');
        },
        isActive: currentTab === 'classes'
      },
      {
        id: 'tutors',
        label: 'Faculty',
        icon: GraduationCap,
        action: () => {
          setActiveSubSection('');
          onChangeTab('tutors');
        },
        isActive: currentTab === 'tutors'
      },
      {
        id: 'announcements',
        label: 'Notices',
        icon: Megaphone,
        badge: announcementCount > 0 ? announcementCount : undefined,
        action: () => {
          setActiveSubSection('');
          onChangeTab('announcements');
        },
        isActive: currentTab === 'announcements'
      },
      {
        id: 'admin_approvals',
        label: 'Approvals',
        icon: ShieldCheck,
        action: () => {
          setActiveSubSection('users_approvals');
          onChangeTab('home');
          window.dispatchEvent(new CustomEvent('app_navigate_admin_subtab', { detail: { adminTab: 'users_approvals' } }));
        },
        isActive: currentTab === 'home' && activeSubSection === 'users_approvals'
      },
      {
        id: 'admin_ledger',
        label: 'Ledger',
        icon: CreditCard,
        action: () => {
          setActiveSubSection('payments');
          onChangeTab('home');
          window.dispatchEvent(new CustomEvent('app_navigate_admin_subtab', { detail: { adminTab: 'payments' } }));
        },
        isActive: currentTab === 'home' && activeSubSection === 'payments'
      },
      {
        id: 'admin_scholars',
        label: 'Scholars',
        icon: Users,
        action: () => {
          setActiveSubSection('students');
          onChangeTab('home');
          window.dispatchEvent(new CustomEvent('app_navigate_admin_subtab', { detail: { adminTab: 'students' } }));
        },
        isActive: currentTab === 'home' && activeSubSection === 'students'
      },
      {
        id: 'admin_progress',
        label: 'Progress',
        icon: TrendingUp,
        action: () => {
          setActiveSubSection('progress');
          onChangeTab('home');
          window.dispatchEvent(new CustomEvent('app_navigate_admin_subtab', { detail: { adminTab: 'progress' } }));
        },
        isActive: currentTab === 'home' && activeSubSection === 'progress'
      },
      {
        id: 'admin_messages',
        label: 'Messages',
        icon: MessageSquare,
        action: () => {
          setActiveSubSection('messages');
          onChangeTab('home');
          window.dispatchEvent(new CustomEvent('app_navigate_admin_subtab', { detail: { adminTab: 'messages' } }));
        },
        isActive: currentTab === 'home' && activeSubSection === 'messages'
      },
      {
        id: 'admin_pathways',
        label: 'Pathways',
        icon: Layers,
        action: () => {
          setActiveSubSection('pathways');
          onChangeTab('home');
          window.dispatchEvent(new CustomEvent('app_navigate_admin_subtab', { detail: { adminTab: 'pathways' } }));
        },
        isActive: currentTab === 'home' && activeSubSection === 'pathways'
      },
      {
        id: 'admin_banners',
        label: 'Banners',
        icon: ImageIcon,
        action: () => {
          setActiveSubSection('banners');
          onChangeTab('home');
          window.dispatchEvent(new CustomEvent('app_navigate_admin_subtab', { detail: { adminTab: 'banners' } }));
        },
        isActive: currentTab === 'home' && activeSubSection === 'banners'
      },
      {
        id: 'admin_staff',
        label: 'Staff',
        icon: Shield,
        action: () => {
          setActiveSubSection('admins');
          onChangeTab('home');
          window.dispatchEvent(new CustomEvent('app_navigate_admin_subtab', { detail: { adminTab: 'admins' } }));
        },
        isActive: currentTab === 'home' && activeSubSection === 'admins'
      },
      {
        id: 'admin_reviews',
        label: 'Reviews',
        icon: Star,
        action: () => {
          setActiveSubSection('reviews');
          onChangeTab('home');
          window.dispatchEvent(new CustomEvent('app_navigate_admin_subtab', { detail: { adminTab: 'reviews' } }));
        },
        isActive: currentTab === 'home' && activeSubSection === 'reviews'
      }
    ];
  }, [isGuest, currentUser?.role, currentTab, activeSubSection, announcementCount, onChangeTab]);

  return (
    <nav 
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] pb-safe"
      id="mobile_bottom_navigation"
      aria-label="Mobile Navigation"
    >
      <div className="flex items-stretch justify-between w-full h-[62px] max-w-full relative overflow-hidden">
        
        {/* Scrollable Section Navigation Bar */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth px-2 py-1 overscroll-x-contain touch-pan-x"
          style={{ WebkitOverflowScrolling: 'touch' }}
          id="mobile_nav_scrollable_sections"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.isActive;

            return (
              <button
                key={item.id}
                onClick={item.action}
                aria-label={item.label}
                className={`shrink-0 flex flex-col items-center justify-center min-w-[58px] px-2 py-1.5 rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
                  active 
                    ? 'text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50/80 dark:bg-indigo-950/60' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                id={`mobile_nav_${item.id}`}
                title={item.label}
              >
                <div className="relative flex items-center justify-center">
                  <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-105 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-indigo-600 ring-2 ring-white dark:ring-slate-900 text-[8.5px] font-black text-white">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold tracking-tight mt-0.5 truncate max-w-[62px] text-center leading-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Fixed Profile Icon (Pinned Bottom Right Corner, Never Scrolls) */}
        <div 
          className="shrink-0 flex items-center justify-center border-l border-slate-200/80 dark:border-slate-800/80 px-2 py-1 bg-white/95 dark:bg-slate-900/95 shadow-[-4px_0_12px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_12px_rgba(0,0,0,0.25)]"
          id="mobile_nav_fixed_profile_wrapper"
        >
          {currentUser ? (
            <button
              onClick={() => {
                if (onOpenProfile) {
                  onOpenProfile();
                } else {
                  onChangeTab('dashboard');
                }
              }}
              aria-label="User Profile"
              className={`flex flex-col items-center justify-center min-w-[56px] px-1.5 py-1.5 rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
                currentTab === 'dashboard'
                  ? 'text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50/80 dark:bg-indigo-950/60'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              id="mobile_nav_profile"
              title="View User Profile"
            >
              <div className="relative flex items-center justify-center">
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
              <span className="text-[10px] font-bold tracking-tight mt-0.5 truncate max-w-[58px] text-center leading-tight">
                Profile
              </span>
            </button>
          ) : (
            <button
              onClick={() => onChangeTab('auth')}
              aria-label="Sign In"
              className={`flex flex-col items-center justify-center min-w-[56px] px-1.5 py-1.5 rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
                currentTab === 'auth'
                  ? 'text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50/80 dark:bg-indigo-950/60'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              id="mobile_nav_signin"
              title="Sign In"
            >
              <div className="relative flex items-center justify-center">
                <LogIn className="w-5 h-5 stroke-[1.8]" />
              </div>
              <span className="text-[10px] font-bold tracking-tight mt-0.5 truncate max-w-[58px] text-center leading-tight">
                Sign In
              </span>
            </button>
          )}
        </div>

      </div>
    </nav>
  );
};


