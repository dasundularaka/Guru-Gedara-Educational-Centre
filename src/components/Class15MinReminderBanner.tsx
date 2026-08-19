import React, { useState } from 'react';
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Sparkles, 
  Play, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { use15MinClassNotification } from '../hooks/use15MinClassNotification';
import { motion, AnimatePresence } from 'motion/react';

interface Class15MinReminderBannerProps {
  compact?: boolean;
  onNavigateTab?: (tab: string) => void;
}

export const Class15MinReminderBanner: React.FC<Class15MinReminderBannerProps> = ({
  compact = false,
  onNavigateTab
}) => {
  const {
    permission,
    isPermissionGranted,
    isPermissionDenied,
    soundEnabled,
    nextUpcomingClass,
    isTriggeringTest,
    requestPermission,
    toggleSound,
    triggerTestAlert,
    playChime
  } = use15MinClassNotification();

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showInternalToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleEnableNotifications = async () => {
    const perm = await requestPermission();
    if (perm === 'granted') {
      showInternalToast('Browser notifications enabled! You will be alerted 15m before class.');
      playChime();
    } else if (perm === 'denied') {
      showInternalToast('Notifications blocked in browser settings. Please allow in site permissions.');
    }
  };

  const handleTestAlert = async () => {
    try {
      await triggerTestAlert();
      showInternalToast('Test 15-min notification dispatched with audio chime!');
    } catch {
      showInternalToast('Failed to trigger test notification.');
    }
  };

  // Compact layout (e.g. for Navbar or Dashboard sidebars)
  if (compact) {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-3 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Bell className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800">15-Min Class Alerts</span>
                {isPermissionGranted ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                    <AlertCircle className="w-2.5 h-2.5" /> Enable
                  </span>
                )}
              </div>
              {nextUpcomingClass && (
                <p className="text-[11px] text-indigo-700 font-medium truncate max-w-[180px]">
                  Next: {nextUpcomingClass.classItem.title} ({nextUpcomingClass.countdownText})
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {!isPermissionGranted && (
              <button
                onClick={handleEnableNotifications}
                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                Enable
              </button>
            )}
            <button
              onClick={handleTestAlert}
              disabled={isTriggeringTest}
              title="Test 15-min notification"
              className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3 h-3 text-indigo-600" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full interactive banner
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-xl border border-indigo-700/40">
      {/* Subtle background glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        
        {/* Left: Info & Next Class Status */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-2 bg-indigo-600/60 rounded-xl border border-indigo-400/30 text-indigo-200 backdrop-blur-xs">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              15-Minute Class Start Alert Trigger
            </h3>
            {isPermissionGranted ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Browser Push Active
              </span>
            ) : isPermissionDenied ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30">
                <AlertCircle className="w-3 h-3 text-rose-400" /> Push Blocked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                <Sparkles className="w-3 h-3 text-amber-400" /> Permission Needed
              </span>
            )}
          </div>

          <p className="text-xs text-indigo-200/90 max-w-xl leading-relaxed">
            Automated browser notification and harmonic audio chime trigger 15 minutes before your scheduled tuition classes begin, keeping you perfectly on schedule.
          </p>

          {/* Next upcoming class badge */}
          {nextUpcomingClass ? (
            <div className="inline-flex items-center gap-2 bg-indigo-950/60 border border-indigo-500/30 px-3 py-1.5 rounded-xl text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-indigo-200">Next Class:</span>
              <strong className="text-white font-semibold">{nextUpcomingClass.classItem.title}</strong>
              <span className="text-indigo-300">({nextUpcomingClass.startTimeFormatted})</span>
              <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                nextUpcomingClass.isStartingSoon ? 'bg-amber-500/30 text-amber-200 border border-amber-400/40' : 'bg-indigo-700/50 text-indigo-200'
              }`}>
                {nextUpcomingClass.countdownText}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-xs text-indigo-300/80">
              <Info className="w-3.5 h-3.5" /> No further classes scheduled for today.
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {/* Sound Toggle */}
          <button
            onClick={() => toggleSound()}
            className={`p-2.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
              soundEnabled 
                ? 'bg-indigo-700/50 hover:bg-indigo-700 border-indigo-500/40 text-white' 
                : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title={soundEnabled ? 'Alert chime enabled (click to mute)' : 'Alert chime muted (click to enable)'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Chime ON' : 'Chime Muted'}</span>
          </button>

          {/* Test Trigger Button */}
          <button
            onClick={handleTestAlert}
            disabled={isTriggeringTest}
            className="px-3.5 py-2.5 bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl border border-indigo-400/30 transition-all flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            title="Trigger instant 15-min notification test"
          >
            <Play className="w-3.5 h-3.5 text-amber-300" />
            <span>Test 15-Min Alert</span>
          </button>

          {/* Enable Permission Button */}
          {!isPermissionGranted && (
            <button
              onClick={handleEnableNotifications}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Enable Browser Push</span>
            </button>
          )}
        </div>

      </div>

      {/* Toast Alert */}
      {toastMsg && (
        <div className="mt-3 p-2 bg-indigo-950/90 text-indigo-100 text-xs rounded-lg border border-indigo-500/40 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};
