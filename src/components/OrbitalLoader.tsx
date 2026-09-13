import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, LucideIcon } from 'lucide-react';

export interface OrbitalLoaderProps {
  /** Size of the orbital loader */
  size?: 'sm' | 'md' | 'lg';
  /** Primary label or message to display */
  label?: string;
  /** Secondary subtitle or helper text */
  sublabel?: string;
  /** Array of status messages to smoothly cycle through */
  statuses?: string[];
  /** Optional custom center icon */
  icon?: LucideIcon;
  /** Presentation variant */
  variant?: 'inline' | 'card' | 'fullscreen';
  /** Additional container CSS class */
  className?: string;
}

export const OrbitalLoader: React.FC<OrbitalLoaderProps> = ({
  size = 'md',
  label,
  sublabel,
  statuses,
  icon: Icon = GraduationCap,
  variant = 'card',
  className = '',
}) => {
  const [statusIdx, setStatusIdx] = useState(0);

  const activeStatuses = statuses && statuses.length > 0 ? statuses : null;

  useEffect(() => {
    if (!activeStatuses || activeStatuses.length <= 1) return;
    const interval = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % activeStatuses.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [activeStatuses]);

  // Dimension mapping
  const dimensions = {
    sm: {
      box: 'w-14 h-14',
      outerRing: 'inset-0',
      middleRing: 'w-10 h-10',
      innerRing: 'w-7 h-7',
      core: 'w-5 h-5',
      icon: 'w-3 h-3',
      particle: 'w-1.5 h-1.5',
    },
    md: {
      box: 'w-20 h-20',
      outerRing: 'inset-0',
      middleRing: 'w-14 h-14',
      innerRing: 'w-9 h-9',
      core: 'w-7 h-7',
      icon: 'w-4 h-4',
      particle: 'w-2 h-2',
    },
    lg: {
      box: 'w-24 h-24',
      outerRing: 'inset-0',
      middleRing: 'w-18 h-18',
      innerRing: 'w-12 h-12',
      core: 'w-8 h-8',
      icon: 'w-4.5 h-4.5',
      particle: 'w-2.5 h-2.5',
    },
  }[size];

  const content = (
    <div className={`relative flex flex-col items-center ${size === 'sm' ? 'space-y-3' : 'space-y-5'} text-center`}>
      {/* Multi-layered orbital loader */}
      <div className={`relative ${dimensions.box} flex items-center justify-center`}>
        {/* Outer Ring 1: Slow rotating dashed ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}
          className={`absolute ${dimensions.outerRing} border border-dashed border-indigo-200 dark:border-indigo-800/80 rounded-full`}
        />

        {/* Glowing particle orbiting on outer ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}
          className="absolute inset-0 z-10"
        >
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 ${dimensions.particle} bg-indigo-600 dark:bg-indigo-400 rounded-full shadow-lg shadow-indigo-500/50`}
          />
        </motion.div>

        {/* Middle Ring 2: Medium speed counter-rotating gradient circle */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
          className={`absolute ${dimensions.middleRing} border-2 border-transparent border-t-indigo-600 dark:border-t-indigo-400 border-r-indigo-400 dark:border-r-indigo-300 rounded-full`}
        />

        {/* Inner Ring 3: Fast rotating neon cyan highlight */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
          className={`absolute ${dimensions.innerRing} border-2 border-transparent border-b-cyan-500 dark:border-b-cyan-400 rounded-full`}
        />

        {/* Center Pulse Core with Glowing Icon */}
        <motion.div
          animate={{ scale: [0.93, 1.07, 0.93] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className={`absolute ${dimensions.core} bg-indigo-50 dark:bg-slate-800 border border-indigo-100 dark:border-indigo-700/60 rounded-full flex items-center justify-center z-20 shadow-inner`}
        >
          <Icon className={`${dimensions.icon} text-indigo-600 dark:text-indigo-400`} />
        </motion.div>

        {/* Central ambient glow flare */}
        <div className="absolute w-8 h-8 bg-indigo-500/15 dark:bg-indigo-400/20 rounded-full blur-md pointer-events-none" />
      </div>

      {/* Typography & Messages */}
      <div className="space-y-1.5 max-w-xs">
        {size !== 'sm' && (
          <h3 className="text-[11px] font-extrabold tracking-[0.22em] text-slate-800 dark:text-slate-200 uppercase font-sans">
            GURU GEDARA
          </h3>
        )}

        {/* Cycling statuses or static label */}
        {activeStatuses ? (
          <div className="h-5 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={statusIdx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold tracking-wide uppercase"
              >
                {activeStatuses[statusIdx]}
              </motion.p>
            </AnimatePresence>
          </div>
        ) : label ? (
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug">
            {label}
          </p>
        ) : null}

        {sublabel && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            {sublabel}
          </p>
        )}
      </div>

      {/* Subtle animated infinite track bar */}
      <div className="w-40 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative mt-1">
        <motion.div
          className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
          animate={{
            left: ['-100%', '100%'],
            width: ['20%', '40%', '20%'],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.8,
            ease: 'easeInOut',
          }}
        />
      </div>
    </div>
  );

  if (variant === 'fullscreen') {
    return (
      <div
        className={`flex flex-col items-center justify-center min-h-screen bg-slate-50/70 dark:bg-slate-950 relative overflow-hidden ${className}`}
      >
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400/10 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-48 -right-40 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-sm w-[90%] px-8 py-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-black/50">
          {content}
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return <div className={`py-4 ${className}`}>{content}</div>;
  }

  // Default 'card' variant: suited for tabs and dashboard sections
  return (
    <div
      className={`py-16 px-6 flex items-center justify-center bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-slate-150 dark:border-slate-800/80 shadow-xs backdrop-blur-xs my-6 ${className}`}
    >
      {content}
    </div>
  );
};
