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
import { ToastNotification } from './components/ToastNotification';
import { SyncTelemetryConsole } from './components/SyncTelemetryConsole';
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
  Database
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
  const [statusIdx, setStatusIdx] = useState(0);
  const statuses = [
    "Establishing secure tunnel...",
    "Syncing academic credentials...",
    "Loading student databases...",
    "Configuring smart workspace..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % statuses.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen bg-slate-50/60 relative overflow-hidden" 
      id="central_loading_screen"
    >
      {/* Decorative ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-48 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative flex flex-col items-center space-y-7 max-w-sm w-[90%] px-8 py-10 bg-white/90 backdrop-blur-md border border-slate-100 rounded-3xl shadow-2xl shadow-slate-200/50 text-center">
        
        {/* Beautiful multi-layered orbital loader */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          
          {/* Outer Ring 1: Slow rotating glowing ring with particle */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            className="absolute inset-0 border border-dashed border-slate-200 rounded-full"
          />
          
          {/* Glowing particle orbiting on outer ring */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            className="absolute inset-0 z-10"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-600 rounded-full shadow-lg shadow-blue-500/50" />
          </motion.div>

          {/* Middle Ring 2: Medium speed counter-rotating gradient circle */}
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }}
            className="absolute w-18 h-18 border-2 border-transparent border-t-indigo-600 border-r-indigo-400 rounded-full"
          />

          {/* Inner Ring 3: Fast rotating neon blue highlight */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="absolute w-12 h-12 border-2 border-transparent border-b-cyan-500 rounded-full"
          />

          {/* Center Pulse Core with Glowing Icon */}
          <motion.div 
            animate={{ scale: [0.95, 1.05, 0.95] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="absolute w-8 h-8 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center z-20 shadow-inner"
          >
            <GraduationCap className="w-4.5 h-4.5 text-blue-600" />
          </motion.div>
          
          {/* Central radial background flare */}
          <div className="absolute w-10 h-10 bg-blue-500/10 rounded-full blur-md" />
        </div>

        <div className="space-y-2">
          {/* Custom logo lettering with character spacing */}
          <h3 className="text-sm font-extrabold tracking-[0.25em] text-slate-800 uppercase font-sans">
            GURU GEDARA
          </h3>
          
          {/* Smooth cycling authenticating text */}
          <div className="h-5 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p 
                key={statusIdx}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-indigo-600 font-semibold tracking-wide font-sans uppercase"
              >
                {statuses[statusIdx]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Elegant infinite-scroll load bar */}
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden relative">
          <motion.div 
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
            animate={{ 
              left: ["-100%", "100%"],
              width: ["20%", "40%", "20%"]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 1.8, 
              ease: "easeInOut" 
            }}
          />
        </div>

      </div>
    </div>
  );
}

function MainAppContent() {
  const [currentTab, setCurrentTab] = useState('home');
  const { 
    toast, 
    hideToast, 
    cloudSync, 
    currentUser, 
    loading, 
    showToast,
    isReconciling,
    reconcileProgress,
    reconcileStep,
    lastReconciledAt,
    reconcileCloudData,
    syncState
  } = useApp();

  const [pingTime, setPingTime] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'stable' | 'unstable' | 'reconnecting'>('stable');

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
        <AnimatePresence>
          {toast && (
            <ToastNotification toast={toast} onClose={hideToast} />
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
              <div className="flex items-center justify-between">
                <h4 className="text-xs uppercase font-bold text-white tracking-widest font-mono">Connection Core</h4>
                {(isReconciling || syncState.status === 'syncing') && (
                  <span className="text-[10px] font-mono font-bold text-cyan-300 animate-pulse bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded-full">
                    {reconcileProgress}%
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                {/* Connection Status Badge */}
                <div className={`inline-flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-mono transition-all duration-300 ${
                  isReconciling || syncState.status === 'syncing' || connectionStatus === 'reconnecting'
                    ? 'bg-blue-900/50 border-cyan-500/60 text-cyan-200 shadow-lg shadow-cyan-500/10'
                    : connectionStatus === 'unstable'
                    ? 'bg-red-950/40 border-red-800/50 text-red-200'
                    : cloudSync
                    ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
                    : 'bg-white/5 border-white/10 text-blue-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {isReconciling || syncState.status === 'syncing' || connectionStatus === 'reconnecting' ? (
                      <>
                        <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                        <span className="text-cyan-200 font-bold tracking-wide">
                          Syncing... {reconcileProgress < 100 ? `${reconcileProgress}%` : ''}
                        </span>
                      </>
                    ) : connectionStatus === 'unstable' ? (
                      <>
                        <WifiOff className="w-4 h-4 text-red-400 animate-pulse" />
                        <span className="text-red-300 font-bold">Connection Unstable</span>
                      </>
                    ) : cloudSync ? (
                      <>
                        <Wifi className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span className="font-semibold">Cloud Database Linked</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4 text-orange-400" />
                        <span>Local State (Sandboxed)</span>
                      </>
                    )}
                  </div>

                  {cloudSync && !isReconciling && connectionStatus === 'stable' && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase font-extrabold tracking-wider">
                      100% Synced
                    </span>
                  )}
                </div>

                {/* Animated Reconcile Progress Bar */}
                {(isReconciling || syncState.status === 'syncing' || reconcileProgress < 100) && (
                  <div className="space-y-1.5 bg-blue-950/80 border border-blue-800/60 p-2.5 rounded-xl shadow-inner">
                    <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300">
                      <span className="flex items-center gap-1.5 font-bold truncate max-w-[180px]">
                        <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin shrink-0" />
                        <span className="truncate">{reconcileStep || "Reconciling Firestore cache..."}</span>
                      </span>
                      <span className="font-bold text-white shrink-0">{reconcileProgress}%</span>
                    </div>
                    
                    <div className="w-full bg-blue-900/80 rounded-full h-2 overflow-hidden p-0.5 border border-blue-700/50 relative">
                      <motion.div 
                        className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 h-full rounded-full shadow-lg shadow-cyan-400/50"
                        initial={{ width: '0%' }}
                        animate={{ width: `${reconcileProgress}%` }}
                        transition={{ ease: "easeInOut", duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}

                {/* Telemetry metadata & Latency indicator */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-blue-300 bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/5">
                    <Activity className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span>Latency:</span>
                    {pingTime !== null ? (
                      <span className={`font-bold ${pingTime < 80 ? 'text-emerald-400' : pingTime < 150 ? 'text-amber-400' : 'text-red-400'}`}>
                        {pingTime}ms
                      </span>
                    ) : (
                      <span className="text-slate-400">...</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-blue-300 bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/5 truncate">
                    <Database className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="truncate">
                      {lastReconciledAt 
                        ? `Synced: ${lastReconciledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` 
                        : 'Cache Active'}
                    </span>
                  </div>
                </div>

                {/* Interactive Reconcile & Instability buttons */}
                <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
                  <button
                    onClick={() => reconcileCloudData()}
                    disabled={isReconciling}
                    className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-100 transition-colors font-bold cursor-pointer disabled:opacity-50"
                    id="reconcile_cloud_btn"
                  >
                    <RefreshCw className={`w-3 h-3 ${isReconciling ? 'animate-spin text-cyan-400' : ''}`} />
                    <span>{isReconciling ? "Syncing..." : "Reconcile Cloud Data"}</span>
                  </button>

                  <button
                    onClick={handleSimulateInstability}
                    disabled={connectionStatus === 'reconnecting'}
                    className="text-indigo-300 hover:text-indigo-150 transition-colors underline cursor-pointer disabled:opacity-50"
                    id="simulate_instability_btn"
                  >
                    {connectionStatus === 'reconnecting' ? "Calibrating..." : "Test Instability"}
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-blue-300/80 pt-0.5 leading-relaxed">
                Guru Gedara uses reactive Firestore cloud buckets to maintain dynamic data states securely across browsers.
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
          <ToastNotification toast={toast} onClose={hideToast} />
        )}
      </AnimatePresence>

      {/* Sync Telemetry and Propagation Audit Console */}
      <SyncTelemetryConsole />
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
