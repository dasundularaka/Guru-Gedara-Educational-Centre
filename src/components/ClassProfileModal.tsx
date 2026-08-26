import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  QrCode, 
  UserCheck, 
  UserX, 
  UserMinus,
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
  History,
  CheckSquare,
  Square,
  Lock,
  Timer,
  AlertTriangle,
  Sliders,
  Save,
  Download,
  Upload,
  CalendarCheck,
  Clock3
} from 'lucide-react';
import { ClassItem, Booking, UserProfile, Payment, StudyMaterial, AttendanceRecord, ResourceType } from '../types';
import { firestoreService } from '../lib/firestoreService';
import { binaryStore } from '../lib/binaryStore';
import { calculateStudentPunctuality } from '../lib/punctualityUtils';
import { StudentProfileModal } from './StudentProfileModal';
import { checkClassAvailability, getTutorAvailabilitySummary, checkTutorAvailability } from '../utils/tutorAvailability';

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
  const [activeTab, setActiveTab] = useState<'roster' | 'materials' | 'attendance' | 'availability'>(isTutorOrAdmin ? 'roster' : 'materials');

  // Roster Filter & Bulk Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState<boolean>(false);

  // Materials State
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<ResourceType>('link');
  const [newMode, setNewMode] = useState<'file' | 'link'>('file');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [savingMaterial, setSavingMaterial] = useState(false);

  // Grace Period Configuration State
  const [gracePeriod, setGracePeriod] = useState<number>(classItem?.gracePeriod ?? 5);
  const [showGraceConfig, setShowGraceConfig] = useState<boolean>(false);
  const [savingGrace, setSavingGrace] = useState<boolean>(false);

  // Student Profile Inspection Modal
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (classItem) {
      setGracePeriod(classItem.gracePeriod !== undefined ? classItem.gracePeriod : 5);
      if (!isTutorOrAdmin && activeTab === 'roster') {
        setActiveTab('materials');
      }
    }
  }, [classItem?.id, classItem?.gracePeriod, isTutorOrAdmin, activeTab]);

  const handleSaveGracePeriod = async (newGrace: number) => {
    if (!classItem) return;
    setSavingGrace(true);
    try {
      await firestoreService.updateClass(classItem.id, {
        gracePeriod: Number(newGrace)
      });
      setGracePeriod(Number(newGrace));
      showToast(`Grace period updated to ${newGrace} minutes for '${classItem.title}'!`, 'success');
      
      await firestoreService.addAuditLog({
        username: currentUser.name || currentUser.username || 'Tutor',
        action: 'CLASS_GRACE_PERIOD_UPDATED',
        details: `Updated attendance grace period to ${newGrace} mins for class ${classItem.title} (${classItem.id})`
      });

      if (onUpdateData) onUpdateData();
      setShowGraceConfig(false);
    } catch (err) {
      showToast('Failed to update grace period.', 'error');
    } finally {
      setSavingGrace(false);
    }
  };

  // Clear bulk selections whenever class or search changes
  useEffect(() => {
    setSelectedStudentIds([]);
  }, [classItem?.id, searchQuery, activeTab]);

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

  // Check if current user is a student and suspended for this class
  const isCurrentStudentSuspended = currentUser.role === 'student' && (
    currentUser.classEnrollmentStatus?.[classItem.id] === 'suspended' || 
    currentUser.status === 'suspended'
  );

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
      .filter(p => (p.studentId === booking.studentId || (p.studentName && booking.studentName && p.studentName.toLowerCase() === booking.studentName.toLowerCase())) && p.classId === classItem.id && p.status === 'paid')
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

  // Bulk Selection Helpers
  const filteredStudentIds = filteredStudents.map(s => s.studentId);
  const isAllFilteredSelected = filteredStudentIds.length > 0 && filteredStudentIds.every(id => selectedStudentIds.includes(id));

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !filteredStudentIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...selectedStudentIds, ...filteredStudentIds]));
      setSelectedStudentIds(combined);
    }
  };

  const handleToggleSelectStudent = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId) 
        : [...prev, studentId]
    );
  };

  // Bulk Status Change Handler (Active <-> Suspended)
  const handleBulkStatusChange = async (newStatus: 'active' | 'suspended') => {
    if (selectedStudentIds.length === 0 || !classItem) return;
    setIsBulkUpdating(true);

    try {
      let count = 0;
      for (const studentId of selectedStudentIds) {
        const user = allUsers.find(u => u.uid === studentId);
        const currentMap = user?.classEnrollmentStatus || {};
        const updatedMap = { ...currentMap, [classItem.id]: newStatus };

        await firestoreService.updateUserProfile(studentId, {
          classEnrollmentStatus: updatedMap
        });
        count++;
      }

      showToast(
        `Successfully updated status to ${newStatus.toUpperCase()} for ${count} student(s) in '${classItem.title}'!`,
        'success'
      );

      await firestoreService.addAuditLog({
        username: currentUser.name || currentUser.username || 'Tutor',
        action: 'BULK_CLASS_ENROLLMENT_STATUS_CHANGE',
        details: `Bulk updated ${count} student(s) to ${newStatus.toUpperCase()} for class ${classItem.title} (${classItem.id})`
      });

      setSelectedStudentIds([]);
      if (onUpdateData) onUpdateData();
    } catch (err) {
      showToast('Failed to perform bulk status update.', 'error');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Bulk Unenroll Handler (Remove from Class Roster)
  const handleBulkUnenroll = async () => {
    if (selectedStudentIds.length === 0 || !classItem) return;
    if (!window.confirm(`Are you sure you want to UNENROLL / REMOVE ${selectedStudentIds.length} student(s) from '${classItem.title}'? This will unenroll them from the class roster.`)) return;

    setIsBulkUpdating(true);
    try {
      let count = 0;
      for (const studentId of selectedStudentIds) {
        const booking = classBookings.find(b => b.studentId === studentId);
        if (booking) {
          await firestoreService.cancelBooking(booking.id, classItem.id);
          count++;
        }
      }

      showToast(`Successfully unenrolled ${count} student(s) from '${classItem.title}'.`, 'info');

      await firestoreService.addAuditLog({
        username: currentUser.name || currentUser.username || 'Tutor',
        action: 'BULK_STUDENT_UNENROLLMENT',
        details: `Bulk unenrolled ${count} student(s) from class ${classItem.title} (${classItem.id})`
      });

      setSelectedStudentIds([]);
      if (onUpdateData) onUpdateData();
    } catch (err) {
      showToast('Failed to unenroll selected students.', 'error');
    } finally {
      setIsBulkUpdating(false);
    }
  };

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
    if (!newTitle.trim()) {
      showToast('Please enter a title for the resource.', 'info');
      return;
    }

    if (newMode === 'file' && !newFile) {
      showToast('Please choose a file to upload.', 'info');
      return;
    }

    if (newMode === 'link' && !newUrl.trim()) {
      showToast('Please enter a valid reference link / URL.', 'info');
      return;
    }

    setSavingMaterial(true);
    setUploadProgress(0);

    try {
      let finalUrl = newUrl.trim();
      let finalFileName = '';
      let finalFileSize = 0;
      let finalFileType = '';
      let finalStoragePath = '';

      if (newMode === 'file' && newFile) {
        const uploadRes = await firestoreService.uploadResourceFile(
          newFile,
          classItem.id,
          currentUser.uid,
          (progress) => setUploadProgress(progress)
        );
        finalUrl = uploadRes.url;
        finalFileName = uploadRes.fileName;
        finalFileSize = uploadRes.fileSize;
        finalFileType = uploadRes.fileType;
        finalStoragePath = uploadRes.storagePath;
      }

      const newMat = await firestoreService.saveStudyMaterial({
        title: newTitle.trim(),
        description: newDesc.trim(),
        subject: classItem.subject,
        referenceUrl: finalUrl,
        type: newType,
        tutorId: currentUser.uid,
        tutorName: currentUser.name,
        classId: classItem.id,
        classTitle: classItem.title,
        isVisible: true,
        fileName: finalFileName || undefined,
        fileSize: finalFileSize || undefined,
        fileType: finalFileType || undefined,
        storagePath: finalStoragePath || undefined
      });

      setMaterials(prev => [newMat, ...prev]);
      setNewTitle('');
      setNewDesc('');
      setNewUrl('');
      setNewFile(null);
      setUploadProgress(0);
      setShowAddMaterial(false);
      showToast('Study material published successfully!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Could not save material.', 'error');
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

          {/* Modal Navigation Tabs & Controls */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-3 overflow-x-auto shrink-0">
            <div className="flex gap-2 text-xs font-bold shrink-0">
              {isTutorOrAdmin && (
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
              )}
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
                <History className="w-4 h-4" /> {isTutorOrAdmin ? `Attendance Logs (${classAttendanceLogs.length})` : 'My Attendance Logs'}
              </button>
              <button
                onClick={() => setActiveTab('availability')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'availability' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
                id="tab_class_tutor_availability"
              >
                <CalendarCheck className="w-4 h-4 text-emerald-500" /> Tutor Availability
              </button>
            </div>

            {/* Right side of Nav Bar: Grace Period Configuration Trigger for Tutors/Admins */}
            {isTutorOrAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowGraceConfig(!showGraceConfig)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                    showGraceConfig 
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold' 
                      : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                  id="btn_toggle_grace_period_config"
                  title="Configure class attendance grace period"
                >
                  <Timer className="w-3.5 h-3.5 text-amber-600" />
                  <span>Grace Period: <b>{gracePeriod} min</b></span>
                  <Sliders className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            )}
          </div>

          {/* Grace Period Configuration Banner Drawer */}
          {showGraceConfig && isTutorOrAdmin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-amber-50 border-b border-amber-200 p-4 shrink-0"
              id="panel_grace_period_configuration"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-amber-200 rounded-lg text-amber-800">
                      <Timer className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-black text-amber-950">
                      Attendance Grace Period Setting
                    </h4>
                    <span className="text-[10px] font-mono font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                      Active: {gracePeriod} Minutes
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed max-w-xl">
                    Define the arrival grace window. Students who check in / scan after <strong>class start time + {gracePeriod} minutes</strong> will be automatically marked as <strong>'Late'</strong> instead of 'On Time' and receive a Late alert.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-amber-900">Set Window:</span>
                  {[0, 5, 10, 15, 20, 30].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleSaveGracePeriod(mins)}
                      disabled={savingGrace}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer shadow-2xs ${
                        gracePeriod === mins
                          ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                          : 'bg-white hover:bg-amber-100 text-amber-950 border border-amber-300'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Modal Tab Content Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">

            {/* TAB 1: ENROLLED STUDENT ROSTER (TUTORS & ADMINS ONLY) */}
            {activeTab === 'roster' && isTutorOrAdmin && (
              <div className="space-y-4">
                {/* Suspended Warning Banner for Student */}
                {isCurrentStudentSuspended && (
                  <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-extrabold text-red-900">Class Enrollment Suspended</h4>
                      <p className="text-[11px] text-red-700 mt-0.5 leading-relaxed">
                        You remain enrolled on this class roster, but your access to class details, study materials, external links, and video recordings is currently suspended by tutor/admin. Please contact administration or your tutor to reactivate access.
                      </p>
                    </div>
                  </div>
                )}

                {/* Bulk Actions Control Bar for Tutor / Admin */}
                {isTutorOrAdmin && selectedStudentIds.length > 0 && (
                  <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-3 border border-slate-800">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4.5 h-4.5 text-emerald-400" />
                      <span className="text-xs font-bold font-mono">
                        {selectedStudentIds.length} student(s) selected
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        disabled={isBulkUpdating}
                        onClick={() => handleBulkStatusChange('active')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        title="Set status to ACTIVE for selected students"
                        id="btn_bulk_activate"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Bulk Activate
                      </button>

                      <button
                        disabled={isBulkUpdating}
                        onClick={() => handleBulkStatusChange('suspended')}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        title="Suspend access to details & materials for selected students"
                        id="btn_bulk_suspend"
                      >
                        <UserX className="w-3.5 h-3.5" /> Bulk Suspend
                      </button>

                      <button
                        disabled={isBulkUpdating}
                        onClick={handleBulkUnenroll}
                        className="px-3 py-1.5 bg-red-600/90 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        title="Unenroll/remove selected students from class"
                        id="btn_bulk_unenroll"
                      >
                        <UserMinus className="w-3.5 h-3.5" /> Bulk Unenroll
                      </button>

                      <button
                        onClick={() => setSelectedStudentIds([])}
                        className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Deselect
                      </button>
                    </div>
                  </div>
                )}

                {/* Search Bar & Select All Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search student by name, email, or UID..."
                      className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    {isTutorOrAdmin && filteredStudents.length > 0 && (
                      <button
                        onClick={handleToggleSelectAll}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
                        id="btn_select_all_students"
                      >
                        {isAllFilteredSelected ? (
                          <>
                            <CheckSquare className="w-4 h-4 text-indigo-600" /> Deselect All ({filteredStudents.length})
                          </>
                        ) : (
                          <>
                            <Square className="w-4 h-4 text-slate-400" /> Select All ({filteredStudents.length})
                          </>
                        )}
                      </button>
                    )}

                    <span className="text-xs font-mono text-slate-500 font-semibold">
                      Showing {filteredStudents.length} of {enrolledStudentProfiles.length}
                    </span>
                  </div>
                </div>

                {filteredStudents.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-extrabold text-slate-700">No Enrolled Students Found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Students who book this class will appear in this roster.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredStudents.map(({ studentId, studentName, photoURL, email, classStatus, paymentCategory, lastPaymentMonth, user }) => {
                      const isSuspended = classStatus === 'suspended';
                      const isSelected = selectedStudentIds.includes(studentId);

                      // Calculate punctuality metrics for this student
                      const studentPunctuality = calculateStudentPunctuality(
                        studentId,
                        attendanceRecords,
                        [classItem]
                      );

                      const handleOpenProfile = () => {
                        const targetUser: UserProfile = user || {
                          uid: studentId,
                          name: studentName,
                          email: email !== 'N/A' ? email : '',
                          role: 'student',
                          photoURL: photoURL,
                          status: isSuspended ? 'suspended' : 'active',
                          classEnrollmentStatus: { [classItem.id]: classStatus as any },
                          createdAt: new Date().toISOString()
                        };
                        setSelectedStudentForProfile(targetUser);
                      };

                      return (
                        <div 
                          key={studentId}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                            isSelected
                              ? 'bg-indigo-50/50 border-indigo-400 shadow-xs ring-1 ring-indigo-400/30'
                              : isSuspended 
                              ? 'bg-red-50/40 border-red-200' 
                              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {/* Selection Checkbox for Tutors/Admins */}
                              {isTutorOrAdmin && (
                                <button
                                  onClick={() => handleToggleSelectStudent(studentId)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer shrink-0"
                                  title={isSelected ? "Deselect student" : "Select student"}
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-5 h-5 text-indigo-600" />
                                  ) : (
                                    <Square className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                                  )}
                                </button>
                              )}

                              {photoURL ? (
                                <img 
                                  referrerPolicy="no-referrer"
                                  src={photoURL} 
                                  alt={studentName} 
                                  onClick={handleOpenProfile}
                                  className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0 cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all"
                                  title="Click to view student profile"
                                />
                              ) : (
                                <div 
                                  onClick={handleOpenProfile}
                                  className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-sm shrink-0 cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all"
                                  title="Click to view student profile"
                                >
                                  {studentName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 
                                    onClick={handleOpenProfile}
                                    className="text-xs font-extrabold text-slate-900 leading-tight hover:text-indigo-600 cursor-pointer transition-colors"
                                  >
                                    {studentName}
                                  </h4>

                                  {/* LATE ARRIVAL BADGE */}
                                  {studentPunctuality.isConsistentlyLate && (
                                    <span 
                                      onClick={handleOpenProfile}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-slate-950 shadow-2xs border border-amber-300 cursor-pointer hover:bg-amber-400"
                                      title={studentPunctuality.badgeDescription}
                                      id={`badge_roster_late_${studentId}`}
                                    >
                                      <AlertTriangle className="w-2.5 h-2.5 fill-slate-950 text-amber-500" />
                                      Late Arrival ({studentPunctuality.lateRate}%)
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] text-slate-500 truncate max-w-[160px]">{email}</p>
                                <p className="text-[10px] font-mono text-slate-400">UID: {studentId}</p>
                              </div>
                            </div>

                            {/* Class Status Badge */}
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase font-mono shrink-0 ${
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

                          {/* Action Buttons: Inspect Profile & Single Status Toggle Control */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleOpenProfile}
                              className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                              id={`btn_inspect_student_${studentId}`}
                            >
                              <FileText className="w-3.5 h-3.5" /> View Profile
                            </button>

                            {isTutorOrAdmin && (
                              <button
                                type="button"
                                onClick={() => handleToggleStudentStatus(studentId, classStatus, studentName)}
                                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                  isSuspended 
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' 
                                    : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                                }`}
                              >
                                {isSuspended ? (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5" /> Reactivate
                                  </>
                                ) : (
                                  <>
                                    <UserX className="w-3.5 h-3.5" /> Suspend
                                  </>
                                )}
                              </button>
                            )}
                          </div>
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
                {isCurrentStudentSuspended ? (
                  <div className="text-center py-12 px-6 bg-red-50/50 rounded-2xl border-2 border-dashed border-red-200 space-y-3">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-black text-slate-900">Resource Access Locked (Suspended)</h4>
                    <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                      Your enrollment status for <strong className="text-slate-900">{classItem.title}</strong> is currently <span className="text-red-700 font-bold uppercase font-mono">Suspended</span>. You are listed on the class roster, but access to study notes, reference links, PDFs, and video recordings is disabled.
                    </p>
                    <div className="pt-2">
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-100 text-red-800 text-[11px] font-mono font-bold rounded-full border border-red-200">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-600" /> Contact your Tutor or Admin to restore access
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
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
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-indigo-950 uppercase font-mono tracking-wider">
                        Add New Resource for {classItem.title}
                      </h4>
                      {/* Mode switch */}
                      <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setNewMode('file')}
                          className={`px-2.5 py-1 rounded-md transition-all ${
                            newMode === 'file' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Upload File
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewMode('link')}
                          className={`px-2.5 py-1 rounded-md transition-all ${
                            newMode === 'link' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Drive / Link
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-650 mb-1">Resource Title *</label>
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
                          <option value="file">Document / PDF File</option>
                          <option value="link">External Link / Google Drive</option>
                          <option value="video">Video Recording</option>
                          <option value="note">Class Notes / Summary</option>
                        </select>
                      </div>
                    </div>

                    {newMode === 'file' ? (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-650 mb-1">Select File (PDF, Docs, Image, etc.) *</label>
                        <input
                          type="file"
                          required={newMode === 'file'}
                          onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                          className="w-full text-xs px-3 py-1.5 bg-white border border-dashed border-indigo-200 rounded-xl outline-none text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                        {newFile && (
                          <p className="mt-1 text-[10px] font-mono text-slate-500">
                            Selected: {newFile.name} ({(newFile.size / 1024).toFixed(1)} KB)
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-650 mb-1">Resource URL / Download Link *</label>
                        <input
                          required={newMode === 'link'}
                          type="url"
                          value={newUrl}
                          onChange={(e) => setNewUrl(e.target.value)}
                          placeholder="https://drive.google.com/file/d/..."
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                    )}

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

                    {savingMaterial && uploadProgress > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-indigo-650">
                          <span>Uploading resource file...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-200"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

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
                              <button 
                                type="button"
                                onClick={() => binaryStore.openOrDownload(mat)}
                                className="text-[10px] font-mono text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1.5 mt-1 cursor-pointer font-bold"
                              >
                                {mat.storagePath || mat.fileName ? <Download className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
                                <span>{mat.fileName || (mat.referenceUrl.startsWith('indexeddb://') ? 'Download Stored Document' : mat.referenceUrl)}</span>
                              </button>
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
                  </>
                )}
              </div>
            )}

            {/* TAB 3: ATTENDANCE HISTORY LOGS */}
            {activeTab === 'attendance' && (() => {
              const displayedAttendanceLogs = isTutorOrAdmin
                ? classAttendanceLogs
                : classAttendanceLogs.filter(log => log.studentId === currentUser.uid || log.studentName === currentUser.name || (currentUser.email && (log as any).studentEmail === currentUser.email));

              return (
                <div className="space-y-3">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-2">
                    <History className="w-4 h-4 text-indigo-600" /> {isTutorOrAdmin ? 'Class Session Attendance Logs' : 'My Attendance Logs for this Class'}
                  </h3>

                  {displayedAttendanceLogs.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-extrabold text-slate-700">No Attendance Logs Recorded</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isTutorOrAdmin ? 'Use the QR scanner at class start to record live student presence.' : 'Your verified attendance check-ins will show up here.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {displayedAttendanceLogs.map((log) => (
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
              );
            })()}

            {/* TAB 4: TUTOR AVAILABILITY & CALENDAR SCHEDULE */}
            {activeTab === 'availability' && (() => {
              const tutorUser = allUsers.find(u => u.uid === classItem.tutorId) || allUsers.find(u => u.name === classItem.tutorName) || (currentUser.uid === classItem.tutorId ? currentUser : null);
              const summary = tutorUser ? getTutorAvailabilitySummary(tutorUser) : null;
              const classCheck = checkClassAvailability(classItem, tutorUser);
              const tutorDetails = tutorUser?.tutorDetails;
              const recurring = tutorDetails?.recurringAvailability || [];
              const workingHours = tutorDetails?.workingHours || [];
              const specificDates = tutorDetails?.specificDateAvailability || [];
              const daysOff = tutorDetails?.daysOff || [];

              return (
                <div className="space-y-6" id="panel_tutor_availability">
                  {/* Tutor Status Header Card */}
                  <div className="p-5 rounded-2xl bg-linear-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      {tutorUser?.photoURL ? (
                        <img 
                          referrerPolicy="no-referrer"
                          src={tutorUser.photoURL} 
                          alt={tutorUser.name} 
                          className="w-12 h-12 rounded-full object-cover border-2 border-indigo-400"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-base text-white">
                          {classItem.tutorName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                          {classItem.tutorName}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            tutorUser?.availabilityStatus === 'away' 
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : tutorUser?.availabilityStatus === 'in_class'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}>
                            {tutorUser?.availabilityStatus === 'away' ? 'Away' : tutorUser?.availabilityStatus === 'in_class' ? 'In Class' : 'Available'}
                          </span>
                        </h3>
                        <p className="text-xs text-indigo-200 mt-0.5">
                          {tutorDetails?.teachingSpecialty || 'Lead Instructor'} • {tutorDetails?.experienceYears || 5}+ Years Teaching Experience
                        </p>
                      </div>
                    </div>

                    {/* Class Schedule Validation Banner */}
                    <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                      classCheck.isAvailable 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      {classCheck.isAvailable ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Class Time Active: {classItem.schedule}</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                          <span>Unavailable: {classCheck.reason}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Recurring Availability Grid */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-indigo-600" /> Recurring Weekly Teaching Slots
                    </h4>

                    {recurring.length === 0 ? (
                      <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                        <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">Standard Working Hours Apply</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Tutor is available during standard weekday scheduling hours.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {recurring.map((slot) => (
                          <div 
                            key={slot.id} 
                            className={`p-3.5 rounded-2xl border transition-all ${
                              slot.isActive 
                                ? 'bg-white border-slate-200 shadow-2xs' 
                                : 'bg-slate-50/70 border-slate-100 opacity-60'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-xs font-extrabold text-slate-900">{slot.dayOfWeek}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase ${
                                slot.isActive 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-slate-100 text-slate-500'
                              }`}>
                                {slot.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-mono font-bold">
                              <Clock3 className="w-3.5 h-3.5 text-indigo-500" />
                              <span>{slot.startTime} – {slot.endTime}</span>
                            </div>
                            {slot.label && (
                              <p className="text-[10px] text-slate-400 mt-1 truncate">{slot.label}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Days Off & Specific Date Overrides */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Days Off */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Scheduled Days Off
                      </h5>
                      {daysOff.length === 0 ? (
                        <p className="text-[11px] text-slate-400">No scheduled weekly off-days configured.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {daysOff.map((day, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                              {day}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Specific Date Blackouts */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-rose-500" /> Specific Date Exceptions
                      </h5>
                      {specificDates.length === 0 ? (
                        <p className="text-[11px] text-slate-400">No blackout dates or special closures reported.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {specificDates.map((sp) => (
                            <div key={sp.id} className="p-2 rounded-xl bg-white border border-slate-200 text-xs flex justify-between items-center">
                              <div>
                                <span className="font-mono font-bold text-slate-800">{sp.date}</span>
                                <p className="text-[10px] text-slate-500">{sp.reason || 'Date unavailable'}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono ${
                                sp.isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {sp.isAvailable ? 'Available' : 'Blocked'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        </motion.div>
      </div>

      {/* Student Profile Modal for Tutors/Admins */}
      {selectedStudentForProfile && (
        <StudentProfileModal
          isOpen={!!selectedStudentForProfile}
          onClose={() => setSelectedStudentForProfile(null)}
          student={selectedStudentForProfile}
          currentUser={currentUser}
          classes={[classItem]}
          attendanceRecords={attendanceRecords}
          bookings={bookings}
          showToast={showToast}
        />
      )}
    </AnimatePresence>
  );
};
