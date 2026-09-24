import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../lib/firestoreService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  UserPlus, 
  CreditCard, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  Search,
  ClipboardCheck,
  AlertTriangle,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  User,
  QrCode,
  Download,
  Filter,
  X,
  ExternalLink,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { Booking, ClassItem, Payment, UserProfile, AttendanceRecord, AuditLog } from '../types';
import { MultifunctionalSearchFilter, FilterGroup, ActiveFilterTag } from './MultifunctionalSearchFilter';
import { AdminQRScannerModal } from './AdminQRScannerModal';

export interface SystemEvent {
  id: string;
  type: 'user_register' | 'payment_confirm' | 'class_update' | 'booking_made' | 'attendance_log' | 'audit_log';
  title: string;
  description: string;
  timestamp: Date;
  username: string;
  meta?: string;
  status?: string;
  userRole?: string;
  amount?: number;
}

interface SystemActivityFeedProps {
  users?: UserProfile[];
  classes?: ClassItem[];
  payments?: Payment[];
  bookings?: Booking[];
  attendanceRecords?: AttendanceRecord[];
  onRefresh?: () => void;
  onViewUserProfile?: (user: UserProfile) => void;
}

export const SystemActivityFeed: React.FC<SystemActivityFeedProps> = ({
  users: propUsers = [],
  classes: propClasses = [],
  payments: propPayments = [],
  bookings: propBookings = [],
  attendanceRecords: propAttendance = [],
  onRefresh,
  onViewUserProfile
}) => {
  const { showToast } = useApp();
  
  // Real database audit logs state
  const [internalAuditLogs, setInternalAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  
  // Unified Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  // QR Scanner user filter state
  const [isQrScannerOpen, setIsQrScannerOpen] = useState<boolean>(false);
  const [scannedUser, setScannedUser] = useState<UserProfile | null>(null);

  // Helper map: user names, emails, UIDs -> actual username
  const userMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    (propUsers || []).forEach(u => {
      if (u.username) map.set(u.username.toLowerCase(), u);
      if (u.uid) map.set(u.uid.toLowerCase(), u);
      if (u.name) map.set(u.name.toLowerCase(), u);
      if (u.displayName) map.set(u.displayName.toLowerCase(), u);
      if (u.email) map.set(u.email.toLowerCase(), u);
    });
    return map;
  }, [propUsers]);

  // Resolver to ensure strictly @username is displayed next to the log heading instead of name
  const resolveUsername = useCallback((rawActor: string | undefined): string => {
    if (!rawActor) return 'system';
    const clean = rawActor.trim().replace(/^@/, '');
    
    // Check if directly matched in userMap
    const matchedUser = userMap.get(clean.toLowerCase());
    if (matchedUser && matchedUser.username) {
      return matchedUser.username;
    }
    if (matchedUser && matchedUser.uid) {
      return matchedUser.uid;
    }

    // Strip out (Admin), (Tutor), etc.
    const match = clean.match(/^([^\(]+)/);
    const base = match ? match[1].trim() : clean;
    const baseUser = userMap.get(base.toLowerCase());
    if (baseUser && baseUser.username) {
      return baseUser.username;
    }

    // Convert full name like "Dasun Dularaka" to username style
    return base.toLowerCase().replace(/\s+/g, '_');
  }, [userMap]);

  const loadRealDatabaseEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedLogs = await firestoreService.getAuditLogs().catch(() => []);
      setInternalAuditLogs(fetchedLogs || []);
      setLastRefreshedAt(new Date());
    } catch (e) {
      console.error("Failed loading real database events for activity ledger:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRealDatabaseEvents();
    const unsubscribe = firestoreService.subscribeAuditLogs((logs) => {
      setInternalAuditLogs(logs || []);
      setLastRefreshedAt(new Date());
    });
    return () => unsubscribe();
  }, [loadRealDatabaseEvents]);

  const handleManualRefresh = async () => {
    await loadRealDatabaseEvents();
    if (onRefresh) {
      onRefresh();
    }
    showToast('Activity logs synchronized with live database', 'info');
  };

  // Compile strictly from audit logs with resolved usernames
  const allEvents = useMemo(() => {
    const list: SystemEvent[] = [];
    const seenKeys = new Set<string>();

    (internalAuditLogs || []).forEach((log) => {
      if (!log) return;
      const logDate = log.timestamp ? new Date(log.timestamp) : new Date();
      if (isNaN(logDate.getTime())) return;

      const logKey = log.id || `${log.action}_${log.details}_${logDate.getTime()}`;
      if (seenKeys.has(logKey)) return;
      seenKeys.add(logKey);

      const actionUpper = (log.action || '').toUpperCase();
      let eventType: SystemEvent['type'] = 'audit_log';

      if (actionUpper.includes('PAYMENT') || actionUpper.includes('FEE') || actionUpper.includes('TUITION')) {
        eventType = 'payment_confirm';
      } else if (actionUpper.includes('CLASS') || actionUpper.includes('SUBJECT') || actionUpper.includes('CURRICULUM')) {
        eventType = 'class_update';
      } else if (actionUpper.includes('USER') || actionUpper.includes('STUDENT') || actionUpper.includes('TUTOR') || actionUpper.includes('PROFILE') || actionUpper.includes('ADMISSION') || actionUpper.includes('ACCOUNT')) {
        eventType = 'user_register';
      } else if (actionUpper.includes('BOOKING') || actionUpper.includes('ENROLL') || actionUpper.includes('INTAKE')) {
        eventType = 'booking_made';
      } else if (actionUpper.includes('ATTENDANCE') || actionUpper.includes('QR')) {
        eventType = 'attendance_log';
      }

      // Determine user role
      const resolvedUname = resolveUsername(log.username);
      const matchedUser = propUsers.find(u => 
        (u.username && u.username.toLowerCase() === resolvedUname.toLowerCase()) ||
        (u.uid && u.uid.toLowerCase() === resolvedUname.toLowerCase())
      );
      const role = matchedUser ? matchedUser.role : 'system';

      list.push({
        id: `audit-${logKey}`,
        type: eventType,
        title: log.action ? log.action.replace(/_/g, ' ') : 'System Action',
        description: log.details || 'System event recorded in ledger.',
        timestamp: logDate,
        username: resolvedUname,
        meta: log.action ? log.action.replace(/_/g, ' ') : 'Log Entry',
        userRole: role,
        status: log.details?.toLowerCase().includes('paid') || log.details?.toLowerCase().includes('confirmed') || log.details?.toLowerCase().includes('approved')
          ? 'paid' 
          : log.details?.toLowerCase().includes('pending') 
          ? 'pending' 
          : log.details?.toLowerCase().includes('fail') || log.details?.toLowerCase().includes('decline')
          ? 'failed'
          : 'system'
      });
    });

    // Sort strictly descending by timestamp
    return list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [internalAuditLogs, resolveUsername, propUsers]);

  // Apply filters, search & Scanned User filter
  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      // 1. Scanned user constraint: get all activity logs of that user
      if (scannedUser) {
        const uUsername = (scannedUser.username || '').toLowerCase();
        const uUid = (scannedUser.uid || '').toLowerCase();
        const uName = (scannedUser.name || '').toLowerCase();
        const uEmail = (scannedUser.email || '').toLowerCase();
        
        const eventUname = event.username.toLowerCase();
        const descLower = event.description.toLowerCase();
        const titleLower = event.title.toLowerCase();

        const matchesUser = 
          (uUsername && eventUname === uUsername) ||
          (uUid && eventUname === uUid) ||
          (uUsername && descLower.includes(uUsername)) ||
          (uUid && descLower.includes(uUid)) ||
          (uName && descLower.includes(uName)) ||
          (uEmail && descLower.includes(uEmail)) ||
          (uUsername && titleLower.includes(uUsername));

        if (!matchesUser) return false;
      }

      // 2. Category filter
      if (selectedCategory === 'payments' && event.type !== 'payment_confirm') return false;
      if (selectedCategory === 'users' && event.type !== 'user_register') return false;
      if (selectedCategory === 'bookings' && event.type !== 'booking_made') return false;
      if (selectedCategory === 'classes' && event.type !== 'class_update') return false;
      if (selectedCategory === 'attendance' && event.type !== 'attendance_log') return false;
      if (selectedCategory === 'audit' && event.type !== 'audit_log') return false;

      // 3. Status filter
      if (selectedStatus !== 'all' && event.status !== selectedStatus) return false;

      // 4. Role filter
      if (selectedRole !== 'all' && event.userRole !== selectedRole) return false;

      // 5. Multifunctional Text Search
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().replace(/^@/, '');
        const matchesTitle = event.title.toLowerCase().includes(q);
        const matchesDesc = event.description.toLowerCase().includes(q);
        const matchesMeta = event.meta?.toLowerCase().includes(q);
        const matchesUser = event.username.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesMeta && !matchesUser) return false;
      }

      return true;
    });
  }, [allEvents, scannedUser, selectedCategory, selectedStatus, selectedRole, searchQuery]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    if (selectedRole !== 'all') count++;
    if (scannedUser) count++;
    return count;
  }, [selectedCategory, selectedStatus, selectedRole, scannedUser]);

  // Active tags list for quick chips removal
  const activeTags: ActiveFilterTag[] = useMemo(() => {
    const tags: ActiveFilterTag[] = [];
    if (scannedUser) {
      tags.push({
        id: 'scanned_user',
        label: 'User',
        valueLabel: `@${scannedUser.username || scannedUser.uid}`,
        onRemove: () => setScannedUser(null)
      });
    }
    if (selectedCategory !== 'all') {
      tags.push({
        id: 'category',
        label: 'Domain',
        valueLabel: selectedCategory.toUpperCase(),
        onRemove: () => setSelectedCategory('all')
      });
    }
    if (selectedStatus !== 'all') {
      tags.push({
        id: 'status',
        label: 'Status',
        valueLabel: selectedStatus.toUpperCase(),
        onRemove: () => setSelectedStatus('all')
      });
    }
    if (selectedRole !== 'all') {
      tags.push({
        id: 'role',
        label: 'Role',
        valueLabel: selectedRole.toUpperCase(),
        onRemove: () => setSelectedRole('all')
      });
    }
    return tags;
  }, [scannedUser, selectedCategory, selectedStatus, selectedRole]);

  const resetAllFilters = () => {
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedRole('all');
    setScannedUser(null);
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Modern Filter Groups with Main Categories & Subcategories
  const filterGroups: FilterGroup[] = useMemo(() => [
    {
      id: 'domain_categories',
      title: 'Log Categories',
      icon: Layers,
      value: selectedCategory,
      onChange: (val) => {
        setSelectedCategory(val);
        setCurrentPage(1);
      },
      options: [
        { label: 'All Log Domains', value: 'all', badge: allEvents.length },
        { label: 'Financial & Payments', value: 'payments', badge: allEvents.filter(e => e.type === 'payment_confirm').length, icon: CreditCard },
        { label: 'Users & Staff', value: 'users', badge: allEvents.filter(e => e.type === 'user_register').length, icon: UserPlus },
        { label: 'Course Enrollments', value: 'bookings', badge: allEvents.filter(e => e.type === 'booking_made').length, icon: Calendar },
        { label: 'Curriculums & Classes', value: 'classes', badge: allEvents.filter(e => e.type === 'class_update').length, icon: BookOpen },
        { label: 'Attendance & QR Scans', value: 'attendance', badge: allEvents.filter(e => e.type === 'attendance_log').length, icon: ClipboardCheck },
        { label: 'System & Security', value: 'audit', badge: allEvents.filter(e => e.type === 'audit_log').length, icon: ShieldCheck }
      ]
    },
    {
      id: 'log_status',
      title: 'Status & Outcome',
      icon: Activity,
      value: selectedStatus,
      onChange: (val) => {
        setSelectedStatus(val);
        setCurrentPage(1);
      },
      options: [
        { label: 'All Statuses', value: 'all' },
        { label: 'Settled / Approved', value: 'paid', icon: CheckCircle2 },
        { label: 'Pending Review', value: 'pending', icon: Clock },
        { label: 'Failed / Declined', value: 'failed', icon: AlertTriangle },
        { label: 'System Action', value: 'system', icon: Sparkles }
      ]
    },
    {
      id: 'actor_role',
      title: 'User Role',
      icon: User,
      value: selectedRole,
      onChange: (val) => {
        setSelectedRole(val);
        setCurrentPage(1);
      },
      options: [
        { label: 'All Roles', value: 'all' },
        { label: 'Students', value: 'student', icon: GraduationCap },
        { label: 'Faculty Tutors', value: 'tutor', icon: BookOpen },
        { label: 'System Admins', value: 'admin', icon: ShieldCheck },
        { label: 'Automated System', value: 'system', icon: Sparkles }
      ]
    }
  ], [allEvents, selectedCategory, selectedStatus, selectedRole]);

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage) || 1;
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEvents.slice(start, start + itemsPerPage);
  }, [filteredEvents, currentPage, itemsPerPage]);

  const getEventIcon = (type: SystemEvent['type'], status?: string) => {
    switch (type) {
      case 'user_register':
        return <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'payment_confirm':
        if (status === 'failed') return <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
        if (status === 'pending') return <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
        return <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'class_update':
        return <BookOpen className="w-4 h-4 text-violet-600 dark:text-violet-400" />;
      case 'booking_made':
        return <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'attendance_log':
        return <ClipboardCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      case 'audit_log':
        return <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-600 dark:text-slate-400" />;
    }
  };

  const getEventBadgeStyle = (type: SystemEvent['type'], status?: string) => {
    switch (type) {
      case 'user_register':
        return 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300';
      case 'payment_confirm':
        if (status === 'failed') return 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300';
        if (status === 'pending') return 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300';
        return 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300';
      case 'class_update':
        return 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-300';
      case 'booking_made':
        return 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300';
      case 'attendance_log':
        return 'bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-300';
      case 'audit_log':
        return 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300';
    }
  };

  const formatEventTime = (d: Date) => {
    try {
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  const exportLogsToCSV = () => {
    if (filteredEvents.length === 0) {
      showToast('No log records available to export', 'error');
      return;
    }

    const headers = ['Timestamp', 'Actor Username', 'Domain Action', 'Event Title', 'Details Description', 'Status', 'User Role'];
    const rows = filteredEvents.map(e => [
      `"${e.timestamp.toISOString()}"`,
      `"${e.username}"`,
      `"${e.type}"`,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      `"${e.status || 'system'}"`,
      `"${e.userRole || 'user'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `system_live_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredEvents.length} activity logs to CSV`, 'success');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-5" id="live_logs_ledger_page">
      
      {/* Page Title & Live Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-md shadow-indigo-100 dark:shadow-none">
            <Activity className="w-6 h-6 text-indigo-100" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Live System Activity Ledger
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                System Logs Live
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive forensic audit trail with real-time timestamps and verified usernames ({allEvents.length} total events)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            id="btn_export_activity_logs_csv"
            onClick={exportLogsToCSV}
            className="px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Download logs as CSV"
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            id="btn_refresh_activity_ledger"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="px-3.5 py-2 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            title="Re-query latest system logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-500' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Refresh'}</span>
          </button>
          
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono hidden lg:inline-block pl-1">
            Updated {lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Scanned User Spotlight Card: Displays full user details and narrows logs */}
      {scannedUser && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-r from-indigo-50/90 via-blue-50/40 to-white dark:from-indigo-950/40 dark:via-slate-850 dark:to-slate-900 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3.5">
            <img 
              src={scannedUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(scannedUser.name || scannedUser.username || 'User')}&background=6366f1&color=fff`} 
              alt={scannedUser.username}
              className="w-12 h-12 rounded-xl object-cover border-2 border-white dark:border-slate-800 shadow-sm shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                  @{scannedUser.username || scannedUser.uid}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  {scannedUser.role}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  scannedUser.status === 'active' 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {scannedUser.status || 'Active'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-sans">
                {scannedUser.name} &bull; {scannedUser.email} &bull; UID: <code className="text-[10px] font-mono">{scannedUser.uid}</code>
              </p>
              <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold mt-0.5 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                <span>Filtered: Showing all {filteredEvents.length} system activity logs for this user</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            {onViewUserProfile && (
              <button
                type="button"
                onClick={() => onViewUserProfile(scannedUser)}
                className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Open user profile dossier"
              >
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span>User Details</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setScannedUser(null)}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Return to global logs ledger"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filter</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Unified Multifunctional Search Bar & Wordless Filter Button in ONE LINE */}
      <MultifunctionalSearchFilter
        searchValue={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search by action, @username, or event details..."
        searchId="live_logs_search_input"
        filterGroups={filterGroups}
        activeFilterCount={activeFilterCount}
        onResetFilters={resetAllFilters}
        activeTags={activeTags}
        extraActions={(
          <button
            type="button"
            id="btn_scan_user_qr_for_logs"
            onClick={() => setIsQrScannerOpen(true)}
            className="h-10 px-3 sm:px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 whitespace-nowrap active:scale-95"
            title="Scan student or tutor QR code to inspect all their system logs"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Scan User QR</span>
          </button>
        )}
      />

      {/* Activity Logs Stream Table / Feed */}
      <div className="flow-root pt-1">
        {isLoading && allEvents.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-indigo-500" />
            <p className="text-xs font-medium">Streaming system logs ledger from Firestore...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-20 text-center text-slate-400 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl space-y-2">
            <Activity className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              No system activity logs found
            </h4>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              {searchQuery || activeFilterCount > 0 
                ? 'Try clearing active filters or adjusting your search term to see more ledger events.' 
                : 'System audit logs will appear here in real-time as users perform operations.'}
            </p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-2 px-3.5 py-1.5 text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {paginatedEvents.map((event) => (
                <motion.div 
                  key={event.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 hover:bg-slate-50 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800 transition-all flex items-start gap-3.5"
                >
                  {/* Event Domain Icon Badge */}
                  <div className="shrink-0 mt-0.5">
                    <span className={`h-9 w-9 rounded-xl border flex items-center justify-center shadow-2xs ${getEventBadgeStyle(event.type, event.status)}`}>
                      {getEventIcon(event.type, event.status)}
                    </span>
                  </div>

                  {/* Main Event Content */}
                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
                    <div className="space-y-1">
                      {/* Log Heading & Actor Username right next to it */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                          {event.title}
                        </h4>
                        
                        {/* Strictly user's username displayed next to the log heading instead of name */}
                        <span 
                          className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 shadow-2xs"
                          title={`User: @${event.username}`}
                        >
                          <User className="w-2.5 h-2.5 text-indigo-500" />
                          <span>@{event.username}</span>
                        </span>

                        {event.userRole && event.userRole !== 'system' && (
                          <span className="text-[9px] font-mono uppercase font-bold px-1.5 py-0.2 rounded-md bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {event.userRole}
                          </span>
                        )}

                        {event.meta && (
                          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
                            {event.meta}
                          </span>
                        )}
                      </div>

                      {/* Description / Audit payload */}
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                        {event.description}
                      </p>
                    </div>

                    {/* Timestamp & Relative time */}
                    <div className="flex flex-col sm:items-end text-[11px] font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0 self-start sm:self-auto">
                      <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                        <Clock className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                        <span>{event.timestamp.toLocaleDateString()} {event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      <span className="text-[10px] text-slate-400" title={event.timestamp.toISOString()}>
                        ({formatEventTime(event.timestamp)})
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-800 pt-4 text-xs">
          <p className="text-slate-500 dark:text-slate-400 font-sans">
            Showing <strong className="font-semibold text-slate-700 dark:text-slate-300">{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredEvents.length)}</strong> of <strong className="font-semibold text-slate-700 dark:text-slate-300">{filteredEvents.length}</strong> logs
          </p>
          <div className="flex items-center gap-1.5">
            <button
              id="btn_prev_activity_page"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {currentPage} / {totalPages}
            </span>
            <button
              id="btn_next_activity_page"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Admin QR Scanner Modal for User Identification & Activity Filter */}
      <AdminQRScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        allUsers={propUsers}
        onSelectUser={(user) => {
          setScannedUser(user);
          setIsQrScannerOpen(false);
          setCurrentPage(1);
          showToast(`Retrieved all system activity logs for @${user.username || user.uid}`, 'success');
        }}
        showToast={showToast}
      />
    </div>
  );
};
