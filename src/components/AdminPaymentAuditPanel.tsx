import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  AlertCircle, 
  CheckCircle2, 
  Play, 
  Clock, 
  RefreshCw, 
  FileText, 
  UserX, 
  Bell, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp,
  Info,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { firestoreService } from '../lib/firestoreService';
import { useApp } from '../context/AppContext';

interface AuditResult {
  reminded: number;
  suspended: number;
  exempted: number;
  auditedCount: number;
  details: string[];
  timestamp: string;
}

interface AdminPaymentAuditPanelProps {
  onAuditCompleted?: () => Promise<void> | void;
}

export const AdminPaymentAuditPanel: React.FC<AdminPaymentAuditPanelProps> = ({ onAuditCompleted }) => {
  const { currentUser, showToast, refreshUserProfile, refreshNotifications, refreshPayments } = useApp();
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<AuditResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('gurugedara_last_payment_audit');
      if (stored) {
        setLastResult(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed reading last audit record', e);
    }
  }, []);

  const handleRunAudit = async () => {
    if (!currentUser) return;
    
    setIsRunning(true);
    try {
      const res = await firestoreService.runMonthlyPaymentAuditAndReminders(currentUser.uid || 'admin');
      setLastResult(res);
      await refreshUserProfile();
      await refreshNotifications();
      await refreshPayments();
      if (onAuditCompleted) {
        await onAuditCompleted();
      }

      showToast(
        `Audit Complete! Audited ${res.auditedCount} enrollments. Sent ${res.reminded} overdue reminders, suspended ${res.suspended} unpaid class access records.`,
        'success'
      );
      setShowDetails(true);
    } catch (e) {
      console.error('Payment audit run failed', e);
      showToast('Payment audit execution failed. Please check system logs.', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 border border-indigo-800/60 shadow-xl space-y-5 relative overflow-hidden" id="admin_payment_audit_panel">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-800/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold font-mono uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Requirement 13
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold font-mono uppercase tracking-wider">
              {currentMonthName} Audit Period
            </span>
          </div>
          <h3 className="text-lg font-black text-white flex items-center gap-2 pt-1">
            <UserX className="w-5 h-5 text-amber-400" />
            Monthly Tuition Fee Audit &amp; Auto-Suspension Engine
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            Automatically scans all enrolled student courses for unpaid monthly fees. Dispatches real-time reminder notifications, and automatically marks overdue enrollments as <strong className="text-rose-300">Suspended</strong> unless approved for Late Payment or Free Card status.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            type="button"
            onClick={handleRunAudit}
            disabled={isRunning}
            id="admin_btn_run_payment_audit"
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Auditing Database...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                <span>Run Monthly Audit Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Audit Stats Metric Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Enrolled Audited</span>
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-mono font-black text-white">
            {lastResult ? lastResult.auditedCount : '--'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Course enrollments checked</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Reminders Sent</span>
            <Bell className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-mono font-black text-amber-300">
            {lastResult ? lastResult.reminded : '--'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Overdue fee notices</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Auto-Suspended</span>
            <UserX className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-mono font-black text-rose-300">
            {lastResult ? lastResult.suspended : '--'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Access rights locked</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Exempted</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-mono font-black text-emerald-300">
            {lastResult ? lastResult.exempted : '--'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Free Card / Late Grace</div>
        </div>
      </div>

      {/* Last execution timestamp & detail dropdown toggle */}
      {lastResult && (
        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs border-t border-indigo-900/60">
          <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>
              Last executed: {new Date(lastResult.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{showDetails ? 'Hide Audit Log Details' : `View Audit Logs (${lastResult.details?.length || 0})`}</span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Expandable audit log items */}
      <AnimatePresence>
        {showDetails && lastResult && lastResult.details && lastResult.details.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-950/80 rounded-2xl p-3.5 border border-slate-800 space-y-2 max-h-56 overflow-y-auto text-xs"
          >
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pb-1 border-b border-slate-800">
              <span>Execution Detail Log</span>
              <span>{lastResult.details.length} Events</span>
            </div>
            <div className="space-y-1 font-mono text-[11px]">
              {lastResult.details.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-2 py-0.5 text-slate-300">
                  <span className="text-amber-500 font-bold">›</span>
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
