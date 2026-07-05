import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Wifi, 
  WifiOff, 
  Trash2, 
  Check, 
  AlertTriangle 
} from 'lucide-react';

interface SyncStatusIndicatorProps {
  operationPatterns: string[];
  className?: string;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ operationPatterns, className = "" }) => {
  const { syncState } = useApp();
  
  const matches = operationPatterns.some(pat => 
    syncState.lastOperation?.toLowerCase().includes(pat.toLowerCase())
  );
  
  if (!matches) return null;
  
  switch (syncState.status) {
    case 'syncing':
      return (
        <span className={`inline-flex items-center gap-1 text-[11px] text-blue-600 font-semibold font-mono bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full animate-pulse border border-blue-100 dark:border-blue-900/30 ${className}`}>
          <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
          <span>Syncing inputs...</span>
        </span>
      );
    case 'synced':
      return (
        <span className={`inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold font-mono bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30 ${className}`}>
          <CheckCircle2 className="w-3 h-3 text-emerald-500 animate-bounce" />
          <span>Synced & Verified</span>
        </span>
      );
    case 'failed':
      return (
        <span className={`inline-flex items-center gap-1 text-[11px] text-rose-600 font-semibold font-mono bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-900/30 ${className}`}>
          <XCircle className="w-3 h-3 text-rose-500" />
          <span>Sync Timeout (Local Backup Saved)</span>
        </span>
      );
    default:
      return null;
  }
};

export const SyncTelemetryConsole: React.FC = () => {
  const { syncState, syncLogs, clearSyncLogs, cloudSync } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'verification'>('logs');

  const pendingCount = syncLogs.filter(l => l.status === 'pending').length;

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans">
      {/* Floating Toggle Badge */}
      <button
        id="sync-telemetry-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full shadow-lg font-mono text-[11px] font-bold tracking-tight transition-all duration-300 ${
          isOpen 
            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
            : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-800'
        }`}
      >
        <span className="relative flex h-2 w-2">
          {syncState.status === 'syncing' ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </>
          ) : syncState.status === 'failed' ? (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          ) : (
            <span className={`relative inline-flex rounded-full h-2 w-2 ${cloudSync ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          )}
        </span>
        <Database className={`w-3.5 h-3.5 ${syncState.status === 'syncing' ? 'animate-spin text-blue-500' : ''}`} />
        <span>Sync Console</span>
        {pendingCount > 0 && (
          <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-full leading-none">
            {pendingCount}
          </span>
        )}
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

      {/* Expanded Console Box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="sync-telemetry-panel"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="absolute bottom-14 right-0 w-[420px] max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col"
            style={{ maxHeight: '520px' }}
          >
            {/* Header */}
            <div className="bg-slate-900 dark:bg-slate-950 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-400" />
                <div>
                  <h4 className="text-xs font-bold tracking-tight uppercase font-mono">Sync Telemetry Hub</h4>
                  <p className="text-[9px] text-slate-400 font-mono">Real-time Cloud Propagation Audit</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 bg-slate-800 dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700/50">
                {cloudSync ? (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase">Cloud Active</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-amber-400" />
                    <span className="text-[9px] font-mono font-bold text-amber-400 uppercase">Offline Local</span>
                  </>
                )}
              </div>
            </div>

            {/* Current Sync Status Banner */}
            <div className={`px-4 py-3 border-b text-xs flex items-center gap-2 font-mono ${
              syncState.status === 'syncing' 
                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-300'
                : syncState.status === 'failed'
                ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-300'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {syncState.status === 'syncing' && <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />}
              {syncState.status === 'synced' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />}
              {syncState.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-rose-500" />}
              {syncState.status === 'idle' && <Database className="w-3.5 h-3.5 text-slate-400" />}
              
              <div className="flex-1 min-w-0">
                <span className="font-bold text-[10px] uppercase block">
                  {syncState.status === 'idle' ? 'Ready for operations' : `State: ${syncState.status}`}
                </span>
                <span className="truncate block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{syncState.message}</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 text-[10px] font-mono font-bold uppercase">
              <button
                id="telemetry-tab-logs"
                onClick={() => setActiveTab('logs')}
                className={`flex-1 py-2.5 text-center transition-all ${
                  activeTab === 'logs' 
                    ? 'border-b-2 border-slate-900 dark:border-white text-slate-900 dark:text-white bg-slate-50/30 dark:bg-slate-800/10' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Sync Logs ({syncLogs.length})
              </button>
              <button
                id="telemetry-tab-verification"
                onClick={() => setActiveTab('verification')}
                className={`flex-1 py-2.5 text-center transition-all ${
                  activeTab === 'verification' 
                    ? 'border-b-2 border-slate-900 dark:border-white text-slate-900 dark:text-white bg-slate-50/30 dark:bg-slate-800/10' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Verification Steps
              </button>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-900/40" style={{ height: '300px' }}>
              {activeTab === 'logs' ? (
                syncLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                    <Database className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                    <p className="text-xs font-mono text-slate-400">No database writes logged yet.</p>
                    <p className="text-[10px] text-slate-400 leading-relaxed">Modify records, publish courses, or submit reviews to witness real-time Cloud sync auditing and verification.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {syncLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 shadow-sm flex gap-3 items-start font-mono text-[10px]"
                      >
                        <div className="mt-0.5">
                          {log.status === 'pending' && <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
                          {log.status === 'success' && <Check className="w-3.5 h-3.5 text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 p-0.5 rounded-full" />}
                          {log.status === 'verify_success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />}
                          {log.status === 'verify_failed' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                          {log.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-rose-500" />}
                        </div>
                        
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex justify-between items-center text-[9px] text-slate-400">
                            <span className="font-bold truncate max-w-[200px] text-slate-700 dark:text-slate-300">{log.operation}</span>
                            <span>{log.timestamp}</span>
                          </div>
                          
                          <p className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">{log.message}</p>
                          
                          {log.attempts > 1 && (
                            <div className="flex gap-1">
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                log.status === 'failed' 
                                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30' 
                                  : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30'
                              }`}>
                                Attempt {log.attempts}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* Verification Steps Explainer Tab */
                <div className="space-y-4 text-xs font-mono">
                  <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-850 space-y-2">
                    <h5 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 text-[10px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Live CRUD Propagation Checks
                    </h5>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Every database write executes an automated pipeline to verify propagation directly inside Google Cloud Run and Firestore:
                    </p>
                    <ol className="list-decimal pl-4 space-y-2 text-[10px] text-slate-600 dark:text-slate-400 mt-2">
                      <li><b>Command Execution:</b> Pre-validation of client inputs & authentication state mapping.</li>
                      <li><b>Retry Buffer:</b> Attempt write to Live Firestore cloud. Failed sockets automatically re-route through exponential backoff limits up to 3 times.</li>
                      <li><b>Live Check:</b> Fetch back raw data from Google servers instantly via specific collection document path identifiers.</li>
                      <li><b>Verification:</b> Compare cloud payloads with offline cached storage. If validated, log is finalized as <span className="text-emerald-500 font-bold">VERIFIED_SUCCESS</span>.</li>
                    </ol>
                  </div>

                  <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-850 text-center space-y-2">
                    <p className="text-[10px] text-slate-500">Need to check full verification logs or clear existing cache?</p>
                    <button
                      id="clear-sync-telemetry-btn"
                      onClick={clearSyncLogs}
                      className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/65 text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-lg border border-rose-100 dark:border-rose-900/20 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Clear Audit Logs
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer status bar */}
            <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 p-2.5 text-[9px] text-slate-400 font-mono text-center">
              System active • Powered by Google Firestore Persistence
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
