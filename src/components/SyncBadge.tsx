import React from 'react';
import { SyncFieldStatus } from '../hooks/useSyncStatus';
import { RefreshCw, Check, AlertCircle, Cloud, ShieldCheck, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SyncBadgeProps {
  /** The real-time persistence status */
  status: SyncFieldStatus;
  /** Custom feedback message to display or show in tooltip */
  message?: string;
  /** Whether to display text labels along with the icon */
  showText?: boolean;
  /** Position of the badge relative to wrapped input children */
  position?: 'inside' | 'top-right' | 'standalone';
  /** Optional input elements or form fields to wrap */
  children?: React.ReactNode;
  /** Custom class name for styling overrides */
  className?: string;
}

export const SyncBadge: React.FC<SyncBadgeProps> = ({
  status,
  message,
  showText = true,
  position = 'top-right',
  children,
  className = ''
}) => {
  const getBadgeDetails = () => {
    switch (status) {
      case 'syncing':
        return {
          bgColor: 'bg-indigo-50 border-indigo-100/80 text-indigo-700',
          dotColor: 'bg-indigo-500',
          pingColor: 'bg-indigo-400',
          icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
          label: 'Syncing...',
          defaultMsg: 'Securing changes to database...'
        };
      case 'saved':
        return {
          bgColor: 'bg-emerald-50 border-emerald-100/80 text-emerald-700',
          dotColor: 'bg-emerald-500',
          pingColor: 'bg-emerald-400',
          icon: <ShieldCheck className="w-3.5 h-3.5" />,
          label: 'Saved & Verified',
          defaultMsg: 'All changes successfully synchronized and verified on Cloud Firestore.'
        };
      case 'retrying':
        return {
          bgColor: 'bg-amber-50 border-amber-200 text-amber-700',
          dotColor: 'bg-amber-500',
          pingColor: 'bg-amber-400',
          icon: <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />,
          label: 'Retrying...',
          defaultMsg: 'Network delay detected. Automatically retrying live database sync...'
        };
      case 'error':
        return {
          bgColor: 'bg-rose-50 border-rose-100/80 text-rose-700',
          dotColor: 'bg-rose-500',
          pingColor: 'bg-rose-400',
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          label: 'Offline Cache',
          defaultMsg: 'Sync delayed. Changes saved to offline fallback cache.'
        };
      case 'idle':
      default:
        return {
          bgColor: 'bg-slate-50 border-slate-100 text-slate-500',
          dotColor: 'bg-slate-400',
          pingColor: 'bg-slate-300',
          icon: <Cloud className="w-3.5 h-3.5" />,
          label: 'Secured',
          defaultMsg: 'Data is protected and synced with live servers.'
        };
    }
  };

  const details = getBadgeDetails();
  const titleText = message || details.defaultMsg;

  // Inner badge element
  const badgeContent = (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono leading-none shadow-sm select-none transition-all duration-300 ${details.bgColor} ${className}`}
      title={titleText}
    >
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${details.pingColor} opacity-75`}></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 ${details.dotColor}`}></span>
      </span>
      {details.icon}
      {showText && <span className="font-semibold tracking-tight">{details.label}</span>}
    </motion.div>
  );

  // If no children, render standalone badge
  if (!children) {
    return <AnimatePresence mode="wait">{badgeContent}</AnimatePresence>;
  }

  // Wrapping input elements
  return (
    <div className="relative w-full flex flex-col">
      {position === 'top-right' && (
        <div className="flex justify-between items-center mb-1.5 h-5">
          <div className="flex-1" />
          <AnimatePresence mode="wait">
            {badgeContent}
          </AnimatePresence>
        </div>
      )}

      <div className="relative w-full">
        {children}
        
        {position === 'inside' && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center">
            <AnimatePresence mode="wait">
              {badgeContent}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
