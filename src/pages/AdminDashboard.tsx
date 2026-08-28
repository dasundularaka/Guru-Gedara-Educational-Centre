import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { firestoreService, formatNameAsUid } from '../lib/firestoreService';
import { optimizeImage } from '../lib/imageOptimizer';
import { ConfirmModal } from '../components/ConfirmModal';
import { UserProfile, ClassItem, Booking, Payment, PathwayItem, SubjectItem, BannerImage, AttendanceRecord } from '../types';
import { SubjectSelector } from '../components/SubjectSelector';
import { SystemActivityFeed } from '../components/SystemActivityFeed';
import { StudentProgressTracker } from '../components/StudentProgressTracker';
import { ClassProfileModal } from '../components/ClassProfileModal';
import { TutorProfileModal } from '../components/TutorProfileModal';
import { ClassAttendanceQRScannerModal } from '../components/ClassAttendanceQRScannerModal';
import { ClassReminderCronPanel } from '../components/ClassReminderCronPanel';
import { EmailNotificationLogsModal } from '../components/EmailNotificationLogsModal';
import { AdminEmailTemplatesPanel } from '../components/AdminEmailTemplatesPanel';
import { CameraProfileCapture } from '../components/CameraProfileCapture';
import { DigitalStudentIDCardModal } from '../components/DigitalStudentIDCardModal';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '../lib/firebase';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { 
  Users, 
  CreditCard, 
  BookOpen, 
  TrendingUp, 
  ShieldCheck, 
  Search, 
  Settings, 
  Plus, 
  AlertCircle, 
  CheckCircle,
  Megaphone,
  Sliders,
  DollarSign,
  UserCheck,
  Edit,
  Trash2,
  X,
  PlusCircle,
  Lock,
  Eye,
  EyeOff,
  BarChart3,
  Download,
  Sparkles,
  Star,
  Upload,
  Compass,
  Cpu,
  Bookmark,
  GraduationCap,
  Calculator,
  Atom,
  FolderPlus,
  Tag,
  Layers,
  Image as ImageIcon,
  ExternalLink,
  Check,
  Power,
  Bell,
  Mail,
  Shield,
  CheckCheck,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
  Award,
  Percent,
  QrCode,
  Camera,
  BadgeCheck
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { 
    currentUser, 
    showToast, 
    refreshClasses, 
    refreshBookings,
    reviews, 
    updateReviewStatus, 
    deleteReview, 
    classes, 
    bookings, 
    payments, 
    resetDatabase,
    notifications,
    refreshNotifications,
    executeWriteWithRetry
  } = useApp();
  const [activeTab, setActiveTab] = useState<'analytics' | 'payments' | 'students' | 'tutors' | 'classes' | 'pathways' | 'banners' | 'notices' | 'admins' | 'reviews' | 'progress' | 'email_templates'>('analytics');
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'announcements' | 'payments' | 'reminders'>('all');
  const [showEmailLogsModal, setShowEmailLogsModal] = useState<boolean>(false);
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [classesList, setClassesList] = useState<ClassItem[]>(classes || []);
  const [paymentsList, setPaymentsList] = useState<Payment[]>(payments || []);
  const [bookingsList, setBookingsList] = useState<Booking[]>(bookings || []);
  const [pathwaysList, setPathwaysList] = useState<PathwayItem[]>([]);
  const [subjectsList, setSubjectsList] = useState<SubjectItem[]>([]);
  const [bannersList, setBannersList] = useState<BannerImage[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedProgressStudentId, setSelectedProgressStudentId] = useState<string>('');
  const [selectedClassForProfile, setSelectedClassForProfile] = useState<ClassItem | null>(null);
  const [selectedTutorForProfile, setSelectedTutorForProfile] = useState<UserProfile | null>(null);
  const [selectedClassForScanner, setSelectedClassForScanner] = useState<ClassItem | null>(null);
  const [showClassScannerModal, setShowClassScannerModal] = useState<boolean>(false);
  const [showAdminCameraModal, setShowAdminCameraModal] = useState<boolean>(false);
  const [progressSearchTerm, setProgressSearchTerm] = useState<string>('');
  const [progressGradeFilter, setProgressGradeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isNavDropdownOpen, setIsNavDropdownOpen] = useState(false);

  // Pathway management modal states
  const [pathwayModalOpen, setPathwayModalOpen] = useState(false);
  const [editingPathway, setEditingPathway] = useState<PathwayItem | null>(null);
  const [pathwayTitle, setPathwayTitle] = useState("");
  const [pathwayDescription, setPathwayDescription] = useState("");
  const [pathwayIconName, setPathwayIconName] = useState("BookOpen");
  const [pathwayCategory, setPathwayCategory] = useState("Mathematics");
  const [isSavingPathway, setIsSavingPathway] = useState(false);

  // Subject management states
  const [newSubjectName, setNewSubjectName] = useState("");
  const [isAddingSubject, setIsAddingSubject] = useState(false);

  // Banner management modal states
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerImage | null>(null);
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerSubtitle, setBannerSubtitle] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [bannerLinkUrl, setBannerLinkUrl] = useState("");
  const [bannerActive, setBannerActive] = useState(true);
  const [isSavingBanner, setIsSavingBanner] = useState(false);

  // Review status filters
  const [reviewFilterStatus, setReviewFilterStatus] = useState<string>("all");

  const filteredReviews = (reviews || []).filter(r => {
    if (reviewFilterStatus === "all") return true;
    return r.status === reviewFilterStatus;
  });

  // Recharts Monthly Trends Data processor based strictly on Firestore data
  const getMonthlyData = () => {
    // Generate the last 6 months list dynamically (oldest to newest)
    const monthsData: { name: string; yearMonth: string; endOfMonth: Date; students: number; revenue: number }[] = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleString('en-US', { month: 'short' });
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      monthsData.push({
        name: `${monthLabel} ${String(d.getFullYear()).slice(-2)}`,
        yearMonth,
        endOfMonth,
        students: 0,
        revenue: 0
      });
    }

    const studentUsers = (users || []).filter(u => u.role === 'student');

    // Count actual student profiles enrolled on or before end of that month
    monthsData.forEach(m => {
      studentUsers.forEach(u => {
        if (u.createdAt) {
          try {
            const uDate = new Date(u.createdAt);
            if (!isNaN(uDate.getTime()) && uDate <= m.endOfMonth) {
              m.students += 1;
            }
          } catch (e) {
            m.students += 1;
          }
        } else {
          m.students += 1;
        }
      });
    });

    // Sum actual paid transactions matching their logging date month
    (paymentsList || []).forEach(p => {
      if (p.status === 'paid' && p.date) {
        try {
          const pDate = new Date(p.date);
          if (!isNaN(pDate.getTime())) {
            const yMonth = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`;
            const match = monthsData.find(m => m.yearMonth === yMonth);
            if (match) {
              match.revenue += (Number(p.amount) || 0);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
    });

    return monthsData.map((item) => ({
      name: item.name,
      "Scholars Enrolled": item.students,
      "Revenue (LKR)": item.revenue
    }));
  };

  const getGrowthMetricsData = () => {
    const monthsData: { 
      name: string; 
      yearMonth: string; 
      endOfMonth: Date;
      students: number; 
      classes: number; 
      pending: number; 
    }[] = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleString('en-US', { month: 'short' });
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      monthsData.push({
        name: `${monthLabel} ${String(d.getFullYear()).slice(-2)}`,
        yearMonth,
        endOfMonth,
        students: 0,
        classes: 0,
        pending: 0
      });
    }

    const studentUsers = (users || []).filter(u => u.role === 'student');

    // Accumulate actual student count up to each month
    monthsData.forEach(m => {
      studentUsers.forEach(u => {
        if (u.createdAt) {
          try {
            const uDate = new Date(u.createdAt);
            if (!isNaN(uDate.getTime()) && uDate <= m.endOfMonth) {
              m.students += 1;
            }
          } catch (e) {
            m.students += 1;
          }
        } else {
          m.students += 1;
        }
      });
    });

    // Populate active classes created on or before that month
    monthsData.forEach(m => {
      (classesList || []).forEach(c => {
        if (c.createdAt) {
          try {
            const cDate = new Date(c.createdAt);
            if (!isNaN(cDate.getTime())) {
              if (cDate <= m.endOfMonth) {
                m.classes += 1;
              }
            } else {
              m.classes += 1;
            }
          } catch (e) {
            m.classes += 1;
          }
        } else {
          m.classes += 1;
        }
      });
    });

    // Count pending payments by their date month
    (paymentsList || []).forEach(p => {
      if (p.status === 'pending' && p.date) {
        try {
          const pDate = new Date(p.date);
          if (!isNaN(pDate.getTime())) {
            const yMonth = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`;
            const match = monthsData.find(m => m.yearMonth === yMonth);
            if (match) {
              match.pending += 1;
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
    });

    return monthsData.map((item) => ({
      name: item.name,
      "Total Students": item.students,
      "Active Classes": item.classes,
      "Pending Payments": item.pending
    }));
  };

  // Recharts 30-Day Class Enrollment Trends Data processor based purely on Firestore bookings & student registrations
  const get30DaysEnrollmentData = () => {
    const daysData: {
      date: string;
      fullDate: string;
      newBookings: number;
      newStudents: number;
    }[] = [];

    const now = new Date();
    // Build array of past 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      daysData.push({
        date: dateLabel,
        fullDate: isoDate,
        newBookings: 0,
        newStudents: 0
      });
    }

    // Process bookings list from Firestore
    (bookingsList || []).forEach(booking => {
      if (!booking || booking.status === 'cancelled') return;
      const bDateStr = booking.bookingDate || booking.createdAt;
      if (bDateStr) {
        try {
          const bDate = new Date(bDateStr);
          if (!isNaN(bDate.getTime())) {
            const iso = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}-${String(bDate.getDate()).padStart(2, '0')}`;
            const match = daysData.find(d => d.fullDate === iso);
            if (match) {
              match.newBookings += 1;
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
    });

    // Process student users created date from Firestore
    (users || []).forEach(u => {
      if (u.role === 'student' && u.createdAt) {
        try {
          const uDate = new Date(u.createdAt);
          if (!isNaN(uDate.getTime())) {
            const iso = `${uDate.getFullYear()}-${String(uDate.getMonth() + 1).padStart(2, '0')}-${String(uDate.getDate()).padStart(2, '0')}`;
            const match = daysData.find(d => d.fullDate === iso);
            if (match) {
              match.newStudents += 1;
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
    });

    let accumulativeEnrollments = 0;

    return daysData.map((item) => {
      const dailyTotal = item.newBookings + item.newStudents;
      accumulativeEnrollments += dailyTotal;

      return {
        date: item.date,
        "Class Enrollments": item.newBookings,
        "Student Signups": item.newStudents,
        "Daily Total": dailyTotal,
        "Cumulative Velocity": accumulativeEnrollments
      };
    });
  };

  // CSV Attendance and booking exporter method
  const exportToCSV = () => {
    if (bookingsList.length === 0) {
      showToast("There are no student attendance or bookings records logged to export.", "info");
      return;
    }

    const csvHeaders = [
      "Booking ID",
      "Student ID",
      "Student Name",
      "Class ID",
      "Class Title",
      "Tutor ID",
      "Tutor Name",
      "Day of Week",
      "Time Slot",
      "Booking Date",
      "Enrollment Status"
    ];

    const csvRows = bookingsList.map(booking => {
      const escapedTitle = booking.classTitle ? `"${booking.classTitle.replace(/"/g, '""')}"` : '"N/A"';
      const escapedStudentName = booking.studentName ? `"${booking.studentName.replace(/"/g, '""')}"` : '"N/A"';
      const escapedTutorName = booking.tutorName ? `"${booking.tutorName.replace(/"/g, '""')}"` : '"N/A"';

      return [
        booking.id,
        booking.studentId,
        escapedStudentName,
        booking.classId,
        escapedTitle,
        booking.tutorId,
        escapedTutorName,
        booking.dayOfWeek,
        booking.timeSlot,
        booking.bookingDate || "N/A",
        booking.status
      ].join(",");
    });

    const csvBody = [csvHeaders.join(","), ...csvRows].join("\n");

    try {
      const blob = new Blob([csvBody], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `guru_gedara_attendance_bookings_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Attendance and Bookings CSV file downloaded successfully!", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to prepare files for export.", "error");
    }
  };

  // Filter handles
  const [paySearchQuery, setPaySearchQuery] = useState("");
  const [payStatusFilter, setPayStatusFilter] = useState("all");

  // Student specific filters (separate name and username)
  const [studentSearchName, setStudentSearchName] = useState("");
  const [studentSearchUsername, setStudentSearchUsername] = useState("");

  // Tutor specific filters (separate name and username)
  const [tutorSearchName, setTutorSearchName] = useState("");
  const [tutorSearchUsername, setTutorSearchUsername] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'student' | 'tutor' | 'class' | 'payment' | 'user' | 'review' | 'banner' | 'pathway' | 'subject';
    id: string;
    title: string;
    isDeleting?: boolean;
  }>({
    isOpen: false,
    type: 'student',
    id: '',
    title: '',
    isDeleting: false
  });

  // Announcement fields
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [noticeTarget, setNoticeTarget] = useState<'all' | 'students' | 'tutors'>('all');
  const [sendingNotice, setSendingNotice] = useState(false);

  // Admin Editing Modal configurations
  const [modalType, setModalType] = useState<'student' | 'tutor' | 'class' | 'payment' | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields State
  // Student & Tutor fields
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [studentGrade, setStudentGrade] = useState("Grade 11");
  const [studentParentContact, setStudentParentContact] = useState("");
  const [studentGender, setStudentGender] = useState<'male' | 'female'>('male');
  const [studentSelectedClasses, setStudentSelectedClasses] = useState<string[]>([]);
  const [studentAddress, setStudentAddress] = useState("");
  const [studentDob, setStudentDob] = useState("");
  const [studentGuardianName, setStudentGuardianName] = useState("");
  const [studentParentEmail, setStudentParentEmail] = useState("");
  const [studentCcParentOnNotifications, setStudentCcParentOnNotifications] = useState(false);
  const [studentNotes, setStudentNotes] = useState("");
  const [studentPhotoURL, setStudentPhotoURL] = useState("");
  const [tutorBio, setTutorBio] = useState("");
  const [tutorSubjects, setTutorSubjects] = useState("General Science, Algebra");
  const [tutorHourlyRate, setTutorHourlyRate] = useState("45");
  const [tutorExperience, setTutorExperience] = useState("5");
  const [tutorQualification, setTutorQualification] = useState("M.Sc. in Physics");

  // New User Password & Auto-generation States
  const [userPassword, setUserPassword] = useState("");
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true);
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Class fields
  const [classTitle, setClassTitle] = useState("");
  const [classSubject, setClassSubject] = useState("");
  const [classSchedule, setClassSchedule] = useState("Saturdays 10:00 AM - 12:00 PM");
  const [classDayOfWeek, setClassDayOfWeek] = useState("Saturday");
  const [classTimeSlot, setClassTimeSlot] = useState("10:00 AM");
  const [classPrice, setClassPrice] = useState("120");
  const [classDescription, setClassDescription] = useState("");
  const [classMaxSlots, setClassMaxSlots] = useState("20");
  const [classBookedSlots, setClassBookedSlots] = useState("0");
  const [classTutorId, setClassTutorId] = useState("");
  const [classImageUrl, setClassImageUrl] = useState("");
  const [generatingBanner, setGeneratingBanner] = useState(false);

  // Payment fields
  const [paymentStudentId, setPaymentStudentId] = useState("");
  const [paymentStudentSearch, setPaymentStudentSearch] = useState("");
  const [paymentClassId, setPaymentClassId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("120");
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending' | 'failed'>('paid');
  const [paymentMethod, setPaymentMethod] = useState("Credit Card");

  // Admin creation states
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminDisplayName, setNewAdminDisplayName] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminGender, setNewAdminGender] = useState<'male' | 'female'>('male');
  const [newAdminPhoto, setNewAdminPhoto] = useState('');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  // Admin search states
  const [adminNameQuery, setAdminNameQuery] = useState('');
  const [adminUserQuery, setAdminUserQuery] = useState('');
  const [selectedUserForIdCard, setSelectedUserForIdCard] = useState<UserProfile | null>(null);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim() || !newAdminName.trim() || !newAdminPassword.trim()) {
      showToast("Email, Full Name, and Password are required fields.", "error");
      return;
    }

    setIsCreatingAdmin(true);
    try {
      const generatedUsername = Math.floor(10000000 + Math.random() * 90000000).toString();
      const targetAdminUid = formatNameAsUid(newAdminName.trim(), newAdminEmail.trim());

      try {
        const tempApp = initializeApp(firebaseConfig, "TempAppAdminAdd_" + Math.floor(Math.random() * 100000));
        const tempAuth = getAuth(tempApp);
        await createUserWithEmailAndPassword(tempAuth, newAdminEmail.trim(), newAdminPassword.trim());
        await deleteApp(tempApp);
      } catch (firebaseErr: any) {
        console.warn("Firebase Auth auto-creation failed for admin, using custom local UID. Reason: ", firebaseErr.message);
      }

      await firestoreService.createUserProfile(targetAdminUid, {
        email: newAdminEmail.trim(),
        name: newAdminName.trim(),
        displayName: newAdminDisplayName.trim() || newAdminName.trim(),
        phone: newAdminPhone.trim(),
        gender: newAdminGender,
        role: 'admin',
        photoURL: newAdminPhoto.trim() || (newAdminGender === 'male' 
          ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
          : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'),
        password: newAdminPassword.trim(),
        username: generatedUsername,
        status: 'approved'
      });

      setNewAdminEmail('');
      setNewAdminName('');
      setNewAdminDisplayName('');
      setNewAdminPassword('');
      setNewAdminPhone('');
      setNewAdminPhoto('');
      
      await fetchAdminDatasets();
      showToast("New Administration account provisioned successfully!", "success");
    } catch (err: any) {
      showToast("Failed to provision admin account: " + err.message, "error");
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      const recs = await firestoreService.getAttendance();
      setAttendanceRecords(recs || []);
    } catch (e) {
      console.warn("Failed reading attendance records", e);
    }
  };

  const fetchAdminDatasets = async () => {
    setLoading(true);
    try {
      // Fetch users, classes, payments, bookings, pathways, subjects, banners, and attendance in parallel
      const [allUsers, allClass, allPays, allBook, allPathways, allSubjects, allBanners, allAttendance] = await Promise.all([
        firestoreService.getAllUsers(),
        firestoreService.getClasses(),
        firestoreService.getPayments(),
        firestoreService.getBookings(),
        firestoreService.getPathways(),
        firestoreService.getSubjects(),
        firestoreService.getBanners(),
        firestoreService.getAttendance()
      ]);

      setUsers(allUsers);
      setClassesList(allClass);
      setPaymentsList(allPays);
      setBookingsList(allBook);
      setPathwaysList(allPathways);
      setSubjectsList(allSubjects);
      setBannersList(allBanners);
      setAttendanceRecords(allAttendance || []);
    } catch (e) {
      console.warn("Failed index mapping of site admin data pools", e);
    } finally {
      setLoading(false);
    }
  };

  // Photo Approval Handlers (Approval workflow for Students & Tutors)
  const handleApprovePhoto = async (targetUser: UserProfile) => {
    if (!targetUser.pendingPhotoURL) return;
    try {
      await firestoreService.approveProfilePhoto(targetUser.uid);
      await fetchAdminDatasets();
      showToast(`Approved new photo for ${targetUser.name}! It is now public.`, 'success');
    } catch (err: any) {
      showToast('Failed to approve photo: ' + err.message, 'error');
    }
  };

  const handleRejectPhoto = async (targetUser: UserProfile) => {
    try {
      await firestoreService.rejectProfilePhoto(targetUser.uid);
      await fetchAdminDatasets();
      showToast(`Rejected proposed photo for ${targetUser.name}.`, 'info');
    } catch (err: any) {
      showToast('Failed to reject photo: ' + err.message, 'error');
    }
  };

  // Banner Handlers
  const handleOpenBannerModal = (banner?: BannerImage) => {
    if (banner) {
      setEditingBanner(banner);
      setBannerTitle(banner.title || '');
      setBannerSubtitle(banner.subtitle || '');
      setBannerImageUrl(banner.imageUrl || '');
      setBannerLinkUrl(banner.linkUrl || '');
      setBannerActive(banner.active ?? true);
    } else {
      setEditingBanner(null);
      setBannerTitle('');
      setBannerSubtitle('');
      setBannerImageUrl('https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200');
      setBannerLinkUrl('');
      setBannerActive(true);
    }
    setBannerModalOpen(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerImageUrl.trim()) {
      showToast("Banner image URL or file is required.", "error");
      return;
    }
    setIsSavingBanner(true);
    try {
      const bannerObj: BannerImage = {
        id: editingBanner ? editingBanner.id : 'b_' + Date.now(),
        title: bannerTitle.trim() || '',
        subtitle: bannerSubtitle.trim() || '',
        imageUrl: bannerImageUrl.trim(),
        linkUrl: bannerLinkUrl.trim() || '',
        active: bannerActive,
        createdAt: editingBanner ? editingBanner.createdAt : new Date().toISOString()
      };
      await firestoreService.saveBanner(bannerObj);
      showToast(editingBanner ? "Hero banner image updated successfully!" : "New hero banner image published!", "success");
      setBannerModalOpen(false);
      const updated = await firestoreService.getBanners();
      setBannersList(updated);
    } catch (err: any) {
      showToast("Failed to save banner image: " + (err.message || String(err)), "error");
    } finally {
      setIsSavingBanner(false);
    }
  };

  const handleDeleteBannerItem = (id: string, title?: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'banner',
      id,
      title: title || 'Hero Banner'
    });
  };

  const handleToggleBannerActive = async (banner: BannerImage) => {
    try {
      const updatedBanner: BannerImage = { ...banner, active: !banner.active };
      await firestoreService.saveBanner(updatedBanner);
      showToast(`Banner image is now ${updatedBanner.active ? 'Active (Visible on Homepage)' : 'Inactive (Hidden)'}.`, "info");
      setBannersList(prev => prev.map(b => b.id === banner.id ? updatedBanner : b));
    } catch (err: any) {
      showToast("Failed to change banner active status.", "error");
    }
  };

  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast("Image file size must be less than 10MB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 800;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          if (width / height > MAX_WIDTH / MAX_HEIGHT) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          } else {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          setBannerImageUrl(compressedBase64);
          showToast("Banner image compressed & attached!", "success");
        }
      };
      img.onerror = () => {
        showToast("Failed to process image file.", "error");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Pathways Handlers
  const handleOpenPathwayModal = (pathway?: PathwayItem) => {
    if (pathway) {
      setEditingPathway(pathway);
      setPathwayTitle(pathway.title);
      setPathwayDescription(pathway.description);
      setPathwayIconName(pathway.iconName || 'BookOpen');
      setPathwayCategory(pathway.category || 'Mathematics');
    } else {
      setEditingPathway(null);
      setPathwayTitle('');
      setPathwayDescription('');
      setPathwayIconName('BookOpen');
      setPathwayCategory('Mathematics');
    }
    setPathwayModalOpen(true);
  };

  const handleSavePathway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pathwayTitle.trim() || !pathwayDescription.trim()) {
      showToast("Pathway title and description are required.", "error");
      return;
    }
    setIsSavingPathway(true);
    try {
      const pathwayObj: PathwayItem = {
        id: editingPathway ? editingPathway.id : 'path_' + Date.now(),
        title: pathwayTitle.trim(),
        description: pathwayDescription.trim(),
        iconName: pathwayIconName,
        category: pathwayCategory.trim()
      };
      await firestoreService.savePathway(pathwayObj);
      showToast(editingPathway ? "Course pathway updated successfully!" : "New course pathway created!", "success");
      setPathwayModalOpen(false);
      const updatedPathways = await firestoreService.getPathways();
      setPathwaysList(updatedPathways);
    } catch (err: any) {
      showToast("Failed to save pathway: " + (err.message || String(err)), "error");
    } finally {
      setIsSavingPathway(false);
    }
  };

  const handleDeletePathwayItem = (id: string, title?: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'pathway',
      id,
      title: title || 'Course Pathway'
    });
  };

  // Subjects Handlers
  const handleAddSubjectCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) {
      showToast("Please enter a subject category name.", "error");
      return;
    }
    setIsAddingSubject(true);
    try {
      const added = await firestoreService.addSubject(newSubjectName.trim());
      showToast(`Subject category "${added.name}" added to database!`, "success");
      setNewSubjectName('');
      const updatedSubjects = await firestoreService.getSubjects();
      setSubjectsList(updatedSubjects);
    } catch (err: any) {
      showToast("Failed to add subject category.", "error");
    } finally {
      setIsAddingSubject(false);
    }
  };

  const handleDeleteSubjectCategory = (id: string, name: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'subject',
      id,
      title: name
    });
  };

  // Helper to render icon for Pathways
  const renderPathwayIcon = (iconName: string, className = "w-5 h-5") => {
    switch (iconName) {
      case 'Cpu': return <Cpu className={className} />;
      case 'Compass': return <Compass className={className} />;
      case 'Bookmark': return <Bookmark className={className} />;
      case 'GraduationCap': return <GraduationCap className={className} />;
      case 'Calculator': return <Calculator className={className} />;
      case 'Atom': return <Atom className={className} />;
      case 'Sparkles': return <Sparkles className={className} />;
      default: return <BookOpen className={className} />;
    }
  };

  useEffect(() => {
    fetchAdminDatasets();
    const unsubBanners = firestoreService.subscribeBanners((banners) => {
      setBannersList(banners);
    });
    const unsubPathways = firestoreService.subscribePathways((pathways) => {
      setPathwaysList(pathways);
    });
    const unsubSubjects = firestoreService.subscribeSubjects((subjects) => {
      setSubjectsList(subjects);
    });
    return () => {
      unsubBanners();
      unsubPathways();
      unsubSubjects();
    };
  }, []);

  const handleUpdatePaymentStatus = async (paymentId: string, status: 'paid' | 'failed' | 'pending') => {
    try {
      await firestoreService.updatePaymentStatus(paymentId, status);
      showToast(`Financial ledger receipt ID ${paymentId} updated as: ${status.toUpperCase()}`, "success");
      await fetchAdminDatasets();
    } catch {
      showToast("Ledger edit failed.", "error");
    }
  };

  const handleLaunchAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeMessage.trim()) {
      showToast("Fields can't be empty.", "error");
      return;
    }

    setSendingNotice(true);
    try {
      let targets: UserProfile[] = [];
      if (noticeTarget === 'students') {
        targets = users.filter(u => u.role === 'student');
      } else if (noticeTarget === 'tutors') {
        targets = users.filter(u => u.role === 'tutor');
      } else {
        targets = users; // all
      }

      for (const t of targets) {
        await firestoreService.triggerNotification(
          t.uid,
          `[Faculty Alert] ${noticeTitle}`,
          noticeMessage,
          'announcement'
        );
      }

      showToast(`Campaign notice deployed to ${targets.length} registered accounts!`, "success");
      setNoticeTitle("");
      setNoticeMessage("");
    } catch (e) {
      showToast("Failed to launch global bulletin alerts.", "error");
    } finally {
      setSendingNotice(false);
    }
  };

  // Reset form helper
  const resetFormStates = () => {
    setEditingId(null);
    setUserName("");
    setUserEmail("");
    setUserPhone("");
    setStudentGrade("11");
    setStudentParentContact("");
    setStudentGender('male');
    setStudentSelectedClasses([]);
    setStudentAddress("");
    setStudentDob("");
    setStudentGuardianName("");
    setStudentParentEmail("");
    setStudentCcParentOnNotifications(false);
    setStudentNotes("");
    setStudentPhotoURL("");
    setTutorBio("");
    setTutorSubjects("General Science, Algebra");
    setTutorHourlyRate("45");
    setTutorExperience("5");
    setTutorQualification("M.Sc. in Physics");
    setUserPassword("");
    setAutoGeneratePassword(true);
    setShowPasswordText(false);

    setClassTitle("");
    setClassSubject("Calculus");
    setClassSchedule("Saturdays 10:00 AM - 12:00 PM");
    setClassDayOfWeek("Saturday");
    setClassTimeSlot("10:00 AM");
    setClassPrice("120");
    setClassDescription("");
    setClassMaxSlots("20");
    setClassBookedSlots("0");
    setClassTutorId("");
    setClassImageUrl("");

    setPaymentStudentId("");
    setPaymentStudentSearch("");
    setPaymentClassId("");
    setPaymentAmount("120");
    setPaymentStatus("paid");
    setPaymentMethod("Credit Card");
  };

  const handleStudentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast("Image file size should be less than 10MB.", "error");
        return;
      }
      try {
        const optimized = await optimizeImage(file, { maxWidth: 600, maxHeight: 600, quality: 0.82 });
        if (optimized) {
          setStudentPhotoURL(optimized);
          showToast("Profile image uploaded and optimized for cloud sync!", "success");
        }
      } catch (err) {
        showToast("Failed to process profile image.", "error");
      }
    }
  };

  // Actions Opening modals helper
  const openAddModal = (type: 'student' | 'tutor' | 'class' | 'payment') => {
    resetFormStates();
    setModalType(type);
    setModalMode('add');
    
    // Set first default values if options exists in records
    const students = users.filter(u => u.role === 'student');
    if (students.length > 0) setPaymentStudentId(students[0].uid);
    
    const tutors = users.filter(u => u.role === 'tutor');
    if (tutors.length > 0) {
      setClassTutorId(tutors[0].uid);
    }
    
    if (classesList.length > 0) setPaymentClassId(classesList[0].id);
  };

  const openEditModal = (type: 'student' | 'tutor' | 'class' | 'payment', item: any) => {
    resetFormStates();
    setModalType(type);
    setModalMode('edit');
    setEditingId(item.id || item.uid);

    if (type === 'student') {
      setUserName(item.name || "");
      setUserEmail(item.email || "");
      setUserPhone(item.phone || "");
      setStudentGrade(item.studentDetails?.grade || "11");
      setStudentParentContact(item.guardianPhone || item.studentDetails?.parentContact || "");
      setStudentGender(item.gender || 'male');
      setStudentSelectedClasses(item.selectedClasses || []);
      setStudentAddress(item.address || "");
      setStudentDob(item.dob || "");
      setStudentGuardianName(item.guardianName || "");
      setStudentParentEmail(item.parentEmail || "");
      setStudentCcParentOnNotifications(item.ccParentOnNotifications ?? item.isParentEmailLinked ?? (!!item.parentEmail));
      setStudentNotes(item.notes || "");
      setStudentPhotoURL(item.photoURL || "");
    } else if (type === 'tutor') {
      setUserName(item.name || "");
      setUserEmail(item.email || "");
      setUserPhone(item.phone || "");
      setTutorBio(item.tutorDetails?.bio || "");
      setTutorSubjects(item.tutorDetails?.subjects?.join(", ") || "");
      setTutorHourlyRate(String(item.tutorDetails?.hourlyRate || 45));
      setTutorExperience(String(item.tutorDetails?.experience || 5));
      setTutorQualification(item.tutorDetails?.qualification || "");
    } else if (type === 'class') {
      setClassTitle(item.title || "");
      setClassSubject(item.subject || "");
      setClassSchedule(item.schedule || "");
      setClassDayOfWeek(item.dayOfWeek || "");
      setClassTimeSlot(item.timeSlot || "");
      setClassPrice(String(item.price || 120));
      setClassDescription(item.description || "");
      setClassMaxSlots(String(item.maxSlots || 20));
      setClassBookedSlots(String(item.bookedSlots || 0));
      setClassTutorId(item.tutorId || "");
      setClassImageUrl(item.imageUrl || "");
    } else if (type === 'payment') {
      setPaymentStudentId(item.studentId || "");
      setPaymentClassId(item.classId || "");
      setPaymentAmount(String(item.amount || 120));
      setPaymentStatus(item.status || "paid");
      setPaymentMethod(item.paymentMethod || "Credit Card");
    }
  };
  
  const handleGenerateClassBanner = async () => {
    if (!classTitle.trim()) {
      showToast("Please enter a Class Course Title first to generate a professional topic-specific image.", "error");
      return;
    }
    
    setGeneratingBanner(true);
    showToast("AI is analyzing course syllabus and designing matching topic assets...", "info");
    
    setTimeout(() => {
      const randomId = Math.floor(Math.random() * 1000);
      let customUrl = "";
      const lowerTitle = classTitle.toLowerCase();
      
      if (classSubject === 'Mathematics') {
        customUrl = lowerTitle.includes('calc') || lowerTitle.includes('calculus')
          ? "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=600"
          : "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=600";
      } else if (classSubject === 'Physics') {
        customUrl = lowerTitle.includes('quantum') || lowerTitle.includes('space')
          ? "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600"
          : "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&q=80&w=600";
      } else if (classSubject === 'Coding') {
        customUrl = lowerTitle.includes('web') || lowerTitle.includes('react') || lowerTitle.includes('html')
          ? "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=600"
          : "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=600";
      } else if (classSubject === 'English') {
        customUrl = lowerTitle.includes('creative') || lowerTitle.includes('writing')
          ? "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=600"
          : "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&q=80&w=600";
      } else {
        customUrl = `https://picsum.photos/seed/${randomId}/600/350`;
      }
      
      setClassImageUrl(customUrl);
      setGeneratingBanner(false);
      showToast("Professional topic-specific header generated and attached successfully!", "success");
    }, 1500);
  };

  // Student approvals and username generation helpers
  const handleApproveStudent = async (studentId: string, gender: 'male' | 'female' | undefined) => {
    try {
      const allUsers = await firestoreService.getAllUsers();
      const g = gender || 'male';
      const prefix = g === 'male' ? 'GB' : 'GG';
      let uniqueUsername = "";
      let attempts = 0;
      while (attempts < 100) {
        const num = Math.floor(10000000 + Math.random() * 90000000).toString();
        const candidate = prefix + num;
        if (!allUsers.some(u => u.username === candidate)) {
          uniqueUsername = candidate;
          break;
        }
        attempts++;
      }
      if (!uniqueUsername) uniqueUsername = prefix + Math.floor(10000000 + Math.random() * 90000000).toString();

      await firestoreService.updateTutorProfile(studentId, {
        status: 'approved',
        username: uniqueUsername
      });

      showToast(`Student approved! System generated identifier allocated: ${uniqueUsername}`, "success");
      
      // Auto trigger notification
      await firestoreService.triggerNotification(
        studentId,
        "Account Intake Approved!",
        `Good news! Your Guru Gedara student profile has been manually approved by the administrator. Your immutable account username identifier is ${uniqueUsername}.`,
        "announcement"
      );
      
      await fetchAdminDatasets();
    } catch (e: any) {
      showToast(e.message || "Failed student manual approval.", "error");
    }
  };

  const handleAssignTutorUsername = async (tutorId: string) => {
    try {
      const allUsers = await firestoreService.getAllUsers();
      const currentTut = allUsers.find(u => u.uid === tutorId || u.username === tutorId);

      let uniqueUsername = "";
      let attempts = 0;
      while (attempts < 100) {
        const num = Math.floor(10000000 + Math.random() * 90000000).toString();
        const candidate = "GT" + num;
        if (!allUsers.some(u => u.username === candidate || u.uid === candidate)) {
          uniqueUsername = candidate;
          break;
        }
        attempts++;
      }
      if (!uniqueUsername) uniqueUsername = "GT" + Math.floor(10000000 + Math.random() * 90000000).toString();

      if (currentTut) {
        const oldUid = currentTut.uid;
        
        // Prepare new profile where both username and uid equal GT...
        const updatedProfile: UserProfile = {
          ...currentTut,
          uid: uniqueUsername,
          username: uniqueUsername,
          role: 'tutor'
        };

        // Create new profile under uniqueUsername (GT...)
        await firestoreService.createUserProfile(uniqueUsername, updatedProfile);

        // Delete old profile if its UID was different
        if (oldUid !== uniqueUsername) {
          await firestoreService.deleteUserProfile(oldUid);
          
          // Update any classes that referenced the old UID
          const currentClasses = classesList.filter(c => c.tutorId === oldUid);
          for (const cls of currentClasses) {
            await firestoreService.updateClass(cls.id, { tutorId: uniqueUsername, tutorName: currentTut.name });
          }
        }
      } else {
        await firestoreService.updateTutorProfile(tutorId, {
          username: uniqueUsername,
          uid: uniqueUsername
        });
      }

      showToast(`Tutor system identifier GT allocated: ${uniqueUsername}`, "success");
      await fetchAdminDatasets();
    } catch (e: any) {
      showToast(e.message || "Failed tutor identifier allocation.", "error");
    }
  };

  // handleDelete closures which open standard state-driven eye comfortable confirmation modal
  const handleDeleteStudent = (uid: string, name: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'student',
      id: uid,
      title: name
    });
  };

  const handleDeleteTutor = (uid: string, name: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'tutor',
      id: uid,
      title: name
    });
  };

  const handleDeleteClass = (classId: string, title: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'class',
      id: classId,
      title: title
    });
  };

  const handleDeletePayment = (paymentId: string, label: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'payment',
      id: paymentId,
      title: label
    });
  };

  const executeDeletion = async () => {
    const { type, id } = deleteConfirm;
    if (!id) return;
    setDeleteConfirm(prev => ({ ...prev, isDeleting: true }));
    try {
      if (type === 'student') {
        await firestoreService.deleteUserProfile(id);
        setUsers(prev => prev.filter(u => u.uid !== id));
        showToast("Student profile successfully deleted.", "success");
      } else if (type === 'tutor') {
        await firestoreService.deleteUserProfile(id);
        setUsers(prev => prev.filter(u => u.uid !== id));
        showToast("Tutor faculty profile successfully deleted.", "success");
      } else if (type === 'class') {
        await firestoreService.deleteClass(id);
        setClassesList(prev => prev.filter(c => c.id !== id));
        showToast("Course curriculum successfully deleted.", "success");
        await refreshClasses();
      } else if (type === 'payment') {
        await firestoreService.deletePayment(id);
        setPaymentsList(prev => prev.filter(p => p.id !== id));
        showToast("Ledger transaction record deleted successfully.", "success");
      } else if (type === 'review') {
        await deleteReview(id);
        showToast("Review deleted successfully.", "success");
      } else if (type === 'banner') {
        await firestoreService.deleteBanner(id);
        setBannersList(prev => prev.filter(b => b.id !== id));
        showToast("Hero banner image deleted successfully.", "success");
      } else if (type === 'pathway') {
        await firestoreService.deletePathway(id);
        setPathwaysList(prev => prev.filter(p => p.id !== id));
        showToast("Course pathway deleted successfully.", "success");
      } else if (type === 'subject') {
        await firestoreService.deleteSubject(id);
        setSubjectsList(prev => prev.filter(s => s.id !== id));
        showToast("Subject category removed from database.", "info");
      }
      setDeleteConfirm({ isOpen: false, type: 'student', id: '', title: '', isDeleting: false });
      await fetchAdminDatasets();
    } catch {
      showToast(`Failed to delete selected ${type} record.`, "error");
      setDeleteConfirm(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (modalType === 'student') {
        const studentDetails = {
          grade: studentGrade,
          parentContact: studentParentContact,
          interests: []
        };
        const uProfile: Partial<UserProfile> = {
          name: userName,
          displayName: userName, // Ensure display name is also updated to mirror full name options by default
          email: userEmail,
          phone: userPhone,
          role: 'student',
          gender: studentGender,
          address: studentAddress,
          dob: studentDob,
          guardianName: studentGuardianName,
          guardianPhone: studentParentContact,
          parentEmail: studentParentEmail.trim(),
          isParentEmailLinked: studentCcParentOnNotifications && !!studentParentEmail.trim(),
          ccParentOnNotifications: studentCcParentOnNotifications && !!studentParentEmail.trim(),
          parentEmailCcPreferences: {
            attendance: true,
            payments: true,
            general: true
          },
          notes: studentNotes,
          photoURL: studentPhotoURL || (studentGender === 'male' 
            ? 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'
            : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'),
          selectedClasses: studentSelectedClasses,
          studentDetails
        };
        if (modalMode === 'add') {
          let finalPassword = userPassword;
          if (autoGeneratePassword) {
            finalPassword = "GG-" + Math.random().toString(36).substr(2, 8).toUpperCase() + "!";
            uProfile.isPasswordResetRequired = true;
          } else {
            if (!finalPassword) finalPassword = "test123";
            uProfile.isPasswordResetRequired = false;
          }
          uProfile.password = finalPassword;

          // Set registration status to approved since it was explicitly added by Admin
          uProfile.status = 'approved';
          
          // Generate unique 8-digit numeric username (strictly numeric, no A-Z characters)
          const allUsers = await firestoreService.getAllUsers();
          let uniqueUsername = "";
          let attempts = 0;
          while (attempts < 100) {
            const candidate = Math.floor(10000000 + Math.random() * 90000000).toString();
            if (!allUsers.some(u => u.username === candidate)) {
              uniqueUsername = candidate;
              break;
            }
            attempts++;
          }
          if (!uniqueUsername) uniqueUsername = Math.floor(10000000 + Math.random() * 90000000).toString();
          
          const targetStudentUid = formatNameAsUid(userName, userEmail);
          uProfile.username = uniqueUsername;
          uProfile.uid = targetStudentUid;

          // Enroll into Firebase Auth if required
          let tempApp: any = null;
          try {
            tempApp = initializeApp(firebaseConfig, "TempAppStudentAdd_" + Math.floor(Math.random() * 100000));
            const tempAuth = getAuth(tempApp);
            await createUserWithEmailAndPassword(tempAuth, userEmail, finalPassword);
          } catch (firebaseErr: any) {
            console.warn("Firebase Auth auto-creation failed, using custom local UID. Reason: ", firebaseErr.message);
          } finally {
            if (tempApp) {
              try { await deleteApp(tempApp); } catch (e) {}
            }
          }

          // Clean up any orphan user document with same email
          const existingSameEmail = allUsers.find(u => u.email.toLowerCase() === userEmail.toLowerCase() && u.uid !== targetStudentUid);
          if (existingSameEmail) {
            await firestoreService.deleteUserProfile(existingSameEmail.uid);
          }

          await firestoreService.createUserProfile(targetStudentUid, uProfile);
          showToast(`Student profile '${userName}' enrolled with system identifier: ${uniqueUsername}. Password: ${finalPassword}`, "success");
        } else {
          await firestoreService.updateUserProfile(editingId!, uProfile);
          showToast(`Student profile updated.`, "success");
        }

        // Sync class enrollments (bookings) for student
        try {
          const targetUid = modalMode === 'add' ? uProfile.uid! : editingId!;
          const allBookings = await firestoreService.getBookings();
          const existingStudentBookings = allBookings.filter(b => 
            (b.studentId === targetUid || b.studentEmail === userEmail) && b.status !== 'cancelled'
          );

          // Enroll student into newly selected classes
          for (const cId of studentSelectedClasses) {
            const hasBooking = existingStudentBookings.some(b => b.classId === cId);
            if (!hasBooking) {
              const cls = classesList.find(c => c.id === cId);
              if (cls) {
                await firestoreService.bookClass(targetUid, userName, cls);
              }
            }
          }

          // Unenroll student from unselected classes
          for (const existingB of existingStudentBookings) {
            if (!studentSelectedClasses.includes(existingB.classId)) {
              await firestoreService.cancelBooking(existingB.id, existingB.classId);
            }
          }
        } catch (enrollErr) {
          console.warn("Failed syncing student class enrollments:", enrollErr);
        }
      } else if (modalType === 'tutor') {
        const tutorDetails = {
          bio: tutorBio,
          subjects: tutorSubjects.split(",").map(s => s.trim()),
          experience: Number(tutorExperience) || 5,
          qualification: tutorQualification,
          hourlyRate: Number(tutorHourlyRate) || 45,
          rating: 5.0,
          availability: [{ day: "Monday", slots: ["10:00 AM", "02:00 PM"] }]
        };
        const uProfile: Partial<UserProfile> = {
          name: userName,
          email: userEmail,
          phone: userPhone,
          role: 'tutor',
          tutorDetails
        };
        if (modalMode === 'add') {
          let finalPassword = userPassword;
          if (autoGeneratePassword) {
            finalPassword = "GG-" + Math.random().toString(36).substr(2, 8).toUpperCase() + "!";
            uProfile.isPasswordResetRequired = true;
          } else {
            if (!finalPassword) finalPassword = "test123";
            uProfile.isPasswordResetRequired = false;
          }
          uProfile.password = finalPassword;

          // Generate unique 8-digit numeric username (strictly numeric, no A-Z characters)
          const allUsers = await firestoreService.getAllUsers();
          let uniqueUsername = "";
          let attempts = 0;
          while (attempts < 100) {
            const candidate = Math.floor(10000000 + Math.random() * 90000000).toString();
            if (!allUsers.some(u => u.username === candidate)) {
              uniqueUsername = candidate;
              break;
            }
            attempts++;
          }
          if (!uniqueUsername) uniqueUsername = Math.floor(10000000 + Math.random() * 90000000).toString();

          const targetTutorUid = formatNameAsUid(userName, userEmail);
          uProfile.username = uniqueUsername;
          uProfile.uid = targetTutorUid;

          let tempApp: any = null;
          try {
            tempApp = initializeApp(firebaseConfig, "TempAppTutorAdd_" + Math.floor(Math.random() * 100000));
            const tempAuth = getAuth(tempApp);
            await createUserWithEmailAndPassword(tempAuth, userEmail, finalPassword);
          } catch (firebaseErr: any) {
            console.warn("Firebase Auth auto-creation failed for tutor. Reason: ", firebaseErr.message);
          } finally {
            if (tempApp) {
              try { await deleteApp(tempApp); } catch (e) {}
            }
          }

          // Clean up any orphan user document with same email
          const existingSameEmail = allUsers.find(u => u.email.toLowerCase() === userEmail.toLowerCase() && u.uid !== targetTutorUid);
          if (existingSameEmail) {
            await firestoreService.deleteUserProfile(existingSameEmail.uid);
          }

          await firestoreService.createUserProfile(targetTutorUid, uProfile);
          showToast(`Tutor profile '${userName}' created with system ID: ${uniqueUsername}. Password: ${finalPassword}`, "success");
        } else {
          await firestoreService.updateUserProfile(editingId!, uProfile);
          showToast(`Tutor profile updated.`, "success");
        }
      } else if (modalType === 'class') {
        const selectedTutorObj = users.find(u => u.uid === classTutorId);
        const tName = selectedTutorObj ? selectedTutorObj.name : "Faculty Tutor";
        const cDetails = {
          title: classTitle,
          subject: classSubject,
          description: classDescription,
          schedule: classSchedule,
          dayOfWeek: classDayOfWeek,
          timeSlot: classTimeSlot,
          price: Number(classPrice) || 120,
          maxSlots: Number(classMaxSlots) || 20,
          bookedSlots: Number(classBookedSlots) || 0,
          tutorId: classTutorId,
          tutorName: tName,
          imageUrl: classImageUrl
        };
        if (modalMode === 'add') {
          await firestoreService.createNewClass(cDetails);
          showToast(`Course class '${classTitle}' published successfully.`, "success");
        } else {
          await firestoreService.updateClass(editingId!, cDetails);
          showToast(`Course class updated.`, "success");
        }
        await refreshClasses();
      } else if (modalType === 'payment') {
        const studentObj = users.find(u => u.uid === paymentStudentId);
        const classObj = classesList.find(c => c.id === paymentClassId);
        const sName = studentObj ? studentObj.name : "Academy Scholar";
        const cTitle = classObj ? classObj.title : "Syllabus Course";
        
        const pDetails = {
          studentId: paymentStudentId,
          studentName: sName,
          classId: paymentClassId,
          classTitle: cTitle,
          amount: Number(paymentAmount) || 120,
          status: paymentStatus,
          paymentMethod,
          date: new Date().toISOString()
        };
        if (modalMode === 'add') {
          await firestoreService.createPayment(
            paymentStudentId,
            sName,
            paymentClassId,
            cTitle,
            Number(paymentAmount) || 120,
            paymentMethod,
            paymentStatus
          );
          showToast(`Tuition payment ledger transaction added successfully.`, "success");
        } else {
          await firestoreService.updatePayment(editingId!, pDetails);
          showToast(`Ledger record updated.`, "success");
        }
      }
      setModalType(null);
      await fetchAdminDatasets();
    } catch (err: any) {
      console.error("Error saving modal data:", err);
      showToast(`Administrative saving command failed: ${err?.message || String(err)}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Financial summary tallies
  const totalCollectedRevenue = paymentsList
    .filter(p => p.status === 'paid')
    .reduce((totals, current) => totals + current.amount, 0);

  const successTransactionsCount = paymentsList.filter(p => p.status === 'paid').length;
  const successPcnt = paymentsList.length > 0 
    ? Math.round((successTransactionsCount / paymentsList.length) * 100) 
    : 100;

  // Payments filter matching
  const matchingPayments = paymentsList.filter(p => {
    const matchesStatus = payStatusFilter === 'all' || p.status === payStatusFilter;
    if (!matchesStatus) return false;
    if (!paySearchQuery.trim()) return true;

    const query = paySearchQuery.toLowerCase().trim();
    const studentObj = users.find(u => u.uid === p.studentId);
    const studentUniqueId = (studentObj?.username || '').toLowerCase();
    const studentNameFromUser = (studentObj?.name || '').toLowerCase();
    const studentNameFromPayment = (p.studentName || '').toLowerCase();
    const classTitle = (p.classTitle || '').toLowerCase();
    const studentUid = (p.studentId || '').toLowerCase();

    return (
      studentNameFromPayment.includes(query) ||
      studentNameFromUser.includes(query) ||
      studentUniqueId.includes(query) ||
      studentUid.includes(query) ||
      classTitle.includes(query)
    );
  });

  if (!currentUser) return null;

  if (currentUser.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 bg-white border border-slate-200 rounded-3xl text-center shadow-xs">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-extrabold text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-1">This administrative workspace is strictly reserved for authorized system administrators.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-gray-50/50 min-h-screen py-10"
      id="admin_workspace"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Workspace Title Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div>
              <span className="text-xs font-bold text-red-600 font-mono uppercase tracking-widest block leading-none">Management Office</span>
              <h1 className="text-3xl font-extrabold text-blue-955 tracking-tight mt-3">Academy Administration</h1>
              <p className="text-xs text-gray-400 mt-1">Schedules control logs • Global Ledger ledger • Sync nodes: ONLINE</p>
            </div>
          </div>

          {/* Controls: Admin Profile Avatar & Navigation Dropdown */}
          <div className="flex items-center gap-3">
            {/* Executive ID Pass Button */}
            <button
              id="admin_my_id_card_btn"
              onClick={() => setSelectedUserForIdCard(currentUser || null)}
              className="px-3.5 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-950 text-white rounded-2xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="View, print and export official Executive Admin ID Card"
            >
              <BadgeCheck className="w-4 h-4 text-amber-400" />
              <span>Executive ID Pass</span>
            </button>

            {/* Admin Profile Picture Control */}
            <button
              id="admin_profile_photo_btn"
              onClick={() => setShowAdminCameraModal(true)}
              className="relative group p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow transition-all flex items-center gap-2.5 px-3 py-1.5 cursor-pointer"
              title="Capture photo with Camera or select from Gallery (Instant Admin Direct Approval)"
            >
              <div className="relative">
                <img
                  src={currentUser?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                  alt={currentUser?.name || "Admin"}
                  className="w-8 h-8 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                />
                <div className="absolute -bottom-1 -right-1 bg-red-600 text-white p-0.5 rounded-full ring-2 ring-white dark:ring-slate-800 shadow-xs">
                  <Camera className="w-2.5 h-2.5" />
                </div>
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[11px] font-extrabold text-slate-800 dark:text-white leading-tight">
                  {currentUser?.name || 'Administrator'}
                </p>
                <span className="text-[9px] font-mono font-bold text-red-600 dark:text-red-400">
                  Admin Avatar
                </span>
              </div>
            </button>

            {/* Sub menu controls - Modern Dropdown Navigation */}
            <div className="relative">
            <button
              id="admin_dashboard_nav_dropdown_trigger"
              onClick={() => setIsNavDropdownOpen(!isNavDropdownOpen)}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow transition-all flex items-center gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 text-xs font-black text-slate-800 dark:text-white">
                <span className="p-1.5 bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  {activeTab === 'analytics' && <BarChart3 className="w-4 h-4" />}
                  {activeTab === 'payments' && <CreditCard className="w-4 h-4" />}
                  {activeTab === 'students' && <Users className="w-4 h-4" />}
                  {activeTab === 'progress' && <GraduationCap className="w-4 h-4" />}
                  {activeTab === 'tutors' && <UserCheck className="w-4 h-4" />}
                  {activeTab === 'classes' && <BookOpen className="w-4 h-4" />}
                  {activeTab === 'pathways' && <Layers className="w-4 h-4" />}
                  {activeTab === 'banners' && <ImageIcon className="w-4 h-4" />}
                  {activeTab === 'notices' && <Bell className="w-4 h-4" />}
                  {activeTab === 'email_templates' && <Mail className="w-4 h-4 text-indigo-600" />}
                  {activeTab === 'admins' && <ShieldCheck className="w-4 h-4" />}
                  {activeTab === 'reviews' && <Star className="w-4 h-4" />}
                </span>
                <span className="capitalize">
                  {activeTab === 'analytics' && 'Insights & Analytics'}
                  {activeTab === 'payments' && 'Global Ledger Ledger'}
                  {activeTab === 'students' && 'Scholars & Students'}
                  {activeTab === 'progress' && 'Student Progress & Attendance'}
                  {activeTab === 'tutors' && 'Faculty & Tutors'}
                  {activeTab === 'classes' && 'Curriculums & Classes'}
                  {activeTab === 'pathways' && 'Course Pathways & Subjects'}
                  {activeTab === 'banners' && 'Hero Banners'}
                  {activeTab === 'notices' && 'Notices & System Alerts'}
                  {activeTab === 'email_templates' && 'Email Templates & Notifications'}
                  {activeTab === 'admins' && 'Administrative Staff'}
                  {activeTab === 'reviews' && 'Moderate Reviews'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-700 px-2 py-0.5 rounded-full font-bold ml-1">
                Navigation
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${isNavDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isNavDropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsNavDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 z-40 space-y-1">
                  <div className="px-3 py-1.5 text-[10px] font-mono font-extrabold uppercase text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60 mb-1">
                    Select Section View
                  </div>
                  {[
                    { id: 'analytics', label: 'Insights & Analytics', icon: <BarChart3 className="w-4 h-4 text-blue-500" /> },
                    { id: 'payments', label: 'Global Ledger Ledger', icon: <CreditCard className="w-4 h-4 text-emerald-500" /> },
                    { id: 'students', label: 'Scholars', icon: <Users className="w-4 h-4 text-indigo-500" /> },
                    { id: 'progress', label: 'Student Progress', icon: <GraduationCap className="w-4 h-4 text-purple-500" /> },
                    { id: 'tutors', label: 'Faculty', icon: <UserCheck className="w-4 h-4 text-amber-500" /> },
                    { id: 'classes', label: 'Curriculums', icon: <BookOpen className="w-4 h-4 text-sky-500" /> },
                    { id: 'pathways', label: 'Course Pathways & Subjects', icon: <Layers className="w-4 h-4 text-cyan-500" /> },
                    { id: 'banners', label: 'Hero Banners', icon: <ImageIcon className="w-4 h-4 text-teal-500" /> },
                    { id: 'notices', label: 'Notices & System Alerts', icon: <Bell className="w-4 h-4 text-amber-500" />, badge: notifications.filter(n => !n.isRead).length },
                    { id: 'email_templates', label: 'Email Templates & Suite', icon: <Mail className="w-4 h-4 text-indigo-500" /> },
                    { id: 'admins', label: 'Administrative Staff', icon: <ShieldCheck className="w-4 h-4 text-emerald-500" /> },
                    { id: 'reviews', label: 'Moderate Reviews', icon: <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      id={`admin_tab_${opt.id}`}
                      onClick={() => {
                        setActiveTab(opt.id as any);
                        if (opt.id === 'progress') fetchAttendanceRecords();
                        setIsNavDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === opt.id
                          ? 'bg-blue-600 text-white shadow-xs font-black'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </div>
                      {opt.badge && opt.badge > 0 ? (
                        <span className="px-1.5 py-0.5 text-[9px] bg-red-500 text-white rounded-full font-black animate-pulse">
                          {opt.badge}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Global Pending Profile Picture Approvals Review Banner (Students & Tutors) */}
      {users.filter(u => !!u.pendingPhotoURL).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/20 dark:via-amber-500/10 border border-amber-300 dark:border-amber-700/60 rounded-3xl backdrop-blur-sm shadow-sm"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-sm">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Pending Profile Photo Review Queue
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-extrabold bg-amber-500 text-white rounded-full">
                    {users.filter(u => !!u.pendingPhotoURL).length} Awaiting Approval
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Student and faculty tutor avatars require manual review before being shown publicly in system rosters.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.filter(u => !!u.pendingPhotoURL).map(pendingUser => (
              <div
                key={pendingUser.uid}
                className="p-3.5 bg-white dark:bg-slate-800/90 border border-amber-200 dark:border-amber-700/50 rounded-2xl shadow-xs flex flex-col justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="relative">
                      <img
                        src={pendingUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                        alt="Current"
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                        title="Current Active Photo"
                      />
                      <span className="absolute -bottom-1 -left-1 text-[8px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-1 rounded">
                        Old
                      </span>
                    </div>
                    <span className="text-slate-400 font-bold text-xs">&rarr;</span>
                    <div className="relative">
                      <img
                        src={pendingUser.pendingPhotoURL}
                        alt="Proposed"
                        className="w-10 h-10 rounded-xl object-cover border-2 border-amber-500 shadow-sm"
                        title="Proposed New Photo"
                      />
                      <span className="absolute -bottom-1 -right-1 text-[8px] bg-amber-500 text-white font-bold px-1 rounded shadow-xs">
                        New
                      </span>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {pendingUser.name}
                      </h4>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-extrabold ${
                        pendingUser.role === 'tutor' 
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300' 
                          : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'
                      }`}>
                        {pendingUser.role === 'tutor' ? 'Faculty' : 'Scholar'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{pendingUser.email}</p>
                    {pendingUser.username && (
                      <p className="text-[9px] text-slate-400 font-mono">ID: {pendingUser.username}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700">
                  <button
                    id={`accept-photo-queue-btn-${pendingUser.uid}`}
                    onClick={() => handleApprovePhoto(pendingUser)}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    id={`reject-photo-queue-btn-${pendingUser.uid}`}
                    onClick={() => handleRejectPhoto(pendingUser)}
                    className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

        {/* Aggregate statistics bento bar - Only visible on Insights & Analytics tab */}
        {activeTab === 'analytics' && (
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.08
                }
              }
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8"
          >
            
            {/* Revenue */}
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
              }}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-105 flex items-center justify-center">
                <DollarSign className="w-5.5 h-5.5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-widest block leading-none">Gross Tuition collected</span>
                <span className="text-xl font-extrabold text-blue-950 block mt-1.5 leading-none font-mono">LKR {totalCollectedRevenue}</span>
              </div>
            </motion.div>

            {/* Bookings */}
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
              }}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4"
            >
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 border border-purple-105 flex items-center justify-center">
                <BookOpen className="w-5.5 h-5.5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-widest block leading-none">Syllabus Class Bookings</span>
                <span className="text-xl font-extrabold text-gray-900 block mt-1.5 leading-none font-mono">{bookingsList.length} Active Slots</span>
              </div>
            </motion.div>

            {/* Scholars */}
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
              }}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-105 flex items-center justify-center">
                <Users className="w-5.5 h-5.5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-widest block leading-none">Scholars Enrolled</span>
                <span className="text-xl font-extrabold text-gray-900 block mt-1.5 leading-none font-mono">{users.filter(u => u.role==='student').length} Accounts</span>
              </div>
            </motion.div>

            {/* Collection Status */}
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
              }}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4"
            >
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-105 flex items-center justify-center">
                <TrendingUp className="w-5.5 h-5.5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-widest block leading-none">Ledger Recovery Yield</span>
                <span className="text-xl font-extrabold text-emerald-600 block mt-1.5 leading-none font-mono">{successPcnt}% recovery</span>
              </div>
            </motion.div>

          </motion.div>
        )}

        {/* Dynamic Inner displays */}
        {loading && users.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-xs">
            Querying server administrative clusters...
          </div>
        ) : (
          <div className="animate-fade-in text-xs">
            
            {/* Tab 0: Insights & Analytics Dashboard */}
            {activeTab === 'analytics' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                
                {/* HIGH-LEVEL STATISTICS SUMMARY (Total Students, Active Classes, Pending Payments) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Total Students Card */}
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/60 rounded-2xl p-6 border border-indigo-100 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-500 font-mono tracking-wider block">Total Enrolled Students</span>
                      <span className="text-3xl font-extrabold text-indigo-950 block mt-2 font-mono">
                        {users.filter(u => u.role === 'student').length}
                      </span>
                      <p className="text-[10px] text-indigo-600 mt-1.5 font-medium">Registered scholar profiles</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-white text-indigo-650 flex items-center justify-center shadow-sm border border-indigo-100/40">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Active Classes Card */}
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 rounded-2xl p-6 border border-emerald-100 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-600 font-mono tracking-wider block">Active Curriculums</span>
                      <span className="text-3xl font-extrabold text-emerald-950 block mt-2 font-mono">
                        {classesList.length}
                      </span>
                      <p className="text-[10px] text-emerald-700 mt-1.5 font-medium">Deployed syllabus classes</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-white text-emerald-600 flex items-center justify-center shadow-sm border border-emerald-100/40">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Pending Payments Card */}
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 rounded-2xl p-6 border border-amber-100 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-600 font-mono tracking-wider block">Pending Invoice Ledger</span>
                      <span className="text-3xl font-extrabold text-amber-950 block mt-2 font-mono">
                        {paymentsList.filter(p => p.status === 'pending').length}
                      </span>
                      <p className="text-[10px] text-amber-700 mt-1.5 font-medium">
                        LKR {paymentsList.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0).toLocaleString()} unsettled
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-white text-amber-600 flex items-center justify-center shadow-sm border border-amber-100/40">
                      <CreditCard className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* 30-Day Class Enrollment Trends Recharts Chart */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-extrabold text-blue-950">Class Enrollment Trends (Last 30 Days)</h4>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Daily student registration volume and active class booking velocity synchronized directly with Firestore records.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono font-bold">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                        <span>Class Enrollments</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>Student Signups</span>
                      </div>
                      <div className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                        Live 30D Window
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">30-Day Registrations</p>
                      <p className="text-lg font-extrabold text-blue-950 mt-0.5">
                        {get30DaysEnrollmentData().reduce((acc, d) => acc + (d["Daily Total"] || 0), 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Daily Average</p>
                      <p className="text-lg font-extrabold text-blue-950 mt-0.5">
                        {(get30DaysEnrollmentData().reduce((acc, d) => acc + (d["Daily Total"] || 0), 0) / 30).toFixed(1)} / day
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Peak Daily Volume</p>
                      <p className="text-lg font-extrabold text-emerald-600 mt-0.5">
                        {Math.max(...get30DaysEnrollmentData().map(d => d["Daily Total"] || 0), 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cumulative Velocity</p>
                      <p className="text-lg font-extrabold text-indigo-600 mt-0.5">
                        {get30DaysEnrollmentData().slice(-1)[0]?.["Cumulative Velocity"] || 0}
                      </p>
                    </div>
                  </div>

                  {/* Recharts Area Graph */}
                  <div className="h-72 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={get30DaysEnrollmentData()}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorEnrollments30" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35}/>
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                          </linearGradient>
                          <linearGradient id="colorSignups30" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#94a3b8" 
                          fontSize={9} 
                          tickLine={false} 
                          interval={2}
                        />
                        <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: "#0f172a", 
                            borderRadius: "12px", 
                            border: "none", 
                            color: "#fff", 
                            fontSize: "11px",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)" 
                          }}
                          labelStyle={{ fontWeight: "bold", color: "#38bdf8", marginBottom: "4px" }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: "12px", fontSize: "11px", fontWeight: "600" }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="Class Enrollments" 
                          stroke="#2563eb" 
                          strokeWidth={2.5} 
                          fillOpacity={1} 
                          fill="url(#colorEnrollments30)" 
                          activeDot={{ r: 5 }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="Student Signups" 
                          stroke="#10b981" 
                          strokeWidth={2} 
                          fillOpacity={1} 
                          fill="url(#colorSignups30)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Growth Visualization Chart */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
                    <div>
                      <h4 className="text-sm font-extrabold text-blue-950">Academy Core Growth Trajectory</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">Comprehensive growth metrics comparing scholars, active schedules, and pending payment overhead over 6 months</p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[10px] font-bold font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 block"></span>
                        <span className="text-slate-600">Students</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                        <span className="text-slate-600">Classes</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block"></span>
                        <span className="text-slate-600">Pending Invoice Tasks</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={getGrowthMetricsData()}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }}
                          labelStyle={{ fontWeight: "bold", color: "#38bdf8" }}
                        />
                        <Line type="monotone" dataKey="Total Students" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Active Classes" stroke="#10b981" strokeWidth={2.5} />
                        <Line type="monotone" dataKey="Pending Payments" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Visual Charts section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Chart 1: Scholar Enrollment Trends */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h4 className="text-sm font-extrabold text-blue-950">Scholar Enrollment Trajectory</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">Cumulative monthly student counts registering onboard</p>
                      </div>
                      <div className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-650 text-[10px] font-mono font-bold uppercase">
                        Active Growth
                      </div>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={getMonthlyData()}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorScholars" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} />
                          <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }}
                            labelStyle={{ fontWeight: "bold", color: "#38bdf8" }}
                          />
                          <Area type="monotone" dataKey="Scholars Enrolled" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorScholars)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: Monthly revenue growth */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h4 className="text-sm font-extrabold text-blue-950">Tuition Revenue & Fee Collections</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">Monthly aggregate gross ledger settlements in LKR</p>
                      </div>
                      <div className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-650 text-[10px] font-mono font-bold uppercase">
                        Payments Sync
                      </div>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={getMonthlyData()}
                          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} />
                          <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} />
                          <Tooltip 
                            formatter={(value) => [`LKR ${Number(value).toLocaleString()}`, "Gross Revenue"]}
                            contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }}
                            labelStyle={{ fontWeight: "bold", color: "#34d399" }}
                          />
                          <Bar dataKey="Revenue (LKR)" fill="#10b981" radius={[6, 6, 0, 0]} barSize={36} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

                {/* System Activity Feed Component with live Firestore data stream */}
                <SystemActivityFeed 
                  users={users}
                  classes={classesList}
                  payments={paymentsList}
                  bookings={bookingsList}
                  onRefresh={fetchAdminDatasets}
                />

                {/* CSV exporter card block */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-md shadow-blue-100">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h4 className="text-base font-extrabold">Data Portability & Administrative Exporter</h4>
                      <p className="text-[11px] text-blue-100 mt-1 leading-relaxed max-w-xl">
                        Generate and download high-fidelity comma-separated values (.csv) spreadsheets of student scheduling slots, tutors matched, and enrolled schedules to facilitate localized accounting audits and attendance tracking.
                      </p>
                    </div>
                    <button
                      id="admin_btn_export_csv"
                      onClick={exportToCSV}
                      className="px-5 py-2.5 bg-white hover:bg-blue-50 text-blue-800 rounded-xl font-bold flex items-center gap-2 text-xs shadow-lg transition-all cursor-pointer whitespace-nowrap self-start md:self-auto"
                    >
                      <Download className="w-4.5 h-4.5 text-blue-700" /> Export Records as CSV
                    </button>
                  </div>
                </div>

              </motion.div>
            )}

            {/* Tab 1: Ledger & Payments logs */}
            {activeTab === 'payments' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 space-y-4"
              >
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-gray-950 flex items-center gap-1.5">
                      <CreditCard className="w-5 h-5 text-blue-550" />
                      Gross Tuition Class Ledger Receipts
                    </h3>
                    <p className="text-[10px] text-gray-450 mt-0.5">Manage, add, modify or delete ledger invoice transactions</p>
                  </div>

                  {/* Filters handles */}
                  <div className="flex flex-wrap gap-2.5 items-center w-full sm:w-auto">
                    <button 
                      id="admin_btn_add_payment"
                      onClick={() => openAddModal('payment')}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all flex items-center gap-1 cursor-pointer text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Ledger Record
                    </button>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-2.5 flex items-center text-gray-400">
                        <Search className="w-3.5 h-3.5" />
                      </span>
                      <input 
                        type="text" 
                        value={paySearchQuery}
                        onChange={(e) => setPaySearchQuery(e.target.value)}
                        placeholder="Search student or class name..."
                        className="text-xs pl-8.5 pr-2.5 py-1.5 rounded-lg border border-gray-200 outline-none w-52 font-sans"
                      />
                    </div>
                    <select
                      value={payStatusFilter}
                      onChange={(e) => setPayStatusFilter(e.target.value)}
                      className="text-xs rounded-lg border border-gray-200 px-2 py-1.5 outline-none font-sans"
                    >
                      <option value="all">Logs: All status</option>
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>

                {/* Ledger Table logs */}
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-100 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                        <th className="p-3">Ref ID & Gateway</th>
                        <th className="p-3">Scholar</th>
                        <th className="p-3">Course / Class</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Gateway Details</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {matchingPayments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-400">
                            No ledger logs match selected filters.
                          </td>
                        </tr>
                      ) : (
                        matchingPayments.map((p) => {
                          const isPaid = p.status === 'paid';
                          const isFailed = p.status === 'failed';
                          const isPending = p.status === 'pending';
                          return (
                            <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="p-3 font-mono">
                                <span className="font-bold text-slate-800 block text-[11px]">{p.id}</span>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {p.gateway === 'stripe' ? (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-150 uppercase">
                                      Stripe Card
                                    </span>
                                  ) : p.gateway === 'paypal' ? (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-50 text-sky-700 border border-sky-150 uppercase">
                                      PayPal
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                                      {p.gateway || 'Direct'}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="font-bold text-gray-900 block">{p.studentName}</span>
                                {p.payerEmail && (
                                  <span className="text-[10px] text-gray-400 font-mono block">{p.payerEmail}</span>
                                )}
                              </td>
                              <td className="p-3 text-gray-650 max-w-xs" title={p.classTitle}>
                                <span className="font-semibold text-slate-850 block truncate">{p.classTitle}</span>
                                <span className="text-[10px] text-gray-400 block font-mono">{new Date(p.date).toLocaleDateString()}</span>
                              </td>
                              <td className="p-3 font-mono font-bold text-indigo-700">
                                LKR {p.amount.toLocaleString()}
                              </td>
                              <td className="p-3">
                                <span className="text-[11px] text-slate-600 block">{p.paymentMethod || 'Credit Card'}</span>
                                {p.transactionId && (
                                  <span className="text-[9px] font-mono text-slate-400 block truncate max-w-[140px]" title={p.transactionId}>
                                    Txn: {p.transactionId}
                                  </span>
                                )}
                              </td>
                              <td className="p-3">
                                {isPaid && <span className="inline-block py-0.5 px-2 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px] border border-emerald-200">Paid</span>}
                                {isFailed && <span className="inline-block py-0.5 px-2 bg-red-50 text-red-700 rounded-full font-bold text-[10px] border border-red-200">Failed</span>}
                                {isPending && <span className="inline-block py-0.5 px-2 bg-yellow-50 text-yellow-800 rounded-full font-bold text-[10px] border border-yellow-200">Pending</span>}
                              </td>
                              <td className="p-3">
                                <div className="flex gap-1.5 items-center">
                                  {!isPaid && (
                                    <button 
                                      onClick={() => handleUpdatePaymentStatus(p.id, 'paid')}
                                      className="py-1 px-2 rounded bg-emerald-50 text-emerald-600 border border-emerald-150 font-bold hover:bg-emerald-100 cursor-pointer text-[10px] whitespace-nowrap"
                                    >
                                      Approve
                                    </button>
                                  )}
                                  <button 
                                    id={`edit-payment-btn-${p.id}`}
                                    onClick={() => openEditModal('payment', p)}
                                    className="p-1 rounded bg-gray-50 hover:bg-gray-100 border border-gray-150 text-blue-600 cursor-pointer"
                                    title="Edit payment details"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    id={`delete-payment-btn-${p.id}`}
                                    onClick={() => handleDeletePayment(p.id, p.classTitle || "Transaction Record") }
                                    className="p-1 rounded bg-red-50 hover:bg-red-100 border border-red-105 text-red-600 cursor-pointer"
                                    title="Delete transaction record"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

              </motion.div>
            )}

            {/* Tab 2: Registered Student scholars */}
            {activeTab === 'students' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4"
              >
                <div className="flex justify-between items-center border-b pb-3 border-gray-50">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                      <Users className="w-5 h-5 text-blue-500" /> Registered Students scholars ({users.filter(u => u.role === 'student').length})
                    </h3>
                    <p className="text-[10px] text-gray-400">Enroll new student scholar accounts, edit positions or remove profiles</p>
                  </div>
                  <button 
                    id="admin_btn_add_student"
                    onClick={() => openAddModal('student')}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Student Account
                  </button>
                </div>

                {/* Independent Filtering Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-550 uppercase font-mono mb-1">Filter by Full Name:</label>
                    <input 
                      type="text"
                      placeholder="Search name..."
                      value={studentSearchName}
                      onChange={(e) => setStudentSearchName(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-200 focus:border-indigo-550 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-550 uppercase font-mono mb-1">Filter by Username (Student ID):</label>
                    <input 
                      type="text"
                      placeholder="Search username (e.g. 10000001)..."
                      value={studentSearchUsername}
                      onChange={(e) => setStudentSearchUsername(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-200 focus:border-indigo-550 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {users
                    .filter(u => u.role === 'student')
                    .filter(stud => {
                      const nameMatch = !studentSearchName.trim() || stud.name.toLowerCase().includes(studentSearchName.toLowerCase());
                      const usernameMatch = !studentSearchUsername.trim() || (stud.username || '').toLowerCase().includes(studentSearchUsername.toLowerCase());
                      return nameMatch && usernameMatch;
                    })
                    .map((stud) => {
                      const isPending = stud.status === 'pending';
                      const preferredTitles = (stud.selectedClasses || []).map(cid => classesList.find(c => c.id === cid)?.title || cid).filter(Boolean);
                    
                    return (
                      <div 
                        key={stud.uid} 
                        className={`p-4 border rounded-xl flex flex-col justify-between transition-all hover:border-indigo-200 ${
                          isPending ? 'bg-amber-50/40 border-amber-200 shadow-sm shadow-amber-50/50' : 'bg-gray-50/40 border-gray-150'
                        }`}
                      >
                        <div className="flex gap-3.5 items-start">
                          {stud.photoURL ? (
                            <img className="h-10 w-10 rounded-full object-cover border border-gray-250 flex-shrink-0" src={stud.photoURL} alt="" />
                          ) : (
                            <div className="h-10 w-10 bg-indigo-150 text-indigo-850 flex items-center justify-center font-bold text-sm rounded-full flex-shrink-0">
                              {stud.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-gray-950 leading-snug">{stud.name}</h4>
                              {isPending ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider">
                                  Pending Intake
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider">
                                  Active Approved
                                </span>
                              )}
                            </div>
                            
                            <p className="text-gray-500 font-mono text-[10px]">{stud.email}</p>
                            
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-gray-650 pt-1 leading-snug">
                              <p>Phone: <span className="font-bold text-slate-800">{stud.phone || 'N/A'}</span></p>
                              <p>Gender: <span className="font-bold text-slate-800 capitalize">{stud.gender || 'male'}</span></p>
                              <p className="col-span-2">Address: <span className="font-semibold text-slate-800">{stud.address || 'N/A'}</span></p>
                              <p className="col-span-2">Guardian: <span className="font-bold text-slate-800">{stud.guardianName || 'N/A'}</span> ({stud.guardianPhone || 'N/A'})</p>
                            </div>

                            <div className="flex gap-1.5 flex-wrap pt-1 items-center">
                              <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-150 rounded text-[9px] font-extrabold">
                                {stud.studentDetails?.grade || (stud as any).grade || 'Grade 11'}
                              </span>
                              {stud.username && (
                                <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-800 border border-slate-205 rounded font-mono text-[9px] font-black">
                                  ID: {stud.username}
                                </span>
                              )}
                            </div>

                            {preferredTitles.length > 0 && (
                              <div className="pt-1">
                                <span className="block text-[10px] font-bold text-indigo-750 uppercase tracking-wide">Enrolled Classes:</span>
                                <p className="text-[10px] text-slate-500 italic mt-0.5 leading-tight">{preferredTitles.join(', ')}</p>
                              </div>
                            )}

                            {isPending && (
                              <button
                                id={`approve-student-btn-${stud.uid}`}
                                onClick={() => handleApproveStudent(stud.uid, stud.gender)}
                                className="mt-2 w-full py-2 px-3 bg-slate-900 border border-slate-950 text-white rounded-xl text-xs font-black hover:bg-slate-950 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                Approve & Generate Username
                              </button>
                            )}
                            {stud.pendingPhotoURL && (
                              <div className="mt-3 p-3 bg-amber-50/70 border border-amber-205 rounded-xl space-y-2">
                                <span className="block text-[10px] font-black text-amber-800 uppercase tracking-widest font-mono">
                                  📸 Proposed Photo Change
                                </span>
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <img src={stud.photoURL || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150"} className="w-10 h-10 rounded-full object-cover border border-slate-200" title="Current Active Photo" />
                                    <span className="absolute -bottom-1 -right-1 text-red-500 bg-white rounded-full px-1 text-[8px] font-bold shadow-sm border border-slate-100">Old</span>
                                  </div>
                                  <span className="text-slate-400 font-mono text-xs">&rarr;</span>
                                  <div className="relative">
                                    <img src={stud.pendingPhotoURL} className="w-10 h-10 rounded-full object-cover border-2 border-amber-400" title="Proposed New Photo" />
                                    <span className="absolute -bottom-1 -right-1 text-emerald-500 bg-white rounded-full px-1 text-[8px] font-bold shadow-sm border border-slate-100">New</span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    id={`accept-photo-btn-${stud.uid}`}
                                    onClick={() => handleApprovePhoto(stud)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-xs"
                                  >
                                    Accept Photo
                                  </button>
                                  <button
                                    id={`reject-photo-btn-${stud.uid}`}
                                    onClick={() => handleRejectPhoto(stud)}
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                                  >
                                    Reject photo
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Action Controls */}
                        <div className="flex justify-end gap-1.5 mt-3 pt-2.5 border-t border-slate-100 flex-wrap">
                          <button
                            id={`idcard-student-btn-${stud.uid}`}
                            onClick={() => setSelectedUserForIdCard(stud)}
                            className="p-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 cursor-pointer flex items-center gap-1 text-[11px] font-bold transition-all"
                            title="Generate and print official Student ID Card"
                          >
                            <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" /> ID Card
                          </button>
                          <button
                            id={`progress-student-btn-${stud.uid}`}
                            onClick={() => {
                              setSelectedProgressStudentId(stud.uid);
                              setActiveTab('progress');
                              fetchAttendanceRecords();
                            }}
                            className="p-1 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 cursor-pointer flex items-center gap-1 text-[11px] font-bold transition-all"
                            title="View student academic progress, quiz scores & attendance"
                          >
                            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" /> View Progress
                          </button>
                          <button 
                            id={`edit-student-btn-${stud.uid}`}
                            onClick={() => openEditModal('student', stud)}
                            className="p-1 px-2.5 rounded-lg bg-white hover:bg-gray-100 border border-gray-200 text-blue-600 cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                            title="Edit scholar profile"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button 
                            id={`delete-student-btn-${stud.uid}`}
                            onClick={() => handleDeleteStudent(stud.uid, stud.name)}
                            className="p-1 px-2.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                            title="Withdraw/Delete scholar account"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Tab: Student Progress & Performance Analytics */}
            {activeTab === 'progress' && (() => {
              const studentList = users.filter(u => u.role === 'student');

              const filteredStudents = studentList.filter(stud => {
                const query = progressSearchTerm.trim().toLowerCase();
                const nameMatch = !query || stud.name.toLowerCase().includes(query);
                const usernameMatch = !query || (stud.username || '').toLowerCase().includes(query);
                const emailMatch = !query || (stud.email || '').toLowerCase().includes(query);
                const matchQuery = nameMatch || usernameMatch || emailMatch;

                const studGrade = stud.studentDetails?.grade || (stud as any).grade || '';
                const matchGrade = progressGradeFilter === 'all' || studGrade === progressGradeFilter;

                return matchQuery && matchGrade;
              });

              const activeStudent = studentList.find(s => s.uid === selectedProgressStudentId) || filteredStudents[0] || studentList[0];
              const activeStudentIndex = filteredStudents.findIndex(s => s?.uid === activeStudent?.uid);

              const activeStudentBookings = activeStudent 
                ? bookingsList.filter(b => b.studentId === activeStudent.uid || b.studentName === activeStudent.name)
                : [];

              const activeStudentAttendance = activeStudent
                ? attendanceRecords.filter(a => a.studentId === activeStudent.uid || a.studentName === activeStudent.name)
                : [];

              const exportStudentProgressCSV = () => {
                if (!activeStudent) return;
                const rows = [
                  ["Field", "Value"],
                  ["Student Name", activeStudent.name],
                  ["Username (Student ID)", activeStudent.username || 'N/A'],
                  ["Email", activeStudent.email],
                  ["Phone", activeStudent.phone || 'N/A'],
                  ["Grade", activeStudent.studentDetails?.grade || (activeStudent as any).grade || 'Grade 11'],
                  ["Status", activeStudent.status || 'active'],
                  ["Enrolled Classes Count", activeStudentBookings.length.toString()],
                  ["Attendance Records Count", activeStudentAttendance.length.toString()],
                  ["Report Generated Date", new Date().toLocaleString()]
                ];

                const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `student_progress_${(activeStudent.username || activeStudent.name).replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                showToast(`Progress summary report downloaded for ${activeStudent.name}`, "success");
              };

              return (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  {/* Top Banner & Filtering Controls */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4 border-gray-100">
                      <div>
                        <h3 className="text-lg font-black text-blue-950 flex items-center gap-2">
                          <GraduationCap className="w-6 h-6 text-indigo-600" /> Scholar Performance & Attendance Intelligence
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Comprehensive student progress tracker with real-time quiz performance curves, attendance scan logs, and course mastery scores.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-xl text-xs font-bold flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-indigo-600" />
                          <span>{studentList.length} Total Scholars</span>
                        </div>
                        <button
                          onClick={fetchAttendanceRecords}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
                        >
                          🔄 Refresh Attendance Logs
                        </button>
                      </div>
                    </div>

                    {/* Live Filter Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase">Filter by Username or Name:</label>
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Search name or ID (e.g. GB00000000)..."
                            value={progressSearchTerm}
                            onChange={(e) => setProgressSearchTerm(e.target.value)}
                            className="w-full text-xs pl-8 pr-3 py-2 bg-white rounded-lg border border-slate-200 focus:border-indigo-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase">Filter by Grade Level:</label>
                        <select
                          value={progressGradeFilter}
                          onChange={(e) => setProgressGradeFilter(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-200 focus:border-indigo-500 outline-none font-medium cursor-pointer"
                        >
                          <option value="all">All Academic Grades</option>
                          <option value="Grade 6">Grade 6</option>
                          <option value="Grade 7">Grade 7</option>
                          <option value="Grade 8">Grade 8</option>
                          <option value="Grade 9">Grade 9</option>
                          <option value="Grade 10">Grade 10</option>
                          <option value="Grade 11">Grade 11</option>
                          <option value="Grade 12">Grade 12</option>
                          <option value="Grade 13">Grade 13</option>
                        </select>
                      </div>

                      {/* Direct One-by-One Student Dropdown Selector */}
                      <div className="space-y-1 sm:col-span-2">
                        <label className="block text-[10px] font-mono font-bold text-indigo-700 uppercase">Select Individual Student (One-by-One View):</label>
                        <div className="flex items-center gap-2">
                          <select
                            value={activeStudent?.uid || ''}
                            onChange={(e) => setSelectedProgressStudentId(e.target.value)}
                            className="w-full text-xs px-3 py-2 bg-white border-2 border-indigo-200 text-indigo-950 font-extrabold rounded-lg focus:border-indigo-600 outline-none cursor-pointer"
                          >
                            {filteredStudents.length === 0 ? (
                              <option value="">No matching students found</option>
                            ) : (
                              filteredStudents.map(s => (
                                <option key={s.uid} value={s.uid}>
                                  {s.name} ({s.username || s.email}) - {s.studentDetails?.grade || (s as any).grade || 'Grade 11'}
                                </option>
                              ))
                            )}
                          </select>

                          {/* Prev / Next buttons for one-by-one stepping */}
                          <button
                            disabled={activeStudentIndex <= 0}
                            onClick={() => {
                              if (activeStudentIndex > 0) {
                                setSelectedProgressStudentId(filteredStudents[activeStudentIndex - 1].uid);
                              }
                            }}
                            className="p-2 bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-200 rounded-lg text-slate-700 cursor-pointer"
                            title="Previous Student"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            disabled={activeStudentIndex >= filteredStudents.length - 1}
                            onClick={() => {
                              if (activeStudentIndex < filteredStudents.length - 1) {
                                setSelectedProgressStudentId(filteredStudents[activeStudentIndex + 1].uid);
                              }
                            }}
                            className="p-2 bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-200 rounded-lg text-slate-700 cursor-pointer"
                            title="Next Student"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Grid: Student Directory List + Active Progress Dashboard */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Directory List (4 cols) */}
                    <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3 max-h-[850px] overflow-y-auto">
                      <div className="flex justify-between items-center px-1 pb-2 border-b border-gray-100">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">
                          Searchable Directory ({filteredStudents.length})
                        </span>
                        <span className="text-[10px] text-gray-400">Click to select</span>
                      </div>

                      {filteredStudents.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 space-y-2">
                          <Search className="w-8 h-8 mx-auto text-gray-300" />
                          <p className="text-xs font-semibold">No student records match search parameters.</p>
                        </div>
                      ) : (
                        filteredStudents.map((stud) => {
                          const isSelected = activeStudent?.uid === stud.uid;
                          const studBookingsCount = bookingsList.filter(b => b.studentId === stud.uid || b.studentName === stud.name).length;

                          return (
                            <div
                              key={stud.uid}
                              onClick={() => setSelectedProgressStudentId(stud.uid)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                isSelected
                                  ? 'bg-indigo-50/80 border-indigo-300 shadow-xs ring-1 ring-indigo-200'
                                  : 'bg-slate-50/50 border-slate-100 hover:border-slate-200 hover:bg-slate-100/50'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {stud.photoURL ? (
                                  <img className="h-9 w-9 rounded-full object-cover border border-slate-200 flex-shrink-0" src={stud.photoURL} alt="" />
                                ) : (
                                  <div className="h-9 w-9 bg-indigo-600 text-white flex items-center justify-center font-bold text-xs rounded-full flex-shrink-0">
                                    {stud.name.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <h5 className="text-xs font-extrabold text-slate-900 truncate">{stud.name}</h5>
                                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                    {stud.username && (
                                      <span className="px-1.5 py-0.2 bg-white text-indigo-900 border border-indigo-150 rounded font-mono text-[9px] font-extrabold">
                                        ID: {stud.username}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-500 font-medium">
                                      {stud.studentDetails?.grade || (stud as any).grade || 'Grade 11'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right flex-shrink-0">
                                <span className="block text-[10px] font-black text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-100">
                                  {studBookingsCount} Classes
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Right Active Student Inspector View (8 cols) */}
                    <div className="lg:col-span-8 space-y-6">
                      {!activeStudent ? (
                        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
                          <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                          <p className="text-sm font-bold">Please select a student scholar to inspect their performance metrics.</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Selected Student Executive Profile Summary */}
                          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                {activeStudent.photoURL ? (
                                  <img src={activeStudent.photoURL} className="w-14 h-14 rounded-full object-cover border-2 border-indigo-400/50 shadow-sm" alt="" />
                                ) : (
                                  <div className="w-14 h-14 rounded-full bg-indigo-600 text-white font-extrabold text-xl flex items-center justify-center border-2 border-indigo-400/50">
                                    {activeStudent.name.substring(0, 2).toUpperCase()}
                                  </div>
                                )}

                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-xl font-extrabold tracking-tight">{activeStudent.name}</h2>
                                    {activeStudent.username && (
                                      <span className="px-2 py-0.5 bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 font-mono text-xs font-black rounded-lg">
                                        ID: {activeStudent.username}
                                      </span>
                                    )}
                                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold rounded-full uppercase">
                                      {activeStudent.status || 'Active'}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-indigo-200/80 mt-1">
                                    <span>📧 {activeStudent.email}</span>
                                    <span>📱 {activeStudent.phone || 'N/A'}</span>
                                    <span>🎓 {activeStudent.studentDetails?.grade || (activeStudent as any).grade || 'Grade 11'}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={exportStudentProgressCSV}
                                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                >
                                  <Download className="w-3.5 h-3.5" /> Export Report
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-indigo-800/50 text-xs">
                              <div>
                                <span className="text-[10px] uppercase font-mono text-indigo-300 font-bold block">Guardian Name:</span>
                                <span className="font-semibold">{activeStudent.guardianName || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-mono text-indigo-300 font-bold block">Guardian Phone:</span>
                                <span className="font-semibold">{activeStudent.guardianPhone || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-mono text-indigo-300 font-bold block">Enrolled Classes:</span>
                                <span className="font-semibold">{activeStudentBookings.length} Active Courses</span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-mono text-indigo-300 font-bold block">Scan Attendance Logs:</span>
                                <span className="font-semibold">{activeStudentAttendance.length} Total Sessions</span>
                              </div>
                            </div>
                          </div>

                          {/* Render Full StudentProgressTracker for Selected Student */}
                          <StudentProgressTracker
                            currentUser={activeStudent}
                            userBookings={activeStudentBookings}
                            classes={classesList}
                            attendanceRecords={activeStudentAttendance}
                            onAttendanceMarked={fetchAttendanceRecords}
                            showToast={showToast}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* Tab 3: Verified Tutors */}
            {activeTab === 'tutors' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 font-sans"
              >
                <div className="flex justify-between items-center border-b pb-3 border-gray-50 animate-fade-in font-sans">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-5 h-5 text-indigo-650" /> Board Certified Tuition Faculty ({users.filter(u => u.role==='tutor').length})
                    </h3>
                    <p className="text-[10px] text-gray-400 font-sans">Register new tutors, edit qualifications and define hourly pay metrics</p>
                  </div>
                  <button 
                    id="admin_btn_add_tutor"
                    onClick={() => openAddModal('tutor')}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Faculty Tutor
                  </button>
                </div>

                {/* Independent Filtering Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-550 uppercase font-mono mb-1">Filter by Full Name:</label>
                    <input 
                      type="text"
                      placeholder="Search tutor name..."
                      value={tutorSearchName}
                      onChange={(e) => setTutorSearchName(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-200 focus:border-indigo-550 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-550 uppercase font-mono mb-1">Filter by Username (Tutor ID):</label>
                    <input 
                      type="text"
                      placeholder="Search username (e.g. GT00000000)..."
                      value={tutorSearchUsername}
                      onChange={(e) => setTutorSearchUsername(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-200 focus:border-indigo-550 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {users
                    .filter(u => u.role === 'tutor')
                    .filter(tut => {
                      const nameMatch = !tutorSearchName.trim() || tut.name.toLowerCase().includes(tutorSearchName.toLowerCase());
                      const usernameMatch = !tutorSearchUsername.trim() || (tut.username || '').toLowerCase().includes(tutorSearchUsername.toLowerCase());
                      return nameMatch && usernameMatch;
                    })
                    .map((tut) => (
                    <div 
                      key={tut.uid} 
                      className="p-4 border border-emerald-100/60 rounded-xl bg-slate-50/40 flex flex-col justify-between transition-all hover:border-indigo-150"
                    >
                      <div className="flex gap-3.5 items-start">
                        {tut.photoURL ? (
                          <img className="h-10 w-10 rounded-full object-cover border border-emerald-150 flex-shrink-0" src={tut.photoURL} alt="" />
                        ) : (
                          <div className="h-10 w-10 bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm rounded-full flex-shrink-0">
                            TJ
                          </div>
                        )}
                        <div className="space-y-1 flex-1 min-w-0">
                          <h4 className="font-extrabold text-gray-950 leading-none">{tut.name}</h4>
                          <p className="text-gray-500 font-mono text-[10px] truncate">{tut.email}</p>
                          <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">{tut.tutorDetails?.bio || 'No general biography registered.'}</p>
                          <p className="text-gray-500 text-[11px]">Degree: <span className="font-bold text-gray-800 font-sans">{tut.tutorDetails?.qualification || 'Certified Professional'}</span></p>
                          
                          <div className="flex gap-1.5 flex-wrap pt-1">
                            <span className="font-extrabold text-emerald-850 font-mono text-[11px] bg-emerald-50 px-2 py-0.5 border border-emerald-150 rounded">${tut.tutorDetails?.hourlyRate || (tut as any).hourlyRate || 35}/Hr</span>
                            {tut.username && (tut.username.startsWith('GT') || tut.uid.startsWith('GT')) ? (
                              <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-800 border border-slate-205 rounded font-mono text-[9px] font-bold">
                                ID: {tut.username.startsWith('GT') ? tut.username : tut.uid}
                              </span>
                            ) : (
                              <button
                                id={`allocate-id-btn-${tut.uid}`}
                                onClick={() => handleAssignTutorUsername(tut.uid)}
                                className="px-2 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-700 hover:bg-indigo-100 rounded text-[9px] font-black transition-colors cursor-pointer flex items-center gap-1"
                                title="Generate system identifier (GT00000000) for tutor"
                              >
                                Allocate ID
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {tut.pendingPhotoURL && (
                        <div className="mt-3 p-3 bg-amber-50/70 dark:bg-amber-900/20 border border-amber-205 dark:border-amber-700/50 rounded-xl space-y-2">
                          <span className="block text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-widest font-mono">
                            📸 Proposed Faculty Photo
                          </span>
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img src={tut.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"} className="w-10 h-10 rounded-full object-cover border border-slate-200" title="Current Active Photo" />
                              <span className="absolute -bottom-1 -right-1 text-red-500 bg-white rounded-full px-1 text-[8px] font-bold shadow-sm border border-slate-100">Old</span>
                            </div>
                            <span className="text-slate-400 font-mono text-xs">&rarr;</span>
                            <div className="relative">
                              <img src={tut.pendingPhotoURL} className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 shadow-sm" title="Proposed New Photo" />
                              <span className="absolute -bottom-1 -right-1 text-emerald-500 bg-white rounded-full px-1 text-[8px] font-bold shadow-sm border border-slate-100">New</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              id={`accept-tutor-photo-btn-${tut.uid}`}
                              onClick={() => handleApprovePhoto(tut)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-xs"
                            >
                              Accept Photo
                            </button>
                            <button
                              id={`reject-tutor-photo-btn-${tut.uid}`}
                              onClick={() => handleRejectPhoto(tut)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-100 dark:border-rose-800/40 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                            >
                              Reject photo
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Card Action Controls */}
                      <div className="flex justify-end gap-1.5 mt-3 pt-2.5 border-t border-slate-100 flex-wrap">
                        <button
                          id={`idcard-tutor-btn-${tut.uid}`}
                          onClick={() => setSelectedUserForIdCard(tut)}
                          className="p-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 cursor-pointer flex items-center gap-1 text-[11px] font-bold transition-all"
                          title="Generate and print official Faculty ID Card"
                        >
                          <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" /> ID Card
                        </button>
                        <button
                          id={`view-tutor-profile-btn-${tut.uid}`}
                          onClick={() => setSelectedTutorForProfile(tut)}
                          className="p-1 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-700 cursor-pointer flex items-center gap-1 text-[11px] font-bold transition-all"
                          title="View full tutor biography, expertise areas & working hours"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-600" /> Profile
                        </button>
                        <button 
                          id={`feature-tutor-btn-${tut.uid}`}
                          onClick={async () => {
                            try {
                              const updatedFeatured = !tut.isFeatured;
                              await firestoreService.updateUserProfile(tut.uid, { isFeatured: updatedFeatured });
                              showToast(`${tut.name} has been ${updatedFeatured ? 'marked as Featured' : 'removed from Featured'}.`, "success");
                              const updatedUsers = users.map(u => u.uid === tut.uid ? { ...u, isFeatured: updatedFeatured } : u);
                              setUsers(updatedUsers);
                            } catch (err) {
                              showToast("Failed to update tutor status.", "error");
                            }
                          }}
                          className={`p-1 px-2.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold ${
                            tut.isFeatured 
                              ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700' 
                              : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-650'
                          }`}
                          title="Toggle featured status on homepage"
                        >
                          <Star className={`w-3.5 h-3.5 ${tut.isFeatured ? 'fill-amber-400 text-amber-500' : 'text-gray-400'}`} /> 
                          {tut.isFeatured ? 'Featured' : 'Feature'}
                        </button>
                        <button 
                          id={`edit-tutor-btn-${tut.uid}`}
                          onClick={() => openEditModal('tutor', tut)}
                          className="p-1 px-2.5 rounded-lg bg-white hover:bg-gray-100 border border-gray-200 text-blue-600 cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                          title="Edit tutor card"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button 
                          id={`delete-tutor-btn-${tut.uid}`}
                          onClick={() => handleDeleteTutor(tut.uid, tut.name)}
                          className="p-1 px-2.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-105 text-red-600 cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                          title="Delete tutor record"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Tab 4: Class Calendars Published */}
            {activeTab === 'classes' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4"
              >
                <div className="flex justify-between items-center border-b pb-3 border-gray-50">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-5 h-5 text-blue-500" /> Published Courses Curriculum Directory ({classesList.length})
                    </h3>
                    <p className="text-[10px] text-gray-400">Publish class syllabus pages, set capacity limits and modify time schedules</p>
                  </div>
                  <button 
                    id="admin_btn_publish_class"
                    onClick={() => openAddModal('class')}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Publish New Class
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classesList.map((c) => {
                    const spacesLeft = c.maxSlots - c.bookedSlots;
                    return (
                      <div 
                        key={c.id} 
                        onClick={() => setSelectedClassForProfile(c)}
                        className="p-4 border border-gray-100 rounded-xl bg-gray-50/20 text-xs space-y-2.5 transition-all hover:border-blue-300 hover:shadow-xs flex justify-between gap-3 items-start cursor-pointer group relative"
                      >
                        <div className="flex-1 space-y-1.5">
                          <div className="flex justify-between items-start gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase font-mono tracking-wider">{c.subject}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedClassForScanner(c);
                                  setShowClassScannerModal(true);
                                }}
                                className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all cursor-pointer shadow-xs border border-indigo-400/30 flex items-center gap-1 text-[10px] font-bold"
                                title="Open QR Attendance Scanner for this class"
                                id={`btn_scan_qr_admin_item_${c.id}`}
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>Scan QR</span>
                              </button>
                              <span className="font-mono text-blue-700 font-extrabold text-sm">LKR {c.price}/Mo</span>
                            </div>
                          </div>

                          <h4 className="font-extrabold text-gray-950 text-xs leading-snug pt-1 group-hover:text-indigo-600 transition-colors">{c.title}</h4>
                          <p className="text-gray-500 leading-relaxed text-[11px] line-clamp-2">{c.description}</p>
                          <p className="text-gray-400 font-mono text-[10px]">Schedule: <span className="font-bold text-gray-800">{c.schedule}</span></p>
                          
                          <div className="flex justify-between items-center text-[10px] border-t border-dashed border-gray-100 pt-2 text-gray-400 font-mono">
                            <span>By: {c.tutorName}</span>
                            <span className={`font-semibold ${spacesLeft <= 2 ? 'text-red-500 font-bold' : 'text-emerald-600'}`}>
                              Intakes: {c.bookedSlots}/{c.maxSlots} Seats filled
                            </span>
                          </div>
                        </div>

                        {/* Card Action Controls */}
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button 
                            id={`feature-class-btn-${c.id}`}
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const updatedFeatured = !c.isFeatured;
                                await firestoreService.updateClass(c.id, { isFeatured: updatedFeatured });
                                showToast(`Class "${c.title}" has been ${updatedFeatured ? 'marked as Featured' : 'removed from Featured'}.`, "success");
                                const updatedClasses = classesList.map(item => item.id === c.id ? { ...item, isFeatured: updatedFeatured } : item);
                                setClassesList(updatedClasses);
                                if (refreshClasses) {
                                  refreshClasses();
                                }
                              } catch (err) {
                                showToast("Failed to update class status.", "error");
                              }
                            }}
                            className={`p-1 rounded cursor-pointer border transition-colors ${
                              c.isFeatured 
                                ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-500 font-bold' 
                                : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-400 hover:text-amber-500'
                            }`}
                            title="Toggle featured status on homepage"
                          >
                            <Star className={`w-3.5 h-3.5 ${c.isFeatured ? 'fill-amber-400 text-amber-500' : ''}`} />
                          </button>
                          <button 
                            id={`edit-class-btn-${c.id}`}
                            onClick={() => openEditModal('class', c)}
                            className="p-1 rounded bg-white hover:bg-gray-100 border border-gray-200 text-blue-600 cursor-pointer"
                            title="Edit course syllabus"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            id={`delete-class-btn-${c.id}`}
                            onClick={() => handleDeleteClass(c.id, c.title)}
                            className="p-1 rounded bg-red-50 hover:bg-red-100 border border-red-105 text-red-600 cursor-pointer"
                            title="Delete course from faculty"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Tab 5: notices announcements portal */}
            {activeTab === 'notices' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* 24-Hour Class Reminder Cron Control Panel */}
                <ClassReminderCronPanel />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Notice Deployer */}
                  <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm font-sans">
                  <h3 className="text-base font-bold text-blue-900 mb-4 pb-2 border-b border-gray-50 flex items-center gap-2">
                    <Megaphone className="w-5.2 h-5.2 text-blue-600 animate-pulse" />
                    Deploy Academy-wide Notice bulletin
                  </h3>
                  <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                    Announce holidays, curriculum adjustments, examination notices or global administrative alerts. The notification triggers instantly to target dashboards.
                  </p>

                  <form onSubmit={handleLaunchAnnouncement} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Notice Heading:</label>
                        <input
                          required
                          type="text"
                          value={noticeTitle}
                          onChange={(e) => setNoticeTitle(e.target.value)}
                          placeholder="e.g. Academy Term End Holiday Guidelines"
                          className="w-full text-xs px-3.5 py-2.5 border border-gray-200 bg-gray-50/40 rounded-xl outline-none focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Target Account Position Audience:</label>
                        <select
                          value={noticeTarget}
                          onChange={(e) => setNoticeTarget(e.target.value as any)}
                          className="w-full text-xs px-3 py-2.5 border border-gray-205 bg-white rounded-xl outline-none"
                        >
                          <option value="all">Audience: All Accounts (Global)</option>
                          <option value="students">Students Scholars Only</option>
                          <option value="tutors">Registered Faculty Tutors Only</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Notice Message content body (Push bulletin):</label>
                      <textarea
                        required
                        rows={4}
                        value={noticeMessage}
                        onChange={(e) => setNoticeMessage(e.target.value)}
                        placeholder="Detail the announcement details clearly. Do NOT include mock database syntaxes..."
                        className="w-full text-xs p-3.5 border border-gray-200 bg-gray-50/40 rounded-xl outline-none focus:bg-white leading-relaxed"
                      ></textarea>
                    </div>

                    <button
                      id="admin_btn_broadcast_notice"
                      type="submit"
                      disabled={sendingNotice || !noticeTitle.trim() || !noticeMessage.trim()}
                      className="w-full py-2.5 bg-blue-650 hover:bg-blue-700 bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                    >
                      {sendingNotice ? 'Deploying system nodes...' : 'Broadcast Bulletin Campaign'} <Megaphone className="w-4.5 h-4.5" />
                    </button>
                  </form>
                </div>

                {/* Ledger verification tips right col */}
                <div className="lg:col-span-5 bg-gradient-to-br from-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-blue-900 shadow-md">
                  <h4 className="text-sm font-bold flex items-center gap-1.5 border-b pb-3 border-slate-800">
                    <AlertCircle className="w-4.5 h-4.5 text-blue-300" />
                    Administrative Guidelines
                  </h4>

                  <div className="mt-4 space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
                    <p>
                      <strong>1. Ledger adjustments triggers:</strong> Payments set to " PAID" grant permanent seat reservation on matching student accounts. Failed statuses block class roster entry alerts.
                    </p>
                    <p>
                      <strong>2. Database integrity checks:</strong> Admin actions write directly into Firebase Firestore modules. This dashboard handles global query filters dynamically.
                    </p>
                    <p>
                      <strong>3. Communication bulletins:</strong> Bulletins trigger automatic notification nodes across matching client devices.
                    </p>
                  </div>
                </div>

                {/* Full Width: Real-Time System Alerts & Notification Ledger */}
                <div className="lg:col-span-12 bg-white rounded-2xl p-6 border border-gray-150 shadow-xs mt-2 font-sans">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4 border-gray-100 mb-4">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-amber-500" />
                        <span>System Alert Ledger & Real-Time Notifications Log</span>
                        {notifications.filter(n => !n.isRead).length > 0 && (
                          <span className="px-2.5 py-0.5 text-xs bg-red-500 text-white font-bold rounded-full">
                            {notifications.filter(n => !n.isRead).length} Unread
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Monitor live payment logs, student registrations, broadcast announcements, and automated reminders across the academy.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setActiveTab('email_templates')}
                        className="px-3.5 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="View & Test HTML Email Templates"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-pink-600" /> Email Templates
                      </button>
                      <button
                        onClick={() => setShowEmailLogsModal(true)}
                        className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="View Automated Email Service Logs & Cloud Functions Queue"
                      >
                        <Mail className="w-3.5 h-3.5 text-indigo-600" /> Automated Email Service
                      </button>
                      {notifications.filter(n => !n.isRead).length > 0 && (
                        <button
                          onClick={async () => {
                            await executeWriteWithRetry(
                              "Mark All Admin Notifications Read",
                              async () => {
                                const unread = notifications.filter(n => !n.isRead);
                                for (const u of unread) {
                                  await firestoreService.markNotificationRead(u.id);
                                }
                                await refreshNotifications();
                              }
                            );
                            showToast("All notifications marked as read", "success");
                          }}
                          className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5" /> Read All
                        </button>
                      )}
                      <button
                        onClick={() => refreshNotifications()}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>

                  {/* Filter Sub-Tabs */}
                  <div className="flex items-center gap-2 mb-5 p-1.5 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold flex-wrap">
                    <button
                      onClick={() => setNotifFilter('all')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${notifFilter === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'}`}
                    >
                      All Alerts ({notifications.length})
                    </button>
                    <button
                      onClick={() => setNotifFilter('unread')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${notifFilter === 'unread' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'}`}
                    >
                      Unread ({notifications.filter(n => !n.isRead).length})
                    </button>
                    <button
                      onClick={() => setNotifFilter('payments')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${notifFilter === 'payments' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'}`}
                    >
                      Payment Receipts
                    </button>
                    <button
                      onClick={() => setNotifFilter('announcements')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${notifFilter === 'announcements' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'}`}
                    >
                      Announcements
                    </button>
                    <button
                      onClick={() => setNotifFilter('reminders')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${notifFilter === 'reminders' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'}`}
                    >
                      Reminders & Class Updates
                    </button>
                  </div>

                  {/* List of Alerts */}
                  <div className="space-y-3">
                    {(() => {
                      const filtered = notifications.filter(n => {
                        if (notifFilter === 'unread') return !n.isRead;
                        if (notifFilter === 'payments') return n.type === 'payment';
                        if (notifFilter === 'announcements') return n.type === 'announcement';
                        if (notifFilter === 'reminders') return n.type === 'reminder';
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="p-12 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center gap-2">
                            <Bell className="w-8 h-8 text-slate-300" />
                            <p className="font-semibold text-slate-600">No alerts logged in the real-time database</p>
                            <p className="text-[11px] text-slate-400">
                              {notifFilter === 'unread' ? 'All alert notices are currently marked as read.' : 'System alerts trigger automatically when students pay tuition, enrol in courses, or dispatches occur.'}
                            </p>
                          </div>
                        );
                      }

                      return filtered.map((not) => (
                        <div
                          key={not.id}
                          className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                            !not.isRead ? 'bg-indigo-50/30 border-indigo-150 shadow-2xs' : 'bg-white border-slate-150'
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            <div className="p-2.5 bg-slate-100 rounded-xl shrink-0 mt-0.5">
                              {not.type === 'payment' && <CreditCard className="w-4 h-4 text-emerald-600" />}
                              {not.type === 'message' && <Mail className="w-4 h-4 text-blue-600" />}
                              {not.type === 'announcement' && <Shield className="w-4 h-4 text-purple-600" />}
                              {not.type === 'reminder' && <Bell className="w-4 h-4 text-amber-600" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900">{not.title}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold ${
                                  not.userId === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  Target: {not.userId === 'all' ? 'All Accounts' : `User ${not.userId.slice(0, 8)}...`}
                                </span>
                                {!not.isRead && (
                                  <span className="px-1.5 py-0.2 bg-indigo-600 text-white text-[9px] font-bold rounded-full">
                                    UNREAD
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{not.message}</p>
                              <span className="text-[10px] text-slate-400 mt-2 block font-mono">
                                Logged: {new Date(not.createdAt).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {!not.isRead && (
                            <button
                              onClick={async () => {
                                await executeWriteWithRetry(
                                  `Mark Alert Read: '${not.title}'`,
                                  async () => {
                                    await firestoreService.markNotificationRead(not.id);
                                    await refreshNotifications();
                                  }
                                );
                              }}
                              className="px-3 py-1.5 hover:bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-200 flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Mark Read
                            </button>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

            </motion.div>
            )}

            {/* Tab 6: administrative staff dashboard access */}
            {activeTab === 'admins' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                {/* 1. Admin Provisioning Form (Left Panel, width 5 cols) */}
                <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm font-sans">
                  <h3 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-gray-55 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-650" />
                    Provision Administrative Staff
                  </h3>
                  <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                    Instantly provision secure, authorized credentials for institutional moderators and academic leads.
                  </p>

                  <form onSubmit={handleCreateAdmin} className="space-y-4 font-sans text-xs">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Full Legal Name:</label>
                      <input
                        required
                        type="text"
                        value={newAdminName}
                        onChange={(e) => setNewAdminName(e.target.value)}
                        placeholder="e.g. Priyantha Gamage"
                        className="w-full text-xs px-3.5 py-2.5 border border-gray-200 bg-gray-50/40 rounded-xl outline-none focus:bg-white focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Display Name / Alias:</label>
                        <input
                          type="text"
                          value={newAdminDisplayName}
                          onChange={(e) => setNewAdminDisplayName(e.target.value)}
                          placeholder="e.g. Mr. Priyantha"
                          className="w-full text-xs px-3.5 py-2.5 border border-gray-200 bg-gray-50/40 rounded-xl outline-none focus:bg-white focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Email Address:</label>
                        <input
                          required
                          type="email"
                          value={newAdminEmail}
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                          placeholder="priyantha@gedara.lk"
                          className="w-full text-xs px-3.5 py-2.5 border border-gray-200 bg-gray-50/40 rounded-xl outline-none focus:bg-white focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Secure Password:</label>
                        <input
                          required
                          type="password"
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full text-xs px-3.5 py-2.5 border border-gray-200 bg-gray-50/40 rounded-xl outline-none focus:bg-white focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Contact Number:</label>
                        <input
                          type="text"
                          value={newAdminPhone}
                          onChange={(e) => setNewAdminPhone(e.target.value)}
                          placeholder="+94 77 123 4567"
                          className="w-full text-xs px-3.5 py-2.5 border border-gray-200 bg-gray-50/40 rounded-xl outline-none focus:bg-white focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Gender:</label>
                        <select
                          value={newAdminGender}
                          onChange={(e) => setNewAdminGender(e.target.value as any)}
                          className="w-full text-xs px-3 py-2.5 border border-gray-200 bg-white rounded-xl outline-none focus:border-indigo-500"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Photo Profile URL (Optional):</label>
                        <input
                          type="text"
                          value={newAdminPhoto}
                          onChange={(e) => setNewAdminPhoto(e.target.value)}
                          placeholder="https://..."
                          className="w-full text-xs px-3.5 py-2.5 border border-gray-200 bg-gray-50/40 rounded-xl outline-none focus:bg-white focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <button
                      id="admin_btn_add_staff"
                      type="submit"
                      disabled={isCreatingAdmin}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      {isCreatingAdmin ? 'Creating Staff Credentials...' : 'Deploy Moderator Seat'}
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                  </form>
                </div>

                {/* 2. Registered Admins Grid (Right Panel, width 7 cols) */}
                <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm font-sans space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-gray-50">
                    <h3 className="text-base font-bold text-slate-800">
                      Active Administrative Directory
                    </h3>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search by name/alias..."
                        value={adminNameQuery}
                        onChange={(e) => setAdminNameQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500 w-full sm:w-48 bg-gray-50/30 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {users.filter(u => u.role === 'admin' && (
                      u.name.toLowerCase().includes(adminNameQuery.toLowerCase()) ||
                      (u.username || '').toLowerCase().includes(adminNameQuery.toLowerCase())
                    )).length === 0 ? (
                      <div className="p-12 text-center text-gray-450 text-xs italic">
                        No active administrative moderators match your filters.
                      </div>
                    ) : (
                      users.filter(u => u.role === 'admin' && (
                        u.name.toLowerCase().includes(adminNameQuery.toLowerCase()) ||
                        (u.username || '').toLowerCase().includes(adminNameQuery.toLowerCase())
                      )).map(admin => (
                        <div key={admin.uid} className="p-3 border border-gray-100 bg-gray-50/20 rounded-xl flex items-center justify-between text-xs hover:bg-gray-50/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <img
                              src={admin.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                              alt={admin.name}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-full object-cover border border-gray-150 shadow-inner"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-850">{admin.name}</span>
                                {admin.displayName && admin.displayName !== admin.name && (
                                  <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-semibold italic font-sans font-black">"{admin.displayName}"</span>
                                )}
                              </div>
                              <span className="block text-[10px] text-gray-450 leading-none mt-1 font-mono">ID: {admin.username || 'GA-UNASSIGNED'} • Role: {admin.role}</span>
                              <span className="block text-[10px] mt-1.5 text-gray-500 font-medium font-sans">Email: <span className="font-semibold text-slate-700">{admin.email}</span> • Phone: <span className="text-slate-600">{admin.phone || 'None'}</span></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              id={`idcard-admin-btn-${admin.uid}`}
                              onClick={() => setSelectedUserForIdCard(admin)}
                              className="p-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white cursor-pointer flex items-center gap-1 text-[10px] font-bold transition-all shadow-xs"
                              title="Generate and print official Executive Admin ID Pass"
                            >
                              <BadgeCheck className="w-3.5 h-3.5 text-amber-400" /> ID Pass
                            </button>

                            {admin.uid !== currentUser.uid && (
                              <button
                                onClick={() => {
                                  setDeleteConfirm({
                                    isOpen: true,
                                    type: 'user',
                                    id: admin.uid,
                                    title: admin.name
                                  });
                                }}
                                className="p-1.5 rounded bg-red-50 hover:bg-red-100 border border-red-105 text-red-600 cursor-pointer"
                                title="Revoke Moderator Status"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab 8: reviews moderation queue */}
            {activeTab === 'reviews' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm font-sans space-y-6 animate-fade-in"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-gray-150/60">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                      <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                      Student Reviews Moderation Office
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Approve or delete reviews left by students to ensure academic standards and prevent spamming.
                    </p>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex gap-1.5 bg-slate-50 border border-slate-150 p-1 rounded-xl text-xs font-bold text-slate-500">
                    {['all', 'pending', 'approved', 'flagged'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setReviewFilterStatus(status)}
                        className={`px-3 py-1 rounded-lg transition-all capitalize cursor-pointer ${
                          reviewFilterStatus === status 
                            ? 'bg-blue-600 text-white shadow-sm' 
                            : 'hover:bg-slate-100'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reviews List */}
                <div className="space-y-4">
                  {filteredReviews.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50 border border-slate-100 rounded-3xl">
                      <Star className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <h4 className="text-sm font-extrabold text-slate-800">No matching reviews</h4>
                      <p className="text-xs text-slate-400 mt-1">There are no reviews matching your status filter selection.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredReviews.map((review) => {
                        const isPending = review.status === 'pending';
                        const isApproved = review.status === 'approved';
                        const isFlagged = review.status === 'flagged';

                        return (
                          <div 
                            key={review.id} 
                            className={`p-5 rounded-2xl border transition-all ${
                              isPending 
                                ? 'bg-amber-50/25 border-amber-200 shadow-sm shadow-amber-100/10' 
                                : isFlagged 
                                  ? 'bg-red-50/10 border-red-200' 
                                  : 'bg-white border-slate-150 shadow-xs'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex items-center gap-2.5">
                                {review.studentPhotoURL ? (
                                  <img 
                                    src={review.studentPhotoURL} 
                                    alt={review.studentName} 
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200" 
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                                    {review.studentName.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <span className="text-xs font-bold text-slate-850 block leading-tight">{review.studentName}</span>
                                  <span className="text-[10px] text-slate-400 font-medium block mt-1">{new Date(review.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                                </div>
                              </div>

                              {/* Status badges */}
                              <div>
                                {isPending && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    Pending Moderation
                                  </span>
                                )}
                                {isApproved && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    Approved
                                  </span>
                                )}
                                {isFlagged && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-800 border border-red-200">
                                    Flagged
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Ratings stars */}
                            <div className="flex items-center gap-1.5 mt-3">
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star 
                                    key={star} 
                                    className={`w-3.5 h-3.5 ${
                                      star <= review.rating 
                                        ? 'fill-amber-400 text-amber-400' 
                                        : 'text-slate-150 fill-slate-150'
                                    }`} 
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] font-mono font-bold text-slate-500">
                                ({review.rating}.0 / 5)
                              </span>
                            </div>

                            {/* Targets */}
                            <div className="mt-2 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-655 font-medium">
                              {review.classTitle && (
                                <p>
                                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider font-mono">Course:</span> {review.classTitle}
                                </p>
                              )}
                              {review.tutorName && (
                                <p>
                                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider font-mono">Faculty:</span> Dr. {review.tutorName}
                                </p>
                              )}
                            </div>

                            {/* Comment */}
                            <p className="text-xs text-slate-650 leading-relaxed font-sans mt-3 border-l-2 border-slate-200 pl-3 italic">
                              "{review.comment}"
                            </p>

                            {/* Moderation actions */}
                            <div className="flex gap-2.5 mt-4 border-t border-slate-105 pt-3 flex-wrap">
                              {!isApproved && (
                                <button
                                  id={`approve-review-btn-${review.id}`}
                                  onClick={async () => {
                                    try {
                                      await updateReviewStatus(review.id, 'approved');
                                      showToast("Review approved successfully.", "success");
                                    } catch (e) {
                                      showToast("Error updating review status.", "error");
                                    }
                                  }}
                                  className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-150 text-emerald-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                >
                                  Approve
                                </button>
                              )}
                              {!isFlagged && (
                                <button
                                  id={`flag-review-btn-${review.id}`}
                                  onClick={async () => {
                                    try {
                                      await updateReviewStatus(review.id, 'flagged');
                                      showToast("Review flagged.", "info");
                                    } catch (e) {
                                      showToast("Error updating review status.", "error");
                                    }
                                  }}
                                  className="px-3.5 py-1.5 bg-yellow-50 hover:bg-yellow-100 border border-yellow-150 text-yellow-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                >
                                  Flag Content
                                </button>
                              )}
                              <button
                                id={`delete-review-btn-${review.id}`}
                                onClick={() => {
                                  setDeleteConfirm({
                                    isOpen: true,
                                    type: 'review',
                                    id: review.id,
                                    title: `${review.studentName}'s review`
                                  });
                                }}
                                className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-150 text-red-650 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ml-auto"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 9. PATHWAYS & SUBJECTS MANAGEMENT */}
            {activeTab === 'pathways' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* SECTION 1: ADVANCED COURSE PATHWAYS */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                          <Layers className="w-5 h-5" />
                        </span>
                        <h2 className="text-xl font-extrabold text-blue-955 tracking-tight">Advanced Course Pathways</h2>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Configure syllabus track titles, descriptions, categories, and icon representations displayed across the academy portal.
                      </p>
                    </div>

                    <button
                      id="admin_add_pathway_btn"
                      onClick={() => handleOpenPathwayModal()}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Create Course Pathway
                    </button>
                  </div>

                  {pathwaysList.length === 0 ? (
                    <div className="p-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-3">
                      <Layers className="w-10 h-10 text-gray-400 mx-auto" />
                      <h4 className="text-sm font-bold text-gray-700">No Course Pathways Configured</h4>
                      <p className="text-xs text-gray-400 max-w-sm mx-auto">Click "Create Course Pathway" to publish advanced track details to the portal database.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
                      {pathwaysList.map(pathway => (
                        <div 
                          key={pathway.id}
                          className="p-5 rounded-2xl border border-gray-100 hover:border-blue-200 bg-white hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                  {renderPathwayIcon(pathway.iconName, "w-5 h-5")}
                                </div>
                                <div>
                                  <h3 className="text-sm font-bold text-blue-955">{pathway.title}</h3>
                                  <span className="inline-block mt-0.5 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono">
                                    {pathway.category || 'General'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <p className="text-xs text-gray-600 leading-relaxed font-sans">
                              {pathway.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                            <button
                              id={`edit-pathway-${pathway.id}`}
                              onClick={() => handleOpenPathwayModal(pathway)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5 text-blue-600" /> Edit Details
                            </button>
                            <button
                              id={`delete-pathway-${pathway.id}`}
                              onClick={() => handleDeletePathwayItem(pathway.id)}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SECTION 2: DATABASE SUBJECT CATEGORIES */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                          <Tag className="w-5 h-5" />
                        </span>
                        <h2 className="text-xl font-extrabold text-blue-955 tracking-tight">Database Subjects & Categories</h2>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Add or modify available subjects in the database. These subject categories are dynamically available when publishing new classes and filtering courses.
                      </p>
                    </div>
                  </div>

                  {/* Add New Subject Form */}
                  <form onSubmit={handleAddSubjectCategory} className="flex flex-col sm:flex-row gap-3 items-stretch">
                    <div className="relative flex-1">
                      <Tag className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                      <input 
                        type="text" 
                        required
                        value={newSubjectName} 
                        onChange={(e) => setNewSubjectName(e.target.value)}
                        placeholder="Enter subject name (e.g., Combined Mathematics, Artificial Intelligence, Biology)..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-purple-500 bg-gray-50/50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isAddingSubject}
                      id="admin_add_subject_category_btn"
                      className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" /> {isAddingSubject ? 'Adding...' : 'Add Subject to DB'}
                    </button>
                  </form>

                  {/* List of Registered Subjects */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">
                      Current Registered Database Subjects ({subjectsList.length}):
                    </h4>
                    {subjectsList.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No custom subject categories added yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2.5">
                        {subjectsList.map(sub => (
                          <div 
                            key={sub.id}
                            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-2 shadow-2xs hover:border-purple-300 transition-colors"
                          >
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            <span>{sub.name}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubjectCategory(sub.id, sub.name)}
                              className="text-gray-400 hover:text-red-600 transition-colors p-0.5 ml-1 cursor-pointer"
                              title="Delete Subject"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 10. HERO BANNERS MANAGEMENT */}
            {activeTab === 'banners' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                          <ImageIcon className="w-5 h-5" />
                        </span>
                        <h2 className="text-xl font-extrabold text-blue-955 tracking-tight">Homepage Hero Banner Images</h2>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Manage promotional hero banners, image graphics, titles, and redirect links displayed in the homepage carousel.
                      </p>
                    </div>

                    <button
                      id="admin_add_banner_btn"
                      onClick={() => handleOpenBannerModal()}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Add Hero Banner Image
                    </button>
                  </div>

                  {bannersList.length === 0 ? (
                    <div className="p-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-3">
                      <ImageIcon className="w-10 h-10 text-gray-400 mx-auto" />
                      <h4 className="text-sm font-bold text-gray-700">No Hero Banners Published</h4>
                      <p className="text-xs text-gray-400 max-w-sm mx-auto">Click "Add Hero Banner Image" to publish carousel slides for the academy homepage.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {bannersList.map(banner => (
                        <div 
                          key={banner.id}
                          className="p-4 rounded-2xl border border-gray-100 hover:border-emerald-200 bg-white hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-3">
                            {/* Banner Image Preview Container */}
                            <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-100 bg-slate-900 group">
                              <img 
                                referrerPolicy="no-referrer"
                                src={banner.imageUrl} 
                                alt={banner.title || 'Banner'} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200';
                                }}
                              />
                              {/* Status Badge Overlay */}
                              <div className="absolute top-3 left-3">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider uppercase backdrop-blur-md shadow-xs ${banner.active ? 'bg-emerald-500/90 text-white' : 'bg-slate-800/90 text-slate-300 border border-slate-600'}`}>
                                  {banner.active ? '● Active' : '○ Hidden'}
                                </span>
                              </div>
                            </div>

                            {/* Banner Text Details */}
                            <div className="space-y-1">
                              <h3 className="text-sm font-extrabold text-blue-955 line-clamp-1">
                                {banner.title || 'Untitled Banner'}
                              </h3>
                              {banner.subtitle && (
                                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                  {banner.subtitle}
                                </p>
                              )}
                              {banner.linkUrl && (
                                <a 
                                  href={banner.linkUrl} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-medium mt-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> {banner.linkUrl}
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Action Controls */}
                          <div className="flex items-center justify-between border-t border-gray-100 pt-3 gap-2">
                            <button
                              id={`toggle-banner-${banner.id}`}
                              onClick={() => handleToggleBannerActive(banner)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${banner.active ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                              title={banner.active ? 'Deactivate Banner' : 'Activate Banner'}
                            >
                              <Power className="w-3.5 h-3.5" /> {banner.active ? 'Visible' : 'Hidden'}
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                id={`edit-banner-${banner.id}`}
                                onClick={() => handleOpenBannerModal(banner)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5 text-blue-600" /> Edit
                              </button>
                              <button
                                id={`delete-banner-${banner.id}`}
                                onClick={() => handleDeleteBannerItem(banner.id)}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 11. EMAIL TEMPLATES & NOTIFICATIONS MANAGEMENT */}
            {activeTab === 'email_templates' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <AdminEmailTemplatesPanel onOpenEmailLogs={() => setShowEmailLogsModal(true)} />
              </motion.div>
            )}

          </div>
        )}

      </div>

      {/* Reusable state-driven delete confirmation modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={`Delete ${deleteConfirm.type.charAt(0).toUpperCase() + deleteConfirm.type.slice(1)} Record`}
        message={
          <>
            Are you sure you want to permanently delete the <span className="font-extrabold text-red-600">{deleteConfirm.type}</span> record <span className="font-extrabold text-slate-900">"{deleteConfirm.title}"</span>? This operation is irreversible and will purge it from Guru Gedara Educational Centre databases.
          </>
        }
        confirmText="Delete permanently"
        cancelText="Cancel"
        isLoading={deleteConfirm.isDeleting}
        onConfirm={executeDeletion}
        onClose={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
        confirmBtnId="admin_confirm_delete_btn"
        cancelBtnId="admin_cancel_delete_btn"
      />

      {/* Editing / Addition Overlay Modal Container */}
      {modalType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-5 animate-fade-in text-xs font-sans text-gray-800">
            {/* Header */}
            <div className="flex justify-between items-center border-b pb-3 border-gray-100">
              <h3 className="text-base font-extrabold text-blue-955 capitalize flex items-center gap-1.5">
                <PlusCircle className="w-5 h-5 text-blue-600" />
                {modalMode === 'add' ? 'Publish New Record' : 'Modifying Administrative Profile'}: {modalType}
              </h3>
              <button 
                onClick={() => setModalType(null)} 
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              
              {/* STUDENT FORM */}
              {modalType === 'student' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Scholar Name</label>
                      <input 
                        required 
                        type="text" 
                        value={userName} 
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Alex Mercer"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Contact Email</label>
                      <input 
                        required 
                        type="email" 
                        value={userEmail} 
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="alex.mercer@example.com"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Phone Number</label>
                      <input 
                        required 
                        type="text" 
                        value={userPhone} 
                        onChange={(e) => setUserPhone(e.target.value)}
                        placeholder="+1 (555) 777-8899"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Grade Level</label>
                      <select 
                        value={studentGrade} 
                        onChange={(e) => setStudentGrade(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-500"
                      >
                        {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "Other"].map(g => (
                          <option key={g} value={g}>{g === 'Other' ? 'Other' : `Grade ${g}`}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Parent / Emergency Contact</label>
                      <input 
                        type="text" 
                        value={studentParentContact} 
                        onChange={(e) => setStudentParentContact(e.target.value)}
                        placeholder="+94 71 999 8811"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Scholar Gender</label>
                      <select
                        value={studentGender}
                        onChange={(e) => setStudentGender(e.target.value as 'male' | 'female')}
                        className="w-full p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-500"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Guardian Name</label>
                      <input 
                        type="text" 
                        value={studentGuardianName} 
                        onChange={(e) => setStudentGuardianName(e.target.value)}
                        placeholder="e.g. Mr. S. de Silva"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Date of Birth</label>
                      <input 
                        type="date" 
                        value={studentDob} 
                        onChange={(e) => setStudentDob(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-500 font-sans"
                      />
                    </div>
                  </div>

                  {/* Parent Email & Auto-CC Configuration Card */}
                  <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-150 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest font-mono flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-indigo-600" /> Parent / Guardian Email (Auto-CC)
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-indigo-700 select-none">
                        <input 
                          type="checkbox"
                          checked={studentCcParentOnNotifications}
                          onChange={(e) => setStudentCcParentOnNotifications(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        Auto-CC Enabled
                      </label>
                    </div>
                    <input 
                      type="email"
                      value={studentParentEmail}
                      onChange={(e) => setStudentParentEmail(e.target.value)}
                      placeholder="e.g. parent.guardian@example.com"
                      className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl outline-none focus:border-indigo-600 text-xs font-mono"
                    />
                    <p className="text-[10px] text-slate-500 leading-tight">
                      When enabled, attendance check-ins, tardiness alerts, and tuition payment receipts are automatically CC'd to this email.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Residential Address</label>
                    <input 
                      type="text" 
                      value={studentAddress} 
                      onChange={(e) => setStudentAddress(e.target.value)}
                      placeholder="12/A, Flower Road, Colombo 03"
                      className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Notes (Optional)</label>
                    <textarea 
                      rows={2}
                      value={studentNotes} 
                      onChange={(e) => setStudentNotes(e.target.value)}
                      placeholder="Additional student background, medical notes or interests..."
                      className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Profile Image (PNG/JPG File or Image Link)</label>
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                      <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 shrink-0">
                        <Upload className="w-3.5 h-3.5 text-indigo-600" /> Upload Photo (PNG/JPG)
                        <input 
                          type="file" 
                          accept="image/png, image/jpeg, image/jpg" 
                          onChange={handleStudentFileUpload} 
                          className="hidden" 
                        />
                      </label>
                      <input 
                        type="text" 
                        value={studentPhotoURL} 
                        onChange={(e) => setStudentPhotoURL(e.target.value)}
                        placeholder="Or paste image URL link..."
                        className="w-full p-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                    {studentPhotoURL && (
                      <div className="mt-2 flex items-center gap-2">
                        <img src={studentPhotoURL} alt="Preview" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                        <span className="text-[10px] text-emerald-600 font-bold">Image selected</span>
                        <button type="button" onClick={() => setStudentPhotoURL('')} className="text-[10px] text-red-500 underline ml-auto">Remove</button>
                      </div>
                    )}
                  </div>

                  {modalMode === 'add' && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-blue-600" /> Account Security Credentials
                        </span>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-blue-700">
                          <input 
                            type="checkbox" 
                            checked={autoGeneratePassword}
                            onChange={(e) => setAutoGeneratePassword(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-700 focus:ring-blue-500 border-slate-200"
                          />
                          Generate Password Automatically
                        </label>
                      </div>

                      {!autoGeneratePassword && (
                        <div>
                          <label className="block text-[9px] font-bold text-gray-550 uppercase tracking-widest font-mono mb-1">Set Password</label>
                          <div className="relative">
                            <input 
                              required={!autoGeneratePassword}
                              type={showPasswordText ? "text" : "password"} 
                              value={userPassword} 
                              onChange={(e) => setUserPassword(e.target.value)}
                              placeholder="Min 6 characters e.g. Pass123!"
                              className="w-full p-2.5 pr-10 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswordText(!showPasswordText)}
                              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      )}

                      {autoGeneratePassword && (
                        <p className="text-[10px] text-slate-500 leading-normal">
                          The system will construct a random strong security password and trigger a <strong>first-login change password prompt</strong> to verify their ownership securely.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Course enrollment checklist */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5 flex items-center justify-between">
                      <span>Enroll Student in Classes:</span>
                      <span className="text-[9px] text-indigo-600 uppercase font-black tracking-wider">({studentSelectedClasses.length} enrolled)</span>
                    </label>
                    <div className="border border-slate-200/80 rounded-xl p-3 bg-slate-50/50 max-h-40 overflow-y-auto space-y-1.5">
                      {classesList.length === 0 ? (
                        <p className="text-slate-450 text-xs italic">No tuition courses are currently published in databases.</p>
                      ) : (
                        classesList.map(c => {
                          const isAssigned = studentSelectedClasses.includes(c.id);
                          return (
                            <label key={c.id} className="flex items-start gap-2.5 p-2 bg-white hover:bg-slate-50 border border-slate-100 rounded-lg transition-colors cursor-pointer select-none">
                              <input 
                                type="checkbox"
                                checked={isAssigned}
                                onChange={() => {
                                  if (isAssigned) {
                                    setStudentSelectedClasses(prev => prev.filter(id => id !== c.id));
                                  } else {
                                    setStudentSelectedClasses(prev => [...prev, c.id]);
                                  }
                                }}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 mt-0.5"
                              />
                              <div className="min-w-0">
                                <span className="block text-xs font-bold text-slate-800 leading-tight truncate">{c.title}</span>
                                <span className="block text-[10px] text-slate-500 mt-0.5">{c.subject} &bull; Tuition Fee: LKR {c.price}</span>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TUTOR FORM */}
              {modalType === 'tutor' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Tutor Full Name</label>
                      <input 
                        required 
                        type="text" 
                        value={userName} 
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Dr. Sarah Jenkins"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Contact Email</label>
                      <input 
                        required 
                        type="email" 
                        value={userEmail} 
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="sarah@example.com"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Hourly Rate ($)</label>
                      <input 
                        required 
                        type="number" 
                        value={tutorHourlyRate} 
                        onChange={(e) => setTutorHourlyRate(e.target.value)}
                        placeholder="45"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Experience (Yrs)</label>
                      <input 
                        required 
                        type="number" 
                        value={tutorExperience} 
                        onChange={(e) => setTutorExperience(e.target.value)}
                        placeholder="5"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Qualification</label>
                      <input 
                        required 
                        type="text" 
                        value={tutorQualification} 
                        onChange={(e) => setTutorQualification(e.target.value)}
                        placeholder="M.Sc. in Physics"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Syllabus Subjects (comma-delimited)</label>
                    <input 
                      required 
                      type="text" 
                      value={tutorSubjects} 
                      onChange={(e) => setTutorSubjects(e.target.value)}
                      placeholder="Physics, Calculus, Chemistry"
                      className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Tutor Professional Bio</label>
                    <textarea 
                      required 
                      rows={3}
                      value={tutorBio} 
                      onChange={(e) => setTutorBio(e.target.value)}
                      placeholder="Certified expert in senior Calculus and classical mechanics..."
                      className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500 leading-relaxed"
                    ></textarea>
                  </div>

                  {modalMode === 'add' && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-blue-600" /> Account Security Credentials
                        </span>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-blue-700">
                          <input 
                            type="checkbox" 
                            checked={autoGeneratePassword}
                            onChange={(e) => setAutoGeneratePassword(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-700 focus:ring-blue-500 border-slate-200"
                          />
                          Generate Password Automatically
                        </label>
                      </div>

                      {!autoGeneratePassword && (
                        <div>
                          <label className="block text-[9px] font-bold text-gray-550 uppercase tracking-widest font-mono mb-1">Set Password</label>
                          <div className="relative">
                            <input 
                              required={!autoGeneratePassword}
                              type={showPasswordText ? "text" : "password"} 
                              value={userPassword} 
                              onChange={(e) => setUserPassword(e.target.value)}
                              placeholder="Min 6 characters e.g. Pass123!"
                              className="w-full p-2.5 pr-10 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswordText(!showPasswordText)}
                              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      )}

                      {autoGeneratePassword && (
                        <p className="text-[10px] text-slate-500 leading-normal">
                          The system will construct a random strong security password and trigger a <strong>first-login change password prompt</strong> to verify their ownership securely.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* CLASS FORM */}
              {modalType === 'class' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Course Title</label>
                      <input 
                        required 
                        type="text" 
                        value={classTitle} 
                        onChange={(e) => setClassTitle(e.target.value)}
                        placeholder="Advanced Calculus Theory"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <SubjectSelector 
                        value={classSubject} 
                        onChange={setClassSubject} 
                        label="Subject Category / Domain"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Schedule String</label>
                      <input 
                        required 
                        type="text" 
                        value={classSchedule} 
                        onChange={(e) => setClassSchedule(e.target.value)}
                        placeholder="Saturdays 10:00 AM - 12:00 PM"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Day of Week</label>
                      <select 
                        value={classDayOfWeek} 
                        onChange={(e) => setClassDayOfWeek(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-500"
                      >
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                        <option value="Sunday">Sunday</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Time Slot</label>
                      <input 
                        required 
                        type="text" 
                        value={classTimeSlot} 
                        onChange={(e) => setClassTimeSlot(e.target.value)}
                        placeholder="10:00 AM"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Tuition Fee (LKR)</label>
                      <input 
                        required 
                        type="number" 
                        value={classPrice} 
                        onChange={(e) => setClassPrice(e.target.value)}
                        placeholder="4500"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Max Seats Capacity</label>
                      <input 
                        required 
                        type="number" 
                        value={classMaxSlots} 
                        onChange={(e) => setClassMaxSlots(e.target.value)}
                        placeholder="20"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Booked Seats</label>
                      <input 
                        required 
                        type="number" 
                        value={classBookedSlots} 
                        onChange={(e) => setClassBookedSlots(e.target.value)}
                        placeholder="0"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Lead Instructor Tutor</label>
                    <select 
                      required 
                      value={classTutorId} 
                      onChange={(e) => setClassTutorId(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-500"
                    >
                      <option value="">-- Choose Instructor --</option>
                      {users.filter(u => u.role==='tutor').map(tut => (
                        <option key={tut.uid} value={tut.uid}>{tut.name} ({tut.email})</option>
                      ))}
                    </select>
                  </div>
                  {/* Custom Topic-Specific Banner Image Field */}
                  <div className="border border-slate-100 p-4 rounded-xl bg-slate-50/50 space-y-3 font-sans">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">Class Banner Header Cover Image</label>
                      <button
                        type="button"
                        disabled={generatingBanner}
                        onClick={handleGenerateClassBanner}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className={`w-3.5 h-3.5 text-indigo-600 ${generatingBanner ? 'animate-spin' : ''}`} />
                        {generatingBanner ? "Analyzing & Generating..." : "Generate with AI"}
                      </button>
                    </div>
                    
                    <div className="flex gap-3.5 items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={classImageUrl}
                          onChange={(e) => setClassImageUrl(e.target.value)}
                          placeholder="Enter banner URL pattern or tap 'Generate with AI'..."
                          className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-250 focus:border-indigo-550 outline-none font-mono"
                        />
                        <p className="text-[10px] text-gray-500 mt-1 lines-clamp-1">
                          Professional 16:9 topic photography creates 4x higher student click and enrollment indexes.
                        </p>
                      </div>
                      {classImageUrl && (
                        <div className="h-14 w-24 rounded-lg bg-slate-200 border border-slate-300 relative overflow-hidden flex-shrink-0">
                          <img 
                            referrerPolicy="no-referrer"
                            src={classImageUrl} 
                            alt="Class Banner Preview" 
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setClassImageUrl('')}
                            className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-600 text-white rounded p-0.5 text-[9px]"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Course Curriculum Description</label>
                    <textarea 
                      required 
                      rows={3}
                      value={classDescription} 
                      onChange={(e) => setClassDescription(e.target.value)}
                      placeholder="Deep dive into limits, derivatives, integrals, and advanced AP applications..."
                      className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500 leading-relaxed"
                    ></textarea>
                  </div>
                </div>
              )}

              {/* PAYMENT FORM */}
              {modalType === 'payment' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Search Student by Name or Unique ID</label>
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <input 
                        type="text" 
                        value={paymentStudentSearch}
                        onChange={(e) => setPaymentStudentSearch(e.target.value)}
                        placeholder="Search student by name or ID (e.g. GB12345678)..."
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-sans"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Select Student Scholar</label>
                      <select 
                        required 
                        value={paymentStudentId} 
                        onChange={(e) => setPaymentStudentId(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-500 text-xs font-sans"
                      >
                        <option value="">-- Choose Scholar --</option>
                        {users
                          .filter(u => u.role === 'student')
                          .filter(stud => {
                            if (!paymentStudentSearch.trim()) return true;
                            const query = paymentStudentSearch.toLowerCase().trim();
                            const nameMatch = stud.name.toLowerCase().includes(query);
                            const usernameMatch = (stud.username || '').toLowerCase().includes(query);
                            const uidMatch = stud.uid.toLowerCase().includes(query);
                            const emailMatch = stud.email.toLowerCase().includes(query);
                            return nameMatch || usernameMatch || uidMatch || emailMatch;
                          })
                          .map(stud => (
                            <option key={stud.uid} value={stud.uid}>
                              {stud.name} [{stud.username || stud.uid.slice(0, 8)}] ({stud.email})
                            </option>
                          ))
                        }
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Target Class</label>
                      <select 
                        required 
                        value={paymentClassId} 
                        onChange={(e) => setPaymentClassId(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-500"
                      >
                        <option value="">-- Choose Class --</option>
                        {classesList.map(c => (
                          <option key={c.id} value={c.id}>{c.title} (LKR {c.price})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Paid Amount (LKR)</label>
                      <input 
                        required 
                        type="number" 
                        value={paymentAmount} 
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="4500"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Payment Method</label>
                      <input 
                        required 
                        type="text" 
                        value={paymentMethod} 
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        placeholder="Credit Card"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Ledger Status</label>
                      <select 
                        value={paymentStatus} 
                        onChange={(e) => setPaymentStatus(e.target.value as any)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-500"
                      >
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  id="admin_cancel_edit_btn"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl cursor-pointer hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  id="admin_confirm_edit_btn"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 cursor-pointer"
                >
                  Save Entity Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PATHWAY MODAL */}
      {pathwayModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 animate-fade-in text-xs font-sans text-gray-800">
            <div className="flex justify-between items-center border-b pb-3 border-gray-100">
              <h3 className="text-base font-extrabold text-blue-955 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                {editingPathway ? 'Edit Course Pathway Details' : 'Create New Course Pathway'}
              </h3>
              <button 
                onClick={() => setPathwayModalOpen(false)} 
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePathway} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">
                  Pathway Title
                </label>
                <input 
                  type="text" 
                  required
                  value={pathwayTitle}
                  onChange={(e) => setPathwayTitle(e.target.value)}
                  placeholder="e.g. Advanced Mathematics & Pre-Calculus"
                  className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">
                    Category Tag
                  </label>
                  <input 
                    type="text" 
                    required
                    value={pathwayCategory}
                    onChange={(e) => setPathwayCategory(e.target.value)}
                    placeholder="e.g. Mathematics, Science"
                    className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">
                    Pathway Icon
                  </label>
                  <select 
                    value={pathwayIconName}
                    onChange={(e) => setPathwayIconName(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="BookOpen">BookOpen (Standard)</option>
                    <option value="Cpu">Cpu (Tech/Science)</option>
                    <option value="Compass">Compass (Explore/Art)</option>
                    <option value="Bookmark">Bookmark (Literature)</option>
                    <option value="GraduationCap">GraduationCap (Academic)</option>
                    <option value="Calculator">Calculator (Maths)</option>
                    <option value="Atom">Atom (Physics)</option>
                    <option value="Sparkles">Sparkles (Featured)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">
                  Detailed Description
                </label>
                <textarea 
                  rows={4}
                  required
                  value={pathwayDescription}
                  onChange={(e) => setPathwayDescription(e.target.value)}
                  placeholder="Comprehensive description of topics, syllabus modules, and target outcomes covered in this course pathway..."
                  className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500 resize-none leading-relaxed"
                />
              </div>

              <div className="flex gap-3 border-t border-gray-100 pt-3 justify-end">
                <button
                  type="button"
                  onClick={() => setPathwayModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPathway}
                  id="save_pathway_submit_btn"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSavingPathway ? 'Saving Changes...' : 'Save Course Pathway'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Banner Creation / Editing Modal */}
      {bannerModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-5 animate-fade-in text-xs font-sans text-gray-800">
            <div className="flex justify-between items-center border-b pb-3 border-gray-100">
              <h3 className="text-base font-extrabold text-blue-955 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-600" />
                {editingBanner ? 'Edit Hero Banner Image' : 'Publish Hero Banner Image'}
              </h3>
              <button 
                onClick={() => setBannerModalOpen(false)} 
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">
                  Banner Headline / Title
                </label>
                <input 
                  type="text"
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  placeholder="e.g., New Intake Open for 2026 Academic Year"
                  className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">
                  Subtitle / Sub-headline
                </label>
                <input 
                  type="text"
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  placeholder="e.g., Enroll in Top STEM & Languages Curriculums"
                  className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">
                  Target / Redirect Link URL (Optional)
                </label>
                <input 
                  type="text"
                  value={bannerLinkUrl}
                  onChange={(e) => setBannerLinkUrl(e.target.value)}
                  placeholder="https://guru-gedara.edu/admissions or #classes"
                  className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Banner Image Selection */}
              <div className="space-y-3 pt-1 border-t border-gray-100">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">
                  Banner Image Source
                </label>

                {/* Upload Local Image File */}
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 cursor-pointer flex items-center gap-2 transition-all">
                    <Upload className="w-4 h-4" /> Upload Local Image
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleBannerFileUpload} 
                      className="hidden" 
                    />
                  </label>
                  <span className="text-[11px] text-gray-400">or enter image web URL below</span>
                </div>

                <input 
                  type="text"
                  required
                  value={bannerImageUrl}
                  onChange={(e) => setBannerImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 font-mono text-[11px]"
                />

                {/* Stock Image Presets */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 block mb-1.5">Quick Stock Presets:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: "STEM Intake", url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200" },
                      { name: "Virtual Lab", url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200" },
                      { name: "Graduation", url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200" },
                      { name: "Science Lab", url: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200" },
                      { name: "Coding Bootcamp", url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200" },
                    ].map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setBannerImageUrl(preset.url)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${bannerImageUrl === preset.url ? 'bg-emerald-600 text-white shadow-xs' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Image Preview */}
                {bannerImageUrl && (
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-gray-400 block mb-1">Live Image Preview:</span>
                    <div className="w-full h-36 rounded-xl overflow-hidden border border-gray-200 bg-slate-900">
                      <img 
                        referrerPolicy="no-referrer"
                        src={bannerImageUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <input 
                  type="checkbox"
                  id="banner_active_checkbox"
                  checked={bannerActive}
                  onChange={(e) => setBannerActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 border-gray-300 cursor-pointer"
                />
                <label htmlFor="banner_active_checkbox" className="text-xs font-bold text-gray-700 cursor-pointer">
                  Publish and show on homepage carousel slide
                </label>
              </div>

              <div className="flex gap-3 border-t border-gray-100 pt-3 justify-end">
                <button
                  type="button"
                  onClick={() => setBannerModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingBanner}
                  id="save_banner_submit_btn"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSavingBanner ? 'Saving Banner...' : 'Save Banner Image'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class Profile Modal for Admin */}
      <ClassProfileModal
        isOpen={!!selectedClassForProfile}
        onClose={() => setSelectedClassForProfile(null)}
        classItem={selectedClassForProfile}
        currentUser={currentUser}
        bookings={bookingsList}
        allUsers={users || []}
        payments={paymentsList}
        attendanceRecords={attendanceRecords}
        onOpenScanner={(cls) => {
          setSelectedClassForScanner(cls);
          setShowClassScannerModal(true);
        }}
        onUpdateData={() => {
          if (refreshClasses) refreshClasses();
          if (refreshBookings) refreshBookings();
        }}
        showToast={showToast}
      />

      {/* Class Attendance QR Scanner Modal for Admin */}
      <ClassAttendanceQRScannerModal
        isOpen={showClassScannerModal}
        onClose={() => {
          setShowClassScannerModal(false);
          setSelectedClassForScanner(null);
        }}
        currentUser={currentUser}
        initialClass={selectedClassForScanner}
        tutorClasses={classesList}
        bookings={bookingsList}
        allUsers={users || []}
        attendanceRecords={attendanceRecords}
        onAttendanceMarked={async () => {
          const updatedAtt = await firestoreService.getAttendance();
          setAttendanceRecords(updatedAtt);
        }}
        showToast={showToast}
      />

      {/* Tutor Profile Modal for Admin */}
      {selectedTutorForProfile && (
        <TutorProfileModal
          tutor={selectedTutorForProfile}
          isOpen={!!selectedTutorForProfile}
          onClose={() => setSelectedTutorForProfile(null)}
          reviews={reviews || []}
        />
      )}

      {/* Automated Email Notification Center & Cloud Function Inspector */}
      <EmailNotificationLogsModal
        isOpen={showEmailLogsModal}
        onClose={() => setShowEmailLogsModal(false)}
      />

      {/* Admin Profile Camera & Gallery Avatar Capture Modal */}
      {showAdminCameraModal && currentUser && (
        <CameraProfileCapture
          isOpen={showAdminCameraModal}
          onClose={() => setShowAdminCameraModal(false)}
          targetUser={currentUser}
          onPhotoUpdated={async ({ isPending, url }) => {
            await fetchAdminDatasets();
            showToast('Administrator profile photo updated and synchronized successfully!', 'success');
          }}
        />
      )}

      {/* Role-Adaptive Digital ID Card Modal (Executive Admin, Faculty Tutor, Student Scholar) */}
      {selectedUserForIdCard && (
        <DigitalStudentIDCardModal
          isOpen={!!selectedUserForIdCard}
          onClose={() => setSelectedUserForIdCard(null)}
          currentUser={selectedUserForIdCard}
          enrolledClasses={classesList}
          bookings={bookingsList}
          showToast={showToast}
          onOpenPhotoUpload={selectedUserForIdCard.uid === currentUser?.uid ? () => setShowAdminCameraModal(true) : undefined}
        />
      )}
    </motion.div>
  );
};
