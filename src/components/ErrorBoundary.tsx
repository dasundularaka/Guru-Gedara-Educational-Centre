import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Database, WifiOff, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isDbError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isDbError: false
  };

  private handlePromiseRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason;
    console.error("ErrorBoundary caught unhandled promise rejection:", error);
    
    // Check if it looks like a Firebase or database failure
    const isDb = error && (
      error.code?.includes('permission-denied') || 
      error.message?.toLowerCase().includes('permission') ||
      error.message?.toLowerCase().includes('firestore') ||
      error.message?.toLowerCase().includes('database') ||
      error.message?.toLowerCase().includes('network') ||
      error.code?.includes('unavailable')
    );

    this.setState({
      hasError: true,
      error: error instanceof Error ? error : new Error(String(error)),
      isDbError: !!isDb
    });
  };

  public componentDidMount() {
    window.addEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  public componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    const isDb = error && (
      error.message?.toLowerCase().includes('permission') ||
      error.message?.toLowerCase().includes('firestore') ||
      error.message?.toLowerCase().includes('database') ||
      error.message?.toLowerCase().includes('network') ||
      error.message?.toLowerCase().includes('quota')
    );
    return { 
      hasError: true, 
      error, 
      errorInfo: null,
      isDbError: !!isDb
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an exception:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isDbError: false
    });
    // Try refreshing data or window
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || "An unexpected error occurred.";
      const isOffline = !navigator.onLine;

      return (
        <div id="error_boundary_container" className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white rounded-2xl border border-red-100 shadow-xl overflow-hidden">
            {/* Header pattern */}
            <div className="bg-red-50 px-6 py-5 border-b border-red-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-150 flex items-center justify-center text-red-650 shrink-0">
                {this.state.isDbError ? (
                  <Database className="w-5 h-5 text-red-650" />
                ) : isOffline ? (
                  <WifiOff className="w-5 h-5 text-red-650" />
                ) : (
                  <AlertOctagon className="w-5 h-5 text-red-650" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-black text-red-950 uppercase tracking-wide font-mono">
                  {this.state.isDbError ? "Database Sync Issue" : "Application Error"}
                </h2>
                <p className="text-[11px] text-red-600 font-medium">
                  {this.state.isDbError 
                    ? "Database read/write operation failure" 
                    : "The system experienced a runtime interruption"}
                </p>
              </div>
            </div>

            {/* Error Content */}
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  We encountered an error while attempting to process this request. This may happen due to missing database permissions, restricted firestore rules, offline connectivity, or a temporary service interruption.
                </p>
                
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-left">
                  <span className="block text-[9px] font-bold text-slate-450 uppercase font-mono tracking-wider mb-1">
                    System Exception Details:
                  </span>
                  <p className="text-xs font-mono text-red-600 bg-red-50/50 p-2 rounded-lg border border-red-100 break-words font-medium">
                    {errorMessage}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  id="btn_error_reset"
                  onClick={this.handleReset}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all rounded-xl shadow-sm hover:shadow cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reconnect & Retry
                </button>
                <button
                  id="btn_error_home"
                  onClick={() => { window.location.href = '/'; }}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all rounded-xl cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" /> Go to Home
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-3.5 flex justify-between items-center text-[10px] text-slate-400 font-mono">
              <span>Guru Gedara Portal</span>
              <span>Ref: {this.state.isDbError ? 'DB_SYNC_FAIL' : 'SYS_RUNTIME_ERR'}</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
