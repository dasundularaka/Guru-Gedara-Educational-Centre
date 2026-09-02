import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Award, 
  FileText, 
  ChevronRight,
  Sparkles,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { UserProfile, ClassItem, Booking, AttendanceRecord } from '../types';

interface StudentAcademicHistoryProps {
  currentUser: UserProfile;
  classes: ClassItem[];
  bookings: Booking[];
  attendanceRecords?: AttendanceRecord[];
  onOpenClassProfile?: (classItem: ClassItem) => void;
}

export const StudentAcademicHistory: React.FC<StudentAcademicHistoryProps> = ({
  currentUser,
  classes = [],
  bookings = [],
  attendanceRecords = [],
  onOpenClassProfile
}) => {
  // Aggregate all classes history: explicit history records + bookings + selectedClasses
  const historyList = useMemo(() => {
    const recordsMap = new Map<string, {
      classId: string;
      classTitle: string;
      subject?: string;
      tutorName?: string;
      schedule?: string;
      enrolledAt: string;
      completionDate?: string;
      status: 'Active' | 'Completed' | 'Dropped' | 'Suspended';
      grade?: string;
      note?: string;
      attendancePct?: number;
      classItem?: ClassItem;
    }>();

    // 1. Check explicit enrolledClassesHistory
    if (currentUser.enrolledClassesHistory && currentUser.enrolledClassesHistory.length > 0) {
      for (const h of currentUser.enrolledClassesHistory) {
        const matchingClass = classes.find(c => c.id === h.classId);
        recordsMap.set(h.classId, {
          classId: h.classId,
          classTitle: h.classTitle || matchingClass?.title || 'Academic Course',
          subject: h.subject || matchingClass?.subject || 'Tuition',
          tutorName: h.tutorName || matchingClass?.tutorName || 'Faculty Tutor',
          schedule: matchingClass?.schedule || '',
          enrolledAt: h.enrolledAt || currentUser.createdAt || new Date().toISOString(),
          completionDate: h.completionDate,
          status: h.status,
          grade: h.grade,
          note: h.note,
          classItem: matchingClass
        });
      }
    }

    // 2. Cross-reference current selectedClasses & classEnrollmentStatus
    for (const cid of (currentUser.selectedClasses || [])) {
      const matchingClass = classes.find(c => c.id === cid);
      const isSuspended = currentUser.classEnrollmentStatus?.[cid] === 'suspended' || currentUser.status === 'suspended';
      const status: 'Active' | 'Suspended' = isSuspended ? 'Suspended' : 'Active';

      if (!recordsMap.has(cid)) {
        recordsMap.set(cid, {
          classId: cid,
          classTitle: matchingClass?.title || 'Tuition Course',
          subject: matchingClass?.subject || 'Syllabus',
          tutorName: matchingClass?.tutorName || 'Faculty Instructor',
          schedule: matchingClass?.schedule || '',
          enrolledAt: currentUser.createdAt || new Date().toISOString(),
          status,
          classItem: matchingClass
        });
      }
    }

    // 3. Cross-reference student bookings (including cancelled or completed)
    for (const b of bookings) {
      if (b.studentId === currentUser.uid || b.studentEmail?.toLowerCase() === currentUser.email?.toLowerCase()) {
        const matchingClass = classes.find(c => c.id === b.classId);
        if (!recordsMap.has(b.classId)) {
          const status = b.status === 'cancelled' ? 'Dropped' : 'Active';
          recordsMap.set(b.classId, {
            classId: b.classId,
            classTitle: b.classTitle || matchingClass?.title || 'Course',
            subject: matchingClass?.subject || 'Tuition',
            tutorName: b.tutorName || matchingClass?.tutorName || 'Faculty Instructor',
            schedule: matchingClass?.schedule || '',
            enrolledAt: b.bookingDate || b.createdAt || currentUser.createdAt,
            status,
            classItem: matchingClass
          });
        }
      }
    }

    // Calculate attendance for each
    const list = Array.from(recordsMap.values()).map(rec => {
      const classAtt = attendanceRecords.filter(a => a.classId === rec.classId && a.studentId === currentUser.uid);
      if (classAtt.length > 0) {
        const presentCount = classAtt.filter(a => a.status === 'Present' || (a.status as string)?.toLowerCase() === 'present').length;
        rec.attendancePct = Math.round((presentCount / classAtt.length) * 100);
      }
      return rec;
    });

    // Sort: Active/Suspended first, then by date
    return list.sort((a, b) => {
      const order = { Active: 0, Suspended: 1, Completed: 2, Dropped: 3 };
      if (order[a.status] !== order[b.status]) {
        return order[a.status] - order[b.status];
      }
      return new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime();
    });
  }, [currentUser, classes, bookings, attendanceRecords]);

  const activeCount = historyList.filter(h => h.status === 'Active').length;
  const completedCount = historyList.filter(h => h.status === 'Completed').length;
  const droppedCount = historyList.filter(h => h.status === 'Dropped').length;

  return (
    <div className="space-y-6 font-sans" id="student_academic_history_panel">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Active Enrollments</span>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{activeCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Completed Courses</span>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{completedCount}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Total Course History</span>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{historyList.length}</p>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-200">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Records Table / Card List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              Academic Record & Enrolled Classes History
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive log of all ongoing, completed, and previously attended courses.
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
            {historyList.length} Total Records
          </span>
        </div>

        {historyList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No enrollment history records found.</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Once you enroll in tuition courses or administrators assign your classes, your complete academic timeline will be documented here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {historyList.map((item, idx) => {
              const getStatusBadge = () => {
                switch (item.status) {
                  case 'Active':
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Active Enrolled
                      </span>
                    );
                  case 'Completed':
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                        <Award className="w-3 h-3" /> Completed
                      </span>
                    );
                  case 'Suspended':
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                        <AlertCircle className="w-3 h-3" /> Suspended
                      </span>
                    );
                  case 'Dropped':
                  default:
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        <XCircle className="w-3 h-3" /> Dropped / Removed
                      </span>
                    );
                }
              };

              return (
                <div 
                  key={`${item.classId}-${idx}`} 
                  className="p-5 sm:p-6 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                        {item.subject}
                      </span>
                      <h4 className="text-sm sm:text-base font-black text-slate-900 truncate">
                        {item.classTitle}
                      </h4>
                      {getStatusBadge()}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 font-medium flex-wrap">
                      <span>Instructor: <strong className="text-slate-800">{item.tutorName}</strong></span>
                      {item.schedule && <span>• {item.schedule}</span>}
                      {item.attendancePct !== undefined && (
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          Attendance: {item.attendancePct}%
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono flex-wrap pt-0.5">
                      <span>Enrolled Date: {new Date(item.enrolledAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      {item.completionDate && (
                        <span>• Concluded Date: {new Date(item.completionDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      )}
                      {item.grade && (
                        <span className="font-bold text-emerald-600">• Grade: {item.grade}</span>
                      )}
                    </div>
                  </div>

                  {/* Class Profile Navigation Button */}
                  {item.classItem && onOpenClassProfile && (
                    <button
                      onClick={() => onOpenClassProfile(item.classItem!)}
                      className="px-3.5 py-2 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0 self-end sm:self-center"
                      id={`btn_view_history_class_${item.classId}`}
                    >
                      <span>Class Profile & Materials</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
