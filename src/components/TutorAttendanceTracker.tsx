import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ClassItem, Booking, AttendanceRecord, UserProfile } from '../types';
import { firestoreService } from '../lib/firestoreService';
import { triggerManualAttendanceWarning } from '../lib/attendanceNotificationTrigger';
import { sendAttendanceNotifications } from '../lib/attendanceNotification';
import { AttendanceCalendarHeatmap } from './AttendanceCalendarHeatmap';
import { ClassQRCodeAttendanceModal } from './ClassQRCodeAttendanceModal';
import { AttendanceScanHistory } from './AttendanceScanHistory';
import { 
  ClipboardList, 
  CheckCircle2, 
  XCircle, 
  UserCheck, 
  UserX, 
  Search, 
  Calendar, 
  TrendingUp, 
  Award, 
  AlertCircle, 
  Sparkles, 
  Filter, 
  CheckSquare, 
  Users, 
  BarChart2, 
  QrCode, 
  BellRing, 
  Send, 
  Activity, 
  ShieldCheck,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { AttendanceHealthProgressBar } from './AttendanceHealthProgressBar';
import { StudentProfileModal } from './StudentProfileModal';
import { calculateStudentPunctuality } from '../lib/punctualityUtils';

interface TutorAttendanceTrackerProps {
  tutorClasses: ClassItem[];
  bookings: Booking[];
  attendanceRecords: AttendanceRecord[];
  onAttendanceUpdated: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  executeWriteWithRetry?: (actionName: string, writeFn: () => Promise<void>, verifyFn?: () => Promise<boolean>) => Promise<any>;
  currentUser?: UserProfile;
}

export const TutorAttendanceTracker: React.FC<TutorAttendanceTrackerProps> = ({
  tutorClasses,
  bookings,
  attendanceRecords,
  onAttendanceUpdated,
  showToast,
  executeWriteWithRetry,
  currentUser
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [savingStatus, setSavingStatus] = useState<Record<string, boolean>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<UserProfile | null>(null);

  // Active bookings for this tutor
  const activeBookings = useMemo(() => {
    return bookings.filter(b => b.status === 'active');
  }, [bookings]);

  // Filtered bookings based on selected class and search
  const displayedBookings = useMemo(() => {
    return activeBookings.filter(b => {
      const matchClass = selectedClassId === 'all' || b.classId === selectedClassId;
      const matchSearch = !searchQuery.trim() || 
        b.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.classTitle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchClass && matchSearch;
    });
  }, [activeBookings, selectedClassId, searchQuery]);

  // Calculate engagement metrics per class for Recharts
  const classEngagementData = useMemo(() => {
    return tutorClasses.map(c => {
      const classBookings = activeBookings.filter(b => b.classId === c.id);
      const studentCount = classBookings.length;
      
      // Calculate attendance rate for this class across all dates
      const classRecords = attendanceRecords.filter(r => r.classId === c.id);
      const presentRecords = classRecords.filter(r => r.status === 'Present').length;
      const totalRecords = classRecords.length;
      
      const attendanceRate = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 90; // Default baseline engagement

      return {
        id: c.id,
        title: c.title.length > 18 ? c.title.substring(0, 16) + '...' : c.title,
        fullTitle: c.title,
        subject: c.subject,
        students: studentCount,
        attendanceRate,
        status: attendanceRate >= 85 ? 'High' : attendanceRate >= 70 ? 'Moderate' : 'Needs Attention'
      };
    });
  }, [tutorClasses, activeBookings, attendanceRecords]);

  // Overall Attendance Rate Statistics
  const stats = useMemo(() => {
    const totalStudents = activeBookings.length;
    
    // Total marks on the currently selected date
    const dateRecords = attendanceRecords.filter(r => r.date === selectedDate);
    const presentToday = dateRecords.filter(r => r.status === 'Present').length;
    const absentToday = dateRecords.filter(r => r.status === 'Absent').length;
    
    // Overall total records rate
    const totalHistoricalRecords = attendanceRecords.length;
    const totalHistoricalPresent = attendanceRecords.filter(r => r.status === 'Present').length;
    const avgRate = totalHistoricalRecords > 0 
      ? Math.round((totalHistoricalPresent / totalHistoricalRecords) * 100) 
      : 92;

    return {
      totalStudents,
      presentToday,
      absentToday,
      avgRate
    };
  }, [activeBookings, attendanceRecords, selectedDate]);

  // Session-by-session health breakdown for the chosen date
  const sessionsAttendanceHealth = useMemo(() => {
    return tutorClasses.map(c => {
      const classBookings = activeBookings.filter(b => b.classId === c.id);
      const totalEnrolled = classBookings.length;
      const sessionRecords = attendanceRecords.filter(r => r.classId === c.id && r.date === selectedDate);
      const presentCount = sessionRecords.filter(r => r.status === 'Present').length;
      const absentCount = sessionRecords.filter(r => r.status === 'Absent').length;
      const unmarkedCount = Math.max(0, totalEnrolled - presentCount - absentCount);
      const rate = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0;

      return {
        classItem: c,
        totalEnrolled,
        presentCount,
        absentCount,
        unmarkedCount,
        rate
      };
    });
  }, [tutorClasses, activeBookings, attendanceRecords, selectedDate]);

  // Current view stats for the active filter selection
  const currentViewSessionStats = useMemo(() => {
    const presentCount = displayedBookings.filter(b => {
      const r = attendanceRecords.find(rec => rec.id === `${b.classId}_${b.studentId || b.id}_${selectedDate}`);
      return r?.status === 'Present';
    }).length;

    const absentCount = displayedBookings.filter(b => {
      const r = attendanceRecords.find(rec => rec.id === `${b.classId}_${b.studentId || b.id}_${selectedDate}`);
      return r?.status === 'Absent';
    }).length;

    const totalCount = displayedBookings.length;
    const unmarkedCount = Math.max(0, totalCount - presentCount - absentCount);
    const presentPercent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

    return {
      presentCount,
      absentCount,
      unmarkedCount,
      totalCount,
      presentPercent
    };
  }, [displayedBookings, attendanceRecords, selectedDate]);

  // Mark single student attendance
  const handleMarkStatus = async (booking: Booking, status: 'Present' | 'Absent') => {
    const recordId = `${booking.classId}_${booking.studentId || booking.id}_${selectedDate}`;
    setSavingStatus(prev => ({ ...prev, [recordId]: true }));

    const record: AttendanceRecord = {
      id: recordId,
      classId: booking.classId,
      classTitle: booking.classTitle,
      studentId: booking.studentId || booking.id,
      studentName: booking.studentName,
      date: selectedDate,
      status,
      markedAt: new Date().toISOString(),
      tutorId: booking.tutorId,
      type: 'manual'
    };

    try {
      if (executeWriteWithRetry) {
        await executeWriteWithRetry(
          `Mark Attendance (${status}) for ${booking.studentName}`,
          async () => {
            await firestoreService.markAttendance(record);
          }
        );
      } else {
        await firestoreService.markAttendance(record);
      }

      const targetCls: ClassItem = tutorClasses.find(c => c.id === booking.classId) || {
        id: booking.classId,
        title: booking.classTitle,
        subject: 'General',
        tutorId: booking.tutorId,
        tutorName: currentUser.name,
        price: 0,
        dayOfWeek: 'Monday',
        timeSlot: 'Morning',
        schedule: '09:00 AM - 11:00 AM',
        description: 'Class session',
        maxSlots: 50,
        bookedSlots: 0
      };

      await sendAttendanceNotifications(record, targetCls, null, currentUser);

      showToast(`Marked ${booking.studentName} as ${status} for ${selectedDate}`, 'success');
      onAttendanceUpdated();
    } catch (e) {
      showToast('Failed to update attendance record.', 'error');
    } finally {
      setSavingStatus(prev => ({ ...prev, [recordId]: false }));
    }
  };

  // Bulk actions: Mark all visible students
  const handleBulkMark = async (status: 'Present' | 'Absent') => {
    if (displayedBookings.length === 0) {
      showToast('No students match current filter criteria.', 'info');
      return;
    }

    try {
      for (const booking of displayedBookings) {
        const recordId = `${booking.classId}_${booking.studentId || booking.id}_${selectedDate}`;
        const record: AttendanceRecord = {
          id: recordId,
          classId: booking.classId,
          classTitle: booking.classTitle,
          studentId: booking.studentId || booking.id,
          studentName: booking.studentName,
          date: selectedDate,
          status,
          markedAt: new Date().toISOString(),
          tutorId: booking.tutorId,
          type: 'manual'
        };
        await firestoreService.markAttendance(record);
      }

      showToast(`Successfully marked all ${displayedBookings.length} students as ${status}!`, 'success');
      onAttendanceUpdated();
    } catch (e) {
      showToast('Error saving bulk attendance updates.', 'error');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">Registered Scholars</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.totalStudents}</p>
            <p className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <Users className="w-3 h-3" /> Across {tutorClasses.length} registered classes
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-650 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">Present Today ({selectedDate})</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{stats.presentToday}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-1">Confirmed in attendance registry</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
          {stats.totalStudents > 0 && (
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
              <div 
                style={{ width: `${Math.min(100, Math.round((stats.presentToday / stats.totalStudents) * 100))}%` }} 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              />
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">Absent Today</p>
              <p className="text-2xl font-black text-rose-500 mt-1">{stats.absentToday}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-1">Marked absent or pending</p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl">
              <UserX className="w-6 h-6" />
            </div>
          </div>
          {stats.totalStudents > 0 && (
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
              <div 
                style={{ width: `${Math.min(100, Math.round((stats.absentToday / stats.totalStudents) * 100))}%` }} 
                className="bg-rose-500 h-full rounded-full transition-all duration-500" 
              />
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">Avg Engagement Rate</p>
              <p className="text-2xl font-black text-indigo-650 mt-1">{stats.avgRate}%</p>
              <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> High engagement standing
              </p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-650 rounded-2xl">
              <Award className="w-6 h-6" />
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div 
              style={{ width: `${stats.avgRate}%` }} 
              className={`h-full rounded-full transition-all duration-500 ${
                stats.avgRate >= 85 ? 'bg-indigo-600' : stats.avgRate >= 70 ? 'bg-sky-500' : 'bg-rose-500'
              }`} 
            />
          </div>
        </div>
      </div>

      {/* Session Attendance Health & Progress Matrix Section */}
      {tutorClasses.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4" id="session_attendance_health_matrix">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Session Attendance Health & Progress Overview ({selectedDate})
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Real-time percentage of students marked present for each session on this date.
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              {sessionsAttendanceHealth.filter(s => s.rate >= 80).length} of {sessionsAttendanceHealth.length} Sessions Healthy
            </span>
          </div>

          {/* Grid of Session Attendance Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessionsAttendanceHealth.map((session) => (
              <div 
                key={session.classItem.id} 
                onClick={() => setSelectedClassId(session.classItem.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                  selectedClassId === session.classItem.id 
                    ? 'border-indigo-500 bg-indigo-50/20 ring-2 ring-indigo-200' 
                    : 'border-slate-100 bg-slate-50/40 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[9px] font-bold font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">
                    {session.classItem.subject}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {session.classItem.dayOfWeek} • {session.classItem.timeSlot || 'Day Session'}
                  </span>
                </div>

                <h4 className="font-extrabold text-slate-900 text-xs truncate mb-3" title={session.classItem.title}>
                  {session.classItem.title}
                </h4>

                {/* Progress bar visualizer */}
                <AttendanceHealthProgressBar
                  presentCount={session.presentCount}
                  absentCount={session.absentCount}
                  unmarkedCount={session.unmarkedCount}
                  totalCount={session.totalEnrolled}
                  size="sm"
                  compact
                  label="Present Rate"
                />

                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-3 pt-2.5 border-t border-slate-100">
                  <span>Enrolled: <b>{session.totalEnrolled}</b></span>
                  <span>Present: <b className="text-emerald-600">{session.presentCount}</b></span>
                  <span>Absent: <b className="text-rose-500">{session.absentCount}</b></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Class Engagement Recharts Bar Chart */}
      {tutorClasses.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-650" /> Long-Term Engagement & Attendance by Registered Class
              </h3>
              <p className="text-[11px] text-slate-400">Comparing average attendance rates across all your registered teaching courses.</p>
            </div>
            <span className="text-[10px] font-mono font-bold text-indigo-650 bg-indigo-50 px-2.5 py-1 rounded-lg">
              Historical Visualizer
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classEngagementData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="title" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#f8fafc',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                  formatter={(val: any) => [`${val}% Attendance`, 'Rate']}
                />
                <Bar dataKey="attendanceRate" radius={[8, 8, 0, 0]}>
                  {classEngagementData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.attendanceRate >= 85 ? '#4f46e5' : entry.attendanceRate >= 70 ? '#0284c7' : '#e11d48'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Main Attendance Registry Table Section */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
        
        {/* Filters Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-650" /> Monitor Student Engagement & Attendance
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Select a class course and date to record and review student attendance checklists.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Class Dropdown */}
            <div className="flex-1 sm:flex-none">
              <label className="block text-[9px] font-bold text-slate-400 font-mono uppercase mb-1">Registered Class</label>
              <select
                id="tutor_attendance_class_select"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
              >
                <option value="all">All Registered Classes ({activeBookings.length} Scholars)</option>
                {tutorClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            {/* Date Input */}
            <div className="flex-1 sm:flex-none">
              <label className="block text-[9px] font-bold text-slate-400 font-mono uppercase mb-1">Session Date</label>
              <input
                id="tutor_attendance_date_input"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium cursor-pointer"
              />
            </div>

            {/* Student Search Input */}
            <div className="flex-1 sm:flex-none">
              <label className="block text-[9px] font-bold text-slate-400 font-mono uppercase mb-1">Search Scholar</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="tutor_attendance_search_input"
                  type="text"
                  placeholder="Search name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Visual Progress Indicator for Current Session Attendance Health */}
        <AttendanceHealthProgressBar
          presentCount={currentViewSessionStats.presentCount}
          absentCount={currentViewSessionStats.absentCount}
          unmarkedCount={currentViewSessionStats.unmarkedCount}
          totalCount={currentViewSessionStats.totalCount}
          label={selectedClassId === 'all' ? `All Classes Attendance Health (${selectedDate})` : `${tutorClasses.find(c => c.id === selectedClassId)?.title || 'Class'} Session Attendance Health`}
          sessionDate={selectedDate}
        />

        {/* Bulk Action Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Quick Classroom Tools:</span>
            <span className="text-slate-400 text-[11px]">({displayedBookings.length} scholars in view)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn_generate_tutor_qr_pass"
              onClick={() => setIsQrModalOpen(true)}
              className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" /> Generate Session QR Code
            </button>
            <button
              id="btn_mark_all_present"
              onClick={() => handleBulkMark('Present')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark All Present
            </button>
            <button
              id="btn_mark_all_absent"
              onClick={() => handleBulkMark('Absent')}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" /> Mark All Absent
            </button>
          </div>
        </div>

        {/* Student Roster Attendance Checklist Table */}
        {displayedBookings.length === 0 ? (
          <div className="p-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-600">No Student Seats Registered</h4>
            <p className="text-[11px] text-slate-400 mt-1">No active student bookings matched your filter criteria.</p>
          </div>
        ) : (
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                    <th className="py-3.5 px-4">Student Name</th>
                    <th className="py-3.5 px-4">Class Course</th>
                    <th className="py-3.5 px-4">Engagement Rating</th>
                    <th className="py-3.5 px-4">Session Status ({selectedDate})</th>
                    <th className="py-3.5 px-4 text-right">Attendance Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {displayedBookings.map((b) => {
                    const recordId = `${b.classId}_${b.studentId || b.id}_${selectedDate}`;
                    const currentRecord = attendanceRecords.find(r => r.id === recordId);
                    const isSaving = savingStatus[recordId];

                    // Calculate student punctuality
                    const punctuality = calculateStudentPunctuality(
                      b.studentId,
                      attendanceRecords,
                      tutorClasses
                    );

                    const handleOpenStudentProfile = () => {
                      const studentObj: UserProfile = {
                        uid: b.studentId,
                        name: b.studentName,
                        email: '',
                        role: 'student',
                        status: 'active',
                        createdAt: new Date().toISOString()
                      };
                      setSelectedStudentForProfile(studentObj);
                    };

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                        
                        {/* Student Name & Avatar */}
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div 
                              onClick={handleOpenStudentProfile}
                              className="w-8 h-8 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center justify-center font-extrabold text-xs shrink-0 cursor-pointer transition-colors"
                              title="Click to view student profile"
                            >
                              {b.studentName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span 
                                  onClick={handleOpenStudentProfile}
                                  className="hover:text-indigo-650 cursor-pointer transition-colors"
                                >
                                  {b.studentName}
                                </span>

                                {/* LATE ARRIVAL BADGE */}
                                {punctuality.isConsistentlyLate && (
                                  <span 
                                    onClick={handleOpenStudentProfile}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-slate-950 shadow-2xs border border-amber-300 cursor-pointer hover:bg-amber-400"
                                    title={punctuality.badgeDescription}
                                  >
                                    <AlertTriangle className="w-2.5 h-2.5 fill-slate-950 text-amber-500" />
                                    Late Arrival ({punctuality.lateRate}%)
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono font-normal">Slot: {b.dayOfWeek} @ {b.timeSlot}</p>
                            </div>
                          </div>
                        </td>

                        {/* Class Course */}
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold font-mono text-slate-600 mb-0.5">
                            {b.classTitle}
                          </span>
                        </td>

                        {/* Engagement Rating */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                            currentRecord?.status === 'Present'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : currentRecord?.status === 'Absent'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            <Sparkles className="w-3 h-3" />
                            {currentRecord?.status === 'Present' ? 'High Engagement' : currentRecord?.status === 'Absent' ? 'Session Missed' : 'Pending Check'}
                          </span>
                        </td>

                        {/* Session Status Pill */}
                        <td className="py-3.5 px-4 font-bold">
                          {currentRecord?.status === 'Present' ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-emerald-600 flex items-center gap-1 text-xs">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Present
                              </span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {currentRecord.type === 'qrcode' ? 'QR Code' : 'Manual'}
                              </span>
                            </div>
                          ) : currentRecord?.status === 'Absent' ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-rose-600 flex items-center gap-1 text-xs">
                                <XCircle className="w-4 h-4 text-rose-500" /> Absent
                              </span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {currentRecord.type === 'qrcode' ? 'QR Code' : 'Manual'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal italic text-xs">Not marked</span>
                          )}
                        </td>

                        {/* Attendance Action Buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              id={`trigger_alert_${b.id}`}
                              onClick={async () => {
                                try {
                                  // Compute student rate
                                  const studentRecords = attendanceRecords.filter(r => r.studentId === (b.studentId || b.id));
                                  const total = studentRecords.length;
                                  const present = studentRecords.filter(r => r.status === 'Present').length;
                                  const rate = total > 0 ? Math.round((present / total) * 100) : 75;

                                  await triggerManualAttendanceWarning(
                                    b.studentId || b.id,
                                    b.studentName,
                                    b.classTitle,
                                    rate
                                  );
                                  showToast(`Sent attendance alert notification to ${b.studentName}.`, 'success');
                                } catch (err) {
                                  showToast('Failed to dispatch student warning notification.', 'error');
                                }
                              }}
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-500 hover:text-amber-700 transition-colors cursor-pointer"
                              title="Send automated low-attendance warning alert to this student's dashboard"
                            >
                              <BellRing className="w-3.5 h-3.5" />
                            </button>

                            <button
                              id={`mark_present_${b.id}`}
                              disabled={isSaving}
                              onClick={() => handleMarkStatus(b, 'Present')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                                currentRecord?.status === 'Present'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              id={`mark_absent_${b.id}`}
                              disabled={isSaving}
                              onClick={() => handleMarkStatus(b, 'Absent')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                                currentRecord?.status === 'Absent'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700'
                              }`}
                            >
                              Absent
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Class-wide Attendance Calendar Heatmap */}
      <AttendanceCalendarHeatmap
        attendanceRecords={attendanceRecords}
        classes={tutorClasses}
        bookings={bookings}
        title="Semester Class Attendance & Activity Heatmap"
        subtitle="Daily aggregate attendance rates across your active teaching courses"
      />

      {/* Chronological Scan History Log for Tutors */}
      <AttendanceScanHistory
        attendanceRecords={attendanceRecords}
        classes={tutorClasses}
        title="Classroom QR Check-In Audit History"
      />

      {/* Tutor QR Code Generator Modal */}
      <ClassQRCodeAttendanceModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        currentUser={currentUser || { uid: 'tutor', role: 'tutor', name: 'Instructor', email: 'tutor@school.edu', createdAt: '' }}
        tutorClasses={tutorClasses}
        bookings={bookings}
        attendanceRecords={attendanceRecords}
        onAttendanceMarked={onAttendanceUpdated}
        showToast={showToast}
      />

      {/* Student Profile & Late Arrival Inspection Modal */}
      {selectedStudentForProfile && (
        <StudentProfileModal
          isOpen={!!selectedStudentForProfile}
          onClose={() => setSelectedStudentForProfile(null)}
          student={selectedStudentForProfile}
          currentUser={currentUser || { uid: 'tutor', role: 'tutor', name: 'Instructor', email: 'tutor@school.edu', createdAt: '' }}
          classes={tutorClasses}
          attendanceRecords={attendanceRecords}
          bookings={bookings}
          showToast={showToast}
        />
      )}

    </div>
  );
};
