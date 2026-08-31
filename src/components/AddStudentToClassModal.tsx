import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  UserPlus, 
  Check, 
  AlertCircle, 
  GraduationCap, 
  UserCheck, 
  UserX, 
  CreditCard, 
  BookOpen, 
  ShieldCheck,
  Calendar,
  Clock,
  DollarSign
} from 'lucide-react';
import { ClassItem, UserProfile, Booking } from '../types';
import { firestoreService } from '../lib/firestoreService';

interface AddStudentToClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetClass: ClassItem | null;
  currentUser?: UserProfile | null;
  onStudentEnrolled?: (studentId: string, classId: string) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const AddStudentToClassModal: React.FC<AddStudentToClassModalProps> = ({
  isOpen,
  onClose,
  targetClass,
  currentUser,
  onStudentEnrolled,
  showToast = (msg) => console.log(msg)
}) => {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [initialStatus, setInitialStatus] = useState<'active' | 'suspended'>('active');
  const [paymentCategory, setPaymentCategory] = useState<'Normal' | 'Free Card' | 'Half Card'>('Normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterApprovedOnly, setFilterApprovedOnly] = useState(true);

  useEffect(() => {
    if (isOpen && targetClass) {
      loadData();
      setSelectedStudentId(null);
      setInitialStatus('active');
      setPaymentCategory('Normal');
      setSearchQuery('');
    }
  }, [isOpen, targetClass]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allUsers, allBookings] = await Promise.all([
        firestoreService.getAllUsers(),
        firestoreService.getBookings()
      ]);
      const studentUsers = allUsers.filter(u => u.role === 'student');
      setStudents(studentUsers);
      setBookings(allBookings);
    } catch (err) {
      console.warn("Failed to load students for enrollment:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !targetClass) return null;

  // Filter students
  const filteredStudents = students.filter(student => {
    if (filterApprovedOnly && student.status === 'pending') return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = (student.name || '').toLowerCase().includes(q);
    const usernameMatch = (student.username || '').toLowerCase().includes(q);
    const emailMatch = (student.email || '').toLowerCase().includes(q);
    const phoneMatch = (student.phone || '').toLowerCase().includes(q);
    const gradeMatch = (student.studentDetails?.grade || '').toLowerCase().includes(q);

    return nameMatch || usernameMatch || emailMatch || phoneMatch || gradeMatch;
  });

  // Check if student is already enrolled in this class
  const isEnrolledInTargetClass = (student: UserProfile) => {
    const inProfile = Array.isArray(student.selectedClasses) && student.selectedClasses.includes(targetClass.id);
    const inBookings = bookings.some(
      b => b.classId === targetClass.id && 
      (b.studentId === student.uid || b.studentEmail?.toLowerCase() === student.email?.toLowerCase()) && 
      b.status !== 'cancelled'
    );
    return inProfile || inBookings;
  };

  const selectedStudent = students.find(s => s.uid === selectedStudentId);

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !targetClass) {
      showToast('Please select a student to enroll.', 'error');
      return;
    }

    if (selectedStudent && isEnrolledInTargetClass(selectedStudent)) {
      showToast(`${selectedStudent.name} is already enrolled in this class.`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const performerName = currentUser?.name || currentUser?.username || 'Admin';
      await firestoreService.enrollStudentInClass(
        selectedStudentId,
        targetClass.id,
        initialStatus,
        paymentCategory,
        performerName
      );

      showToast(
        `Successfully enrolled ${selectedStudent?.name || 'student'} into ${targetClass.title}!`,
        'success'
      );

      if (onStudentEnrolled) {
        onStudentEnrolled(selectedStudentId, targetClass.id);
      }
      onClose();
    } catch (err: any) {
      console.error("Enrollment failed:", err);
      showToast(`Enrollment failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold flex items-center gap-2">
                Add Student to Class
              </h3>
              <p className="text-xs text-indigo-200/80">
                Enroll a registered student directly into class roster & academic records
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Class Overview Banner */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <span className="font-extrabold text-slate-900">{targetClass.title}</span>
              <span className="text-slate-500 ml-1.5 font-medium">({targetClass.subject})</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-slate-600 font-mono text-[11px]">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              {targetClass.dayOfWeek || targetClass.schedule}
            </span>
            <span className="flex items-center gap-1 font-bold text-emerald-700">
              <DollarSign className="w-3 h-3 text-emerald-600" />
              LKR {targetClass.price.toLocaleString()}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
              {targetClass.bookedSlots || 0} / {targetClass.maxSlots} Seats
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleEnrollSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            {/* Search and Filters */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 font-mono">
                1. Select Student Scholar
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search student by name, Student ID (username), email, phone, grade..."
                    className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFilterApprovedOnly(!filterApprovedOnly)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    filterApprovedOnly 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {filterApprovedOnly ? 'Approved Only' : 'All Students'}
                </button>
              </div>
            </div>

            {/* Students List Selection */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 max-h-52 overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-500 font-medium">
                  Loading students database...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                  No matching students found.
                </div>
              ) : (
                filteredStudents.map((stud) => {
                  const alreadyEnrolled = isEnrolledInTargetClass(stud);
                  const isSelected = selectedStudentId === stud.uid;

                  return (
                    <div
                      key={stud.uid}
                      onClick={() => {
                        if (!alreadyEnrolled) {
                          setSelectedStudentId(stud.uid);
                        }
                      }}
                      className={`p-3 transition-all flex items-center justify-between gap-3 ${
                        alreadyEnrolled
                          ? 'opacity-60 bg-slate-100/80 cursor-not-allowed'
                          : isSelected
                          ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-400/40 cursor-pointer'
                          : 'hover:bg-white cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {stud.photoURL ? (
                          <img
                            referrerPolicy="no-referrer"
                            src={stud.photoURL}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-xs shrink-0">
                            {(stud.name || 'S').substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-extrabold text-slate-900 truncate">
                              {stud.name}
                            </span>
                            {stud.username && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono text-[9px] font-bold">
                                ID: {stud.username}
                              </span>
                            )}
                            {stud.studentDetails?.grade && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-mono text-[9px] font-bold">
                                {stud.studentDetails.grade}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate font-mono mt-0.5">
                            {stud.email || stud.phone || 'No email provided'}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {alreadyEnrolled ? (
                          <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase font-mono bg-slate-200 text-slate-600">
                            Already Enrolled
                          </span>
                        ) : isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-300">
                            Select
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected Student Confirmation & Class Settings */}
            {selectedStudent && (
              <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-extrabold text-indigo-950">
                      Enrolling: {selectedStudent.name} ({selectedStudent.username || selectedStudent.email})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentId(null)}
                    className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Change Student
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Initial Enrollment Status */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 font-mono mb-1.5">
                      Class Access Status
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setInitialStatus('active')}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                          initialStatus === 'active'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Active
                      </button>
                      <button
                        type="button"
                        onClick={() => setInitialStatus('suspended')}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                          initialStatus === 'suspended'
                            ? 'bg-red-600 text-white border-red-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <UserX className="w-3.5 h-3.5" /> Suspended
                      </button>
                    </div>
                  </div>

                  {/* Payment Category */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 font-mono mb-1.5">
                      Payment Category
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => setPaymentCategory('Normal')}
                        className={`py-2 px-1 rounded-xl text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer border ${
                          paymentCategory === 'Normal'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentCategory('Free Card')}
                        className={`py-2 px-1 rounded-xl text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer border ${
                          paymentCategory === 'Free Card'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Free Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentCategory('Half Card')}
                        className={`py-2 px-1 rounded-xl text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer border ${
                          paymentCategory === 'Half Card'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Half Card
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!selectedStudentId || isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              id="btn_confirm_enroll_student_in_class"
            >
              <UserPlus className="w-4 h-4" />
              {isSubmitting ? 'Enrolling...' : 'Enroll Student in Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
