import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Home } from './pages/Home';
import { Classes } from './pages/Classes';
import { Tutors } from './pages/Tutors';
import { Announcements } from './pages/Announcements';
import { Quizzes } from './pages/Quizzes';
import { Auth } from './pages/Auth';
import { StudentDashboard } from './pages/StudentDashboard';
import { TutorDashboard } from './pages/TutorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { RestrictedPasswordReset } from './pages/RestrictedPasswordReset';
import { ToastNotification } from './components/ToastNotification';
import { MobileProfileModal } from './components/MobileProfileModal';
import { DigitalStudentIDCardModal } from './components/DigitalStudentIDCardModal';
import { OrbitalLoader } from './components/OrbitalLoader';
import { 
  CheckCircle, 
  XOctagon, 
  Info, 
  HelpCircle, 
  Wifi, 
  WifiOff, 
  GraduationCap, 
  Phone, 
  Mail,
  UserCheck,
  RefreshCw,
  Activity,
  Database,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function DashboardRouter() {
  const { currentUser } = useApp();

  if (!currentUser) {
    return <Auth onAuthSuccess={() => {}} />;
  }

  switch (currentUser.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'tutor':
      return <TutorDashboard />;
    default:
      return <StudentDashboard />;
  }
}

function CentralLoadingScreen() {
  return (
    <OrbitalLoader
      variant="fullscreen"
      size="lg"
      statuses={[
        "Establishing secure tunnel...",
        "Syncing academic credentials...",
        "Loading student databases...",
        "Configuring smart workspace..."
      ]}
    />
  );
}

function MainAppContent() {
  const { 
    toast, 
    toasts,
    hideToast, 
    clearAllToasts,
    cloudSync, 
    currentUser, 
    loading, 
    showToast,
    isReconciling,
    reconcileProgress,
    reconcileStep,
    lastReconciledAt,
    reconcileCloudData,
    syncState,
    viewAsRole,
    currentAppTab: currentTab,
    setCurrentAppTab: setCurrentTab
  } = useApp();

  const isGuest = !currentUser || viewAsRole === 'guest';

  const [pingTime, setPingTime] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'stable' | 'unstable' | 'reconnecting'>('stable');
  const [isMobileProfileOpen, setIsMobileProfileOpen] = useState<boolean>(false);
  const [showGlobalIdCard, setShowGlobalIdCard] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showReconnectedAlert, setShowReconnectedAlert] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnectedAlert(true);
      const timer = setTimeout(() => {
        setShowReconnectedAlert(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnectedAlert(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const measurePing = async () => {
      if (connectionStatus === 'reconnecting') return;
      try {
        const start = performance.now();
        await fetch(`/?cb=${Date.now()}`, { method: 'HEAD', cache: 'no-store' });
        const end = performance.now();
        if (!active) return;
        const latency = Math.round(end - start);
        setPingTime(latency);
        if (latency > 150) {
          setConnectionStatus('unstable');
        } else {
          setConnectionStatus('stable');
        }
      } catch (e) {
        if (!active) return;
        console.warn("Ping failed:", e);
        setConnectionStatus('unstable');
      }
    };

    measurePing();
    const interval = setInterval(measurePing, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [connectionStatus]);

  const handleSimulateInstability = () => {
    setConnectionStatus('reconnecting');
    setPingTime(null);
    showToast("Simulating Network Instability... Reconnecting to database.", "info");

    setTimeout(() => {
      setConnectionStatus('stable');
      setPingTime(Math.round(20 + Math.random() * 40));
      showToast("Database connection established. Channels restored!", "success");
    }, 4000);
  };

  // Reset tab selection to matching home dashboard once logged in if they click Auth
  useEffect(() => {
    if (currentUser?.isPasswordResetRequired) {
      setCurrentTab('auth');
    } else if (currentUser && currentTab === 'auth') {
      setCurrentTab('home');
    }
  }, [currentUser, currentTab]);

  if (loading) {
    return <CentralLoadingScreen />;
  }

  if (currentUser?.isPasswordResetRequired) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <main className="flex-grow">
          <RestrictedPasswordReset />
        </main>
        
        {/* Global active feedback Toast Notification message Banner */}
        <ToastNotification 
          toasts={toasts} 
          toast={toast} 
          onClose={hideToast} 
          onClearAll={clearAllToasts} 
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Network Connectivity Status Modern Top Banner */}
      <div className="fixed top-4 inset-x-0 z-[100] flex justify-center px-4 pointer-events-none">
        <AnimatePresence>
          {!isOnline && (
            <motion.div
              key="offline_banner"
              initial={{ opacity: 0, y: -24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-slate-900/95 text-white rounded-2xl border border-rose-500/50 shadow-2xl backdrop-blur-md max-w-md w-full"
              id="banner_network_offline"
            >
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0 border border-rose-500/40">
                <WifiOff className="w-4 h-4 text-rose-400 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white">Connection Lost</p>
                <p className="text-[11px] text-slate-300">You are currently offline. Changes will automatically sync when reconnected.</p>
              </div>
            </motion.div>
          )}

          {isOnline && showReconnectedAlert && (
            <motion.div
              key="reconnected_banner"
              initial={{ opacity: 0, y: -24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-slate-900/95 text-white rounded-2xl border border-emerald-500/50 shadow-2xl backdrop-blur-md max-w-md w-full"
              id="banner_network_reconnected"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/40">
                <Wifi className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white">Connection Restored</p>
                <p className="text-[11px] text-emerald-300">You are back online. All data channels are fully active.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navbar navigation selection */}
      <Navbar currentTab={currentTab} onChangeTab={setCurrentTab} />

      {/* Primary tab views selection container */}
      <main className="flex-grow pb-16 md:pb-0 w-full overflow-x-hidden min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {currentTab === 'home' && (currentUser ? <DashboardRouter /> : <Home onNavigateTab={setCurrentTab} />)}
            {currentTab === 'classes' && <Classes onNavigateTab={setCurrentTab} />}
            {currentTab === 'tutors' && <Tutors />}
            {currentTab === 'announcements' && (
              !isGuest && currentUser 
                ? <Announcements onNavigateTab={setCurrentTab} /> 
                : <Auth onAuthSuccess={() => setCurrentTab('announcements')} />
            )}
            {currentTab === 'quizzes' && (
              !isGuest 
                ? <Quizzes onNavigateTab={setCurrentTab} /> 
                : <Auth onAuthSuccess={() => setCurrentTab('quizzes')} />
            )}
            {currentTab === 'auth' && <Auth onAuthSuccess={() => setCurrentTab('home')} />}
            {currentTab === 'dashboard' && <DashboardRouter />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global Academic footer */}
      <footer className="bg-blue-950 border-t border-blue-900 text-white py-10 md:py-12 mb-14 md:mb-0" id="academy_footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <h4 className="text-base font-bold text-blue-300 flex items-center gap-2">
                <GraduationCap className="w-5 h-5" /> Guru Gedara
              </h4>
              <p className="text-xs text-blue-200 leading-relaxed max-w-xs">
                A modern professional workspace featuring automated calendar integrations, active bookings, dynamic notifications, and direct chat channels.
              </p>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold text-white tracking-widest font-mono mb-4">Quick Links</h4>
              <ul className="space-y-2 text-xs text-blue-200">
                <li><button onClick={() => setCurrentTab('home')} className="hover:text-white transition-colors cursor-pointer">Homepage</button></li>
                <li><button onClick={() => setCurrentTab('classes')} className="hover:text-white transition-colors cursor-pointer">Explore Classes</button></li>
                {!isGuest && (
                  <li><button onClick={() => setCurrentTab('quizzes')} className="hover:text-white transition-colors cursor-pointer">Quizzes & Tests</button></li>
                )}
                <li><button onClick={() => setCurrentTab('tutors')} className="hover:text-white transition-colors cursor-pointer font-sans">Verified Faculty</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold text-white tracking-widest font-mono mb-4">Support Channels</h4>
              <ul className="space-y-2.5 text-xs text-blue-200">
                <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-blue-400" /> +1 (555) 777-9911</li>
                <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-blue-400" /> registrar.academy@example.com</li>
                <li className="flex items-center gap-2 font-mono"><UserCheck className="w-4 h-4 text-blue-400" /> Admin: Principal Office</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-blue-900 pt-6 text-center text-xs text-blue-300">
            <p>© {new Date().getFullYear()} Guru Gedara Educational Centre. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Dock */}
      <MobileBottomNav 
        currentTab={currentTab} 
        onChangeTab={setCurrentTab} 
        onOpenProfile={() => setIsMobileProfileOpen(true)}
      />

      {/* Global Mobile Profile Sheet / Modal */}
      {currentUser && (
        <MobileProfileModal
          isOpen={isMobileProfileOpen}
          onClose={() => setIsMobileProfileOpen(false)}
          onOpenIdCard={() => setShowGlobalIdCard(true)}
          onNavigateTab={(tab) => {
            setCurrentTab(tab);
            setIsMobileProfileOpen(false);
          }}
        />
      )}

      {/* Global Digital Student / Faculty / Admin ID Card Modal */}
      {currentUser && showGlobalIdCard && (
        <DigitalStudentIDCardModal
          isOpen={showGlobalIdCard}
          onClose={() => setShowGlobalIdCard(false)}
          currentUser={currentUser}
          showToast={showToast}
        />
      )}

      {/* Global active feedback Toast Notification message Banner */}
      <ToastNotification 
        toasts={toasts} 
        toast={toast} 
        onClose={hideToast} 
        onClearAll={clearAllToasts} 
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
