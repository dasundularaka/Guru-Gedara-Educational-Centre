import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Classes } from './pages/Classes';
import { Tutors } from './pages/Tutors';
import { Auth } from './pages/Auth';
import { StudentDashboard } from './pages/StudentDashboard';
import { TutorDashboard } from './pages/TutorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { RestrictedPasswordReset } from './pages/RestrictedPasswordReset';
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
  UserCheck
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

function MainAppContent() {
  const [currentTab, setCurrentTab] = useState('home');
  const { toast, hideToast, cloudSync, currentUser, loading } = useApp();

  // Reset tab selection to matching home dashboard once logged in if they click Auth
  useEffect(() => {
    if (currentUser?.isPasswordResetRequired) {
      setCurrentTab('auth');
    } else if (currentUser && currentTab === 'auth') {
      setCurrentTab('home');
    }
  }, [currentUser, currentTab]);

  if (loading) {
    return (
      <div 
        className="flex flex-col items-center justify-center min-h-screen bg-slate-50/50" 
        id="central_loading_screen"
      >
        <div className="flex flex-col items-center space-y-6 max-w-sm px-6 py-8 bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-100/50 text-center">
          <div className="relative flex items-center justify-center">
            {/* outer aesthetic ring */}
            <div className="absolute w-16 h-16 border-4 border-blue-100 rounded-full"></div>
            {/* dynamic motion spinner */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
              className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full z-10"
              id="central_spinner_ring"
            />
            {/* center micro icon or dot */}
            <div className="absolute w-3.5 h-3.5 bg-blue-600 rounded-full animate-pulse z-20"></div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight text-slate-800 font-sans">gurugedaraedu</h3>
            <p className="text-xs text-slate-500 font-mono tracking-wider uppercase animate-pulse">
              Authenticating Session
            </p>
          </div>
          
          <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-blue-500 rounded-full"
              animate={{ x: [-40, 40] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              style={{ width: '60%' }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (currentUser?.isPasswordResetRequired) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <main className="flex-grow">
          <RestrictedPasswordReset />
        </main>
        
        {/* Global active feedback Toast Notification message Banner */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="fixed bottom-6 right-6 z-55 max-w-sm rounded-2xl p-4 shadow-2xl flex items-start gap-3 bg-white border border-gray-100 font-sans"
              id="tuition_toast_alert"
            >
              <div className="mt-0.5 flex-shrink-0">
                {toast.type === 'success' && <CheckCircle className="w-5.2 h-5.2 text-emerald-500" />}
                {toast.type === 'error' && <XOctagon className="w-5.2 h-5.2 text-red-500" />}
                {toast.type === 'info' && <Info className="w-5.2 h-5.2 text-blue-500" />}
              </div>
              
              <div className="flex-grow pr-4">
                <p className="text-xs font-bold text-gray-900 leading-tight">Tuition Alert System</p>
                <p className="text-xs text-gray-500 mt-1 leading-snug">{toast.message}</p>
              </div>

              <button
                onClick={hideToast}
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded-lg transition-colors absolute top-2 right-2"
              >
                <XOctagon className="w-4 h-4 text-gray-300" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Navbar navigation selection */}
      <Navbar currentTab={currentTab} onChangeTab={setCurrentTab} />

      {/* Primary tab views selection container */}
      <main className="flex-grow">
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
            {currentTab === 'auth' && <Auth onAuthSuccess={() => setCurrentTab('home')} />}
            {currentTab === 'dashboard' && <DashboardRouter />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global Academic footer */}
      <footer className="bg-blue-950 border-t border-blue-900 text-white py-12" id="academy_footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
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

            <div className="space-y-3">
              <h4 className="text-xs uppercase font-bold text-white tracking-widest font-mono mb-4">Connection Core</h4>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-blue-200">
                {cloudSync ? (
                  <>
                    <Wifi className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>Cloud Database Linked</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-orange-400" />
                    <span>Local State (Sandboxed)</span>
                  </>
                )}
              </div>
              <p className="text-[10px] text-blue-300">
                Guru Gedara uses reactive Firestore cloud buckets to maintain dynamic data states securely.
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-blue-900 pt-6 text-center text-xs text-blue-300">
            <p>© {new Date().getFullYear()} Guru Gedara Educational Centre. All rights reserved. Registered Educational Faculty center.</p>
          </div>
        </div>
      </footer>

      {/* Global active feedback Toast Notification message Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="fixed bottom-6 right-6 z-55 max-w-sm rounded-2xl p-4 shadow-2xl flex items-start gap-3 bg-white border border-gray-100 font-sans"
            id="tuition_toast_alert"
          >
            <div className="mt-0.5 flex-shrink-0">
              {toast.type === 'success' && <CheckCircle className="w-5.2 h-5.2 text-emerald-500" />}
              {toast.type === 'error' && <XOctagon className="w-5.2 h-5.2 text-red-500" />}
              {toast.type === 'info' && <Info className="w-5.2 h-5.2 text-blue-500" />}
            </div>
            
            <div className="flex-grow pr-4">
              <p className="text-xs font-bold text-gray-900 leading-tight">Tuition Alert System</p>
              <p className="text-xs text-gray-500 mt-1 leading-snug">{toast.message}</p>
            </div>

            <button
              onClick={hideToast}
              className="text-gray-400 hover:text-gray-600 p-0.5 rounded-lg transition-colors absolute top-2 right-2"
            >
              <XOctagon className="w-4 h-4 text-gray-300" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
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
