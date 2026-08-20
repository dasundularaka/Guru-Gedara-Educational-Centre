import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  Clock, 
  X, 
  ExternalLink,
  Volume2,
  VolumeX,
  Trash2,
  Sparkles
} from 'lucide-react';
import { ToastItem, ToastType } from '../types';

interface ToastNotificationProps {
  toast?: ToastItem | { message: string; type: 'success' | 'error' | 'info' } | null;
  toasts?: ToastItem[];
  onClose: (id?: string) => void;
  onClearAll?: () => void;
}

// Gentle Web Audio API synthesizer for modern micro-haptic pop sound
function playModernPopChime(type: ToastType = 'info') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    // Tailored micro-pitch frequencies per notification category
    const freqMap: Record<ToastType, number> = {
      success: 587.33, // D5 (pleasant uplift)
      error: 349.23,   // F4 (low cautionary tap)
      warning: 493.88, // B4 (gentle attention)
      reminder: 659.25,// E5 (bright reminder)
      info: 523.25     // C5 (soft neutral ping)
    };

    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(freqMap[type] || 523.25, now);
    if (type === 'success') {
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
    } else if (type === 'reminder') {
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);
    }

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 400);
  } catch {
    // Audio contexts safely handled if blocked by browser policy
  }
}

// Individual modern toast card with progress bar, drag dismiss, and hover pause
const ModernToastCard: React.FC<{
  item: ToastItem;
  onDismiss: (id: string) => void;
  isHoveredStack: boolean;
  index: number;
  total: number;
  isExpanded: boolean;
}> = ({ item, onDismiss, isHoveredStack, index, total, isExpanded }) => {
  const duration = item.duration || 4500;
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(duration);
  const timerRef = useRef<any>(null);

  // Theme definition for type variants
  const theme = {
    success: {
      badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      iconBg: 'bg-emerald-500 text-white',
      barColor: 'bg-emerald-500',
      trackColor: 'bg-emerald-500/15',
      borderColor: 'border-emerald-200/80 dark:border-emerald-900/50',
      glowShadow: 'shadow-[0_8px_30px_rgb(16,185,129,0.12)]',
      icon: <CheckCircle2 className="w-4 h-4" />,
      defaultTitle: 'Success'
    },
    error: {
      badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/20',
      iconBg: 'bg-rose-500 text-white',
      barColor: 'bg-rose-500',
      trackColor: 'bg-rose-500/15',
      borderColor: 'border-rose-200/80 dark:border-rose-900/50',
      glowShadow: 'shadow-[0_8px_30px_rgb(244,63,94,0.12)]',
      icon: <AlertOctagon className="w-4 h-4" />,
      defaultTitle: 'Attention Needed'
    },
    warning: {
      badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20',
      iconBg: 'bg-amber-500 text-white',
      barColor: 'bg-amber-500',
      trackColor: 'bg-amber-500/15',
      borderColor: 'border-amber-200/80 dark:border-amber-900/50',
      glowShadow: 'shadow-[0_8px_30px_rgb(245,158,11,0.12)]',
      icon: <AlertTriangle className="w-4 h-4" />,
      defaultTitle: 'Warning'
    },
    reminder: {
      badgeBg: 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      iconBg: 'bg-indigo-600 text-white',
      barColor: 'bg-indigo-600',
      trackColor: 'bg-indigo-500/15',
      borderColor: 'border-indigo-200/80 dark:border-indigo-900/50',
      glowShadow: 'shadow-[0_8px_30px_rgb(99,102,241,0.15)]',
      icon: <Clock className="w-4 h-4" />,
      defaultTitle: 'Class Schedule Notice'
    },
    info: {
      badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20',
      iconBg: 'bg-blue-600 text-white',
      barColor: 'bg-blue-600',
      trackColor: 'bg-blue-500/15',
      borderColor: 'border-blue-200/80 dark:border-blue-900/50',
      glowShadow: 'shadow-[0_8px_30px_rgb(59,130,246,0.12)]',
      icon: <Info className="w-4 h-4" />,
      defaultTitle: 'System Notice'
    }
  }[item.type] || {
    badgeBg: 'bg-slate-500/10 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/20',
    iconBg: 'bg-slate-700 text-white',
    barColor: 'bg-slate-600',
    trackColor: 'bg-slate-500/15',
    borderColor: 'border-slate-200/80 dark:border-slate-800',
    glowShadow: 'shadow-lg',
    icon: <Sparkles className="w-4 h-4" />,
    defaultTitle: 'Notification'
  };

  // Timer & progress bar management with pause-on-hover
  useEffect(() => {
    if (isHoveredStack) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const intervalMs = 25;
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const currentRemaining = Math.max(0, remainingTimeRef.current - elapsed);
      const pct = (currentRemaining / duration) * 100;
      setProgress(pct);

      if (currentRemaining <= 0) {
        clearInterval(timerRef.current);
        onDismiss(item.id);
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Record remaining time on pause
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    };
  }, [isHoveredStack, duration, item.id, onDismiss]);

  // Visual layout offset calculation for modern card stacking
  const isTopCard = index === total - 1;
  const offsetFromTop = (total - 1) - index;
  const stackScale = isExpanded ? 1 : Math.max(0.92, 1 - offsetFromTop * 0.04);
  const stackTranslateY = isExpanded ? 0 : offsetFromTop * -10;
  const stackOpacity = isExpanded ? 1 : Math.max(0.65, 1 - offsetFromTop * 0.15);

  return (
    <motion.div
      layout
      drag="x"
      dragConstraints={{ left: 0, right: 300 }}
      dragElastic={0.4}
      onDragEnd={(_, info) => {
        if (info.offset.x > 80 || info.velocity.x > 300) {
          onDismiss(item.id);
        }
      }}
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ 
        opacity: stackOpacity, 
        y: stackTranslateY, 
        scale: stackScale,
        transition: { type: 'spring', damping: 24, stiffness: 380 }
      }}
      exit={{ 
        opacity: 0, 
        scale: 0.92, 
        y: 16, 
        transition: { duration: 0.18, ease: 'easeOut' } 
      }}
      style={{
        zIndex: index + 10,
        pointerEvents: isTopCard || isExpanded ? 'auto' : 'none'
      }}
      className={`relative w-full overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border ${theme.borderColor} ${theme.glowShadow} transition-shadow duration-200 select-none`}
      id={`toast_${item.id}`}
    >
      {/* Depleting Animated Progress Indicator */}
      <div className={`absolute top-0 left-0 right-0 h-[2.5px] ${theme.trackColor}`}>
        <div 
          className={`h-full ${theme.barColor} transition-[width] duration-75 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-3.5 sm:p-4 flex items-start gap-3">
        {/* Category Icon Badge */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${theme.iconBg} shadow-sm mt-0.5`}>
          {theme.icon}
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[12px] font-black text-slate-900 dark:text-white tracking-tight leading-none">
              {item.title || theme.defaultTitle}
            </span>
            <span className={`px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded-md border ${theme.badgeBg}`}>
              {item.type}
            </span>
          </div>

          <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed break-words font-medium">
            {item.message}
          </p>

          {item.description && (
            <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1 font-mono leading-snug">
              {item.description}
            </p>
          )}

          {/* Action Trigger Button if present */}
          {item.action && (
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  item.action?.onClick();
                  onDismiss(item.id);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer shadow-xs active:scale-95 ${
                  item.action.primary !== false
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                }`}
              >
                <span>{item.action.label}</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </button>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(item.id);
          }}
          className="absolute top-2.5 right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

export const ToastNotification: React.FC<ToastNotificationProps> = ({ 
  toast, 
  toasts, 
  onClose,
  onClearAll 
}) => {
  // Normalize toasts list
  const activeToasts: ToastItem[] = React.useMemo(() => {
    if (toasts && toasts.length > 0) {
      return toasts;
    }
    if (toast) {
      const singleToast: ToastItem = {
        id: (toast as any).id || 'single_toast',
        message: toast.message,
        type: (toast.type as ToastType) || 'info',
        createdAt: Date.now(),
        duration: 4500
      };
      return [singleToast];
    }
    return [];
  }, [toast, toasts]);

  const [isHoveredStack, setIsHoveredStack] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(() => {
    return localStorage.getItem('gurugedara_toast_sound_muted') === 'true';
  });

  const prevToastCountRef = useRef(activeToasts.length);

  // Play audio chime on new incoming pop-up
  useEffect(() => {
    if (activeToasts.length > prevToastCountRef.current && !isSoundMuted) {
      const latest = activeToasts[activeToasts.length - 1];
      playModernPopChime(latest.type);
    }
    prevToastCountRef.current = activeToasts.length;
  }, [activeToasts, isSoundMuted]);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSoundMuted(prev => {
      const next = !prev;
      localStorage.setItem('gurugedara_toast_sound_muted', String(next));
      return next;
    });
  };

  if (activeToasts.length === 0) return null;

  return (
    <div 
      className="fixed z-[9999] inset-x-3 bottom-4 md:inset-x-auto md:bottom-6 md:right-6 md:w-[380px] flex flex-col items-end pointer-events-none font-sans select-none"
      id="modern_popup_notification_container"
      onMouseEnter={() => setIsHoveredStack(true)}
      onMouseLeave={() => {
        setIsHoveredStack(false);
        setIsExpanded(false);
      }}
    >
      {/* Multi-Notification Stack Controls Header */}
      {activeToasts.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          className="pointer-events-auto mb-2 flex items-center justify-between gap-2 px-3 py-1 rounded-full bg-slate-900/80 dark:bg-slate-800/90 text-white backdrop-blur-md shadow-lg border border-slate-700/50 text-[10px] font-bold"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span>{activeToasts.length} Active Notifications</span>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-700 pl-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="hover:text-blue-300 transition-colors cursor-pointer underline underline-offset-2"
            >
              {isExpanded ? 'Stack' : 'Expand'}
            </button>
            <button
              onClick={toggleSound}
              className="hover:text-amber-300 transition-colors p-0.5 cursor-pointer"
              title={isSoundMuted ? 'Unmute alert chimes' : 'Mute alert chimes'}
            >
              {isSoundMuted ? <VolumeX className="w-3 h-3 text-slate-400" /> : <Volume2 className="w-3 h-3 text-emerald-400" />}
            </button>
            <button
              onClick={() => {
                if (onClearAll) onClearAll();
                else onClose();
              }}
              className="hover:text-rose-300 transition-colors p-0.5 cursor-pointer flex items-center gap-0.5"
              title="Clear all notifications"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Notifications Stack Cards */}
      <div 
        className={`w-full flex flex-col ${isExpanded ? 'space-y-2.5' : '-space-y-12'}`}
        onClick={() => {
          if (activeToasts.length > 1 && !isExpanded) {
            setIsExpanded(true);
          }
        }}
      >
        <AnimatePresence mode="popLayout">
          {activeToasts.map((item, index) => (
            <ModernToastCard
              key={item.id}
              item={item}
              onDismiss={(id) => onClose(id)}
              isHoveredStack={isHoveredStack}
              index={index}
              total={activeToasts.length}
              isExpanded={isExpanded || activeToasts.length === 1}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

