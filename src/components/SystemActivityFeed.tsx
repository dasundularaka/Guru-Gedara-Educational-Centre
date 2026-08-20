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
  Database
} from 'lucide-react';
import { Booking, ClassItem, Payment, UserProfile, AttendanceRecord, AuditLog } from '../types';

export interface SystemEvent {
  id: string;
  type: 'user_register' | 'payment_confirm' | 'class_update' | 'booking_made' | 'attendance_log' | 'audit_log';
  title: string;
  description: string;
  timestamp: Date;
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
}

export const SystemActivityFeed: React.FC<SystemActivityFeedProps> = ({
  users: propUsers,
  classes: propClasses,
  payments: propPayments,
  bookings: propBookings,
  attendanceRecords: propAttendance,
  onRefresh
}) => {
  const context = useApp();
  
  // Internal state for freshly fetched records if props not provided
  const [internalUsers, setInternalUsers] = useState<UserProfile[]>([]);
  const [internalAuditLogs, setInternalAuditLogs] = useState<AuditLog[]>([]);
  const [internalAttendance, setInternalAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  
  // UI filter & search state
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Active data sources (prioritize props, fallback to context/internal state)
  const activeClasses = propClasses || context.classes || [];
  const activePayments = propPayments || context.payments || [];
  const activeBookings = propBookings || context.bookings || [];

  const loadRealDatabaseEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch users, audit logs, and attendance from Firestore directly
      const [fetchedUsers, fetchedLogs, fetchedAtt] = await Promise.all([
        firestoreService.getAllUsers().catch(() => []),
        firestoreService.getAuditLogs().catch(() => []),
        firestoreService.getAttendance().catch(() => [])
      ]);
      
      setInternalUsers(fetchedUsers || []);
      setInternalAuditLogs(fetchedLogs || []);
      setInternalAttendance(fetchedAtt || []);
      setLastRefreshedAt(new Date());
    } catch (e) {
      console.error("Failed loading real database events for activity ledger:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRealDatabaseEvents();
  }, [loadRealDatabaseEvents]);

  const handleManualRefresh = async () => {
    await loadRealDatabaseEvents();
    if (onRefresh) {
      onRefresh();
    }
  };

  // Compile genuine database records into unified timeline events
  const allEvents = useMemo(() => {
    const list: SystemEvent[] = [];
    const effectiveUsers = (propUsers && propUsers.length > 0) ? propUsers : internalUsers;
    const effectiveAttendance = (propAttendance && propAttendance.length > 0) ? propAttendance : internalAttendance;

    // 1. Real Audit Logs from Firestore
    (internalAuditLogs || []).forEach((log) => {
      if (!log) return;
      const logDate = log.timestamp ? new Date(log.timestamp) : new Date();
      if (isNaN(logDate.getTime())) return;

      list.push({
        id: `audit-${log.id || Math.random().toString(36).substring(2, 9)}`,
        type: 'audit_log',
        title: log.action || 'Administrative Action',
        description: log.details || `Admin action performed`,
        timestamp: logDate,
        meta: log.username || 'Admin Board',
        status: 'system'
      });
    });

    // 2. Real User Registrations & Accounts
    (effectiveUsers || []).forEach((user) => {
      if (!user) return;
      const userCreatedDate = user.createdAt ? new Date(user.createdAt) : null;
      // If no valid createdAt, use current date
      const dateToUse = userCreatedDate && !isNaN(userCreatedDate.getTime()) ? userCreatedDate : new Date();

      if (user.role === 'student') {
        const gradeText = user.studentDetails?.grade ? `Grade ${user.studentDetails.grade}` : 'Academic Division';
        list.push({
          id: `user-stud-${user.uid}`,
          type: 'user_register',
          title: `Student Enrolled: ${user.name || 'Student Scholar'}`,
          description: `Scholar account verified (${gradeText}, ID: ${user.username || user.uid.substring(0, 8)}). Contact: ${user.email || 'N/A'}.`,
          timestamp: dateToUse,
          meta: gradeText,
          userRole: 'student'
        });
      } else if (user.role === 'tutor') {
        const subjects = user.tutorDetails?.subjects?.join(', ') || 'Specialized Subjects';
        const qual = user.tutorDetails?.qualification || 'Certified Faculty';
        list.push({
          id: `user-tut-${user.uid}`,
          type: 'user_register',
          title: `Faculty Tutor Onboarded: ${user.name || 'Instructor'}`,
          description: `Faculty credentials active for ${subjects}. Qualification: ${qual}.`,
          timestamp: dateToUse,
          meta: 'Faculty',
          userRole: 'tutor'
        });
      } else if (user.role === 'admin') {
        list.push({
          id: `user-adm-${user.uid}`,
          type: 'user_register',
          title: `System Admin Account: ${user.name || 'Admin'}`,
          description: `Administrative privileges granted for email ${user.email}.`,
          timestamp: dateToUse,
          meta: 'Security',
          userRole: 'admin'
        });
      }
    });

    // 3. Real Payment & Fee Ledger Transactions
    (activePayments || []).forEach((payment) => {
      if (!payment) return;
      const payDate = payment.date || payment.createdAt ? new Date(payment.date || payment.createdAt!) : null;
      const dateToUse = payDate && !isNaN(payDate.getTime()) ? payDate : new Date();

      const amountFormatted = (payment.amount || 0).toLocaleString();
      const statusTitle = payment.status === 'paid' 
        ? `Tuition Settled: LKR ${amountFormatted}`
        : payment.status === 'pending'
        ? `Tuition Invoice Pending: LKR ${amountFormatted}`
        : `Payment Attempt Failed: LKR ${amountFormatted}`;

      list.push({
        id: `pay-${payment.id}`,
        type: 'payment_confirm',
        title: statusTitle,
        description: `Transaction reference #${payment.id?.substring(0, 10) || 'N/A'} for ${payment.studentName || 'Student'} in "${payment.classTitle || 'Academic Course'}". Method: ${payment.paymentMethod || 'Online Gateway'}.`,
        timestamp: dateToUse,
        meta: payment.status === 'paid' ? 'Settled' : payment.status === 'pending' ? 'Pending' : 'Failed',
        status: payment.status,
        amount: payment.amount
      });
    });

    // 4. Real Class Bookings & Seat Reservations
    (activeBookings || []).forEach((booking) => {
      if (!booking) return;
      const bookDate = booking.bookingDate || booking.createdAt ? new Date(booking.bookingDate || booking.createdAt!) : null;
      const dateToUse = bookDate && !isNaN(bookDate.getTime()) ? bookDate : new Date();

      const isCancelled = booking.status === 'cancelled';
      list.push({
        id: `book-${booking.id}`,
        type: 'booking_made',
        title: isCancelled ? `Enrollment Cancelled: ${booking.classTitle || 'Class'}` : `Class Seat Reserved: ${booking.classTitle || 'Class'}`,
        description: `${booking.studentName || 'Student'} ${isCancelled ? 'cancelled seat in' : 'enrolled into'} "${booking.classTitle}" (${booking.dayOfWeek || 'Scheduled'} ${booking.timeSlot || ''}) instructed by ${booking.tutorName || 'Faculty'}.`,
        timestamp: dateToUse,
        meta: booking.dayOfWeek || 'Enrolled',
        status: booking.status
      });
    });

    // 5. Real Classes & Curriculum Syllabi
    (activeClasses || []).forEach((cls) => {
      if (!cls) return;
      const classDate = cls.createdAt ? new Date(cls.createdAt) : null;
      const dateToUse = classDate && !isNaN(classDate.getTime()) ? classDate : new Date();

      list.push({
        id: `class-${cls.id}`,
        type: 'class_update',
        title: `Curriculum Active: ${cls.title || 'Course'}`,
        description: `Subject "${cls.subject || 'Academics'}" scheduled by ${cls.tutorName || 'Faculty'}. Tuition: LKR ${(cls.price || 0).toLocaleString()}/mo.`,
        timestamp: dateToUse,
        meta: cls.subject || 'Curriculum'
      });
    });

    // 6. Real Attendance Records
    (effectiveAttendance || []).forEach((att) => {
      if (!att) return;
      const attDateStr = att.markedAt || att.date;
      const attDate = attDateStr ? new Date(attDateStr) : null;
      const dateToUse = attDate && !isNaN(attDate.getTime()) ? attDate : new Date();

      list.push({
        id: `att-${att.id}`,
        type: 'attendance_log',
        title: `Attendance Logged: ${att.studentName || 'Student'}`,
        description: `Marked ${att.status?.toUpperCase() || 'PRESENT'} for "${att.classTitle || 'Course Session'}" on ${att.date || 'Scheduled Date'}.`,
        timestamp: dateToUse,
        meta: att.status || 'Present',
        status: att.status
      });
    });

    // Sort strictly descending by timestamp
    return list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [internalUsers, internalAuditLogs, internalAttendance, activeClasses, activePayments, activeBookings, propUsers, propAttendance]);

  // Apply category filtering & search
  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      // Category filter
      if (selectedFilter === 'payments' && event.type !== 'payment_confirm') return false;
      if (selectedFilter === 'users' && event.type !== 'user_register') return false;
      if (selectedFilter === 'bookings' && event.type !== 'booking_made') return false;
      if (selectedFilter === 'classes' && event.type !== 'class_update') return false;
      if (selectedFilter === 'attendance' && event.type !== 'attendance_log') return false;
      if (selectedFilter === 'audit' && event.type !== 'audit_log') return false;

      // Text search
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(q);
        const matchesDesc = event.description.toLowerCase().includes(q);
        const matchesMeta = event.meta?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesMeta) return false;
      }

      return true;
    });
  }, [allEvents, selectedFilter, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage));
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEvents.slice(start, start + itemsPerPage);
  }, [filteredEvents, currentPage]);

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

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm" id="system_activity_feed_component">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white shadow-sm">
            <Database className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                Live System Activity Ledger
              </h4>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Database Live
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Genuine audit ledger streamed directly from Firestore collections ({allEvents.length} total entries)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            id="btn_refresh_activity_ledger"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Re-query latest Firestore collections"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-500' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Refresh Feed'}</span>
          </button>
          
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono hidden sm:inline-block">
            Updated {lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Filter and search controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        {/* Category tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Events', count: allEvents.length },
            { id: 'payments', label: 'Payments', count: allEvents.filter(e => e.type === 'payment_confirm').length },
            { id: 'users', label: 'Registrations', count: allEvents.filter(e => e.type === 'user_register').length },
            { id: 'bookings', label: 'Enrollments', count: allEvents.filter(e => e.type === 'booking_made').length },
            { id: 'classes', label: 'Classes', count: allEvents.filter(e => e.type === 'class_update').length },
            { id: 'attendance', label: 'Attendance', count: allEvents.filter(e => e.type === 'attendance_log').length },
            { id: 'audit', label: 'Audit Logs', count: allEvents.filter(e => e.type === 'audit_log').length }
          ].map(tab => (
            <button
              key={tab.id}
              id={`filter_activity_${tab.id}`}
              onClick={() => {
                setSelectedFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                selectedFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedFilter === tab.id ? 'bg-indigo-700 text-white' : 'bg-gray-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input_search_activity_ledger"
            type="text"
            placeholder="Search records, names..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="flow-root min-h-[300px]">
        {paginatedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Database className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No database activity found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
              {searchQuery ? `No activity matching "${searchQuery}". Try clearing search.` : 'No transactions or logs recorded in this category in the database.'}
            </p>
          </div>
        ) : (
          <ul className="-mb-6">
            <AnimatePresence initial={false}>
              {paginatedEvents.map((event, eventIdx) => (
                <motion.li 
                  key={event.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="relative pb-6">
                    {eventIdx !== paginatedEvents.length - 1 ? (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-100 dark:bg-slate-800" aria-hidden="true" />
                    ) : null}
                    <div className="relative flex items-start space-x-3">
                      <div>
                        <span className={`h-8 w-8 rounded-xl border flex items-center justify-center ring-4 ring-white dark:ring-slate-900 ${getEventBadgeStyle(event.type, event.status)}`}>
                          {getEventIcon(event.type, event.status)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
                        <div className="pr-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{event.title}</p>
                            {event.meta && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700">
                                {event.meta}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{event.description}</p>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap self-start sm:self-auto">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span title={event.timestamp.toLocaleString()}>{formatEventTime(event.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* Pagination bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-800 pt-3 mt-2 text-xs">
          <p className="text-slate-500 dark:text-slate-400">
            Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredEvents.length)} of {filteredEvents.length} entries
          </p>
          <div className="flex items-center gap-1">
            <button
              id="btn_prev_activity_page"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono font-semibold text-slate-700 dark:text-slate-300">
              {currentPage} / {totalPages}
            </span>
            <button
              id="btn_next_activity_page"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
