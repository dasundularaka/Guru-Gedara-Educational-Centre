import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Users, 
  UserCheck, 
  UserX, 
  UserMinus, 
  UserPlus, 
  Search, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  GraduationCap, 
  Phone, 
  Mail, 
  CreditCard, 
  Clock, 
  Filter,
  Trash2,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { ClassItem, Booking, UserProfile, AttendanceRecord } from '../types';
import { firestoreService } from '../lib/firestoreService';

interface ClassRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  classItem: ClassItem;
  allUsers: UserProfile[];
  bookings: Booking[];
  attendanceRecords?: AttendanceRecord[];
  currentUser: UserProfile;
  onRosterUpdated?: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ClassRosterModal: React.FC<ClassRosterModalProps> = ({
  isOpen,
  onClose,
  classItem,
  allUsers = [],
  bookings = [],
  attendanceRecords = [],
  currentUser,
  onRosterUpdated,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showAddStudentSection, setShowAddStudentSection] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState<UserProfile | null>(null);
  const [addPaymentCategory, setAddPaymentCategory] = useState<'Normal' | 'Free Card' | 'Half Card'>('Normal');
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  // Derive all students enrolled in this class
  const enrolledStudents = useMemo(() => {
    const studentsMap = new Map<string, { user: UserProfile; booking?: Booking; status: 'active' | 'suspended' }>();

    // 1. Check bookings for this class
    const classBookings = bookings.filter(b => b.classId === classItem.id && b.status === 'active');
    for (const b of classBookings) {
      const u = allUsers.find(user => user.uid === b.studentId || user.email?.toLowerCase() === b.studentEmail?.toLowerCase());
      if (u) {
        const enrollmentStatus = (u.classEnrollmentStatus?.[classItem.id] === 'suspended' || u.status === 'suspended') ? 'suspended' : 'active';
        studentsMap.set(u.uid, { user: u, booking: b, status: enrollmentStatus });
      } else {
        // Fallback user object
        studentsMap.set(b.studentId, {
          user: {
            uid: b.studentId,
            name: b.studentName,
            email: b.studentEmail || '',
            role: 'student',
            createdAt: b.bookingDate || new Date().toISOString()
          },
          booking: b,
          status: 'active'
        });
      }
    }

    // 2. Check allUsers with selectedClasses including this class
    for (const u of allUsers) {
      if (u.role === 'student' && (u.selectedClasses || []).includes(classItem.id)) {
        if (!studentsMap.has(u.uid)) {
          const enrollmentStatus = (u.classEnrollmentStatus?.[classItem.id] === 'suspended' || u.status === 'suspended') ? 'suspended' : 'active';
          const matchingBooking = bookings.find(b => b.classId === classItem.id && (b.studentId === u.uid || b.studentEmail?.toLowerCase() === u.email?.toLowerCase()) && b.status === 'active');
          studentsMap.set(u.uid, { user: u, booking: matchingBooking, status: enrollmentStatus });
        }
      }
    }

    return Array.from(studentsMap.values());
  }, [classItem.id, bookings, allUsers]);

  // Filtered roster
  const filteredRoster = useMemo(() => {
    return enrolledStudents.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        item.user.name.toLowerCase().includes(q) || 
        (item.user.username || '').toLowerCase().includes(q) ||
        (item.user.email || '').toLowerCase().includes(q) ||
        (item.user.phone || '').toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [enrolledStudents, searchQuery, statusFilter]);

  // Candidates to add to this class
  const candidateStudents = useMemo(() => {
    const enrolledUids = new Set(enrolledStudents.map(s => s.user.uid));
    return allUsers.filter(u => {
      if (u.role !== 'student' || enrolledUids.has(u.uid)) return false;
      const q = addSearchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q)
      );
    });
  }, [allUsers, enrolledStudents, addSearchQuery]);

  // Handler: Toggle Suspend / Active status
  const handleToggleSuspend = async (studentUser: UserProfile, currentStatus: 'active' | 'suspended') => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const actionLabel = nextStatus === 'suspended' ? 'Suspend' : 'Activate';
    
    if (!window.confirm(`Are you sure you want to ${actionLabel.toLowerCase()} student '${studentUser.name}' in this class?`)) {
      return;
    }

    setIsUpdating(studentUser.uid);
    try {
      const updatedStatusMap = {
        ...(studentUser.classEnrollmentStatus || {}),
        [classItem.id]: nextStatus
      };

      // Also update enrolledClassesHistory
      const existingHistory = studentUser.enrolledClassesHistory || [];
      const historyIdx = existingHistory.findIndex(h => h.classId === classItem.id);
      let updatedHistory = [...existingHistory];
      if (historyIdx >= 0) {
        updatedHistory[historyIdx] = {
          ...updatedHistory[historyIdx],
          status: nextStatus === 'active' ? 'Active' : 'Suspended'
        };
      } else {
        updatedHistory.push({
          classId: classItem.id,
          classTitle: classItem.title,
          subject: classItem.subject,
          tutorName: classItem.tutorName,
          enrolledAt: new Date().toISOString(),
          status: nextStatus === 'active' ? 'Active' : 'Suspended'
        });
      }

      await firestoreService.updateUserProfile(studentUser.uid, {
        classEnrollmentStatus: updatedStatusMap,
        enrolledClassesHistory: updatedHistory
      });

      // Send notification to student
      await firestoreService.triggerNotification(
        studentUser.uid,
        `Class Access Update: ${classItem.title}`,
        nextStatus === 'suspended'
          ? `Your access to class '${classItem.title}' has been temporarily suspended by faculty administration.`
          : `Your active enrollment and access to class '${classItem.title}' has been restored.`,
        'announcement'
      );

      showToast(`Student '${studentUser.name}' status set to ${nextStatus.toUpperCase()}.`, 'success');
      if (onRosterUpdated) onRosterUpdated();
    } catch (err: any) {
      showToast(`Failed to update status: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsUpdating(null);
    }
  };

  // Handler: Remove / Unenroll student from class
  const handleRemoveFromClass = async (studentUser: UserProfile, booking?: Booking) => {
    if (!window.confirm(`Are you sure you want to remove '${studentUser.name}' from '${classItem.title}'? This will free up 1 slot and update their dashboard immediately.`)) {
      return;
    }

    setIsUpdating(studentUser.uid);
    try {
      await firestoreService.unenrollStudentFromClass(studentUser.uid, classItem.id, currentUser.name || 'Admin');
      
      // Update history to Dropped
      const existingHistory = studentUser.enrolledClassesHistory || [];
      const historyIdx = existingHistory.findIndex(h => h.classId === classItem.id);
      let updatedHistory = [...existingHistory];
      if (historyIdx >= 0) {
        updatedHistory[historyIdx] = {
          ...updatedHistory[historyIdx],
          status: 'Dropped',
          completionDate: new Date().toISOString()
        };
      } else {
        updatedHistory.push({
          classId: classItem.id,
          classTitle: classItem.title,
          subject: classItem.subject,
          tutorName: classItem.tutorName,
          enrolledAt: new Date().toISOString(),
          completionDate: new Date().toISOString(),
          status: 'Dropped'
        });
      }

      await firestoreService.updateUserProfile(studentUser.uid, {
        enrolledClassesHistory: updatedHistory
      });

      showToast(`Student '${studentUser.name}' removed from class roster.`, 'success');
      if (onRosterUpdated) onRosterUpdated();
    } catch (err: any) {
      showToast(`Failed to remove student: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsUpdating(null);
    }
  };

  // Handler: Add student to roster directly
  const handleAddStudentToClass = async () => {
    if (!selectedStudentToAdd) {
      showToast("Please select a student to add to this roster.", "error");
      return;
    }

    setIsAddingStudent(true);
    try {
      await firestoreService.enrollStudentInClass(
        selectedStudentToAdd.uid,
        classItem.id,
        'active',
        addPaymentCategory,
        currentUser.name || 'Admin'
      );

      showToast(`Successfully enrolled '${selectedStudentToAdd.name}' into ${classItem.title}!`, 'success');
      setSelectedStudentToAdd(null);
      setShowAddStudentSection(false);
      setAddSearchQuery('');
      if (onRosterUpdated) onRosterUpdated();
    } catch (err: any) {
      showToast(err.message || "Failed to add student to class.", "error");
    } finally {
      setIsAddingStudent(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-55 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 font-sans"
        id={`class_roster_modal_${classItem.id}`}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col relative"
        >
          {/* Modal Header */}
          <div className="bg-slate-900 text-white p-5 sm:p-6 shrink-0 relative flex justify-between items-start">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/80 text-white font-mono">
                  {classItem.subject}
                </span>
                <span className="text-xs font-mono text-slate-300">ID: {classItem.id}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                <Users className="w-6 h-6 text-indigo-400" />
                Class Roster: {classItem.title}
              </h2>
              <p className="text-xs text-slate-300 flex items-center gap-3 font-medium">
                <span>Tutor: <strong className="text-white">{classItem.tutorName}</strong></span>
                <span>•</span>
                <span>{classItem.schedule}</span>
                <span>•</span>
                <span className="text-emerald-400 font-bold font-mono">{enrolledStudents.length} / {classItem.maxSlots || 20} Enrolled</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddStudentSection(!showAddStudentSection)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                  showAddStudentSection 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }`}
                id="btn_roster_add_student_toggle"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{showAddStudentSection ? "Close Add Form" : "Add Student"}</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer"
                id="btn_close_roster_modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Add Student Expandable Panel */}
          {showAddStudentSection && (
            <div className="bg-indigo-50/70 border-b border-indigo-100 p-4 sm:p-5 shrink-0 animate-fade-in">
              <div className="max-w-3xl mx-auto space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" /> Direct Student Enrollment
                  </h4>
                  <span className="text-[10px] text-slate-500">Search un-enrolled students and add to this class roster</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* Search Candidate */}
                  <div className="sm:col-span-6 relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search student by name, ID or email..."
                      value={addSearchQuery}
                      onChange={(e) => setAddSearchQuery(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2.5 bg-white rounded-xl border border-slate-200 outline-none focus:border-indigo-600"
                    />
                  </div>

                  {/* Payment Category Selector */}
                  <div className="sm:col-span-3">
                    <select
                      value={addPaymentCategory}
                      onChange={(e) => setAddPaymentCategory(e.target.value as any)}
                      className="w-full text-xs px-3 py-2.5 bg-white rounded-xl border border-slate-200 outline-none focus:border-indigo-600 font-bold text-slate-700"
                    >
                      <option value="Normal">Category: Normal</option>
                      <option value="Free Card">Free Card (100% Schol.)</option>
                      <option value="Half Card">Half Card (50% Schol.)</option>
                    </select>
                  </div>

                  {/* Submit Add Button */}
                  <div className="sm:col-span-3">
                    <button
                      onClick={handleAddStudentToClass}
                      disabled={!selectedStudentToAdd || isAddingStudent}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      id="btn_confirm_add_student_to_roster"
                    >
                      {isAddingStudent ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5" />
                      )}
                      <span>Enroll Student</span>
                    </button>
                  </div>
                </div>

                {/* Candidate Selection List */}
                {addSearchQuery && (
                  <div className="max-h-36 overflow-y-auto bg-white rounded-xl border border-slate-200 p-2 divide-y divide-slate-100 shadow-sm">
                    {candidateStudents.length === 0 ? (
                      <p className="text-xs text-slate-400 p-2 text-center">No un-enrolled students matching '{addSearchQuery}'</p>
                    ) : (
                      candidateStudents.map(candidate => {
                        const isSelected = selectedStudentToAdd?.uid === candidate.uid;
                        return (
                          <div
                            key={candidate.uid}
                            onClick={() => setSelectedStudentToAdd(candidate)}
                            className={`p-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-all ${
                              isSelected ? 'bg-indigo-50 text-indigo-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0">
                                {candidate.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-extrabold">{candidate.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{candidate.username ? `ID: ${candidate.username}` : candidate.email}</p>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                              {isSelected ? 'Selected' : 'Select'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
                {selectedStudentToAdd && (
                  <p className="text-[11px] font-bold text-indigo-700">
                    Selected for enrollment: <span className="underline">{selectedStudentToAdd.name}</span> ({selectedStudentToAdd.username || selectedStudentToAdd.email})
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Roster Filter & Search Bar */}
          <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search roster by name, ID, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'all' ? 'bg-slate-900 text-white font-extrabold shadow-xs' : 'hover:bg-slate-50'
                  }`}
                >
                  All ({enrolledStudents.length})
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'active' ? 'bg-emerald-600 text-white font-extrabold shadow-xs' : 'hover:bg-slate-50 text-emerald-700'
                  }`}
                >
                  Active ({enrolledStudents.filter(s => s.status === 'active').length})
                </button>
                <button
                  onClick={() => setStatusFilter('suspended')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'suspended' ? 'bg-amber-600 text-white font-extrabold shadow-xs' : 'hover:bg-slate-50 text-amber-700'
                  }`}
                >
                  Suspended ({enrolledStudents.filter(s => s.status === 'suspended').length})
                </button>
              </div>
            </div>
          </div>

          {/* Roster Student List View */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 divide-y divide-slate-100 space-y-3">
            {filteredRoster.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-600">No students found matching current filters.</p>
                <p className="text-xs text-slate-400">Add new scholars to this roster using the Add Student button above.</p>
              </div>
            ) : (
              filteredRoster.map(({ user, booking, status }) => {
                const isSuspended = status === 'suspended';
                const isThisUpdating = isUpdating === user.uid;

                // Attendance calculation for this student in this class
                const studentAttendance = attendanceRecords.filter(a => a.classId === classItem.id && a.studentId === user.uid);
                const presentCount = studentAttendance.filter(a => a.status === 'Present' || (a.status as string)?.toLowerCase() === 'present').length;
                const attendanceRate = studentAttendance.length > 0 
                  ? Math.round((presentCount / studentAttendance.length) * 100) 
                  : null;

                return (
                  <div
                    key={user.uid}
                    className={`pt-3 first:pt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 rounded-2xl transition-all ${
                      isSuspended ? 'bg-amber-50/50 border border-amber-200/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Student Info */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      {user.photoURL ? (
                        <img 
                          referrerPolicy="no-referrer"
                          src={user.photoURL} 
                          alt={user.name} 
                          className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0" 
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs shrink-0">
                          {user.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-sm text-slate-900 truncate">{user.name}</h4>
                          {isSuspended ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                              Suspended
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Active Enrolled
                            </span>
                          )}
                          {booking?.approvalType === 'free_card' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-800">
                              Free Card
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono flex-wrap">
                          {user.username && <span>ID: <strong className="text-slate-700">{user.username}</strong></span>}
                          <span>{user.email}</span>
                          {user.phone && <span>Tel: <strong className="text-slate-700">{user.phone}</strong></span>}
                          {attendanceRate !== null && (
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                              Att: {attendanceRate}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {/* Toggle Suspend / Active */}
                      <button
                        onClick={() => handleToggleSuspend(user, status)}
                        disabled={isThisUpdating}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                          isSuspended
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                        }`}
                        title={isSuspended ? "Restore active enrollment" : "Suspend student from class"}
                        id={`btn_roster_toggle_suspend_${user.uid}`}
                      >
                        {isThisUpdating ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : isSuspended ? (
                          <UserCheck className="w-3.5 h-3.5" />
                        ) : (
                          <ShieldAlert className="w-3.5 h-3.5" />
                        )}
                        <span>{isSuspended ? "Activate" : "Suspend"}</span>
                      </button>

                      {/* Remove / Unenroll */}
                      <button
                        onClick={() => handleRemoveFromClass(user, booking)}
                        disabled={isThisUpdating}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        title="Unenroll and remove student from class"
                        id={`btn_roster_remove_student_${user.uid}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer */}
          <div className="bg-slate-50 border-t border-slate-200 p-4 shrink-0 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Updates to student roster status synchronize instantly with their live student dashboard.</span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
