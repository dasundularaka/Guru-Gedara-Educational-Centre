import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  QrCode, 
  Search, 
  User, 
  Camera, 
  CameraOff, 
  Edit3, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  BookOpen, 
  AlertCircle, 
  RefreshCw, 
  UserCheck, 
  UserX, 
  Mail, 
  Phone, 
  GraduationCap, 
  Building2, 
  Calendar, 
  Loader2, 
  Check, 
  X, 
  ChevronRight,
  Filter,
  Eye,
  Info,
  Send,
  Upload,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsQR from 'jsqr';
import { UserProfile, ClassItem, Booking } from '../types';
import { firestoreService } from '../lib/firestoreService';
import { AdminQRScannerModal } from './AdminQRScannerModal';
import { AdminDirectMessageModal } from './AdminDirectMessageModal';

interface AdminUsersAndApprovalsProps {
  currentUser: UserProfile;
  users: UserProfile[];
  classes: ClassItem[];
  bookings: Booking[];
  refreshUsers: () => Promise<void> | void;
  refreshBookings: () => Promise<void> | void;
  refreshClasses: () => Promise<void> | void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onOpenStudentProfile?: (student: UserProfile) => void;
  onOpenClassProfile?: (classItem: ClassItem) => void;
}

export const AdminUsersAndApprovals: React.FC<AdminUsersAndApprovalsProps> = ({
  currentUser,
  users = [],
  classes = [],
  bookings = [],
  refreshUsers,
  refreshBookings,
  refreshClasses,
  showToast,
  onOpenStudentProfile,
  onOpenClassProfile
}) => {
  // Live Real-Time Synced Datasets for cross-browser live updates
  const [liveUsers, setLiveUsers] = useState<UserProfile[]>(users);
  const [liveBookings, setLiveBookings] = useState<Booking[]>(bookings);

  useEffect(() => {
    if (Array.isArray(users) && users.length > 0) {
      setLiveUsers(users);
    }
  }, [users]);

  useEffect(() => {
    if (Array.isArray(bookings)) {
      setLiveBookings(bookings);
    }
  }, [bookings]);

  useEffect(() => {
    const unsubUsers = firestoreService.subscribeUsers((updatedUsers) => {
      if (Array.isArray(updatedUsers) && updatedUsers.length > 0) {
        setLiveUsers(updatedUsers);
      }
    });

    const unsubBookings = firestoreService.subscribeBookings((updatedBookings) => {
      if (Array.isArray(updatedBookings)) {
        setLiveBookings(updatedBookings);
      }
    });

    return () => {
      unsubUsers();
      unsubBookings();
    };
  }, []);

  // Main view navigation tab
  const [activeTab, setActiveTab] = useState<'directory' | 'approvals'>('directory');
  
  // Directory Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'tutor' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'pending'>('all');
  
  // Selected user for inspection
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // QR Scanner State
  const [showQRModal, setShowQRModal] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Success Confirmation Notification Banner with animations
  const [successNotice, setSuccessNotice] = useState<{
    type: 'approve' | 'decline';
    title: string;
    subtitle: string;
    targetName: string;
    timestamp: string;
  } | null>(null);

  // Edit User Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Admin Direct Messaging Modal State
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatTargetUser, setChatTargetUser] = useState<UserProfile | null>(null);

  const handleOpenChatWithUser = (targetUser?: UserProfile | null) => {
    setChatTargetUser(targetUser || null);
    setIsChatModalOpen(true);
  };
  const [editForm, setEditForm] = useState<{
    name: string;
    email: string;
    phone: string;
    role: 'student' | 'tutor' | 'admin';
    status: 'active' | 'suspended' | 'pending';
    grade: string;
    school: string;
    parentContact: string;
    notes: string;
  }>({
    name: '',
    email: '',
    phone: '',
    role: 'student',
    status: 'active',
    grade: '',
    school: '',
    parentContact: '',
    notes: ''
  });
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Confirmation Modal State (for approvals, declines, suspensions)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'approve_class' | 'decline_class' | 'approve_student' | 'decline_student' | 'toggle_status';
    title: string;
    message: string;
    targetId: string;
    targetName: string;
    requiresNote?: boolean;
    noteLabel?: string;
    confirmButtonText: string;
    confirmButtonColor: 'emerald' | 'rose' | 'amber';
  } | null>(null);
  const [dialogNote, setDialogNote] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Auto-dismiss success notification banner
  useEffect(() => {
    if (successNotice) {
      const timer = setTimeout(() => {
        setSuccessNotice(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [successNotice]);

  // Approvals Sub-Filter
  const [approvalCategory, setApprovalCategory] = useState<'classes' | 'admissions' | 'history'>('classes');

  // Filtered Users using live synced users
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return liveUsers.filter(u => {
      // Role filter
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      // Status filter
      if (statusFilter !== 'all') {
        const uStatus = u.status || 'active';
        if (uStatus !== statusFilter) return false;
      }
      // Query filter
      if (!q) return true;
      const matchName = u.name?.toLowerCase().includes(q);
      const matchUsername = u.username?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchPhone = u.phone?.toLowerCase().includes(q);
      const matchUid = u.uid.toLowerCase().includes(q);
      return matchName || matchUsername || matchEmail || matchPhone || matchUid;
    });
  }, [liveUsers, searchQuery, roleFilter, statusFilter]);

  // Pending Class Requests using live synced bookings
  const pendingClassRequests = useMemo(() => {
    return liveBookings.filter(b => b.status === 'pending_approval');
  }, [liveBookings]);

  // Pending Student Admissions using live synced users
  const pendingStudentAdmissions = useMemo(() => {
    return liveUsers.filter(u => u.role === 'student' && u.status === 'pending');
  }, [liveUsers]);

  // Decision Records (Previously decided class requests and student admissions)
  const decisionRecords = useMemo(() => {
    const classDecisions = liveBookings
      .filter(b => b.decision || b.status === 'approved' || b.status === 'declined')
      .map(b => ({
        id: b.id,
        type: 'Class Enrollment' as const,
        targetUser: b.studentName,
        targetUsername: b.studentId,
        subjectItem: b.classTitle,
        decision: (b.decision || (b.status === 'approved' ? 'approved' : 'declined')) as 'approved' | 'declined',
        decidedBy: b.decidedBy || 'Administrator',
        decidedByUsername: b.decidedByUsername || 'admin',
        decisionTimestamp: b.decisionTimestamp || b.createdAt || new Date().toISOString(),
        decisionNote: b.decisionNote || 'No administrative comments recorded'
      }));

    const studentDecisions = liveUsers
      .filter(u => u.admissionDecision)
      .map(u => ({
        id: u.uid,
        type: 'Student Admission' as const,
        targetUser: u.name,
        targetUsername: u.username || u.uid,
        subjectItem: `Academic Grade ${u.studentDetails?.grade || 'Standard'}`,
        decision: u.admissionDecision as 'approved' | 'declined',
        decidedBy: u.admissionDecidedBy || 'Administrator',
        decidedByUsername: u.admissionDecidedByUsername || 'admin',
        decisionTimestamp: u.admissionDecisionTimestamp || u.createdAt || new Date().toISOString(),
        decisionNote: u.admissionDecisionNote || 'No administrative comments recorded'
      }));

    return [...classDecisions, ...studentDecisions].sort((a, b) => 
      new Date(b.decisionTimestamp).getTime() - new Date(a.decisionTimestamp).getTime()
    );
  }, [liveBookings, liveUsers]);

  // User details: Enrolled Classes for selected student
  const selectedUserEnrolledClasses = useMemo(() => {
    if (!selectedUser || selectedUser.role !== 'student') return [];
    const isMatchBooking = (b: Booking) => {
      return (
        b.studentId === selectedUser.uid ||
        (!!selectedUser.email && !!b.studentEmail && b.studentEmail.toLowerCase() === selectedUser.email.toLowerCase()) ||
        (!!selectedUser.username && b.studentId === selectedUser.username) ||
        (!!selectedUser.name && !!b.studentName && b.studentName.toLowerCase() === selectedUser.name.toLowerCase())
      );
    };

    const cancelledIds = new Set(
      liveBookings.filter(b => isMatchBooking(b) && (b.status === 'cancelled' || b.status === 'declined')).map(b => b.classId)
    );
    const activeIds = new Set(
      liveBookings.filter(b => isMatchBooking(b) && (b.status === 'active' || b.status === 'approved')).map(b => b.classId)
    );

    const enrolledIds = new Set<string>();
    (selectedUser.selectedClasses || []).forEach(cid => {
      if (!cancelledIds.has(cid) || activeIds.has(cid)) enrolledIds.add(cid);
    });
    activeIds.forEach(cid => enrolledIds.add(cid));

    return classes.filter(c => enrolledIds.has(c.id));
  }, [selectedUser, liveBookings, classes]);

  // Taught classes if inspected user is a tutor
  const selectedTutorClasses = useMemo(() => {
    if (!selectedUser || selectedUser.role !== 'tutor') return [];
    return classes.filter(c => c.tutorId === selectedUser.uid || (selectedUser.name && c.tutorName?.toLowerCase() === selectedUser.name.toLowerCase()));
  }, [selectedUser, classes]);

  // Robust Camera Lifecycle using useEffect
  const startCamera = () => {
    setCameraError(null);
    setIsCameraActive(true);
  };

  const stopCamera = () => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (!isCameraActive) return;

    let isMounted = true;

    const initCamera = async () => {
      setCameraError(null);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError('Camera access is not supported by your browser or container environment.');
          return;
        }

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } }
          });
        } catch {
          // Fallback to standard video camera (desktop webcam or selfie camera)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
        }

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
          scanLoopRef.current = requestAnimationFrame(tickQRScan);
        }
      } catch (err: any) {
        console.warn("Camera init failed:", err);
        setCameraError(err.message || 'Unable to open camera. You can upload a QR image, search manually, or use the Fullscreen Scanner modal.');
      }
    };

    initCamera();

    return () => {
      isMounted = false;
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
        scanLoopRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [isCameraActive]);

  const processScannedPayload = (scannedText: string) => {
    if (!scannedText) return;
    const clean = scannedText.trim();
    setLastScannedCode(clean);

    // Universal search across ALL user roles: Students, Faculty Tutors, and Administrators
    const cleanNoPrefix = clean.replace(/^(stu|tut|adm|usr|qr)[_-]?/i, '');
    const matched = liveUsers.find(u => 
      (u.username && u.username.toLowerCase() === clean.toLowerCase()) ||
      (u.username && u.username.replace(/^(stu|tut|adm|usr)[_-]?/i, '').toLowerCase() === cleanNoPrefix.toLowerCase()) ||
      u.uid.toLowerCase() === clean.toLowerCase() ||
      (u.email && u.email.toLowerCase() === clean.toLowerCase()) ||
      (u.phone && u.phone.includes(clean)) ||
      clean.toLowerCase().includes(u.username?.toLowerCase() || '___') ||
      clean.toLowerCase().includes(u.uid.toLowerCase())
    );

    if (matched) {
      setSelectedUser(matched);
      const roleLabel = matched.role === 'tutor' ? 'Faculty Tutor' : matched.role === 'admin' ? 'Administrator' : 'Student';
      showToast(`Scanned ${roleLabel} Card: Loaded verified profile for ${matched.name} (@${matched.username || matched.uid})`, 'success');
      stopCamera();
    } else {
      showToast(`No user found in registry matching scanned QR code: "${clean}"`, 'error');
    }
  };

  const tickQRScan = () => {
    if (!videoRef.current) return;
    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        });
        if (qrCode && qrCode.data) {
          processScannedPayload(qrCode.data);
          return; // Pause scanning on match
        }
      }
    }
    scanLoopRef.current = requestAnimationFrame(tickQRScan);
  };

  // Upload QR Image fallback
  const handleQRImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
          if (qrCode && qrCode.data) {
            processScannedPayload(qrCode.data);
          } else {
            showToast("No readable QR code found in uploaded image.", "error");
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Populate edit form
  const handleOpenEditModal = (user: UserProfile) => {
    setEditForm({
      name: user.name || user.displayName || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role,
      status: (user.status === 'suspended' ? 'suspended' : user.status === 'pending' ? 'pending' : 'active') as 'active' | 'suspended' | 'pending',
      grade: user.studentDetails?.grade || '',
      school: user.studentDetails?.school || '',
      parentContact: user.studentDetails?.parentContact || '',
      notes: user.notes || ''
    });
    setIsEditModalOpen(true);
  };

  // Save edited user profile
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSavingUser(true);
    try {
      const updates: Partial<UserProfile> = {
        name: editForm.name.trim(),
        email: editForm.email.trim().toLowerCase(),
        phone: editForm.phone.trim(),
        role: editForm.role,
        status: editForm.status,
        notes: editForm.notes.trim()
      };

      if (editForm.role === 'student') {
        updates.studentDetails = {
          grade: editForm.grade.trim(),
          school: editForm.school.trim(),
          parentContact: editForm.parentContact.trim()
        };
      }

      await firestoreService.updateUserProfile(selectedUser.uid, updates);
      await firestoreService.addAuditLog({
        username: currentUser.username || currentUser.name,
        action: 'ADMIN_USER_PROFILE_UPDATED',
        details: `Administrator updated profile for ${selectedUser.name} (${selectedUser.uid})`
      });

      showToast(`User profile for ${editForm.name} updated successfully!`, 'success');
      setIsEditModalOpen(false);
      
      // Update local selected state
      setSelectedUser(prev => prev ? { ...prev, ...updates } : null);
      if (refreshUsers) await refreshUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to update user profile.', 'error');
    } finally {
      setIsSavingUser(false);
    }
  };

  // Open confirmation for changing status (Active <-> Suspended)
  const handlePromptStatusToggle = (user: UserProfile) => {
    const isCurrentlySuspended = user.status === 'suspended';
    const newStatus = isCurrentlySuspended ? 'active' : 'suspended';
    
    setConfirmDialog({
      isOpen: true,
      type: 'toggle_status',
      title: isCurrentlySuspended ? 'Activate User Account' : 'Suspend User Account',
      message: isCurrentlySuspended 
        ? `Are you sure you want to reactivate the account for ${user.name} (@${user.username || user.uid})? The user will be granted login access immediately.`
        : `Are you sure you want to suspend the account for ${user.name} (@${user.username || user.uid})? IMPORTANT: Suspended users CANNOT log into the system under any circumstances.`,
      targetId: user.uid,
      targetName: user.name,
      requiresNote: !isCurrentlySuspended,
      noteLabel: isCurrentlySuspended ? undefined : 'Reason for suspension (visible to user):',
      confirmButtonText: isCurrentlySuspended ? 'Confirm Activation' : 'Confirm Suspension',
      confirmButtonColor: isCurrentlySuspended ? 'emerald' : 'rose'
    });
    setDialogNote('');
  };

  // Open confirmation for class approval
  const handlePromptClassApprove = (booking: Booking) => {
    setConfirmDialog({
      isOpen: true,
      type: 'approve_class',
      title: 'Approve Class Enrollment Request',
      message: `Confirm approval for ${booking.studentName} to enroll in '${booking.classTitle}'? This will officially register the student and notify them.`,
      targetId: booking.id,
      targetName: `${booking.studentName} - ${booking.classTitle}`,
      requiresNote: false,
      noteLabel: 'Administrative Note (optional):',
      confirmButtonText: 'Confirm & Approve',
      confirmButtonColor: 'emerald'
    });
    setDialogNote('');
  };

  // Open confirmation for class decline
  const handlePromptClassDecline = (booking: Booking) => {
    setConfirmDialog({
      isOpen: true,
      type: 'decline_class',
      title: 'Decline Class Enrollment Request',
      message: `Are you sure you want to decline the enrollment request for ${booking.studentName} in '${booking.classTitle}'?`,
      targetId: booking.id,
      targetName: `${booking.studentName} - ${booking.classTitle}`,
      requiresNote: true,
      noteLabel: 'Reason for declining (mandatory):',
      confirmButtonText: 'Confirm & Decline',
      confirmButtonColor: 'rose'
    });
    setDialogNote('');
  };

  // Open confirmation for student admission approval
  const handlePromptStudentApprove = (student: UserProfile) => {
    setConfirmDialog({
      isOpen: true,
      type: 'approve_student',
      title: 'Approve Student Admission',
      message: `Confirm official admission for student ${student.name} (@${student.username || student.uid})? This activates the account and enables class enrollment.`,
      targetId: student.uid,
      targetName: student.name,
      requiresNote: false,
      noteLabel: 'Welcome note from administration (optional):',
      confirmButtonText: 'Approve Admission',
      confirmButtonColor: 'emerald'
    });
    setDialogNote('');
  };

  // Open confirmation for student admission decline
  const handlePromptStudentDecline = (student: UserProfile) => {
    setConfirmDialog({
      isOpen: true,
      type: 'decline_student',
      title: 'Decline Student Admission Application',
      message: `Are you sure you want to decline the registration application for ${student.name}? The account will remain locked and suspended from logging in.`,
      targetId: student.uid,
      targetName: student.name,
      requiresNote: true,
      noteLabel: 'Reason for declining application (mandatory):',
      confirmButtonText: 'Decline Application',
      confirmButtonColor: 'rose'
    });
    setDialogNote('');
  };

  // Execute confirmed action with admin audit stamps
  const handleExecuteConfirmedAction = async () => {
    if (!confirmDialog) return;
    if (confirmDialog.requiresNote && !dialogNote.trim()) {
      showToast("Please provide a reason before finalizing this action.", "error");
      return;
    }

    setIsProcessingAction(true);
    const adminInfo = {
      name: currentUser.name || currentUser.displayName || 'Administrator',
      username: currentUser.username || 'admin',
      note: dialogNote.trim()
    };

    try {
      const isApprove = confirmDialog.type.includes('approve') || (confirmDialog.type === 'toggle_status' && confirmDialog.confirmButtonColor === 'emerald');
      let outcomeTitle = '';
      let outcomeSubtitle = '';

      if (confirmDialog.type === 'approve_class') {
        await firestoreService.approveClassEnrollmentRequest(
          confirmDialog.targetId,
          'active',
          'Normal',
          adminInfo.name,
          adminInfo
        );
        outcomeTitle = 'Class Enrollment Approved';
        outcomeSubtitle = `Approved enrollment for ${confirmDialog.targetName}. Student admission badge and booking activated.`;
        showToast(`Enrollment request approved! Decision saved with timestamp and admin stamp.`, 'success');
      } else if (confirmDialog.type === 'decline_class') {
        await firestoreService.rejectClassEnrollmentRequest(
          confirmDialog.targetId,
          dialogNote.trim() || 'Request declined by administration',
          adminInfo.name,
          adminInfo
        );
        outcomeTitle = 'Class Enrollment Declined';
        outcomeSubtitle = `Declined request for ${confirmDialog.targetName}. Reason: "${dialogNote.trim() || 'Declined by administration'}".`;
        showToast(`Enrollment request declined. Reason and decision saved for the student.`, 'info');
      } else if (confirmDialog.type === 'approve_student') {
        await firestoreService.approveStudentAdmission(
          confirmDialog.targetId,
          adminInfo
        );
        outcomeTitle = 'Student Admission Approved';
        outcomeSubtitle = `Account for ${confirmDialog.targetName} has been activated. The student can now log in and enroll.`;
        showToast(`Student admission approved! Account activated for login.`, 'success');
      } else if (confirmDialog.type === 'decline_student') {
        await firestoreService.declineStudentAdmission(
          confirmDialog.targetId,
          dialogNote.trim() || 'Application declined by administration',
          adminInfo
        );
        outcomeTitle = 'Student Registration Declined';
        outcomeSubtitle = `Application for ${confirmDialog.targetName} declined. Account remains locked.`;
        showToast(`Student registration application declined.`, 'info');
      } else if (confirmDialog.type === 'toggle_status') {
        const targetUser = liveUsers.find(u => u.uid === confirmDialog.targetId);
        const newStatus = targetUser?.status === 'suspended' ? 'active' : 'suspended';
        await firestoreService.updateUserStatus(
          confirmDialog.targetId,
          newStatus,
          {
            name: adminInfo.name,
            username: adminInfo.username,
            reason: dialogNote.trim() || undefined
          }
        );
        outcomeTitle = `Account Status: ${newStatus.toUpperCase()}`;
        outcomeSubtitle = `User ${confirmDialog.targetName} is now set to ${newStatus.toUpperCase()}.`;
        showToast(`User status updated to ${newStatus.toUpperCase()}.`, 'success');
        if (selectedUser && selectedUser.uid === confirmDialog.targetId) {
          setSelectedUser(prev => prev ? { ...prev, status: newStatus } : null);
        }
      }

      // Record success notice for animated celebration overlay & banner
      setSuccessNotice({
        type: isApprove ? 'approve' : 'decline',
        title: outcomeTitle,
        subtitle: outcomeSubtitle,
        targetName: confirmDialog.targetName,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });

      setConfirmDialog(null);
      setDialogNote('');
      if (refreshBookings) await refreshBookings();
      if (refreshUsers) await refreshUsers();
      if (refreshClasses) await refreshClasses();
    } catch (err: any) {
      showToast(err.message || 'Action failed to execute. Please retry.', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="space-y-6" id="admin_users_and_approvals_view">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider">
              Administration Center
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              Logged in as @{currentUser.username || 'admin'}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Users & Approvals
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Scan user ID cards via QR camera, search and inspect user profiles with class rosters, and review all pending enrollment and admission approvals with audit timestamps.
          </p>
        </div>

        {/* Quick Stats Counter Pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-750 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" />
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none">Total Users</span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-200">{users.length}</span>
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase block leading-none">Pending Approvals</span>
              <span className="text-sm font-black text-amber-700 dark:text-amber-300">
                {pendingClassRequests.length + pendingStudentAdmissions.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Buttons */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('directory')}
          className={`pb-3 px-5 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'directory'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
          id="btn_tab_user_directory"
        >
          <Search className="w-4 h-4" />
          <span>User Directory & QR Scanner</span>
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`pb-3 px-5 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer relative ${
            activeTab === 'approvals'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
          id="btn_tab_approvals_panel"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Approvals Center</span>
          {(pendingClassRequests.length > 0 || pendingStudentAdmissions.length > 0) && (
            <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-white leading-none">
              {pendingClassRequests.length + pendingStudentAdmissions.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: USER DIRECTORY & QR SCANNER */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Integrated QR Scanner Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white">
                      Universal Academy ID & QR Scanner
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      All Roles Supported
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Scan digital ID cards for Students, Faculty Tutors, and Administrators to instantly inspect rosters, credentials, and records.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleOpenChatWithUser(null)}
                  className="py-2 px-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  id="btn_open_admin_messaging_hub"
                  title="Open administrative direct messaging hub to message any user"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Message Users</span>
                </button>

                <button
                  onClick={() => setShowQRModal(true)}
                  className="py-2 px-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  id="btn_open_dedicated_qr_scanner"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Dedicated Fullscreen Scanner</span>
                </button>

                {!isCameraActive ? (
                  <button
                    onClick={startCamera}
                    className="py-2 px-3.5 bg-slate-800 hover:bg-slate-750 text-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                    id="btn_start_qr_camera"
                  >
                    <Camera className="w-4 h-4 text-indigo-400" />
                    <span>In-Page Camera</span>
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="py-2 px-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    id="btn_stop_qr_camera"
                  >
                    <CameraOff className="w-4 h-4" />
                    <span>Stop Camera</span>
                  </button>
                )}

                {/* Upload QR file fallback */}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleQRImageUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                  title="Upload image containing QR code"
                  id="btn_upload_qr_image"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Upload QR</span>
                </button>
              </div>
            </div>

            {/* Live Camera Viewport */}
            {isCameraActive && (
              <div className="mt-4 flex flex-col items-center">
                <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black border-2 border-indigo-500/80 shadow-2xl">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                  />
                  {/* Targeting reticle overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-44 h-44 border-2 border-dashed border-emerald-400 rounded-2xl animate-pulse flex items-center justify-center">
                      <span className="text-[10px] text-emerald-300 font-mono font-bold bg-black/60 px-2 py-0.5 rounded">
                        Align Any User QR Code
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 text-center">
                  Position any Student, Faculty Tutor, or Staff ID QR code in front of the lens. Profile loads automatically once detected.
                </p>
              </div>
            )}

            {cameraError && (
              <div className="mt-3 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {lastScannedCode && (
              <div className="mt-3 p-2.5 bg-slate-800/80 rounded-xl flex items-center justify-between text-xs text-slate-300">
                <span>Last decoded payload: <code className="text-indigo-400 font-mono font-bold">{lastScannedCode}</code></span>
                <button
                  onClick={() => processScannedPayload(lastScannedCode)}
                  className="text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
                >
                  Reload Profile
                </button>
              </div>
            )}
          </div>

          {/* User Search & Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username, name, email, or ID..."
                className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-850 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                id="input_admin_user_search"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
                id="select_role_filter"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="tutor">Tutors</option>
                <option value="admin">Administrators</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
                id="select_status_filter"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Grid Layout: Selected User Inspector + User List */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left/Top: Selected User Full Details Card */}
            <div className="lg:col-span-5 order-2 lg:order-1">
              {selectedUser ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 sticky top-6" id="user_inspect_card">
                  {/* Header with Avatar, Role, Status & Edit Button */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {selectedUser.photoURL ? (
                          <img
                            src={selectedUser.photoURL}
                            alt={selectedUser.name}
                            className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-100 dark:border-indigo-900"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black text-xl flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                            {selectedUser.name?.charAt(0) || 'U'}
                          </div>
                        )}
                        <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                          selectedUser.status === 'suspended' ? 'bg-rose-500' : selectedUser.status === 'pending' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                            {selectedUser.name}
                          </h3>
                          {currentUser?.uid === selectedUser.uid && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider">
                              Me
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                          @{selectedUser.username || selectedUser.uid}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="px-2 py-0.5 text-[9px] font-black rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                            {selectedUser.role}
                          </span>
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase ${
                            selectedUser.status === 'suspended' 
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                              : selectedUser.status === 'pending'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          }`}>
                            {selectedUser.status || 'active'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Message & Edit Profile */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleOpenChatWithUser(selectedUser)}
                        className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-xl transition-all cursor-pointer border border-emerald-200 dark:border-emerald-800"
                        title={`Send Direct Message to ${selectedUser.name}`}
                        id="btn_chat_inspected_user"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(selectedUser)}
                        className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl transition-all cursor-pointer border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
                        title="Edit User Profile"
                        id="btn_edit_inspected_user"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Contact Info Table */}
                  <div className="space-y-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> Email
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                        {selectedUser.email || 'None registered'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> Phone
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">
                        {selectedUser.phone || 'None registered'}
                      </span>
                    </div>

                    {selectedUser.role === 'student' && selectedUser.studentDetails?.grade && (
                      <div className="flex items-center justify-between py-1">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5" /> Academic Grade
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          Grade {selectedUser.studentDetails.grade}
                        </span>
                      </div>
                    )}

                    {selectedUser.role === 'student' && selectedUser.studentDetails?.school && (
                      <div className="flex items-center justify-between py-1">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" /> School / Institute
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                          {selectedUser.studentDetails.school}
                        </span>
                      </div>
                    )}

                    {selectedUser.notes && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl text-[11px] text-slate-600 dark:text-slate-300">
                        <span className="font-bold text-slate-400 block mb-0.5">Admin Notes:</span>
                        {selectedUser.notes}
                      </div>
                    )}
                  </div>

                  {/* Student Class Details (If Student) */}
                  {selectedUser.role === 'student' && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Enrolled Classes ({selectedUserEnrolledClasses.length})</span>
                        </h4>
                        {onOpenStudentProfile && (
                          <button
                            onClick={() => onOpenStudentProfile(selectedUser)}
                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <span>Open Academic Dossier</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {selectedUserEnrolledClasses.length > 0 ? (
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          {selectedUserEnrolledClasses.map(c => (
                            <div
                              key={c.id}
                              className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 uppercase">
                                  {c.subject}
                                </span>
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate mt-1">
                                  {c.title}
                                </h5>
                                <p className="text-[10px] text-slate-500 truncate">
                                  Tutor: {c.tutorName} • {c.schedule}
                                </p>
                              </div>

                              {onOpenClassProfile && (
                                <button
                                  onClick={() => onOpenClassProfile(c)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
                                  title="View Class Profile"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl text-center border border-dashed border-slate-200 dark:border-slate-800">
                          <p className="text-xs text-slate-400">No active classes enrolled.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tutor Academic & Instruction Details (If Tutor) */}
                  {selectedUser.role === 'tutor' && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Assigned Classes ({selectedTutorClasses.length})</span>
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400">
                          {selectedUser.tutorDetails?.experience || 3}+ Yrs Experience
                        </span>
                      </div>

                      {selectedUser.tutorDetails?.qualification && (
                        <div className="p-2.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100/60 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200">
                          <span className="text-[10px] font-bold uppercase text-indigo-500 block mb-0.5">Faculty Qualification</span>
                          {selectedUser.tutorDetails.qualification}
                        </div>
                      )}

                      {selectedTutorClasses.length > 0 ? (
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          {selectedTutorClasses.map(c => (
                            <div
                              key={c.id}
                              className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 uppercase">
                                  {c.subject}
                                </span>
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate mt-1">
                                  {c.title}
                                </h5>
                                <p className="text-[10px] text-slate-500 truncate">
                                  LKR {c.price?.toLocaleString()} • {c.dayOfWeek || ''} {c.timeSlot || ''}
                                </p>
                              </div>
                              {onOpenClassProfile && (
                                <button
                                  onClick={() => onOpenClassProfile(c)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
                                  title="View Class Profile"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl text-center border border-dashed border-slate-200 dark:border-slate-800">
                          <p className="text-xs text-slate-400">No active classes assigned yet.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Admin Role Privileges (If Admin) */}
                  {selectedUser.role === 'admin' && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="p-3 bg-amber-50/60 dark:bg-amber-950/40 rounded-xl border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>System Administrator Privileges: Full enrollment approvals, financial ledger access, and member roster management.</span>
                      </div>
                    </div>
                  )}

                  {/* Direct Administrative Messaging Button */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Direct Messaging
                    </span>
                    <button
                      onClick={() => handleOpenChatWithUser(selectedUser)}
                      className="w-full py-2.5 px-3.5 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                      id="btn_direct_message_inspected_user"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Message {selectedUser.name?.split(' ')[0] || 'User'} (@{selectedUser.username || selectedUser.uid.slice(0, 8)})</span>
                    </button>
                  </div>

                  {/* Account Status Control: Active vs Suspended */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Account Status Control
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePromptStatusToggle(selectedUser)}
                        className={`flex-1 py-2.5 px-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                          selectedUser.status === 'suspended'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                        }`}
                        id="btn_toggle_user_status"
                      >
                        {selectedUser.status === 'suspended' ? (
                          <>
                            <UserCheck className="w-4 h-4" />
                            <span>Reactivate Account</span>
                          </>
                        ) : (
                          <>
                            <UserX className="w-4 h-4" />
                            <span>Suspend User (Block Login)</span>
                          </>
                        )}
                      </button>
                    </div>

                    {selectedUser.status === 'suspended' && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium leading-tight">
                        ⚠️ This user is currently SUSPENDED. They are barred from logging into the platform.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-900/60 rounded-3xl p-8 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                    No User Selected
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Scan an ID card QR code or select a user from the directory to load full profile details, class enrollments, and status controls.
                  </p>
                </div>
              )}
            </div>

            {/* Right/Bottom: Filtered Users List */}
            <div className="lg:col-span-7 order-1 lg:order-2 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span className="font-bold">Matching Registry Users ({filteredUsers.length})</span>
                <span>Click user to inspect</span>
              </div>

              <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                {filteredUsers.map(user => {
                  const isSelected = selectedUser?.uid === user.uid;
                  return (
                    <div
                      key={user.uid}
                      onClick={() => setSelectedUser(user)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                      id={`user_item_${user.uid}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.name}
                            className="w-10 h-10 rounded-xl object-cover shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold text-sm flex items-center justify-center shrink-0">
                            {user.name?.charAt(0) || 'U'}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {user.name}
                            </h4>
                            {currentUser?.uid === user.uid && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider">
                                Me
                              </span>
                            )}
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              user.status === 'suspended' ? 'bg-rose-500' : user.status === 'pending' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} />
                          </div>

                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 truncate">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              @{user.username || user.uid.slice(0, 8)}
                            </span>
                            <span>•</span>
                            <span className="truncate">{user.email || 'No email'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase ${
                          user.role === 'student' 
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : user.role === 'tutor'
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {user.role}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenChatWithUser(user);
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/60 cursor-pointer transition-colors"
                          title={`Send Direct Message to ${user.name}`}
                          id={`btn_message_user_${user.uid}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(user);
                            handleOpenEditModal(user);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Edit User Profile"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-400">No users match the search criteria.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: APPROVALS CENTER */}
      {activeTab === 'approvals' && (
        <div className="space-y-6">
          {/* Animated Success Banner for Approvals / Declines */}
          <AnimatePresence>
            {successNotice && (
              <motion.div
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.96 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className={`p-4 rounded-2xl border flex items-center justify-between gap-4 shadow-sm relative overflow-hidden ${
                  successNotice.type === 'approve'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ scale: 0.6, rotate: -25 }}
                    animate={{ scale: [0.6, 1.25, 1], rotate: [-25, 10, 0] }}
                    transition={{ duration: 0.45 }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                      successNotice.type === 'approve'
                        ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                        : 'bg-rose-500 text-white shadow-rose-500/30'
                    }`}
                  >
                    {successNotice.type === 'approve' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </motion.div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider">
                        {successNotice.title}
                      </span>
                      <span className="text-[10px] opacity-60 font-mono">
                        • {successNotice.timestamp}
                      </span>
                    </div>
                    <p className="text-xs font-medium opacity-90 mt-0.5">
                      {successNotice.subtitle}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSuccessNotice(null)}
                  className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sub-Tabs: Classes vs Admissions vs History */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              onClick={() => setApprovalCategory('classes')}
              className={`py-2 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                approvalCategory === 'classes'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              id="subtab_class_enrollment_requests"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Class Enrollment Requests</span>
              {pendingClassRequests.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white text-indigo-600 text-[10px] font-bold">
                  {pendingClassRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setApprovalCategory('admissions')}
              className={`py-2 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                approvalCategory === 'admissions'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              id="subtab_student_admissions"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student Admission Applications</span>
              {pendingStudentAdmissions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white text-indigo-600 text-[10px] font-bold">
                  {pendingStudentAdmissions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setApprovalCategory('history')}
              className={`py-2 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                approvalCategory === 'history'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              id="subtab_decision_history"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Decisions & Audit Log</span>
            </button>
          </div>

          {/* Sub-Section 1: Pending Class Enrollment Requests */}
          {approvalCategory === 'classes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Pending Class Enrollment Requests ({pendingClassRequests.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Students cannot self-enroll. Every submission requires admin verification and confirmation.
                  </p>
                </div>
              </div>

              {pendingClassRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {pendingClassRequests.map(req => (
                      <motion.div
                        layout
                        key={req.id}
                        initial={{ opacity: 0, scale: 0.95, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: -20, transition: { duration: 0.28, ease: "easeInOut" } }}
                        transition={{ layout: { duration: 0.35, ease: "easeOut" } }}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 relative"
                        id={`class_request_card_${req.id}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="px-2 py-0.5 text-[9px] font-black rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                              Pending Admin Approval
                            </span>
                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1.5">
                              {req.classTitle}
                            </h4>
                            <p className="text-xs text-slate-500">
                              Instructor: {req.tutorName} • {req.dayOfWeek || ''} {req.timeSlot || ''}
                            </p>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Requesting Student:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              {req.studentName}
                              {currentUser?.uid === req.studentId && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-600 text-white text-[8px] font-black uppercase">Me</span>
                              )}
                              <span className="text-slate-400 font-mono">(@{req.studentId})</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Date Submitted:</span>
                            <span className="font-mono text-slate-600 dark:text-slate-300">
                              {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Recent'}
                            </span>
                          </div>
                          {req.requestNote && (
                            <div className="pt-1 text-[11px] text-slate-600 dark:text-slate-300 italic border-t border-slate-200/60 dark:border-slate-800 mt-1">
                              "{req.requestNote}"
                            </div>
                          )}
                        </div>

                        {/* Approve & Decline Confirmation Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handlePromptClassApprove(req)}
                            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                            id={`btn_approve_class_${req.id}`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handlePromptClassDecline(req)}
                            className="flex-1 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            id={`btn_decline_class_${req.id}`}
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Decline</span>
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                    All Class Enrollment Requests Reviewed
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    There are no pending student enrollment requests awaiting administrative confirmation.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Sub-Section 2: Pending Student Admissions */}
          {approvalCategory === 'admissions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Pending Student Registrations ({pendingStudentAdmissions.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review incoming student registrations. Approved accounts receive full system login access.
                  </p>
                </div>
              </div>

              {pendingStudentAdmissions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {pendingStudentAdmissions.map(student => (
                      <motion.div
                        layout
                        key={student.uid}
                        initial={{ opacity: 0, scale: 0.95, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: -20, transition: { duration: 0.28, ease: "easeInOut" } }}
                        transition={{ layout: { duration: 0.35, ease: "easeOut" } }}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 relative"
                        id={`student_admission_card_${student.uid}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 font-black text-base flex items-center justify-center">
                              {student.name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                                  {student.name}
                                </h4>
                                {currentUser?.uid === student.uid && (
                                  <span className="px-1.5 py-0.2 rounded bg-indigo-600 text-white text-[9px] font-black uppercase">
                                    Me
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                                @{student.username || student.uid.slice(0, 8)}
                              </p>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 text-[9px] font-black rounded bg-amber-100 text-amber-700 uppercase">
                            Awaiting Admission
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Email:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{student.email}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Phone:</span>
                            <span className="font-mono text-slate-700 dark:text-slate-200">{student.phone || 'None'}</span>
                          </div>
                          {student.studentDetails?.grade && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Academic Grade:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">Grade {student.studentDetails.grade}</span>
                            </div>
                          )}
                          {student.studentDetails?.school && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">School:</span>
                              <span className="text-slate-700 dark:text-slate-300 truncate">{student.studentDetails.school}</span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handlePromptStudentApprove(student)}
                            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                            id={`btn_approve_student_${student.uid}`}
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>Approve Admission</span>
                          </button>
                          <button
                            onClick={() => handlePromptStudentDecline(student)}
                            className="flex-1 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            id={`btn_decline_student_${student.uid}`}
                          >
                            <UserX className="w-4 h-4" />
                            <span>Decline</span>
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                    No Pending Student Registrations
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    All student registrations have been processed and approved.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Sub-Section 3: Decision Records & Audit Log */}
          {approvalCategory === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Administrative Decision Records ({decisionRecords.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Permanent audit history showing all approval decisions with timestamp and deciding administrator.
                  </p>
                </div>
              </div>

              {decisionRecords.length > 0 ? (
                <div className="space-y-2.5">
                  {decisionRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase ${
                            rec.decision === 'approved'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                          }`}>
                            {rec.decision}
                          </span>
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                            {rec.type}
                          </span>
                          <h4 className="font-extrabold text-slate-900 dark:text-white">
                            {rec.subjectItem}
                          </h4>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Applicant: <strong className="text-slate-700 dark:text-slate-300">{rec.targetUser}</strong> (@{rec.targetUsername})
                        </p>

                        <p className="text-[11px] text-slate-600 dark:text-slate-300 italic">
                          "{rec.decisionNote}"
                        </p>
                      </div>

                      <div className="sm:text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Decided by:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {rec.decidedBy} <span className="text-indigo-600 dark:text-indigo-400 font-mono">(@{rec.decidedByUsername})</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                          {new Date(rec.decisionTimestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-400">No previous decision records recorded.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* EDIT USER MODAL */}
      <AnimatePresence>
        {isEditModalOpen && selectedUser && (
          <div className="fixed inset-0 z-55 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Edit User Profile
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    @{selectedUser.username || selectedUser.uid}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Full Name:
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Email Address:
                    </label>
                    <input
                      type="email"
                      required
                      value={editForm.email}
                      onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Phone Number:
                    </label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      User Role:
                    </label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value as any }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    >
                      <option value="student">Student</option>
                      <option value="tutor">Tutor</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Account Status:
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    >
                      <option value="active">Active (Can Login)</option>
                      <option value="suspended">Suspended (Blocked from Login)</option>
                      <option value="pending">Pending Approval</option>
                    </select>
                  </div>
                </div>

                {editForm.role === 'student' && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl space-y-3 border border-slate-200/70 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Student Academic Data
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Academic Grade:</label>
                        <input
                          type="text"
                          value={editForm.grade}
                          onChange={(e) => setEditForm(prev => ({ ...prev, grade: e.target.value }))}
                          placeholder="e.g. 10, 11, 12"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">School / Institute:</label>
                        <input
                          type="text"
                          value={editForm.school}
                          onChange={(e) => setEditForm(prev => ({ ...prev, school: e.target.value }))}
                          placeholder="School name"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Administrative Notes:
                  </label>
                  <textarea
                    rows={2}
                    value={editForm.notes}
                    onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Internal academy comments..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingUser}
                    className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingUser ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION DIALOG (FOR APPROVE / DECLINE / SUSPEND) */}
      <AnimatePresence>
        {confirmDialog && confirmDialog.isOpen && (
          <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmDialog.confirmButtonColor === 'emerald'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                    : confirmDialog.confirmButtonColor === 'rose'
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                }`}>
                  {confirmDialog.confirmButtonColor === 'emerald' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block">
                    Confirmation Required
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                    {confirmDialog.title}
                  </h3>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                {confirmDialog.message}
              </p>

              {/* Note / Reason Field */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {confirmDialog.noteLabel || 'Administrative Note:'}
                </label>
                <textarea
                  rows={2}
                  value={dialogNote}
                  onChange={(e) => setDialogNote(e.target.value)}
                  placeholder={confirmDialog.requiresNote ? "Required reason..." : "Optional comment..."}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  disabled={isProcessingAction}
                  className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteConfirmedAction}
                  disabled={isProcessingAction}
                  className={`py-2 px-4 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    confirmDialog.confirmButtonColor === 'emerald'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : confirmDialog.confirmButtonColor === 'rose'
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                  id="btn_confirm_dialog_action"
                >
                  {isProcessingAction ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>{confirmDialog.confirmButtonText}</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dedicated Universal Academy QR Scanner Modal */}
      {showQRModal && (
        <AdminQRScannerModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          users={liveUsers}
          onSelectUser={(user) => {
            setSelectedUser(user);
            setActiveTab('directory');
            showToast(`Loaded verified profile for ${user.name} (@${user.username || user.uid})`, 'success');
          }}
          showToast={showToast}
        />
      )}

      {/* Admin Direct Message Modal */}
      {isChatModalOpen && (
        <AdminDirectMessageModal
          isOpen={isChatModalOpen}
          onClose={() => setIsChatModalOpen(false)}
          currentUser={currentUser}
          allUsers={liveUsers}
          initialSelectedUser={chatTargetUser}
          showToast={showToast}
          onViewUserProfile={(user) => {
            setSelectedUser(user);
            setActiveTab('directory');
            setIsChatModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
