import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle, XOctagon, Info, X } from 'lucide-react';

interface ToastNotificationProps {
  toast: {
    message: string;
    type: 'success' | 'error' | 'info';
  } | null;
  onClose: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  // Color mapping based on toast notification types
  const theme = {
    success: {
      bar: 'bg-emerald-500',
      track: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      borderColor: 'border-emerald-100/80',
      bgColor: 'bg-white',
      shadowColor: 'shadow-emerald-100/40',
      icon: <CheckCircle className="w-5 h-5 text-emerald-500" />
    },
    error: {
      bar: 'bg-red-500',
      track: 'bg-red-50',
      iconColor: 'text-red-500',
      borderColor: 'border-red-100/80',
      bgColor: 'bg-white',
      shadowColor: 'shadow-red-100/40',
      icon: <XOctagon className="w-5 h-5 text-red-500" />
    },
    info: {
      bar: 'bg-blue-500',
      track: 'bg-blue-50',
      iconColor: 'text-blue-500',
      borderColor: 'border-blue-100/80',
      bgColor: 'bg-white',
      shadowColor: 'shadow-blue-100/40',
      icon: <Info className="w-5 h-5 text-blue-500" />
    }
  }[toast.type] || {
    bar: 'bg-blue-500',
    track: 'bg-blue-50',
    iconColor: 'text-blue-500',
    borderColor: 'border-blue-100/80',
    bgColor: 'bg-white',
    shadowColor: 'shadow-blue-100/40',
    icon: <Info className="w-5 h-5 text-blue-500" />
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 30 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      className={`fixed bottom-6 right-6 z-55 max-w-sm rounded-2xl p-4 pr-10 border ${theme.borderColor} ${theme.bgColor} ${theme.shadowColor} shadow-2xl flex items-start gap-3 overflow-hidden font-sans`}
      id="tuition_toast_alert"
    >
      {/* 1. Entry Progress Bar: Rapidly fills from 0 to 100% when toast enters to indicate loaded status */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${theme.track}`}>
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={`h-full ${theme.bar}`}
        />
      </div>

      {/* 2. Exit Progress Bar: Depletes from 100% to 0% over 5 seconds to show dismiss countdown */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${theme.track}`}>
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: 5.0, ease: 'linear' }}
          className={`h-full ${theme.bar}`}
        />
      </div>

      {/* Toast Content Icon */}
      <div className="mt-0.5 flex-shrink-0">
        {theme.icon}
      </div>
      
      {/* Toast Text Block */}
      <div className="flex-grow">
        <p className="text-xs font-bold text-gray-900 leading-tight">Tuition Alert System</p>
        <p className="text-xs text-gray-500 mt-1 leading-snug">{toast.message}</p>
      </div>

      {/* Manual Dismiss Button */}
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors absolute top-2 right-2 hover:bg-slate-50"
        aria-label="Dismiss Alert"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </motion.div>
  );
};
