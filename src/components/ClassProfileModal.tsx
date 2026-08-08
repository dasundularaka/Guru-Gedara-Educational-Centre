import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  QrCode, 
  UserCheck, 
  UserX, 
  BookOpen, 
  Plus, 
  Eye, 
  EyeOff, 
  Trash2, 
  Calendar, 
  Clock, 
  DollarSign, 
  Users, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Link as LinkIcon, 
  Video, 
  Sparkles,
  ShieldAlert,
  CreditCard,
  History
} from 'lucide-react';
import { ClassItem, Booking, UserProfile, Payment, StudyMaterial, AttendanceRecord, ResourceType } from '../types';
import { firestoreService } from '../lib/firestoreService';

interface ClassProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  classItem: ClassItem | null;
  currentUser: UserProfile;
  bookings: Booking[];
  allUsers: UserProfile[];
  payments: Payment[];
  attendanceRecords: AttendanceRecord[];
  onOpenScanner?: (classItem: ClassItem) => void;
  onUpdateData?: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ClassProfileModal: React.FC<ClassProfileModalProps> = ({
  isOpen,
  onClose,
  classItem,
  currentUser,
  bookings = [],
  allUsers = [],
  payments = [],
  attendanceRecords = [],
  onOpenScanner,
  onUpdateData,
  showToast
}) => {
  const isTutorOrAdmin = currentUser.role === 'tutor' || currentUser.role === 'admin';
  const [activeTab, setActiveTab] = useState<'roster' | 'materials' | 'attendance'>('roster');

  // Roster Filter State
  const [searchQuery, setSearchQuery] = useState('');

  // Materials State
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<ResourceType>('link');
  const [savingMaterial, setSavingMaterial] = useState(false);

  // Load study materials when class changes
  useEffect(() => {
    if (!classItem) return;
    const loadMaterials = async () => {
      setLoadingMaterials(true);
      try {
        const fetched = await firestoreService.getStudyMaterials(classItem.id);
        setMaterials(fetched);
      } catch (err) {
        console.error("Failed loading study materials for class", err);
      } finally {
        setLoadingMaterials(false);
      }
    };
    loadMaterials();
  }, [classItem]);

  if (!isOpen || !classItem) return null;

  // Filter enrolled bookings for this class
  const classBookings = bookings.filter(b => b.classId === classItem.id && b.status === 'active');
  
  // Map enrolled student details
  const enrolledStudentProfiles = classBookings.map(booking => {
    const user = allUsers.find(u => u.uid === booking.studentId);
    
    // Check specific class enrollment status or user status
    const classStatus = user?.classEnrollmentStatus?.[classItem.id] || (user?.status === 'suspended' ? 'suspended' : 'active');
    
    // Determine payment category: free, half, full
    let paymentCategory: 'Free Card' | 'Half Card' | 'Full Fee' = 'Full Fee';
    if (user?.isFreeCard || booking.approvalType === 'free_card') {
      paymentCategory = 'Free Card';
    } else if (booking.approvalType === 'late_payment' || user?.classEnrollmentStatus?.[classItem.id] === 'late_payment') {
      paymentCategory = 'Half Card';
    }

    // Find last payment month
    const studentPayments = payments
      .filter(p => p.studentId === booking.studentId && p.classId === classItem.id && p.status === 'paid')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const lastPayment = studentPayments[0];
    const lastPaymentMonth = lastPayment 
      ? new Date(lastPayment.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'No Payment Record';

    return {
      booking,
      user,
      studentId: booking.studentId,
      studentName: booking.studentName,
      photoURL: user?.photoURL,
      email: user?.email || 'N/A',
      classStatus,
      paymentCategory,
      lastPaymentMonth
    };
  });

  // Filter students by search
  const filteredStudents = enrolledStudentProfiles.filter(s => 
    s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle Student Class Status (Active <-> Suspended)
  const handleToggleStudentStatus = async (studentId: string, currentStatus: string, studentName: string) => {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      const user = allUsers.find(u => u.uid === studentId);
      const currentMap = user?.classEnrollmentStatus || {};
      const updatedMap = { ...currentMap, [classItem.id]: nextStatus as 'active' | 'suspended' };

      await firestoreService.updateUserProfile(studentId, {
        classEnrollmentStatus: updatedMap
      });

      showToast(`Student ${studentName} status updated to ${nextStatus.toUpperCase()} for ${classItem.title}!`, 'success');
      if (onUpdateData) onUpdateData();
    } catch (err) {
      showToast('Failed to update student status.', 'error');
    }
  };

  // Add Study Material
  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) {
      showToast('Please enter title and reference link/file URL.', 'info');
      return;
    }

    setSavingMaterial(true);
    try {
      const newMat = await firestoreService.saveStudyMaterial({
        title: newTitle.trim(),
        description: newDesc.trim(),
        subject: classItem.subject,
        referenceUrl: newUrl.trim(),
        type: newType,
        tutorId: currentUser.uid,
        tutorName: currentUser.name,
        classId: classItem.id,
        classTitle: classItem.title,
        isVisible: true
      });

      setMaterials(prev => [newMat, ...prev]);
      setNewTitle('');
      setNewDesc('');
      setNewUrl('');
      setShowAddMaterial(false);
      showToast('Study material published successfully!', 'success');
    } catch (err) {
      showToast('Could not save material.', 'error');
    } finally {
      setSavingMaterial(false);
    }
  };

  // Toggle Material Visibility (Hide/Visible)
  const handleToggleMaterialVisibility = async (matId: string, currentIsVisible?: boolean) => {
    const newVisibility = currentIsVisible === false ? true : false;
    try {
      await firestoreService.updateStudyMaterial(matId, { isVisible: newVisibility });
      setMaterials(prev => prev.map(m => m.id === matId ? { ...m, isVisible: newVisibility } : m));
      showToast(`Material status changed to ${newVisibility ? 'VISIBLE' : 'HIDDEN'}!`, 'info');
    } catch (err) {
      showToast('Failed to update material visibility.', 'error');
    }
  };

  // Delete Material
  const handleDeleteMaterial = async (matId: string) => {
    if (!window.confirm('Are you sure you want to delete this study material?')) return;
    try {
      await firestoreService.deleteStudyMaterial(matId);
      setMaterials(prev => prev.filter(m => m.id !== matId));
      showToast('Study material deleted.', 'success');
    } catch (err) {
      showToast('Failed to delete material.', 'error');
    }
  };

  // Filter attendance logs for this class
  const classAttendanceLogs = attendanceRecords.filter(a => a.classId === classItem.id);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs font-sans animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-150 overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col relative"
          id={`class_profile_modal_${classItem.id}`}
        >
          {/* Cover Header Banner */}
          <div className="relative h-44 sm:h-52 bg-slate-900 overflow-hidden shrink-0">
            {classItem.imageUrl ? (
              <img 
                referrerPolicy="no-referrer"
                src={classItem.imageUrl} 
                alt={classItem.title} 
                className="w-full h-full object-cover opacity-60"
              />
            ) : (
              <div className="w-full h-full bg-linear-to-r from-indigo-900 via-slate-900 to-purple-950 opacity-80" />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/40 to-transparent" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-slate-900/80 hover:bg-slate-900 text-white/80 hover:text-white rounded-full backdrop-blur-md transition-all cursor-pointer z-10"
              id="btn_close_class_profile_modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Top Right QR Scanner Action Button (Tutors & Admins Only) */}
            {isTutorOrAdmin && onOpenScanner && (
              <button
                onClick={() => {
                  onClose();
                  onOpenScanner(classItem);
                }}
                className="absolute top-4 right-16 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all cursor-pointer z-10 border border-indigo-400/40"
                id={`btn_open_class_qr_scanner_${classItem.id}`}
              >
                <QrCode className="w-4 h-4" /> Scan Class Attendance
              </button>
            )}

            {/* Banner Content Details */}
            <div className="absolute bottom-4 left-6 right-6 flex flex-wrap items-end justify-between gap-3 text-white">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/80 text-white font-mono backdrop-blur-md">
                    {classItem.subject}
                  </span>
                  <span className="text-xs font-mono text-slate-300">ID: {classItem.id}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                  {classItem.title}
                </h2>
                <p className="text-xs text-slate-300 mt-1 font-medium flex items-center gap-2">
                  <span>Tutor: <strong className="text-white">{classItem.tutorName}</strong></span>
                  <span>•</span>
                  <span>{classItem.schedule}</span>
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-2xl flex items-center gap-4">
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-300 block">Class Fee</span>
                  <span className="text-sm font-extrabold text-white font-mono">LKR {classItem.price}/mo</span>
                </div>
                <div className="w-px h-6 bg-white/20" />
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-300 block">Enrolled Students</span>
                  <span className="text-sm font-extrabold text-emerald-400 font-mono">{classBookings.length} Students</span>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Navigation Tabs */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex gap-2 text-xs font-bold">
              <button
                onClick={() => setActiveTab('roster')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'roster' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
                id="tab_class_roster"
              >
                <Users className="w-4 h-4" /> Enrolled Roster ({classBookings.length})
              </button>
              <button
                onClick={() => setActiveTab('materials')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'materials' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
                id="tab_class_materials"
              >
                <BookOpen className="w-4 h-4" /> Course Materials ({materials.length})
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'attendance' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
                id="tab_class_attendance_history"
              >
                <History className="w-4 h-4" /> Attendance Logs ({classAttendanceLogs.length})
              </button>
            </div>
          </div>

          {/* Modal Tab Content Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">

            {/* TAB 1: ENROLLED STUDENT ROSTER */}
            {activeTab === 'roster' && (
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search student by name, email, or UID..."
                      className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-500 font-semibold">
                    Showing {filteredStudents.length} of {enrolledStudentProfiles.length}
                  </span>
                </div>

                {filteredStudents.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-extrabold text-slate-700">No Enrolled Students Found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Students who book this class will appear in this roster.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredStudents.map(({ studentId, studentName, photoURL, email, classStatus, paymentCategory, lastPaymentMonth }) => {
                      const isSuspended = classStatus === 'suspended';

                      return (
                        <div 
                          key={studentId}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                            isSuspended 
                              ? 'bg-red-50/40 border-red-200' 
                              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {photoURL ? (
                                <img 
                                  referrerPolicy="no-referrer"
                                  src={photoURL} 
                                  alt={studentName} 
                                  className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-sm shrink-0">
                                  {studentName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                                  {studentName}
                                </h4>
                                <p className="text-[11px] text-slate-500 truncate max-w-[160px]">{email}</p>
                                <p className="text-[10px] font-mono text-slate-400">UID: {studentId}</p>
                              </div>
                            </div>

                            {/* Class Status Badge */}
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase font-mono ${
                              isSuspended ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              {isSuspended ? 'Suspended' : 'Active'}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                            <div>
                              <span className="text-[9px] uppercase font-mono text-slate-400 block">Payment Category</span>
                              <span className={`font-bold font-mono ${
                                paymentCategory === 'Free Card' ? 'text-emerald-600' : paymentCategory === 'Half Card' ? 'text-amber-600' : 'text-slate-700'
                              }`}>
                                {paymentCategory}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[9px] uppercase font-mono text-slate-400 block">Last Payment</span>
                              <span className="font-semibold text-slate-800 font-mono text-[10px]">
                                {lastPaymentMonth}
                              </span>
                            </div>
                          </div>

                          {/* Admin / Tutor Status Toggle Control */}
                          {isTutorOrAdmin && (
                            <button
                              onClick={() => handleToggleStudentStatus(studentId, classStatus, studentName)}
                              className={`w-full py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                isSuspended 
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' 
                                  : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                              }`}
                            >
                              {isSuspended ? (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" /> Reactivate Student Enrollment
                                </>
                              ) : (
                                <>
                                  <UserX className="w-3.5 h-3.5" /> Suspend Student from Class
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: COURSE MATERIALS */}
            {activeTab === 'materials' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" /> Study Resources & Course Notes
                  </h3>

                  {isTutorOrAdmin && (
                    <button
                      onClick={() => setShowAddMaterial(!showAddMaterial)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      id="btn_add_course_material"
                    >
                      <Plus className="w-4 h-4" /> {showAddMaterial ? 'Cancel' : 'Upload Material'}
                    </button>
                  )}
                </div>

                {/* Add Material Form */}
                {showAddMaterial && (
                  <form onSubmit={handleAddMaterial} className="bg-slate-50 p-4 rounded-2xl border border-indigo-100 space-y-3">
                    <h4 className="text-xs font-extrabold text-indigo-950 uppercase font-mono tracking-wider">
                      Add New Resource for {classItem.title}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-650 mb-1">Resource Title</label>
                        <input
                          required
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="e.g. Chapter 4 Integration Notes PDF"
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-650 mb-1">Resource Type</label>
                        <select
                          value={newType}
                          onChange={(e) => setNewType(e.target.value as ResourceType)}
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 cursor-pointer font-semibold"
                        >
                          <option value="link">External Link / Google Drive</option>
                          <option value="file">Document / PDF File</option>
                          <option value="video">Video Recording</option>
                          <option value="note">Class Notes / Summary</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-650 mb-1">Resource URL / Download Link</label>
                      <input
                        required
                        type="url"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder="https://drive.google.com/file/d/..."
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-650 mb-1">Description (Optional)</label>
                      <textarea
                        rows={2}
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="Key formulas and revision guidelines..."
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddMaterial(false)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingMaterial}
                        className="px-4 py-1.5 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
                      >
                        {savingMaterial ? 'Publishing...' : 'Publish Material'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Materials List */}
                {loadingMaterials ? (
                  <div className="text-center py-8 text-xs text-slate-400 font-mono">
                    Loading course resources...
                  </div>
                ) : materials.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-extrabold text-slate-700">No Course Materials Yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Tutors can upload revision PDFs and video recordings here.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {materials.map((mat) => {
                      const isHidden = mat.isVisible === false;
                      if (!isTutorOrAdmin && isHidden) return null; // Hide from students if set to hidden

                      return (
                        <div 
                          key={mat.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                            isHidden ? 'bg-slate-100/60 border-slate-200 opacity-75' : 'bg-white border-slate-200 hover:border-indigo-200 shadow-xs'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-xl text-white font-bold shrink-0 ${
                              mat.type === 'video' ? 'bg-purple-600' : mat.type === 'file' ? 'bg-emerald-600' : 'bg-indigo-600'
                            }`}>
                              {mat.type === 'video' ? <Video className="w-4 h-4" /> : mat.type === 'file' ? <FileText className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                                  {mat.title}
                                </h4>
                                {isHidden && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-slate-200 text-slate-600">
                                    Hidden from Students
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">{mat.description || 'Class study resource'}</p>
                              <a 
                                href={mat.referenceUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[10px] font-mono text-indigo-600 hover:underline flex items-center gap-1 mt-1 truncate max-w-sm"
                              >
                                <LinkIcon className="w-3 h-3" /> {mat.referenceUrl}
                              </a>
                            </div>
                          </div>

                          {/* Controls for Tutor / Admin */}
                          {isTutorOrAdmin && (
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <button
                                onClick={() => handleToggleMaterialVisibility(mat.id, mat.isVisible)}
                                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                  isHidden 
                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' 
                                    : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                                }`}
                                title={isHidden ? 'Make visible to students' : 'Hide from students'}
                              >
                                {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                {isHidden ? 'Show' : 'Hide'}
                              </button>

                              <button
                                onClick={() => handleDeleteMaterial(mat.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete study material"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ATTENDANCE HISTORY LOGS */}
            {activeTab === 'attendance' && (
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-2">
                  <History className="w-4 h-4 text-indigo-600" /> Class Session Attendance Logs
                </h3>

                {classAttendanceLogs.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-extrabold text-slate-700">No Attendance Logs Recorded</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Use the QR scanner at class start to record live student presence.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {classAttendanceLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl font-bold ${log.status === 'Present' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                            {log.status === 'Present' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900">{log.studentName}</h4>
                            <p className="text-[10px] text-slate-500 font-mono">
                              Date: {log.date} • {new Date(log.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] uppercase font-mono text-slate-400 block">Scanned By</span>
                          <span className="font-bold text-indigo-700 font-mono text-[10px]">
                            {log.scannedByName || 'Tutor / Admin'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
