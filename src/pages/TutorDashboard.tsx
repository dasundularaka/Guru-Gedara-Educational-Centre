import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { SyncStatusIndicator } from '../components/SyncTelemetryConsole';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { SyncBadge } from '../components/SyncBadge';
import { firestoreService } from '../lib/firestoreService';
import { optimizeImage } from '../lib/imageOptimizer';
import { binaryStore } from '../lib/binaryStore';
import { ClassItem, Booking, UserProfile, SubjectItem, PathwayItem, StudyMaterial, ResourceType, RecurringAvailabilitySlot, SpecificDateAvailability } from '../types';
import { SubjectSelector } from '../components/SubjectSelector';
import { CalendarView } from '../components/CalendarView';
import { ChatWidget } from '../components/ChatWidget';
import { ClassProfileModal } from '../components/ClassProfileModal';
import { ClassAttendanceQRScannerModal } from '../components/ClassAttendanceQRScannerModal';
import { CameraProfileCapture } from '../components/CameraProfileCapture';
import { 
  Users, 
  Calendar, 
  QrCode, 
  MessageSquare, 
  BookOpen, 
  Plus, 
  Check, 
  Trash2,
  BookmarkPlus,
  X,
  AlertTriangle,
  Settings,
  Sliders,
  Edit,
  User,
  Sparkles,
  ClipboardList,
  CheckSquare,
  Search,
  Bell,
  ChevronDown,
  CreditCard,
  Mail,
  Shield,
  CheckCheck,
  CheckCircle,
  Megaphone,
  Info,
  FileText,
  Link as LinkIcon,
  ExternalLink,
  Share2,
  HelpCircle,
  Camera,
  Video,
  FileSpreadsheet,
  Layers,
  Filter,
  Copy,
  FolderOpen,
  Upload,
  UploadCloud,
  Download,
  Loader2,
  HardDrive,
  FolderPlus,
  FileUp,
  FileCheck,
  Clock,
  Briefcase,
  Award,
  Eye,
  Timer,
  BadgeCheck
} from 'lucide-react';
import { AttendanceRecord } from '../types';
import { TutorAttendanceTracker } from '../components/TutorAttendanceTracker';
import { TutorProfileModal } from '../components/TutorProfileModal';
import { AttendanceHealthProgressBar } from '../components/AttendanceHealthProgressBar';
import { StudentProfileModal } from '../components/StudentProfileModal';
import { calculateStudentPunctuality } from '../lib/punctualityUtils';
import { Class15MinReminderBanner } from '../components/Class15MinReminderBanner';
import { UserNotificationSettingsPanel } from '../components/UserNotificationSettingsPanel';
import { DigitalStudentIDCardModal } from '../components/DigitalStudentIDCardModal';

export const TutorDashboard: React.FC = () => {
  const { 
    currentUser, 
    updateProfile, 
    showToast, 
    refreshClasses, 
    refreshUserProfile, 
    notificationSettings, 
    updateNotificationSettings,
    classes,
    bookings,
    refreshBookings,
    notifications,
    refreshNotifications,
    executeWriteWithRetry
  } = useApp();
  const { syncField, getFieldStatus, getFieldMessage, syncFieldStart, syncFieldSuccess, syncFieldFailure } = useSyncStatus();
  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'students' | 'resources' | 'attendance' | 'chat' | 'alerts' | 'profile' | 'settings'>('schedule');
  const [isNavDropdownOpen, setIsNavDropdownOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'announcements' | 'reminders'>('all');
  const [tutorNoticeTitle, setTutorNoticeTitle] = useState('');
  const [tutorNoticeMsg, setTutorNoticeMsg] = useState('');
  const [sendingTutorNotice, setSendingTutorNotice] = useState(false);
  
  // Study Materials / Course Resources State
  const [tutorMaterials, setTutorMaterials] = useState<StudyMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [selectedResourceClassId, setSelectedResourceClassId] = useState<string>('all');
  const [selectedResourceType, setSelectedResourceType] = useState<ResourceType | 'all'>('all');
  const [resourceSearchQuery, setResourceSearchQuery] = useState('');

  // Resource Upload & Edit Modal state
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [editingResource, setEditingResource] = useState<StudyMaterial | null>(null);
  const [resTitle, setResTitle] = useState('');
  const [resDescription, setResDescription] = useState('');
  const [resClassId, setResClassId] = useState('');
  const [resSubject, setResSubject] = useState('Mathematics');
  const [resType, setResType] = useState<ResourceType>('note');
  const [resUrl, setResUrl] = useState('');
  const [resIsVisible, setResIsVisible] = useState<boolean>(true);
  const [resUploadMode, setResUploadMode] = useState<'file' | 'link'>('file');
  const [resFile, setResFile] = useState<File | null>(null);
  const [resUploadProgress, setResUploadProgress] = useState<number>(0);
  const [savingResource, setSavingResource] = useState(false);
  const [expandedClassResourceId, setExpandedClassResourceId] = useState<string | null>(null);

  // Quick Inline Upload Card state
  const [quickUploadClassId, setQuickUploadClassId] = useState<string>('');
  const [quickUploadType, setQuickUploadType] = useState<ResourceType>('note');
  const [quickUploadTitle, setQuickUploadTitle] = useState<string>('');
  const [quickUploadFile, setQuickUploadFile] = useState<File | null>(null);
  const [quickUploadProgress, setQuickUploadProgress] = useState<number>(0);
  const [isQuickUploading, setIsQuickUploading] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  // Resource Delete Modal state
  const [deleteResourceConfirm, setDeleteResourceConfirm] = useState<{
    isOpen: boolean;
    id: string;
    title: string;
  }>({
    isOpen: false,
    id: '',
    title: ''
  });
  
  const [tutorClasses, setTutorClasses] = useState<ClassItem[]>([]);
  const [rosterBookings, setRosterBookings] = useState<Booking[]>([]);
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
  const [tutorAvailability, setTutorAvailability] = useState<{ day: string; slots: string[] }[]>([]);
  const [recurringAvailability, setRecurringAvailability] = useState<RecurringAvailabilitySlot[]>([]);
  const [specificDateAvailability, setSpecificDateAvailability] = useState<SpecificDateAvailability[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Attendance management state variables
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedAttendanceClassId, setSelectedAttendanceClassId] = useState<string>('');
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedClassForProfile, setSelectedClassForProfile] = useState<ClassItem | null>(null);
  const [selectedClassForScanner, setSelectedClassForScanner] = useState<ClassItem | null>(null);
  const [showClassScannerModal, setShowClassScannerModal] = useState<boolean>(false);
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);

  // Quick Attendance Widget state
  const [widgetClassId, setWidgetClassId] = useState<string>('');
  const [widgetDate, setWidgetDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // New Class Form Dialog popup
  const [showAddClass, setShowAddClass] = useState(false);
  const [classFormMode, setClassFormMode] = useState<'create' | 'edit'>('create');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("Mathematics");
  const [newDay, setNewDay] = useState("Saturday");
  const [newTime, setNewTime] = useState("10:00 AM");
  const [newPrice, setNewPrice] = useState("80");
  const [newLimit, setNewLimit] = useState("15");
  const [newGracePeriod, setNewGracePeriod] = useState("5");
  const [newDesc, setNewDesc] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [generatingBanner, setGeneratingBanner] = useState(false);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<UserProfile | null>(null);

  // Custom state-driven delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    classId: string;
    classTitle: string;
  }>({
    isOpen: false,
    classId: '',
    classTitle: ''
  });

  // Tutor Profile states
  const [profName, setProfName] = useState("");
  const [profQualification, setProfQualification] = useState("");
  const [profExperience, setProfExperience] = useState("5");
  const [profHourlyRate, setProfHourlyRate] = useState("50");
  const [profSubjects, setProfSubjects] = useState("");
  const [profBio, setProfBio] = useState("");
  const [profPhoto, setProfPhoto] = useState("");
  const [profExpertiseAreas, setProfExpertiseAreas] = useState<string[]>([]);
  const [newExpertiseInput, setNewExpertiseInput] = useState("");
  const [profDaysOff, setProfDaysOff] = useState<string[]>([]);
  const [newDayOffInput, setNewDayOffInput] = useState("");
  const [showSelfProfileModal, setShowSelfProfileModal] = useState(false);
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [profWorkingHours, setProfWorkingHours] = useState<{ day: string; enabled: boolean; startTime: string; endTime: string }[]>([
    { day: "Monday", enabled: true, startTime: "08:00 AM", endTime: "05:00 PM" },
    { day: "Tuesday", enabled: true, startTime: "08:00 AM", endTime: "05:00 PM" },
    { day: "Wednesday", enabled: true, startTime: "08:00 AM", endTime: "05:00 PM" },
    { day: "Thursday", enabled: true, startTime: "08:00 AM", endTime: "05:00 PM" },
    { day: "Friday", enabled: true, startTime: "08:00 AM", endTime: "05:00 PM" },
    { day: "Saturday", enabled: true, startTime: "09:00 AM", endTime: "02:00 PM" },
    { day: "Sunday", enabled: false, startTime: "09:00 AM", endTime: "12:00 PM" }
  ]);

  // Dynamic Database Subjects and Pathways
  const [dbSubjects, setDbSubjects] = useState<SubjectItem[]>([]);
  const [dbPathways, setDbPathways] = useState<PathwayItem[]>([]);

  useEffect(() => {
    const unsubSub = firestoreService.subscribeSubjects((subjects) => {
      setDbSubjects(subjects);
    });
    const unsubPath = firestoreService.subscribePathways((pathways) => {
      setDbPathways(pathways);
    });
    return () => {
      unsubSub();
      unsubPath();
    };
  }, []);

  const DEFAULT_SUBJECT_TRACKS = ["Mathematics", "Physics", "Chemistry", "Biology", "Combined Mathematics", "English", "Coding", "Information Technology", "Commerce", "Accounting", "History"];

  const availableSubjectOptions = Array.from(
    new Set([
      ...dbSubjects.map(s => s.name),
      ...dbPathways.map(p => p.title),
      ...DEFAULT_SUBJECT_TRACKS,
      ...(newSubject ? [newSubject] : [])
    ])
  ).filter(Boolean);

  useEffect(() => {
    if (currentUser) {
      setProfName(currentUser.name || "");
      setProfQualification(currentUser.tutorDetails?.qualification || "");
      setProfExperience(String(currentUser.tutorDetails?.experience || 5));
      setProfHourlyRate(String(currentUser.tutorDetails?.hourlyRate || 50));
      setProfSubjects(currentUser.tutorDetails?.subjects?.join(", ") || "");
      setProfBio(currentUser.tutorDetails?.bio || "");
      setProfPhoto(currentUser.photoURL || "");
      setProfExpertiseAreas(currentUser.tutorDetails?.expertiseAreas || []);
      setProfDaysOff(currentUser.tutorDetails?.daysOff || []);
      if (currentUser.tutorDetails?.workingHours && currentUser.tutorDetails.workingHours.length > 0) {
        setProfWorkingHours(currentUser.tutorDetails.workingHours);
      }
    }
  }, [currentUser]);

  const isTutorMatch = (tId?: string, tName?: string, tEmail?: string) => {
    if (!currentUser) return false;
    if (tId && (tId === currentUser.uid || tId === currentUser.username)) return true;
    if (tEmail && currentUser.email && tEmail.toLowerCase() === currentUser.email.toLowerCase()) return true;
    if (tName && currentUser.name && tName.toLowerCase() === currentUser.name.toLowerCase()) return true;
    return false;
  };

  const computeTutorData = (usersList: UserProfile[] = allStudents) => {
    if (!currentUser) return { matchedClasses: [], matchedBookings: [] };

    const matchedClasses = classes.filter(c => 
      isTutorMatch(c.tutorId, c.tutorName, (c as any).tutorEmail)
    );

    const tutorClassIds = new Set(matchedClasses.map(c => c.id));

    const matchedBookings = bookings.filter(b => 
      (isTutorMatch(b.tutorId, b.tutorName) || tutorClassIds.has(b.classId)) && 
      b.status === "active"
    );

    // Synthesize roster entries for students enrolled in tutor's classes
    const studentUsers = usersList.filter(u => u.role === 'student' || (!u.role && u.username?.startsWith('GB')));
    studentUsers.forEach(stu => {
      (stu.selectedClasses || []).forEach(cId => {
        if (tutorClassIds.has(cId)) {
          const alreadyInRoster = matchedBookings.some(b => b.studentId === stu.uid && b.classId === cId);
          if (!alreadyInRoster) {
            const cls = matchedClasses.find(c => c.id === cId);
            if (cls) {
              matchedBookings.push({
                id: `roster_stu_${stu.uid}_${cls.id}`,
                studentId: stu.uid,
                studentName: stu.name || stu.username || 'Enrolled Student',
                studentEmail: stu.email,
                classId: cls.id,
                classTitle: cls.title,
                tutorId: cls.tutorId,
                tutorName: cls.tutorName,
                dayOfWeek: cls.dayOfWeek || 'Monday',
                timeSlot: cls.timeSlot || '09:00 AM',
                bookingDate: new Date().toISOString(),
                status: 'active'
              });
            }
          }
        }
      });
    });

    return { matchedClasses, matchedBookings };
  };

  const fetchTutorData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // 1. Fetch all users for roster profile pictures first
      const usersList = await firestoreService.getAllUsers();
      setAllStudents(usersList);

      // 2. Compute matched classes and roster bookings
      const { matchedClasses, matchedBookings } = computeTutorData(usersList);
      setTutorClasses(matchedClasses);
      setRosterBookings(matchedBookings);

      // Load availability
      setTutorAvailability(currentUser.tutorDetails?.availability || []);
      setRecurringAvailability(currentUser.tutorDetails?.recurringAvailability || []);
      setSpecificDateAvailability(currentUser.tutorDetails?.specificDateAvailability || []);

      // 3. Fallback or sync in the background if lists are empty
      if (classes.length === 0 || bookings.length === 0) {
        await Promise.all([
          refreshClasses(),
          refreshBookings()
        ]);
      }
    } catch (e) {
      console.warn("Failed loading tutor profiles details", e);
    } finally {
      setLoading(false);
    }
  };

  // Sync state whenever the cached prefetch lists change
  useEffect(() => {
    if (currentUser) {
      const { matchedClasses, matchedBookings } = computeTutorData(allStudents);
      setTutorClasses(matchedClasses);
      setRosterBookings(matchedBookings);
    }
  }, [classes, bookings, currentUser?.uid, allStudents.length]);

  useEffect(() => {
    if (refreshUserProfile && currentUser) {
      refreshUserProfile().catch(console.warn);
    }
    fetchTutorData();
  }, [currentUser?.uid]);

  const loadAttendanceRecords = async () => {
    if (!currentUser) return;
    setLoadingAttendance(true);
    try {
      const records = await firestoreService.getAttendance();
      // Only keep records of classes belonging to this tutor
      const tutorClassIds = classes.filter(c => c.tutorId === currentUser.uid).map(c => c.id);
      const filtered = records.filter(r => tutorClassIds.includes(r.classId));
      setAttendanceRecords(filtered);
    } catch (e) {
      console.warn("Failed to load attendance records", e);
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadAttendanceRecords();
    }
  }, [activeSubTab, currentUser?.uid]);

  const fetchTutorMaterials = async () => {
    if (!currentUser) return;
    setLoadingMaterials(true);
    try {
      const list = await firestoreService.getStudyMaterials();
      const tutorClassIds = classes.filter(c => c.tutorId === currentUser.uid).map(c => c.id);
      const filtered = list.filter(m => m.tutorId === currentUser.uid || (m.classId && tutorClassIds.includes(m.classId)));
      setTutorMaterials(filtered);
    } catch (e) {
      console.warn("Failed loading tutor study materials", e);
    } finally {
      setLoadingMaterials(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTutorMaterials();
    }
  }, [currentUser?.uid, activeSubTab, classes.length]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleOpenAddResourceModal = (
    preselectedClassId?: string, 
    defaultType: ResourceType = 'note',
    defaultMode: 'file' | 'link' = 'file'
  ) => {
    setEditingResource(null);
    setResTitle('');
    setResDescription('');
    setResUrl('');
    setResFile(null);
    setResUploadProgress(0);
    setResUploadMode(defaultMode);
    setResType(defaultType);
    const targetClassId = preselectedClassId || (tutorClasses.length > 0 ? tutorClasses[0].id : '');
    setResClassId(targetClassId);
    const targetClass = tutorClasses.find(c => c.id === targetClassId) || tutorClasses[0];
    setResSubject(targetClass?.subject || 'Mathematics');
    setResIsVisible(true);
    setShowResourceModal(true);
  };

  const handleQuickAddResource = (classId: string, type: ResourceType) => {
    handleOpenAddResourceModal(classId, type, 'file');
  };

  const handleEditResourceModal = (mat: StudyMaterial) => {
    setEditingResource(mat);
    setResTitle(mat.title);
    setResDescription(mat.description || '');
    setResUrl(mat.referenceUrl);
    setResFile(null);
    setResUploadProgress(0);
    setResUploadMode(mat.storagePath || mat.fileName ? 'file' : 'link');
    setResType(mat.type || 'note');
    setResClassId(mat.classId || '');
    setResSubject(mat.subject || 'Mathematics');
    setResIsVisible(mat.isVisible !== false);
    setShowResourceModal(true);
  };

  const handleQuickUploadSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;
    if (!quickUploadFile && !quickUploadTitle.trim()) {
      showToast("Please select a file to upload or enter a title.", "error");
      return;
    }
    const targetClassId = quickUploadClassId || (tutorClasses.length > 0 ? tutorClasses[0].id : '');
    if (!targetClassId) {
      showToast("Please select an assigned course to link this file to.", "error");
      return;
    }
    const targetClass = tutorClasses.find(c => c.id === targetClassId);
    const title = quickUploadTitle.trim() || (quickUploadFile ? quickUploadFile.name.replace(/\.[^/.]+$/, "") : "Course Material");

    setIsQuickUploading(true);
    setQuickUploadProgress(0);

    try {
      let fileUrl = "";
      let fileName = "";
      let fileSize = 0;
      let fileType = "";
      let storagePath = "";

      if (quickUploadFile) {
        const uploadRes = await firestoreService.uploadResourceFile(
          quickUploadFile,
          targetClassId,
          currentUser.uid,
          (progress) => setQuickUploadProgress(progress)
        );
        fileUrl = uploadRes.url;
        fileName = uploadRes.fileName;
        fileSize = uploadRes.fileSize;
        fileType = uploadRes.fileType;
        storagePath = uploadRes.storagePath;
      }

      await firestoreService.saveStudyMaterial({
        title,
        description: `Uploaded for ${targetClass?.title || 'course'}. Category: ${quickUploadType}`,
        subject: targetClass?.subject || "General",
        referenceUrl: fileUrl,
        type: quickUploadType,
        tutorId: currentUser.uid,
        tutorName: currentUser.name,
        classId: targetClassId,
        classTitle: targetClass?.title || undefined,
        isVisible: true,
        fileName,
        fileSize,
        fileType,
        storagePath
      });

      showToast(`Resource '${title}' uploaded and stored in Firebase Storage!`, "success");
      setQuickUploadFile(null);
      setQuickUploadTitle('');
      setQuickUploadProgress(0);
      await fetchTutorMaterials();
    } catch (err: any) {
      showToast(err?.message || "Failed uploading resource to storage.", "error");
    } finally {
      setIsQuickUploading(false);
    }
  };

  const handleToggleResourceVisibility = async (mat: StudyMaterial) => {
    const nextVisible = !(mat.isVisible !== false);
    try {
      await firestoreService.updateStudyMaterial(mat.id, { isVisible: nextVisible });
      showToast(`Resource '${mat.title}' is now ${nextVisible ? 'Visible to students' : 'Hidden as draft'}.`, "info");
      await fetchTutorMaterials();
    } catch {
      showToast("Failed to update visibility status.", "error");
    }
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!resTitle.trim()) {
      showToast("Please enter a title for the resource.", "error");
      return;
    }

    if (resUploadMode === 'file' && !resFile && !editingResource?.referenceUrl) {
      showToast("Please choose a file (PDF, notes, quiz, document) to upload.", "error");
      return;
    }

    if (resUploadMode === 'link' && !resUrl.trim()) {
      showToast("Please provide a valid reference URL.", "error");
      return;
    }

    setSavingResource(true);
    setResUploadProgress(0);

    try {
      const targetClass = tutorClasses.find(c => c.id === resClassId);
      const subjectName = targetClass?.subject || resSubject || "General";

      let finalUrl = resUrl.trim();
      let finalFileName = editingResource?.fileName;
      let finalFileSize = editingResource?.fileSize;
      let finalFileType = editingResource?.fileType;
      let finalStoragePath = editingResource?.storagePath;

      if (resUploadMode === 'file' && resFile) {
        const uploadRes = await firestoreService.uploadResourceFile(
          resFile,
          resClassId || 'general',
          currentUser.uid,
          (progress) => setResUploadProgress(progress)
        );
        finalUrl = uploadRes.url;
        finalFileName = uploadRes.fileName;
        finalFileSize = uploadRes.fileSize;
        finalFileType = uploadRes.fileType;
        finalStoragePath = uploadRes.storagePath;
      } else if (resUploadMode === 'link') {
        if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
          finalUrl = "https://" + finalUrl;
        }
      }

      if (editingResource) {
        await firestoreService.updateStudyMaterial(editingResource.id, {
          title: resTitle.trim(),
          description: resDescription.trim(),
          subject: subjectName,
          referenceUrl: finalUrl,
          type: resType,
          classId: resClassId || undefined,
          classTitle: targetClass?.title || undefined,
          isVisible: resIsVisible,
          fileName: finalFileName,
          fileSize: finalFileSize,
          fileType: finalFileType,
          storagePath: finalStoragePath
        });
        showToast(`Resource '${resTitle.trim()}' updated successfully!`, "success");
      } else {
        await firestoreService.saveStudyMaterial({
          title: resTitle.trim(),
          description: resDescription.trim(),
          subject: subjectName,
          referenceUrl: finalUrl,
          type: resType,
          tutorId: currentUser.uid,
          tutorName: currentUser.name,
          classId: resClassId || undefined,
          classTitle: targetClass?.title || undefined,
          isVisible: resIsVisible,
          fileName: finalFileName,
          fileSize: finalFileSize,
          fileType: finalFileType,
          storagePath: finalStoragePath
        });
        showToast(`Resource '${resTitle.trim()}' published to course!`, "success");
      }

      setShowResourceModal(false);
      setEditingResource(null);
      setResTitle('');
      setResDescription('');
      setResUrl('');
      setResFile(null);
      setResUploadProgress(0);
      setResClassId('');

      await fetchTutorMaterials();
    } catch (err: any) {
      showToast(err?.message || "Failed to save resource. Try again.", "error");
    } finally {
      setSavingResource(false);
    }
  };

  const executeResourceDeletion = async () => {
    const { id, title } = deleteResourceConfirm;
    if (!id) return;
    try {
      await firestoreService.deleteStudyMaterial(id);
      showToast(`Resource '${title}' deleted successfully.`, "success");
      setDeleteResourceConfirm({ isOpen: false, id: '', title: '' });
      await fetchTutorMaterials();
    } catch (e) {
      showToast("Failed deleting resource.", "error");
    }
  };

  // Set default widgetClassId to first tutor class if available
  useEffect(() => {
    if (tutorClasses.length > 0 && !widgetClassId) {
      setWidgetClassId(tutorClasses[0].id);
    }
  }, [tutorClasses, widgetClassId]);

  // Handler to add schedule availability dynamically
  const handleAddAvailability = async (day: string, slot: string) => {
    if (!currentUser) return;
    
    // Structure update
    const currentAvail = [...tutorAvailability];
    const matchDayIdx = currentAvail.findIndex(a => a.day === day);
    
    if (matchDayIdx >= 0) {
      if (currentAvail[matchDayIdx].slots.includes(slot)) {
        showToast(`Slot ${slot} already exists for ${day}.`, "info");
        return;
      }
      currentAvail[matchDayIdx].slots.push(slot);
    } else {
      currentAvail.push({ day, slots: [slot] });
    }

    try {
      const updatedDetails = {
        ...currentUser.tutorDetails,
        availability: currentAvail
      };
      
      await firestoreService.updateTutorProfile(currentUser.uid, {
        tutorDetails: updatedDetails as any
      });
      
      setTutorAvailability(currentAvail);
      showToast(`Availability added: ${day} at ${slot}`, "success");
    } catch {
      showToast("Could not save availability.", "error");
    }
  };

  const handleUpdateRecurringAvailability = async (slots: RecurringAvailabilitySlot[]) => {
    if (!currentUser) return;
    setRecurringAvailability(slots);
    try {
      const updatedDetails = {
        ...currentUser.tutorDetails,
        recurringAvailability: slots
      };
      await firestoreService.updateTutorProfile(currentUser.uid, {
        tutorDetails: updatedDetails as any
      });
      showToast("Weekly recurring availability updated successfully!", "success");
      if (refreshUserProfile) await refreshUserProfile();
    } catch {
      showToast("Failed to update recurring availability.", "error");
    }
  };

  const handleUpdateSpecificDateAvailability = async (slots: SpecificDateAvailability[]) => {
    if (!currentUser) return;
    setSpecificDateAvailability(slots);
    try {
      const updatedDetails = {
        ...currentUser.tutorDetails,
        specificDateAvailability: slots
      };
      await firestoreService.updateTutorProfile(currentUser.uid, {
        tutorDetails: updatedDetails as any
      });
      showToast("Specific date availability / leave schedule updated!", "success");
      if (refreshUserProfile) await refreshUserProfile();
    } catch {
      showToast("Failed to update date availability.", "error");
    }
  };

  const handleTutorBroadcastNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorNoticeTitle.trim() || !tutorNoticeMsg.trim() || !currentUser) return;
    setSendingTutorNotice(true);
    try {
      await executeWriteWithRetry(
        `Broadcast Tutor Announcement: '${tutorNoticeTitle}'`,
        async () => {
          await firestoreService.triggerNotification(
            'all',
            `📢 [Tutor ${currentUser.name}] ${tutorNoticeTitle}`,
            tutorNoticeMsg,
            'announcement'
          );
        }
      );
      showToast("Class announcement broadcasted to students!", "success");
      setTutorNoticeTitle('');
      setTutorNoticeMsg('');
      await refreshNotifications();
    } catch (err) {
      showToast("Failed to broadcast announcement.", "error");
    } finally {
      setSendingTutorNotice(false);
    }
  };

  const startEditClass = (c: ClassItem) => {
    setClassFormMode('edit');
    setEditingClassId(c.id);
    setNewTitle(c.title);
    setNewSubject(c.subject);
    setNewDay(c.dayOfWeek);
    setNewTime(c.timeSlot);
    setNewPrice(String(c.price));
    setNewLimit(String(c.maxSlots));
    setNewGracePeriod(String(c.gracePeriod !== undefined ? c.gracePeriod : 5));
    setNewDesc(c.description);
    setNewImageUrl(c.imageUrl || "");
    setShowAddClass(true);
  };

  const handleDeleteClass = (classId: string, classTitle: string) => {
    setDeleteConfirm({
      isOpen: true,
      classId,
      classTitle
    });
  };

  const executeClassDeletion = async () => {
    const { classId, classTitle } = deleteConfirm;
    if (!classId) return;
    setLoading(true);
    try {
      await executeWriteWithRetry(
        `Delete Class/Syllabus: '${classTitle}'`,
        async () => {
          await firestoreService.deleteClass(classId);
        },
        async () => {
          try {
            if (firestoreService.isCloudConnected()) {
              const { doc, getDoc } = await import('firebase/firestore');
              const { db } = await import('../lib/firebase');
              const snap = await getDoc(doc(db, 'classes', classId));
              return !snap.exists();
            }
          } catch (e) {}
          return true;
        }
      );
      showToast(`Course '${classTitle}' deleted successfully.`, "success");
      setDeleteConfirm({ isOpen: false, classId: '', classTitle: '' });
      await refreshClasses();
      await fetchTutorData();
    } catch (e) {
      showToast("Failed to delete class.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast("Profile image must be under 10MB", "error");
      return;
    }
    try {
      showToast("Uploading photo to Firebase Storage...", "info");
      const storageUrl = await firestoreService.uploadProfilePhoto(file, currentUser.uid, 'tutor');
      await firestoreService.submitProfilePhotoChange(
        currentUser.uid,
        storageUrl,
        'tutor',
        currentUser.name
      );
      if (refreshUserProfile) {
        await refreshUserProfile();
      }
      showToast(
        "📸 Profile picture uploaded to Firebase Storage and submitted for Admin approval! It will appear publicly once verified.",
        "info"
      );
    } catch (err: any) {
      showToast("Failed to upload photo: " + (err.message || "Unknown error"), "error");
    }
  };

  const handleAddExpertiseArea = () => {
    if (!newExpertiseInput.trim()) return;
    const tag = newExpertiseInput.trim();
    if (!profExpertiseAreas.includes(tag)) {
      setProfExpertiseAreas([...profExpertiseAreas, tag]);
    }
    setNewExpertiseInput("");
  };

  const handleRemoveExpertiseArea = (tagToRemove: string) => {
    setProfExpertiseAreas(profExpertiseAreas.filter(t => t !== tagToRemove));
  };

  const handleAddDayOff = () => {
    if (!newDayOffInput.trim()) return;
    const day = newDayOffInput.trim();
    if (!profDaysOff.includes(day)) {
      setProfDaysOff([...profDaysOff, day]);
    }
    setNewDayOffInput("");
  };

  const handleRemoveDayOff = (dayToRemove: string) => {
    setProfDaysOff(profDaysOff.filter(d => d !== dayToRemove));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // Detect changed fields to show granular pulsing sync states next to form fields!
    const changedFields: string[] = [];
    if (profName !== currentUser.name) changedFields.push('profName');
    if (profPhoto !== currentUser.photoURL) changedFields.push('profPhoto');
    if (profQualification !== (currentUser.tutorDetails?.qualification || '')) changedFields.push('profQualification');
    if (Number(profExperience) !== (currentUser.tutorDetails?.experience || 5)) changedFields.push('profExperience');
    if (Number(profHourlyRate) !== (currentUser.tutorDetails?.hourlyRate || 50)) changedFields.push('profHourlyRate');
    if (profBio !== (currentUser.tutorDetails?.bio || '')) changedFields.push('profBio');
    
    const subjectsStr = (currentUser.tutorDetails?.subjects || []).join(', ');
    if (profSubjects !== subjectsStr) changedFields.push('profSubjects');

    if (changedFields.length === 0) {
      // If nothing has actually changed, let's flash Name field to show sync readiness
      changedFields.push('profName');
    }

    // Set all modified fields to syncing status
    changedFields.forEach(f => syncFieldStart(f));

    try {
      setLoading(true);
      await updateProfile({
        name: profName,
        photoURL: profPhoto,
        tutorDetails: {
          bio: profBio,
          subjects: profSubjects.split(',').map(s => s.trim()).filter(Boolean),
          expertiseAreas: profExpertiseAreas,
          experience: Number(profExperience),
          qualification: profQualification,
          hourlyRate: Number(profHourlyRate),
          rating: currentUser.tutorDetails?.rating || 5.0,
          workingHours: profWorkingHours,
          daysOff: profDaysOff,
          availability: tutorAvailability,
          recurringAvailability: recurringAvailability,
          specificDateAvailability: specificDateAvailability
        }
      });
      
      // Mark all modified fields as successfully saved & verified
      changedFields.forEach(f => syncFieldSuccess(f));
      showToast("Tutor profile updated successfully!", "success");
      if (refreshUserProfile) {
        await refreshUserProfile();
      }
    } catch (err: any) {
      // Mark modified fields as failed
      changedFields.forEach(f => syncFieldFailure(f, err?.message || 'Sync failed'));
      showToast(err.message || "Failed to update tutor profile details.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateClassBanner = async () => {
    if (!newTitle.trim()) {
      showToast("Please enter a Class Course Title first to generate a professional topic-specific image.", "error");
      return;
    }
    
    setGeneratingBanner(true);
    showToast("AI is designing premium high-contrast assets matching course syllabus...", "info");
    
    setTimeout(() => {
      const randomId = Math.floor(Math.random() * 1000);
      let customUrl = "";
      const lowerTitle = newTitle.toLowerCase();
      
      if (newSubject === 'Mathematics') {
        customUrl = lowerTitle.includes('calc') || lowerTitle.includes('calculus')
          ? "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=600"
          : "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=600";
      } else if (newSubject === 'Physics') {
        customUrl = lowerTitle.includes('quantum') || lowerTitle.includes('space')
          ? "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600"
          : "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&q=80&w=600";
      } else if (newSubject === 'Coding') {
        customUrl = lowerTitle.includes('web') || lowerTitle.includes('react') || lowerTitle.includes('html')
          ? "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=600"
          : "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=600";
      } else if (newSubject === 'English') {
        customUrl = lowerTitle.includes('creative') || lowerTitle.includes('writing')
          ? "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=600"
          : "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&q=80&w=600";
      } else {
        customUrl = `https://picsum.photos/seed/${randomId}/600/350`;
      }
      
      setNewImageUrl(customUrl);
      setGeneratingBanner(false);
      showToast("Professional topic-specific header generated and attached successfully!", "success");
    }, 1500);
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!newTitle.trim() || !newDesc.trim()) {
      showToast("Make sure all description assets are complete.", "error");
      return;
    }

    try {
      const scheduleString = `${newDay}s ${newTime} - ${parseInt(newTime) + 2}:00 PM`; // mock duration
      
      if (classFormMode === 'edit' && editingClassId) {
        await executeWriteWithRetry(
          `Update Course Curriculum: '${newTitle}'`,
          async () => {
            await firestoreService.updateClass(editingClassId, {
              title: newTitle,
              subject: newSubject,
              schedule: scheduleString,
              dayOfWeek: newDay,
              timeSlot: newTime,
              price: Number(newPrice),
              description: newDesc,
              maxSlots: Number(newLimit),
              imageUrl: newImageUrl,
              gracePeriod: parseInt(newGracePeriod, 10) || 5
            });
          },
          async () => {
            try {
              if (firestoreService.isCloudConnected()) {
                const { doc, getDoc } = await import('firebase/firestore');
                const { db } = await import('../lib/firebase');
                const snap = await getDoc(doc(db, 'classes', editingClassId));
                return snap.exists() && (snap.data() as any).title === newTitle;
              }
            } catch (e) {}
            return true;
          }
        );
        showToast(`Course '${newTitle}' updated successfully!`, "success");
      } else {
        let createdId = '';
        await executeWriteWithRetry(
          `Deploy New Course Syllabus: '${newTitle}'`,
          async () => {
            const item = await firestoreService.createNewClass({
              title: newTitle,
              subject: newSubject,
              tutorId: currentUser.uid,
              tutorName: currentUser.name,
              tutorPhoto: currentUser.photoURL,
              schedule: scheduleString,
              dayOfWeek: newDay,
              timeSlot: newTime,
              price: Number(newPrice),
              description: newDesc,
              maxSlots: Number(newLimit),
              bookedSlots: 0,
              tags: ["Interactive", newSubject],
              imageUrl: newImageUrl,
              gracePeriod: parseInt(newGracePeriod, 10) || 5
            });
            createdId = item.id;

            // trigger global notifications
            await firestoreService.triggerNotification(
              "all",
              "New Tuition Course Launched!",
              `${currentUser.name} just launched a premium course: '${newTitle}'. Secure your seat right now!`,
              "announcement"
            );
          },
          async () => {
            try {
              if (firestoreService.isCloudConnected() && createdId) {
                const { doc, getDoc } = await import('firebase/firestore');
                const { db } = await import('../lib/firebase');
                const snap = await getDoc(doc(db, 'classes', createdId));
                return snap.exists();
              }
            } catch (e) {}
            return true;
          }
        );

        showToast(`Subject Class ${newTitle} launched successfully!`, "success");
      }

      setShowAddClass(false);
      await refreshClasses();
      await fetchTutorData();

      // Reset
      setNewTitle("");
      setNewDesc("");
      setNewPrice("80");
      setNewLimit("15");
      setNewGracePeriod("5");
      setNewImageUrl("");
      setClassFormMode('create');
      setEditingClassId(null);
    } catch (e) {
      showToast("Failed compiling class item creation.", "error");
    }
  };

  if (!currentUser) return null;

  if (currentUser.role !== 'tutor' && currentUser.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 bg-white border border-slate-200 rounded-3xl text-center shadow-xs">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-extrabold text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-1">This faculty workspace is strictly reserved for approved tutors and administrators.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-gray-50/50 min-h-screen py-10"
      id="tutor_workspace"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Tutor Details Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-emerald-600 font-mono uppercase tracking-widest block leading-none">Faculty workspace</span>
            <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight mt-3">Welcome, {currentUser.name}</h1>
            <p className="text-xs text-gray-400 mt-1">Credentials: <span className="font-bold text-emerald-600 truncate">{currentUser.tutorDetails?.qualification || 'PhD Scholar'}</span> • Status: VERIFIED_ACADEMICS</p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Real-time Availability Status Toggle */}
            <div className="flex items-center gap-2.5 bg-white border border-gray-150 px-3.5 py-1.5 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.01)] text-xs font-semibold">
              <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Bookings Status:</span>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border transition-colors ${
                  currentUser.availabilityStatus === 'away' 
                    ? 'bg-amber-50 text-amber-700 border-amber-200' 
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${currentUser.availabilityStatus === 'away' ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                  {currentUser.availabilityStatus === 'away' ? 'Away' : 'Active'}
                </span>
                
                {/* Switch Button */}
                <button
                  id="tutor_availability_toggle"
                  type="button"
                  onClick={async () => {
                    const nextStatus = currentUser.availabilityStatus === 'away' ? 'active' : 'away';
                    try {
                      await updateProfile({ availabilityStatus: nextStatus });
                      showToast(`Availability status updated to '${nextStatus === 'away' ? 'Away' : 'Active'}'!`, "success");
                    } catch (e) {
                      showToast("Failed to update availability status.", "error");
                    }
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    currentUser.availabilityStatus === 'away' ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  title={currentUser.availabilityStatus === 'away' ? 'Set Active for Bookings' : 'Set Away for Bookings'}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      currentUser.availabilityStatus === 'away' ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
                <SyncStatusIndicator operationPatterns={['profile']} />
              </div>
            </div>

            {/* Class Creator trigger, QR Pass Trigger & Faculty ID Card */}
            <div className="flex items-center gap-2">
              <button
                id="tutor_btn_id_card"
                onClick={() => setShowIdCardModal(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-100 cursor-pointer"
                title="View, print and export official Faculty Digital ID Card"
              >
                <BadgeCheck className="w-4 h-4" /> Faculty ID Card
              </button>
              <button
                id="tutor_btn_launch_class"
                onClick={() => {
                  setClassFormMode('create');
                  setEditingClassId(null);
                  setNewTitle("");
                  setNewDesc("");
                  setNewPrice("80");
                  setNewLimit("15");
                  setShowAddClass(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-100 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Launch Tuition Class
              </button>
              <button
                id="tutor_btn_launch_qr_pass"
                onClick={() => setShowQrModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-100 cursor-pointer"
                title="Display live QR Code for class attendance check-ins"
              >
                <QrCode className="w-4 h-4" /> Live Session QR Code
              </button>
            </div>

            {/* Sub menu controls - Modern Dropdown Navigation */}
            <div className="relative">
              <button
                id="tutor_dashboard_nav_dropdown_trigger"
                onClick={() => setIsNavDropdownOpen(!isNavDropdownOpen)}
                className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow transition-all flex items-center gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 text-xs font-black text-slate-800 dark:text-white">
                  <span className="p-1.5 bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    {activeSubTab === 'schedule' && <Calendar className="w-4 h-4" />}
                    {activeSubTab === 'students' && <Users className="w-4 h-4" />}
                    {activeSubTab === 'resources' && <BookOpen className="w-4 h-4" />}
                    {activeSubTab === 'attendance' && <ClipboardList className="w-4 h-4" />}
                    {activeSubTab === 'chat' && <MessageSquare className="w-4 h-4" />}
                    {activeSubTab === 'alerts' && <Bell className="w-4 h-4" />}
                    {activeSubTab === 'profile' && <User className="w-4 h-4" />}
                    {activeSubTab === 'settings' && <Settings className="w-4 h-4" />}
                  </span>
                  <span className="capitalize">
                    {activeSubTab === 'schedule' && 'Teaching Schedules'}
                    {activeSubTab === 'students' && `Listed Scholars (${rosterBookings.length})`}
                    {activeSubTab === 'resources' && `Course Resources (${tutorMaterials.length})`}
                    {activeSubTab === 'attendance' && 'Attendance Tracker'}
                    {activeSubTab === 'chat' && 'Students Chat'}
                    {activeSubTab === 'alerts' && 'Alerts & System Notices'}
                    {activeSubTab === 'profile' && 'Faculty Profile'}
                    {activeSubTab === 'settings' && 'Alert Preferences'}
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
                      Faculty Menu Options
                    </div>
                    {[
                      { id: 'schedule', label: 'Teaching Schedules', icon: <Calendar className="w-4 h-4 text-indigo-500" /> },
                      { id: 'students', label: `Listed Scholars (${rosterBookings.length})`, icon: <Users className="w-4 h-4 text-blue-500" /> },
                      { id: 'resources', label: `Course Resources (${tutorMaterials.length})`, icon: <BookOpen className="w-4 h-4 text-emerald-500" /> },
                      { id: 'attendance', label: 'Attendance Tracker', icon: <ClipboardList className="w-4 h-4 text-amber-500" /> },
                      { id: 'chat', label: 'Students Chat', icon: <MessageSquare className="w-4 h-4 text-purple-500" /> },
                      { id: 'alerts', label: 'Alerts', icon: <Bell className="w-4 h-4 text-rose-500" />, badge: notifications.filter(n => !n.isRead).length },
                      { id: 'profile', label: 'Faculty Profile', icon: <User className="w-4 h-4 text-cyan-500" /> },
                      { id: 'settings', label: 'Alert Preferences', icon: <Settings className="w-4 h-4 text-slate-500" /> },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        id={`tutor_tab_${opt.id}`}
                        onClick={() => {
                          setActiveSubTab(opt.id as any);
                          setIsNavDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          activeSubTab === opt.id
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

        {/* Dynamic Screens */}
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            Fetching faculty dashboard parameters...
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            
            {/* Tab 1: Schedules & Free Slots management */}
            {activeSubTab === 'schedule' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <Class15MinReminderBanner />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Side: Calendar Schedule View */}
                  <div className="lg:col-span-8">
                    <CalendarView
                      userRole="tutor"
                      tutorClasses={tutorClasses}
                      tutorAvailability={tutorAvailability}
                      recurringAvailability={recurringAvailability}
                      specificDateAvailability={specificDateAvailability}
                      onAddAvailability={handleAddAvailability}
                      onUpdateRecurringAvailability={handleUpdateRecurringAvailability}
                      onUpdateSpecificDateAvailability={handleUpdateSpecificDateAvailability}
                      attendanceRecords={attendanceRecords}
                    />
                  </div>

                  {/* Right Side: Attendance Tracker Quick Widget */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-5 font-sans space-y-5" id="attendance_quick_widget">
                    
                    {/* Widget Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-50 text-indigo-650 rounded-lg dark:bg-slate-200/10">
                          <ClipboardList className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 tracking-tight">Attendance Tracker</h3>
                          <p className="text-[10px] text-slate-400 font-medium">Quick-mark session attendance</p>
                        </div>
                      </div>
                    </div>

                    {/* QR Session Launch Button */}
                    <button
                      id="tutor_quick_widget_qr_btn"
                      onClick={() => setShowQrModal(true)}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <QrCode className="w-4 h-4" /> Display Class QR Code
                    </button>

                    {/* Widget Parameters Form */}
                    <div className="space-y-3.5 border-t border-slate-50 pt-4">
                      <div>
                        <label htmlFor="widget_class_select" className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">
                          Select Class
                        </label>
                        <select
                          id="widget_class_select"
                          value={widgetClassId}
                          onChange={(e) => setWidgetClassId(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700"
                        >
                          <option value="">-- Choose active class --</option>
                          {tutorClasses.map(c => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label htmlFor="widget_date_input" className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">
                            Date of Session
                          </label>
                          <input
                            id="widget_date_input"
                            type="date"
                            value={widgetDate}
                            onChange={(e) => setWidgetDate(e.target.value)}
                            className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Visual Progress Indicator for Session Attendance Health */}
                    {widgetClassId && (
                      <div className="border-t border-slate-50 pt-3">
                        {(() => {
                          const enrolled = bookings.filter(b => b.classId === widgetClassId && b.status === "active");
                          const present = enrolled.filter(b => attendanceRecords.find(r => r.id === `${widgetClassId}_${b.studentId || b.id}_${widgetDate}`)?.status === 'Present').length;
                          const absent = enrolled.filter(b => attendanceRecords.find(r => r.id === `${widgetClassId}_${b.studentId || b.id}_${widgetDate}`)?.status === 'Absent').length;
                          const selectedClass = tutorClasses.find(c => c.id === widgetClassId);
                          
                          return (
                            <AttendanceHealthProgressBar
                              presentCount={present}
                              absentCount={absent}
                              totalCount={enrolled.length}
                              sessionTitle={selectedClass?.title}
                              sessionDate={widgetDate}
                              label="Session Attendance Health"
                            />
                          );
                        })()}
                      </div>
                    )}

                    {/* Enrolled Students & Checklist Section */}
                    <div className="border-t border-slate-50 pt-4 space-y-3">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                        <span>Enrolled Students</span>
                        <span className="font-bold text-indigo-650">Roster list</span>
                      </div>

                      {!widgetClassId ? (
                        <p className="text-xs text-slate-450 italic py-4 text-center">Please select a class to view enrollment roster.</p>
                      ) : bookings.filter(b => b.classId === widgetClassId && b.status === "active").length === 0 ? (
                        <p className="text-xs text-slate-450 italic py-4 text-center">No students enrolled in this course.</p>
                      ) : (
                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                          {bookings.filter(b => b.classId === widgetClassId && b.status === "active").map((b) => {
                            const recordId = `${widgetClassId}_${b.studentId || b.id}_${widgetDate}`;
                            const existingRecord = attendanceRecords.find(r => r.id === recordId);

                            const handleWidgetStatusUpdate = async (status: 'Present' | 'Absent') => {
                              try {
                                const newRecord: AttendanceRecord = {
                                  id: recordId,
                                  classId: widgetClassId,
                                  classTitle: b.classTitle,
                                  studentId: b.studentId || b.id,
                                  studentName: b.studentName,
                                  date: widgetDate,
                                  status,
                                  markedAt: new Date().toISOString(),
                                  tutorId: currentUser.uid,
                                  type: 'manual'
                                };
                                await firestoreService.markAttendance(newRecord);
                                showToast(`Attendance marked as ${status} for ${b.studentName}.`, "success");
                                setAttendanceRecords(prev => [...prev.filter(r => r.id !== recordId), newRecord]);
                              } catch (err) {
                                showToast("Failed to record attendance status.", "error");
                              }
                            };

                            return (
                              <div key={b.id} className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-between gap-3 text-xs">
                                <div className="space-y-0.5 truncate flex-1">
                                  <h4 className="font-bold text-slate-800 truncate">{b.studentName}</h4>
                                  <div className="flex items-center gap-1.5">
                                    {existingRecord ? (
                                      <span className={`inline-block text-[8px] font-bold px-1 rounded-sm ${
                                        existingRecord.status === 'Present' 
                                          ? 'bg-emerald-50 text-emerald-700' 
                                          : 'bg-red-50 text-red-700'
                                      }`}>
                                        {existingRecord.status}
                                      </span>
                                    ) : (
                                      <span className="inline-block text-[8px] font-bold px-1 rounded-sm bg-slate-100 text-slate-450">
                                        Unmarked
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={() => handleWidgetStatusUpdate('Present')}
                                    className={`px-2 py-1 rounded text-[9px] font-extrabold cursor-pointer transition-colors ${
                                      existingRecord?.status === 'Present'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-650 hover:bg-emerald-50 hover:text-emerald-700'
                                    }`}
                                  >
                                    Present
                                  </button>
                                  <button
                                    onClick={() => handleWidgetStatusUpdate('Absent')}
                                    className={`px-2 py-1 rounded text-[9px] font-extrabold cursor-pointer transition-colors ${
                                      existingRecord?.status === 'Absent'
                                        ? 'bg-red-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-650 hover:bg-red-50 hover:text-red-700'
                                    }`}
                                  >
                                    Absent
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Stats summary of current session */}
                    {widgetClassId && bookings.filter(b => b.classId === widgetClassId && b.status === "active").length > 0 && (
                      <div className="border-t border-slate-50 pt-4 bg-slate-50 p-3 rounded-xl flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>Present: <b>{bookings.filter(b => b.classId === widgetClassId && b.status === "active").filter(b => attendanceRecords.find(r => r.id === `${widgetClassId}_${b.studentId || b.id}_${widgetDate}`)?.status === 'Present').length}</b></span>
                        <span>Absent: <b>{bookings.filter(b => b.classId === widgetClassId && b.status === "active").filter(b => attendanceRecords.find(r => r.id === `${widgetClassId}_${b.studentId || b.id}_${widgetDate}`)?.status === 'Absent').length}</b></span>
                        <span className="text-indigo-650 font-bold">Total Enrolled: {bookings.filter(b => b.classId === widgetClassId && b.status === "active").length}</span>
                      </div>
                    )}

                  </div>
                </div>
                </div>
              </motion.div>
            )}

            {/* Tab 2: Roster list of enrolled scholars */}
            {activeSubTab === 'students' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                
                {/* Active Classes Column */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 border-b pb-3 border-gray-50 flex items-center gap-2">
                    <BookOpen className="w-4.5 h-4.5 text-blue-500" /> Active subject Courses ({tutorClasses.length})
                  </h3>

                  {tutorClasses.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs">
                      No classes programmed. Click 'Launch Tuition Class' above to begin.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tutorClasses.map((item) => (
                        <div 
                          key={item.id} 
                          onClick={() => setSelectedClassForProfile(item)}
                          className="p-3.5 border border-gray-100 hover:border-blue-200 rounded-xl bg-gray-50/30 text-xs space-y-1.5 flex justify-between gap-2 cursor-pointer transition-all hover:shadow-xs group"
                        >
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[9px] font-bold font-mono text-blue-600 bg-blue-50/50 px-1.5 py-0.5 rounded uppercase">{item.subject}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedClassForScanner(item);
                                  setShowClassScannerModal(true);
                                }}
                                className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all cursor-pointer shadow-xs border border-indigo-400/30 flex items-center gap-1 text-[10px] font-bold"
                                title="Scan QR Code Attendance for this class"
                                id={`btn_scan_qr_tutor_item_${item.id}`}
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Scan QR</span>
                              </button>
                            </div>
                            <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors leading-tight block pt-0.5">{item.title}</h4>
                            
                            {/* Attendance Progress Indicator */}
                            {(() => {
                              const classBookings = bookings.filter(b => b.classId === item.id && b.status === 'active');
                              const classRecords = attendanceRecords.filter(r => r.classId === item.id);
                              const present = classRecords.filter(r => r.status === 'Present').length;
                              const absent = classRecords.filter(r => r.status === 'Absent').length;
                              const totalExpected = Math.max(classBookings.length, classRecords.length);

                              return (
                                <div className="pt-1">
                                  <AttendanceHealthProgressBar
                                    compact
                                    size="sm"
                                    presentCount={present}
                                    absentCount={absent}
                                    totalCount={totalExpected}
                                    label="Attendance"
                                  />
                                </div>
                              );
                            })()}

                            <div className="flex justify-between items-center text-[10px] text-gray-500 mt-2 font-mono">
                              <span>Seats: {item.bookedSlots}/{item.maxSlots}</span>
                              <span>Cost: LKR {item.price}/Mo</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5 shrink-0 justify-center">
                            <button
                              id={`edit-class-btn-${item.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditClass(item);
                              }}
                              className="p-1.5 rounded bg-white hover:bg-gray-100 border border-gray-200 text-blue-600 cursor-pointer"
                              title="Edit class details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`delete-class-btn-${item.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClass(item.id, item.title);
                              }}
                              className="p-1.5 rounded bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 cursor-pointer"
                              title="Delete class curriculum"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Enrolled students Roster */}
                <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 border-b pb-3 border-gray-50 flex items-center gap-2">
                    <Users className="w-4.5 h-4.5 text-blue-500" /> Intake Scholars Roster Directory ({rosterBookings.length})
                  </h3>

                  {rosterBookings.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 text-xs">
                      No student seats have been booked yet. We'll update your calendar once students complete registration.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {rosterBookings.map((b) => {
                        const punctuality = calculateStudentPunctuality(
                          b.studentId,
                          attendanceRecords,
                          tutorClasses
                        );

                        const handleOpenProfile = () => {
                          const studentUser = allStudents.find(s => s.uid === b.studentId) || {
                            uid: b.studentId,
                            name: b.studentName,
                            email: b.studentEmail || '',
                            role: 'student',
                            status: 'active',
                            createdAt: new Date().toISOString()
                          };
                          setSelectedStudentForProfile(studentUser);
                        };

                        return (
                          <div 
                            key={b.id} 
                            className="p-4 border border-slate-200 bg-white rounded-2xl flex justify-between items-start transition-all hover:border-indigo-300 hover:shadow-xs"
                          >
                            <div className="space-y-1.5 flex-1 pr-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-150">
                                  Enrolled Scholar
                                </span>
                                {punctuality.isConsistentlyLate && (
                                  <button
                                    onClick={handleOpenProfile}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-slate-950 shadow-2xs border border-amber-300 cursor-pointer hover:bg-amber-400 transition-colors"
                                    title={punctuality.badgeDescription}
                                  >
                                    <AlertTriangle className="w-2.5 h-2.5 fill-slate-950 text-amber-500" />
                                    Late Arrival ({punctuality.lateRate}%)
                                  </button>
                                )}
                              </div>
                              <h4 
                                onClick={handleOpenProfile}
                                className="text-xs font-bold text-gray-900 leading-tight hover:text-indigo-600 cursor-pointer transition-colors"
                              >
                                {b.studentName}
                              </h4>
                              <p className="text-[11px] text-gray-500">
                                Course: <span className="font-semibold text-gray-700 truncate">{b.classTitle}</span>
                              </p>
                              <p className="text-[10px] text-emerald-600 font-mono font-semibold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Booked Slot: {b.dayOfWeek} at {b.timeSlot}
                              </p>
                            </div>

                            <button
                              onClick={handleOpenProfile}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer border border-slate-200"
                              title="Inspect full student profile & attendance history"
                            >
                              <FileText className="w-3 h-3" /> Profile
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </motion.div>
            )}

            {/* Tab: Course Resources & Resource Manager */}
            {activeSubTab === 'resources' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-8"
              >
                {/* Header & Firebase Cloud Storage Status Banner */}
                <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                          <FolderOpen className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-lg font-black text-gray-900 tracking-tight">
                              Resource Manager & Course Materials
                            </h2>
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1 font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Firebase Storage Active
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Upload, categorize, and link PDFs, lecture notes, quiz assessments, worksheets, and links to your assigned courses.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleOpenAddResourceModal(undefined, 'note', 'file')}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
                      >
                        <UploadCloud className="w-4 h-4" /> Upload File to Cloud
                      </button>
                      <button
                        onClick={() => handleOpenAddResourceModal(undefined, 'link', 'link')}
                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <LinkIcon className="w-3.5 h-3.5 text-slate-500" /> Add Web Link
                      </button>
                    </div>
                  </div>

                  {/* Top Stats Overview Ribbon */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Assigned Courses</span>
                      <p className="text-lg font-black text-slate-800">{tutorClasses.length}</p>
                    </div>
                    <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider font-mono">Total Scholars</span>
                      <p className="text-lg font-black text-blue-800">{rosterBookings.length}</p>
                    </div>
                    <div className="bg-indigo-50/60 border border-indigo-200/70 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider font-mono">Lecture Notes (PDF)</span>
                      <p className="text-lg font-black text-indigo-800">{tutorMaterials.filter(m => m.type === 'note').length}</p>
                    </div>
                    <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider font-mono">Quizzes & Tests</span>
                      <p className="text-lg font-black text-amber-800">{tutorMaterials.filter(m => m.type === 'quiz').length}</p>
                    </div>
                    <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider font-mono">Files & Worksheets</span>
                      <p className="text-lg font-black text-emerald-800">{tutorMaterials.filter(m => m.type === 'file' || m.type === 'video').length}</p>
                    </div>
                    <div className="bg-purple-50/60 border border-purple-200/70 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider font-mono">Total Resources</span>
                      <p className="text-lg font-black text-purple-800">{tutorMaterials.length}</p>
                    </div>
                  </div>

                  {/* Quick Inline Upload & Categorization Zone */}
                  <div className="bg-gradient-to-r from-blue-50/40 via-indigo-50/30 to-purple-50/30 rounded-2xl border border-blue-150 p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                          <UploadCloud className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                            Direct Cloud Upload & Class Assigner
                          </h3>
                          <p className="text-[11px] text-gray-500">
                            Select or drop any study file to upload directly to Firebase Storage and bind to a course ID.
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-md font-bold">
                        PDF • DOCX • QUIZ • PPTX • ZIP • MP4
                      </span>
                    </div>

                    <form onSubmit={handleQuickUploadSubmit} className="space-y-3">
                      {/* Target Class & Category Pickers */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            1. Select Assigned Course:
                          </label>
                          <select
                            value={quickUploadClassId}
                            onChange={(e) => setQuickUploadClassId(e.target.value)}
                            className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none font-bold text-gray-800 focus:border-blue-500 shadow-2xs cursor-pointer"
                          >
                            <option value="">-- Choose Course to Link --</option>
                            {tutorClasses.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.title} ({c.subject})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            2. Categorize Resource:
                          </label>
                          <select
                            value={quickUploadType}
                            onChange={(e) => setQuickUploadType(e.target.value as ResourceType)}
                            className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none font-bold text-gray-800 focus:border-blue-500 shadow-2xs cursor-pointer"
                          >
                            <option value="note">📑 Lecture Note / PDF Document</option>
                            <option value="quiz">📝 Quiz Assessment / Test Sheet</option>
                            <option value="file">📁 Worksheet / Study File</option>
                            <option value="link">🔗 Reference Web Portal</option>
                            <option value="video">🎥 Video Session / Recording</option>
                            <option value="announcement">📢 Course Bulletin / Notice</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            3. Title / Label (Optional):
                          </label>
                          <input
                            type="text"
                            value={quickUploadTitle}
                            onChange={(e) => setQuickUploadTitle(e.target.value)}
                            placeholder="Defaults to uploaded file name..."
                            className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500 shadow-2xs text-gray-800"
                          />
                        </div>
                      </div>

                      {/* Dropzone Area */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(true);
                        }}
                        onDragLeave={() => setIsDraggingFile(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            setQuickUploadFile(e.dataTransfer.files[0]);
                          }
                        }}
                        className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer ${
                          isDraggingFile
                            ? 'border-blue-600 bg-blue-50/80 scale-[1.01]'
                            : quickUploadFile
                            ? 'border-emerald-400 bg-emerald-50/30'
                            : 'border-slate-300 bg-white/70 hover:bg-white hover:border-blue-400'
                        }`}
                        onClick={() => {
                          const input = document.getElementById('quick-file-input') as HTMLInputElement;
                          if (input) input.click();
                        }}
                      >
                        <input
                          id="quick-file-input"
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setQuickUploadFile(e.target.files[0]);
                            }
                          }}
                        />

                        {quickUploadFile ? (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
                            <div className="flex items-center gap-3 text-left">
                              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                                <FileCheck className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-gray-900 truncate max-w-[280px]">
                                    {quickUploadFile.name}
                                  </span>
                                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                    {formatFileSize(quickUploadFile.size)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-500">
                                  Ready to upload to Firebase Storage & link to course ID
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickUploadFile(null);
                              }}
                              className="px-2.5 py-1 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 text-xs font-bold rounded-lg transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="py-2 space-y-1">
                            <UploadCloud className="w-7 h-7 text-blue-500 mx-auto animate-bounce" />
                            <p className="text-xs font-bold text-gray-800">
                              Drag and drop lecture note PDF, quiz document, or worksheet here
                            </p>
                            <p className="text-[11px] text-gray-400">
                              or <span className="text-blue-600 underline font-bold">browse from computer</span> (Max recommended size: 50MB)
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Upload Progress Bar if active */}
                      {isQuickUploading && (
                        <div className="space-y-1.5 p-3 bg-white rounded-xl border border-blue-150">
                          <div className="flex justify-between text-xs font-bold text-blue-800">
                            <span className="flex items-center gap-1.5">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Uploading to Firebase Storage...
                            </span>
                            <span className="font-mono">{quickUploadProgress}%</span>
                          </div>
                          <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                              style={{ width: `${quickUploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Submit Action */}
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={isQuickUploading || (!quickUploadFile && !quickUploadTitle.trim())}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                        >
                          {isQuickUploading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Uploading to Cloud...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload & Link to Course</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Section 1: Assigned Classes Hub (Course-by-Course Access & Management) */}
                <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-4">
                    <div>
                      <h3 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        Assigned Courses & Associated Materials
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Directly manage and upload resources associated with each specific course syllabus.
                      </p>
                    </div>
                    <span className="text-xs font-mono text-gray-400">
                      {tutorClasses.length} Courses Assigned
                    </span>
                  </div>

                  {/* Grid of Assigned Classes with In-Card Resource Controls */}
                  {tutorClasses.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200 space-y-2">
                      <BookOpen className="w-8 h-8 text-gray-300 mx-auto" />
                      <p className="text-xs font-bold text-gray-700">No assigned courses programmed yet</p>
                      <p className="text-[11px] text-gray-400">Click 'Launch Tuition Class' at the top of your workspace to create your first course.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {tutorClasses.map((cls) => {
                        const classMaterials = tutorMaterials.filter(m => m.classId === cls.id);
                        const classBookings = rosterBookings.filter(b => b.classId === cls.id);
                        const notesCount = classMaterials.filter(m => m.type === 'note').length;
                        const quizzesCount = classMaterials.filter(m => m.type === 'quiz').length;
                        const linksCount = classMaterials.filter(m => m.type === 'link' || !m.type).length;
                        const filesCount = classMaterials.filter(m => m.type === 'file' || m.type === 'video').length;
                        const isExpanded = expandedClassResourceId === cls.id;
                        const isSelected = selectedResourceClassId === cls.id;

                        return (
                          <div
                            key={cls.id}
                            className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden ${
                              isSelected
                                ? 'border-blue-500 bg-white shadow-md ring-2 ring-blue-500/20'
                                : 'border-gray-200 bg-white hover:border-blue-200 shadow-2xs'
                            }`}
                          >
                            {/* Class Card Top Info */}
                            <div className="p-5 space-y-4">
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[9px] font-extrabold font-mono text-blue-700 bg-blue-100/60 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                                    {cls.subject}
                                  </span>
                                  <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md font-mono">
                                    {cls.dayOfWeek} • {cls.timeSlot}
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-mono">
                                  {classBookings.length}/{cls.maxSlots} Enrolled
                                </span>
                              </div>

                              <div>
                                <h3 className="text-base font-extrabold text-gray-900 leading-snug" title={cls.title}>
                                  {cls.title}
                                </h3>
                                {cls.description && (
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                                    {cls.description}
                                  </p>
                                )}
                              </div>

                              {/* Class Resource Counts Breakdown */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-gray-100">
                                <span className="text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
                                  {classMaterials.length} Items
                                </span>
                                <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {notesCount} Notes
                                </span>
                                <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 border border-amber-150 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <HelpCircle className="w-3 h-3" />
                                  {quizzesCount} Quizzes
                                </span>
                                <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <LinkIcon className="w-3 h-3" />
                                  {linksCount} Links
                                </span>
                                {filesCount > 0 && (
                                  <span className="text-[9px] font-extrabold text-purple-700 bg-purple-50 border border-purple-150 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <FileSpreadsheet className="w-3 h-3" />
                                    {filesCount} Files
                                  </span>
                                )}
                              </div>

                              {/* Direct Quick-Add Bar on Each Class Card */}
                              <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-150 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                                  Upload For Course:
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <button
                                    onClick={() => handleQuickAddResource(cls.id, 'note')}
                                    className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    title="Upload PDF Lecture Note for this course"
                                  >
                                    <FileUp className="w-3 h-3 text-indigo-600" />
                                    <span>+ PDF Note</span>
                                  </button>
                                  <button
                                    onClick={() => handleQuickAddResource(cls.id, 'quiz')}
                                    className="px-2.5 py-1 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    title="Upload Quiz Assessment for this course"
                                  >
                                    <HelpCircle className="w-3 h-3 text-amber-600" />
                                    <span>+ Quiz</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenAddResourceModal(cls.id, 'file', 'file')}
                                    className="px-2.5 py-1 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    title="Upload Worksheet / Document"
                                  >
                                    <FileSpreadsheet className="w-3 h-3 text-purple-600" />
                                    <span>+ File</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenAddResourceModal(cls.id, 'link', 'link')}
                                    className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    title="Attach Web Reference / URL"
                                  >
                                    <LinkIcon className="w-3 h-3 text-emerald-600" />
                                    <span>+ Link</span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Class Actions Bar */}
                            <div className="px-5 py-3 bg-gray-50/70 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setExpandedClassResourceId(isExpanded ? null : cls.id);
                                    if (!isExpanded) {
                                      setSelectedResourceClassId(cls.id);
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                    isExpanded
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                                  }`}
                                >
                                  <FolderOpen className="w-3.5 h-3.5" />
                                  <span>{isExpanded ? 'Hide Materials' : `Manage Materials (${classMaterials.length})`}</span>
                                </button>

                                <button
                                  onClick={() => setSelectedClassForProfile(cls)}
                                  className="p-1.5 bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                                  title="View Course Profile & Full Roster"
                                >
                                  <User className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedClassForScanner(cls);
                                    setShowClassScannerModal(true);
                                  }}
                                  className="px-2.5 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                                  title="Launch QR Attendance Scanner"
                                >
                                  <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>QR Check-in</span>
                                </button>
                              </div>
                            </div>

                            {/* Expanded In-Line Resource Manager Drawer */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="border-t-2 border-blue-500/30 bg-slate-50/50 p-5 space-y-4"
                                >
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                                      Attached Materials for '{cls.title}'
                                    </h4>
                                    <button
                                      onClick={() => handleOpenAddResourceModal(cls.id)}
                                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" /> Upload File to Course
                                    </button>
                                  </div>

                                  {classMaterials.length === 0 ? (
                                    <div className="p-6 bg-white rounded-xl border border-dashed border-gray-200 text-center space-y-2">
                                      <FileText className="w-6 h-6 text-gray-300 mx-auto" />
                                      <p className="text-xs font-bold text-gray-700">No resources attached to this course yet</p>
                                      <p className="text-[11px] text-gray-400">Use the quick upload buttons above to add notes, quiz links, or documents.</p>
                                      <div className="flex justify-center gap-2 pt-2">
                                        <button
                                          onClick={() => handleQuickAddResource(cls.id, 'note')}
                                          className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 cursor-pointer"
                                        >
                                          + Upload PDF Note
                                        </button>
                                        <button
                                          onClick={() => handleQuickAddResource(cls.id, 'quiz')}
                                          className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-100 cursor-pointer"
                                        >
                                          + Upload Quiz
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                                      {classMaterials.map(mat => {
                                        const resType = mat.type || 'link';
                                        const typeIcon = {
                                          note: FileText,
                                          quiz: HelpCircle,
                                          link: LinkIcon,
                                          file: FileSpreadsheet,
                                          video: Video,
                                          announcement: Megaphone
                                        }[resType] || LinkIcon;
                                        const IconC = typeIcon;
                                        const isVisible = mat.isVisible !== false;

                                        return (
                                          <div
                                            key={mat.id}
                                            className="p-3.5 bg-white border border-gray-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-blue-300 transition-all"
                                          >
                                            <div className="space-y-1 flex-1 min-w-0">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                                  resType === 'note' ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' :
                                                  resType === 'quiz' ? 'bg-amber-50 text-amber-700 border border-amber-150' :
                                                  resType === 'link' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' :
                                                  'bg-blue-50 text-blue-700 border border-blue-150'
                                                }`}>
                                                  <IconC className="w-3 h-3" />
                                                  <span className="capitalize">{resType}</span>
                                                </span>

                                                {mat.fileName && (
                                                  <span className="text-[9px] font-bold font-mono text-purple-700 bg-purple-50 border border-purple-150 px-2 py-0.5 rounded-md">
                                                    📁 {mat.fileName} {mat.fileSize ? `(${formatFileSize(mat.fileSize)})` : ''}
                                                  </span>
                                                )}

                                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                                                  isVisible ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                  {isVisible ? '● Visible' : '○ Draft'}
                                                </span>
                                              </div>

                                              <h5 className="text-xs font-bold text-gray-900 truncate" title={mat.title}>
                                                {mat.title}
                                              </h5>
                                              {mat.description && (
                                                <p className="text-[11px] text-gray-500 line-clamp-1">
                                                  {mat.description}
                                                </p>
                                              )}
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => binaryStore.openOrDownload(mat)}
                                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                                                title="Open or download resource file"
                                              >
                                                {mat.storagePath ? <Download className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                                                <span>{mat.storagePath ? 'Download' : 'Open'}</span>
                                              </button>

                                              <button
                                                onClick={() => {
                                                  navigator.clipboard.writeText(mat.referenceUrl);
                                                  showToast("Resource URL copied to clipboard!", "info");
                                                }}
                                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                                                title="Copy link"
                                              >
                                                <Share2 className="w-3.5 h-3.5" />
                                              </button>

                                              <button
                                                onClick={() => handleToggleResourceVisibility(mat)}
                                                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                                  isVisible 
                                                    ? 'text-emerald-600 hover:bg-emerald-50' 
                                                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                                }`}
                                                title={isVisible ? 'Hide from students (Draft)' : 'Make visible to students'}
                                              >
                                                <Eye className="w-3.5 h-3.5" />
                                              </button>

                                              <button
                                                onClick={() => handleEditResourceModal(mat)}
                                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                                                title="Edit resource details"
                                              >
                                                <Edit className="w-3.5 h-3.5" />
                                              </button>

                                              <button
                                                onClick={() => setDeleteResourceConfirm({ isOpen: true, id: mat.id, title: mat.title })}
                                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                                                title="Delete resource"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section 2: Global Course Resources Search & Filter Hub */}
                <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3">
                    <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-indigo-600" />
                      Course Resources Library & Categorized Explorer
                    </h3>
                    <span className="text-xs text-gray-400 font-mono">
                      Showing {tutorMaterials.length} total resources across all courses
                    </span>
                  </div>
                  
                  {/* Search & Filter Toolbar */}
                  <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-gray-50/80 p-4 rounded-2xl border border-gray-200">
                    
                    {/* Left: Search input & Class Selector */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                      {/* Search bar */}
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={resourceSearchQuery}
                          onChange={(e) => setResourceSearchQuery(e.target.value)}
                          placeholder="Search materials, notes, quizzes, links, files..."
                          className="w-full text-xs pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500 shadow-2xs"
                        />
                        {resourceSearchQuery && (
                          <button
                            onClick={() => setResourceSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Class Filter Dropdown */}
                      <div className="min-w-[190px]">
                        <select
                          value={selectedResourceClassId}
                          onChange={(e) => setSelectedResourceClassId(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none text-gray-800 font-bold focus:border-blue-500 shadow-2xs cursor-pointer"
                        >
                          <option value="all">📚 All Assigned Courses ({tutorMaterials.length})</option>
                          {tutorClasses.map(cls => (
                            <option key={cls.id} value={cls.id}>
                              {cls.title} ({tutorMaterials.filter(m => m.classId === cls.id).length})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Right: Resource Type Selector Pills */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none text-xs font-bold">
                      {[
                        { id: 'all', label: 'All', icon: Layers },
                        { id: 'note', label: 'Notes (PDF)', icon: FileText },
                        { id: 'quiz', label: 'Quizzes', icon: HelpCircle },
                        { id: 'file', label: 'Files / Docs', icon: FileSpreadsheet },
                        { id: 'link', label: 'Links', icon: LinkIcon },
                        { id: 'video', label: 'Videos', icon: Video },
                        { id: 'announcement', label: 'Notices', icon: Megaphone }
                      ].map(typeTab => {
                        const IconComponent = typeTab.icon;
                        const count = typeTab.id === 'all'
                          ? tutorMaterials.length
                          : tutorMaterials.filter(m => (m.type || 'link') === typeTab.id).length;
                        const isActive = selectedResourceType === typeTab.id;

                        return (
                          <button
                            key={typeTab.id}
                            onClick={() => setSelectedResourceType(typeTab.id as any)}
                            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                          >
                            <IconComponent className="w-3.5 h-3.5" />
                            <span>{typeTab.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Filtered Resource List Grid */}
                  {(() => {
                    let filtered = [...tutorMaterials];

                    if (selectedResourceClassId !== 'all') {
                      filtered = filtered.filter(m => m.classId === selectedResourceClassId);
                    }

                    if (selectedResourceType !== 'all') {
                      filtered = filtered.filter(m => (m.type || 'link') === selectedResourceType);
                    }

                    if (resourceSearchQuery.trim()) {
                      const q = resourceSearchQuery.toLowerCase();
                      filtered = filtered.filter(m =>
                        m.title.toLowerCase().includes(q) ||
                        (m.description || '').toLowerCase().includes(q) ||
                        (m.classTitle || '').toLowerCase().includes(q) ||
                        (m.subject || '').toLowerCase().includes(q) ||
                        (m.fileName || '').toLowerCase().includes(q)
                      );
                    }

                    if (filtered.length === 0) {
                      return (
                        <div className="py-12 px-4 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 space-y-3">
                          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mx-auto">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-800">No Course Resources Found</h4>
                            <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
                              {resourceSearchQuery || selectedResourceClassId !== 'all' || selectedResourceType !== 'all'
                                ? 'No items match your active filters. Try clearing active filters or searching for another topic.'
                                : 'You haven\'t uploaded any notes, quiz links, or references for your courses yet.'}
                            </p>
                          </div>
                          <div className="flex justify-center gap-2 pt-2">
                            {(resourceSearchQuery || selectedResourceClassId !== 'all' || selectedResourceType !== 'all') && (
                              <button
                                onClick={() => {
                                  setResourceSearchQuery('');
                                  setSelectedResourceClassId('all');
                                  setSelectedResourceType('all');
                                }}
                                className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-300 transition-colors cursor-pointer"
                              >
                                Clear Filters
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenAddResourceModal()}
                              className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Plus className="w-4 h-4" /> Upload Resource Now
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filtered.map((mat) => {
                          const resType = mat.type || 'link';
                          const isVisible = mat.isVisible !== false;
                          
                          const typeConfig = {
                            note: {
                              badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                              icon: FileText,
                              label: 'Lecture Note (PDF)'
                            },
                            quiz: {
                              badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
                              icon: HelpCircle,
                              label: 'Quiz / Exam'
                            },
                            link: {
                              badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                              icon: LinkIcon,
                              label: 'Reference Link'
                            },
                            file: {
                              badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
                              icon: FileSpreadsheet,
                              label: 'Document File'
                            },
                            video: {
                              badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
                              icon: Video,
                              label: 'Video Clip'
                            },
                            announcement: {
                              badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
                              icon: Megaphone,
                              label: 'Announcement'
                            }
                          }[resType] || {
                            badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
                            icon: LinkIcon,
                            label: 'Resource'
                          };

                          const IconComp = typeConfig.icon;

                          return (
                            <div
                              key={mat.id}
                              className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                            >
                              <div className="space-y-3">
                                {/* Header: Badge, Visibility & Date */}
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${typeConfig.badgeBg}`}>
                                      <IconComp className="w-3.5 h-3.5" />
                                      {typeConfig.label}
                                    </span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                      isVisible ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                      {isVisible ? 'Visible' : 'Draft'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    {new Date(mat.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </div>

                                {/* Title */}
                                <h3 className="text-sm font-extrabold text-gray-900 leading-snug line-clamp-2" title={mat.title}>
                                  {mat.title}
                                </h3>

                                {/* File Metadata Chip if uploaded */}
                                {mat.fileName && (
                                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <HardDrive className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                      <span className="text-[11px] font-bold text-slate-800 truncate" title={mat.fileName}>
                                        {mat.fileName}
                                      </span>
                                    </div>
                                    {mat.fileSize ? (
                                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                        {formatFileSize(mat.fileSize)}
                                      </span>
                                    ) : null}
                                  </div>
                                )}

                                {/* Course Badge */}
                                {mat.classTitle && (
                                  <div className="text-[11px] text-blue-800 font-bold bg-blue-50/80 border border-blue-150 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 max-w-full">
                                    <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <span className="truncate">{mat.classTitle}</span>
                                  </div>
                                )}

                                {/* Description */}
                                {mat.description && (
                                  <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                                    {mat.description}
                                  </p>
                                )}
                              </div>

                              {/* Card Footer Actions */}
                              <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => binaryStore.openOrDownload(mat)}
                                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                                >
                                  {mat.storagePath ? <Download className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                  <span>{mat.storagePath ? 'Download File' : 'Open Resource'}</span>
                                </button>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(mat.referenceUrl);
                                      showToast("Resource URL copied to clipboard!", "info");
                                    }}
                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                    title="Copy resource URL"
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => handleToggleResourceVisibility(mat)}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                      isVisible 
                                        ? 'text-emerald-600 hover:bg-emerald-50' 
                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                    }`}
                                    title={isVisible ? 'Hide from students (Draft)' : 'Make visible to students'}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => handleEditResourceModal(mat)}
                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                    title="Edit resource"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => setDeleteResourceConfirm({ isOpen: true, id: mat.id, title: mat.title })}
                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete resource"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                </div>
              </motion.div>
            )}

            {/* Tab 2.5: Attendance Section */}
            {activeSubTab === 'attendance' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <TutorAttendanceTracker
                  tutorClasses={tutorClasses}
                  bookings={bookings}
                  attendanceRecords={attendanceRecords}
                  onAttendanceUpdated={loadAttendanceRecords}
                  showToast={showToast}
                  executeWriteWithRetry={executeWriteWithRetry}
                  currentUser={currentUser}
                />
              </motion.div>
            )}

            {/* Tab 3: Message conversation chat view */}
            {activeSubTab === 'chat' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <ChatWidget currentUserId={currentUser.uid} currentUserRole="tutor" />
              </motion.div>
            )}

            {/* Tab 3.5: Tutor Profile Settings panel */}
            {activeSubTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                {/* Left Column: Visual Avatar Card & Quick Actions */}
                <div className="lg:col-span-4 bg-white border border-gray-150 rounded-2xl p-6 text-center space-y-5">
                  <div className="flex justify-between items-center border-b pb-3 border-gray-100">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">My Faculty Avatar</h3>
                    <button
                      type="button"
                      onClick={() => setShowSelfProfileModal(true)}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                      title="Preview how students and parents view your public profile card"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview Profile
                    </button>
                  </div>
                  
                  <div className="relative inline-block group">
                    {currentUser.photoURL || profPhoto ? (
                      <img
                        referrerPolicy="no-referrer"
                        src={currentUser.photoURL || profPhoto}
                        alt="Profile preview"
                        className="w-28 h-28 rounded-full object-cover mx-auto border-4 border-indigo-500/20 shadow-md ring-2 ring-indigo-500/10"
                      />
                    ) : (
                      <div className="w-28 h-28 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-4xl font-extrabold mx-auto border-2 border-indigo-200 shadow-sm">
                        {profName ? profName.charAt(0).toUpperCase() : "?"}
                      </div>
                    )}
                    {currentUser.pendingPhotoURL && (
                      <span 
                        className="absolute bottom-0 right-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white shadow-md flex items-center gap-1"
                        title="Proposed photo awaiting admin verification"
                      >
                        ⏳ Pending
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-extrabold text-gray-900">{profName || "My Profile"}</h4>
                    <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">{profQualification || "Academic Tutor"}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{currentUser.email}</p>
                  </div>

                  {/* Proposed Pending Photo Notification Box */}
                  {currentUser.pendingPhotoURL && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={currentUser.pendingPhotoURL} 
                          alt="Proposed avatar" 
                          className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 shadow-xs flex-shrink-0" 
                        />
                        <div>
                          <span className="font-extrabold text-[11px] block text-amber-950">📸 Proposed Avatar In Review</span>
                          <span className="text-[10px] text-amber-700 leading-tight block">
                            Your proposed photo is stored in private pending queue awaiting admin verification before becoming public.
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={async () => {
                            await firestoreService.updateUserProfile(currentUser.uid, { pendingPhotoURL: '' });
                            if (refreshUserProfile) await refreshUserProfile();
                            showToast("Proposed avatar submission withdrawn.", "info");
                          }}
                          className="text-[10px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                        >
                          Cancel Submission
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Photo Upload & Live Camera Controls */}
                  <div className="border border-dashed border-gray-200 hover:border-indigo-400 bg-slate-50/60 rounded-xl p-3 text-center transition-all space-y-2.5">
                    <div className="flex justify-center">
                      <Camera className="w-5 h-5 text-indigo-600" />
                    </div>
                    <p className="text-[11px] font-bold text-gray-700">Update Profile Picture (Camera / Gallery)</p>
                    <p className="text-[10px] text-gray-400">Takes or uploads directly to Firebase Storage</p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <button
                        type="button"
                        onClick={() => setShowCameraModal(true)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" /> Camera & Gallery
                      </button>
                      <label className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs flex items-center justify-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-indigo-600" /> Quick File
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/webp"
                          onChange={handlePhotoFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Avatar Presets */}
                  <div className="border-t border-gray-100 pt-4 text-left">
                    <label className="block text-xs font-bold text-gray-700 mb-2">Or Choose Professional Avatar Preset:</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200", label: "Option 1" },
                        { url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200", label: "Option 2" },
                        { url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200", label: "Option 3" },
                        { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200", label: "Option 4" }
                      ].map((avatar, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setProfPhoto(avatar.url)}
                          className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-square cursor-pointer ${profPhoto === avatar.url ? 'border-indigo-600 scale-105 shadow' : 'border-transparent opacity-80 hover:opacity-100'}`}
                        >
                          <img referrerPolicy="no-referrer" src={avatar.url} alt={avatar.label} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Main Profile Form */}
                <div className="lg:col-span-8 bg-white border border-gray-150 rounded-2xl p-6 font-sans space-y-6">
                  <div className="flex justify-between items-center border-b pb-4 border-gray-100">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <User className="w-5 h-5 text-indigo-600" />
                      Faculty Profile & Availability Manager
                    </h3>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-bold">
                      ● Active Public Faculty
                    </span>
                  </div>
                  
                  <form onSubmit={handleUpdateProfile} className="space-y-6 text-xs">
                    {/* Basic Info Section */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-500" /> 1. Professional Credentials & Info
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">
                            Profile Display Name:
                          </label>
                          <SyncBadge status={getFieldStatus('profName')} message={getFieldMessage('profName')} position="inside">
                            <input
                              required
                              type="text"
                              value={profName}
                              onChange={(e) => setProfName(e.target.value)}
                              className="w-full text-xs pl-3 pr-32 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-indigo-600"
                            />
                          </SyncBadge>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">
                            Photo URL (Optional Link Override):
                          </label>
                          <SyncBadge status={getFieldStatus('profPhoto')} message={getFieldMessage('profPhoto')} position="inside">
                            <input
                              type="text"
                              value={profPhoto}
                              onChange={(e) => setProfPhoto(e.target.value)}
                              placeholder="https://images.unsplash.com/photo-..."
                              className="w-full text-xs pl-3 pr-32 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-indigo-600 font-mono"
                            />
                          </SyncBadge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">
                            Highest Qualification Credentials:
                          </label>
                          <SyncBadge status={getFieldStatus('profQualification')} message={getFieldMessage('profQualification')} position="inside">
                            <input
                              required
                              type="text"
                              value={profQualification}
                              onChange={(e) => setProfQualification(e.target.value)}
                              placeholder="e.g. B.Sc. (Hons) Special in Physics, University of Colombo"
                              className="w-full text-xs pl-3 pr-32 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-indigo-600"
                            />
                          </SyncBadge>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">
                            Experience (Years):
                          </label>
                          <SyncBadge status={getFieldStatus('profExperience')} message={getFieldMessage('profExperience')} position="inside">
                            <input
                              required
                              type="number"
                              value={profExperience}
                              onChange={(e) => setProfExperience(e.target.value)}
                              className="w-full text-xs pl-3 pr-32 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-indigo-600 font-mono"
                            />
                          </SyncBadge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">
                            Hourly Rate (LKR / Hr):
                          </label>
                          <SyncBadge status={getFieldStatus('profHourlyRate')} message={getFieldMessage('profHourlyRate')} position="inside">
                            <input
                              required
                              type="number"
                              value={profHourlyRate}
                              onChange={(e) => setProfHourlyRate(e.target.value)}
                              className="w-full text-xs pl-3 pr-32 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-indigo-600 font-mono"
                            />
                          </SyncBadge>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">
                            Instructed Subject Tracks (comma-separated):
                          </label>
                          <SyncBadge status={getFieldStatus('profSubjects')} message={getFieldMessage('profSubjects')} position="inside">
                            <input
                              required
                              type="text"
                              value={profSubjects}
                              onChange={(e) => setProfSubjects(e.target.value)}
                              placeholder="e.g. Physics, Combined Mathematics, Chemistry"
                              className="w-full text-xs pl-3 pr-32 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-indigo-600"
                            />
                          </SyncBadge>
                          {availableSubjectOptions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                              <span className="text-[10px] text-gray-400 font-medium">Quick add:</span>
                              {availableSubjectOptions.slice(0, 10).map((subj) => {
                                const currentList = profSubjects.split(',').map(s => s.trim()).filter(Boolean);
                                const isSelected = currentList.some(s => s.toLowerCase() === subj.toLowerCase());
                                return (
                                  <button
                                    key={subj}
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        setProfSubjects(currentList.filter(s => s.toLowerCase() !== subj.toLowerCase()).join(', '));
                                      } else {
                                        setProfSubjects([...currentList, subj].join(', '));
                                      }
                                    }}
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                    }`}
                                  >
                                    {isSelected ? `✓ ${subj}` : `+ ${subj}`}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Areas of Expertise / Specializations Section */}
                    <div className="space-y-3 pt-3 border-t border-gray-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-indigo-500" /> 2. Areas of Expertise & Specializations
                      </h4>

                      <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-3">
                        <p className="text-[11px] text-gray-500 leading-normal">
                          Highlight specific curriculum domains, exam preparation methods, or advanced topic masteries to attract students.
                        </p>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newExpertiseInput}
                            onChange={(e) => setNewExpertiseInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddExpertiseArea();
                              }
                            }}
                            placeholder="Add expertise tag e.g. 'A/L Past Paper Revision', 'Quantum Mechanics'..."
                            className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-indigo-600 bg-white"
                          />
                          <button
                            type="button"
                            onClick={handleAddExpertiseArea}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Tag
                          </button>
                        </div>

                        {/* Display Active Tags */}
                        {profExpertiseAreas.length > 0 ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {profExpertiseAreas.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg text-xs font-bold"
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExpertiseArea(tag)}
                                  className="text-indigo-400 hover:text-red-600 cursor-pointer p-0.5 rounded"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-400 italic">No custom expertise tags added yet.</p>
                        )}

                        {/* Quick Suggestions */}
                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="text-[10px] text-gray-400 font-bold block mb-1">Recommended Expertise Tags:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {["Organic Chemistry", "Advanced Calculus", "A/L Past Papers", "Physics Practicals", "Exam Techniques", "O/L Mathematics", "University Prep", "Thermodynamics"].map((rec) => {
                              const isAdded = profExpertiseAreas.includes(rec);
                              return (
                                <button
                                  key={rec}
                                  type="button"
                                  onClick={() => {
                                    if (isAdded) {
                                      handleRemoveExpertiseArea(rec);
                                    } else {
                                      setProfExpertiseAreas([...profExpertiseAreas, rec]);
                                    }
                                  }}
                                  className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border transition-all cursor-pointer ${
                                    isAdded ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {isAdded ? `✓ ${rec}` : `+ ${rec}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Biography Section */}
                    <div className="space-y-2 pt-3 border-t border-gray-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-500" /> 3. Teaching Philosophy & Biography
                      </h4>

                      <SyncBadge status={getFieldStatus('profBio')} message={getFieldMessage('profBio')} position="top-right">
                        <textarea
                          required
                          rows={4}
                          value={profBio}
                          onChange={(e) => setProfBio(e.target.value)}
                          placeholder="Share your teaching style, professional curriculum history, and academic results track-record..."
                          className="w-full text-xs rounded-xl p-3 border border-gray-200 outline-none focus:border-indigo-600 leading-relaxed bg-gray-50/30"
                        ></textarea>
                      </SyncBadge>
                    </div>

                    {/* Working Hours & Availability Section */}
                    <div className="space-y-4 pt-3 border-t border-gray-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" /> 4. Working Hours & Days Off Schedule
                      </h4>

                      {/* Weekly Working Hours Table */}
                      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                        <div className="bg-slate-50 px-4 py-2.5 border-b border-gray-200 flex justify-between items-center">
                          <span className="text-xs font-extrabold text-slate-800">Weekly Teaching Hours</span>
                          <span className="text-[10px] text-gray-400 font-mono">Configures student booking availability</span>
                        </div>

                        <div className="divide-y divide-gray-100">
                          {profWorkingHours.map((wh, index) => (
                            <div key={wh.day} className="p-3 flex items-center justify-between hover:bg-slate-50/60 transition-colors gap-3">
                              <div className="flex items-center gap-3 w-32 shrink-0">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={wh.enabled}
                                    onChange={(e) => {
                                      const updated = [...profWorkingHours];
                                      updated[index].enabled = e.target.checked;
                                      setProfWorkingHours(updated);
                                    }}
                                    className="sr-only peer"
                                  />
                                  <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                                <span className={`text-xs font-bold ${wh.enabled ? 'text-slate-900' : 'text-gray-400 line-through'}`}>
                                  {wh.day}
                                </span>
                              </div>

                              {wh.enabled ? (
                                <div className="flex items-center gap-2 text-xs">
                                  <input
                                    type="text"
                                    value={wh.startTime}
                                    onChange={(e) => {
                                      const updated = [...profWorkingHours];
                                      updated[index].startTime = e.target.value;
                                      setProfWorkingHours(updated);
                                    }}
                                    className="w-24 px-2 py-1 border border-gray-200 rounded-lg text-center font-mono outline-none focus:border-indigo-600"
                                    placeholder="08:00 AM"
                                  />
                                  <span className="text-gray-400 font-mono">to</span>
                                  <input
                                    type="text"
                                    value={wh.endTime}
                                    onChange={(e) => {
                                      const updated = [...profWorkingHours];
                                      updated[index].endTime = e.target.value;
                                      setProfWorkingHours(updated);
                                    }}
                                    className="w-24 px-2 py-1 border border-gray-200 rounded-lg text-center font-mono outline-none focus:border-indigo-600"
                                    placeholder="05:00 PM"
                                  />
                                </div>
                              ) : (
                                <span className="text-[11px] text-red-500 font-bold bg-red-50 px-2.5 py-0.5 rounded-full">
                                  Off Day
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Days Off & Vacation Schedule */}
                      <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-3">
                        <span className="text-xs font-extrabold text-slate-800 block">Declared Days Off & Holidays:</span>
                        
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newDayOffInput}
                            onChange={(e) => setNewDayOffInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddDayOff();
                              }
                            }}
                            placeholder="Add off-day e.g. 'Sundays', 'Poya Holidays', '15 Oct 2026'..."
                            className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-indigo-600 bg-white"
                          />
                          <button
                            type="button"
                            onClick={handleAddDayOff}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Off Day
                          </button>
                        </div>

                        {profDaysOff.length > 0 ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {profDaysOff.map((offDay) => (
                              <span
                                key={offDay}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold"
                              >
                                🌴 {offDay}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDayOff(offDay)}
                                  className="text-red-400 hover:text-red-800 cursor-pointer p-0.5 rounded"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-400 italic">No specific days off or holidays listed.</p>
                        )}
                      </div>
                    </div>

                    {/* Form Footer */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-gray-100 font-sans">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <SyncStatusIndicator operationPatterns={['profile']} />
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setShowSelfProfileModal(true)}
                          className="w-1/2 sm:w-auto px-4 py-2.5 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Preview Public View
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-1/2 sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {loading ? 'Saving Changes...' : 'Save Profile Details'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Tab: Faculty Alert Center & Notifications */}
            {activeSubTab === 'alerts' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                {/* Left Column: Notifications Ledger */}
                <div className="lg:col-span-8 bg-white border border-gray-150 rounded-2xl p-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4 border-gray-100 mb-4">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-indigo-600" />
                        <span>Faculty Alert Center & Notifications</span>
                        {notifications.filter(n => !n.isRead).length > 0 && (
                          <span className="px-2.5 py-0.5 text-xs bg-red-500 text-white font-bold rounded-full">
                            {notifications.filter(n => !n.isRead).length} Unread
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Real-time notifications for course registrations, student messages, and system notices.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {notifications.filter(n => !n.isRead).length > 0 && (
                        <button
                          onClick={async () => {
                            await executeWriteWithRetry(
                              "Mark All Notifications Read",
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
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5" /> Read All
                        </button>
                      )}
                      <button
                        onClick={() => refreshNotifications()}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-2 mb-4 p-1.5 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold">
                    <button
                      onClick={() => setNotifFilter('all')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${notifFilter === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'}`}
                    >
                      All ({notifications.length})
                    </button>
                    <button
                      onClick={() => setNotifFilter('unread')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${notifFilter === 'unread' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'}`}
                    >
                      Unread ({notifications.filter(n => !n.isRead).length})
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
                      Reminders
                    </button>
                  </div>

                  {/* Notification items list */}
                  <div className="space-y-3">
                    {(() => {
                      const filtered = notifications.filter(n => {
                        if (notifFilter === 'unread') return !n.isRead;
                        if (notifFilter === 'announcements') return n.type === 'announcement';
                        if (notifFilter === 'reminders') return n.type === 'reminder';
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="p-12 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center gap-2">
                            <Bell className="w-8 h-8 text-slate-300" />
                            <p className="font-semibold text-slate-600">No alerts logged</p>
                            <p className="text-[11px] text-slate-400">
                              {notifFilter === 'unread' ? 'You are all caught up! No unread notifications.' : 'When course updates, student messages, or system alerts occur, they will appear here.'}
                            </p>
                          </div>
                        );
                      }

                      return filtered.map((not) => (
                        <div
                          key={not.id}
                          className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-all ${
                            !not.isRead ? 'bg-indigo-50/30 border-indigo-100 shadow-2xs' : 'bg-white border-slate-150'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-slate-100 rounded-xl shrink-0 mt-0.5">
                              {not.type === 'payment' && <CreditCard className="w-4 h-4 text-emerald-600" />}
                              {not.type === 'message' && <Mail className="w-4 h-4 text-blue-600" />}
                              {not.type === 'announcement' && <Shield className="w-4 h-4 text-purple-600" />}
                              {not.type === 'reminder' && <Bell className="w-4 h-4 text-amber-600" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">{not.title}</span>
                                {!not.isRead && (
                                  <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
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
                                  `Mark Notification Read: '${not.title}'`,
                                  async () => {
                                    await firestoreService.markNotificationRead(not.id);
                                    await refreshNotifications();
                                  }
                                );
                              }}
                              className="px-2.5 py-1 hover:bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-200 flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Read
                            </button>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Right Column: Quick Broadcast & Preferences */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Broadcast Announcement to Enrolled Students */}
                  <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl border border-indigo-800 shadow-sm">
                    <h4 className="text-sm font-bold flex items-center gap-2 pb-3 border-b border-indigo-700/60">
                      <Megaphone className="w-4 h-4 text-indigo-400 animate-pulse" />
                      Broadcast Class Announcement
                    </h4>
                    <p className="text-xs text-indigo-200 mt-2 mb-4 leading-relaxed">
                      Send an instant notification alert to students regarding schedule adjustments or exam study prep.
                    </p>

                    <form onSubmit={handleTutorBroadcastNotice} className="space-y-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-indigo-200 mb-1">Announcement Title</label>
                        <input
                          type="text"
                          required
                          value={tutorNoticeTitle}
                          onChange={(e) => setTutorNoticeTitle(e.target.value)}
                          placeholder="e.g. Physics Revision Class Time Shift"
                          className="w-full px-3 py-2 bg-indigo-950/80 border border-indigo-700 text-white rounded-xl outline-none text-xs placeholder:text-indigo-400 focus:border-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-indigo-200 mb-1">Message Body</label>
                        <textarea
                          required
                          rows={3}
                          value={tutorNoticeMsg}
                          onChange={(e) => setTutorNoticeMsg(e.target.value)}
                          placeholder="e.g. Tomorrow's live session starts at 5:00 PM. Please bring worksheet #4."
                          className="w-full px-3 py-2 bg-indigo-950/80 border border-indigo-700 text-white rounded-xl outline-none text-xs placeholder:text-indigo-400 focus:border-indigo-400"
                        ></textarea>
                      </div>
                      <button
                        type="submit"
                        disabled={sendingTutorNotice || !tutorNoticeTitle.trim() || !tutorNoticeMsg.trim()}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                      >
                        {sendingTutorNotice ? 'Sending...' : 'Publish Announcement'} <Megaphone className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>

                  {/* Sync Preferences status */}
                  <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between border-b pb-3 border-slate-100">
                      <span>Alert Preferences</span>
                      <SyncStatusIndicator operationPatterns={['notification', 'settings']} />
                    </h4>
                    <div className="mt-3 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Class Registrations</span>
                        <input
                          type="checkbox"
                          checked={notificationSettings.reminders}
                          onChange={(e) => updateNotificationSettings({ reminders: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Tuition Payment Approvals</span>
                        <input
                          type="checkbox"
                          checked={notificationSettings.payments}
                          onChange={(e) => updateNotificationSettings({ payments: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Student Direct Messages</span>
                        <input
                          type="checkbox"
                          checked={notificationSettings.messages}
                          onChange={(e) => updateNotificationSettings({ messages: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab 4: Alert Preferences settings panel */}
            {activeSubTab === 'settings' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <UserNotificationSettingsPanel
                  currentUser={currentUser}
                  onProfileUpdated={async (updated) => {
                    if (refreshUserProfile) {
                      await refreshUserProfile();
                    }
                  }}
                  showToast={showToast}
                />
              </motion.div>
            )}

          </div>
        )}

      </div>

      {/* Launcher Class Create Modal overlay */}
      {showAddClass && (
        <div className="fixed inset-0 z-55 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-blue-50 shadow-2xl relative">
            <button 
              onClick={() => setShowAddClass(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 text-blue-900 border-b pb-3 border-gray-50">
              <Plus className="w-5.5 h-5.5 text-blue-600 font-bold" />
              <h3 className="text-base font-bold">{classFormMode === 'edit' ? "Edit Tuition Class Curriculum" : "Launch New Tuition Class Subject"}</h3>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Class Course Title:</label>
                  <input
                    required
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Linear Curves & Algebra AB Prep"
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <SubjectSelector
                    value={newSubject}
                    onChange={setNewSubject}
                    label="Category Subject Track"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Weekly Session Day:</label>
                  <select
                    value={newDay}
                    onChange={(e) => setNewDay(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 bg-white rounded-xl outline-none focus:border-blue-500"
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
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Starting Time Hour (Slot):</label>
                  <input
                    required
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="e.g. 10:00 AM"
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Course fees billing ($ / Mo):</label>
                  <input
                    required
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="80"
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Seats Limit Slots count:</label>
                  <input
                    required
                    type="number"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    placeholder="15"
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1.5 flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5 text-amber-600" /> Grace Window:
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    max={60}
                    value={newGracePeriod}
                    onChange={(e) => setNewGracePeriod(e.target.value)}
                    placeholder="5"
                    className="w-full text-xs px-3 py-2 border border-amber-300 bg-amber-50/50 rounded-xl outline-none focus:border-amber-500 font-mono font-bold"
                    title="Grace period in minutes after scheduled start before marking Late Arrival"
                  />
                  <p className="text-[9px] text-amber-700 mt-0.5 font-sans">mins after start</p>
                </div>
              </div>

              {/* Custom Topic-Specific Banner Image Field */}
              <div className="border border-slate-100 p-4 rounded-xl bg-slate-50/50 space-y-3 font-sans">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-800">Class Banner Header Cover Image:</label>
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
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="Enter banner URL pattern or tap 'Generate with AI'..."
                      className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-250 focus:border-indigo-550 outline-none font-mono"
                    />
                    <p className="text-[10px] text-gray-500 mt-1 lines-clamp-1">
                      Professional 16:9 topic photography creates 4x higher student click and enrollment indexes.
                    </p>
                  </div>
                  {newImageUrl && (
                    <div className="h-14 w-24 rounded-lg bg-slate-200 border border-slate-300 relative overflow-hidden flex-shrink-0">
                      <img 
                        referrerPolicy="no-referrer"
                        src={newImageUrl} 
                        alt="Class Banner Preview" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setNewImageUrl('')}
                        className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-600 text-white rounded p-0.5 text-[9px]"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Syllabus Overview Description:</label>
                <textarea
                  required
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Summarize course goals, preparation materials required, and recommended grade level indexes..."
                  className="w-full text-xs rounded-xl p-3 border border-gray-200 outline-none focus:border-blue-500 leading-relaxed bg-gray-50/30"
                ></textarea>
              </div>

              <div className="flex gap-2 text-[10px] text-gray-400 bg-blue-50/35 p-3 rounded-xl border border-blue-50/50 leading-normal mb-2">
                <BookmarkPlus className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <span>
                  Launching a course locks schedules into students directory search and alerts students dashboard in live sync.
                </span>
              </div>

              <div className="flex flex-col gap-3 pt-2 font-sans">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] text-slate-400 font-mono">Database Sync Status:</span>
                  <SyncStatusIndicator operationPatterns={['course', 'syllabus', 'curriculum', 'class']} />
                </div>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAddClass(false)}
                    className="w-1/2 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                  >
                    Go Back
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl text-center shadow-md cursor-pointer"
                  >
                    {classFormMode === 'edit' ? "Save Curriculum" : "Deploy Syllabus"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Course Curriculum"
        message={
          <>
            Are you sure you want to permanently delete <span className="font-extrabold text-slate-900">"{deleteConfirm.classTitle}"</span> from your curriculum? All current registrations and slots will be permanently affected.
          </>
        }
        confirmText="Yes, Delete Course"
        cancelText="Keep Course"
        isLoading={loading}
        onConfirm={executeClassDeletion}
        onClose={() => setDeleteConfirm({ isOpen: false, classId: '', classTitle: '' })}
        confirmBtnId="tutor_confirm_delete_class_btn"
        cancelBtnId="tutor_cancel_delete_class_btn"
      />

      {/* Modal for Adding or Editing Course Resource */}
      {showResourceModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 border border-slate-100 shadow-2xl relative animate-fade-in font-sans space-y-5">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">
                    {editingResource ? 'Edit Course Resource' : 'Publish Course Resource to Storage'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Upload lecture notes, quiz sheets, files, or reference links linked to an assigned course ID.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowResourceModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResource} className="space-y-4">
              {/* Mode Switcher: Upload File vs Web Link */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setResUploadMode('file')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    resUploadMode === 'file'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload File to Storage</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResUploadMode('link')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    resUploadMode === 'link'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  <span>External Web Link / URL</span>
                </button>
              </div>

              {/* Target Course Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Target Assigned Course:</label>
                <select
                  value={resClassId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setResClassId(selectedId);
                    const selectedClass = tutorClasses.find(c => c.id === selectedId);
                    if (selectedClass) {
                      setResSubject(selectedClass.subject);
                    }
                  }}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-bold cursor-pointer"
                  required
                >
                  <option value="">-- Select Assigned Course --</option>
                  {tutorClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.subject} • {c.dayOfWeek} {c.timeSlot})
                    </option>
                  ))}
                </select>
              </div>

              {/* Resource Type Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Resource Category:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'note', label: 'Lecture Note', icon: FileText, desc: 'PDF, Slide, Notes' },
                    { id: 'quiz', label: 'Quiz / Exam', icon: HelpCircle, desc: 'Assessment / Sheet' },
                    { id: 'file', label: 'Document File', icon: FileSpreadsheet, desc: 'Worksheet, Exercise' },
                    { id: 'link', label: 'Reference Link', icon: LinkIcon, desc: 'Web Portal, Drive' },
                    { id: 'video', label: 'Video Session', icon: Video, desc: 'Recording, Zoom' },
                    { id: 'announcement', label: 'Course Notice', icon: Megaphone, desc: 'Class update' },
                  ].map(t => {
                    const IconC = t.icon;
                    const isSelected = resType === t.id;
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setResType(t.id as ResourceType)}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-1 ring-blue-500'
                            : 'border-gray-200 bg-gray-50/50 text-gray-700 hover:bg-gray-100/60'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <IconC className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span className="truncate">{t.label}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 truncate">{t.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* File Upload Mode Controls */}
              {resUploadMode === 'file' && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700">Choose Resource File (PDF, DOCX, PPTX, MP4, ZIP):</label>
                  
                  <div
                    onClick={() => {
                      const input = document.getElementById('modal-file-input') as HTMLInputElement;
                      if (input) input.click();
                    }}
                    className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
                      resFile
                        ? 'border-emerald-400 bg-emerald-50/30'
                        : 'border-slate-300 bg-slate-50/50 hover:bg-blue-50/20 hover:border-blue-400'
                    }`}
                  >
                    <input
                      id="modal-file-input"
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setResFile(file);
                          if (!resTitle.trim()) {
                            setResTitle(file.name.replace(/\.[^/.]+$/, ""));
                          }
                        }
                      }}
                    />

                    {resFile ? (
                      <div className="flex items-center justify-between gap-3 text-left">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                            <FileCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900 truncate max-w-xs">{resFile.name}</p>
                            <span className="text-[10px] font-mono text-emerald-700 font-bold">
                              Size: {formatFileSize(resFile.size)} • Type: {resFile.type || 'Document'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setResFile(null);
                          }}
                          className="px-2.5 py-1 text-xs font-bold bg-white text-gray-600 hover:text-red-600 rounded-lg border border-gray-200"
                        >
                          Change
                        </button>
                      </div>
                    ) : editingResource?.fileName ? (
                      <div className="flex items-center justify-between gap-3 text-left">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                            <HardDrive className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900 truncate max-w-xs">Current: {editingResource.fileName}</p>
                            <span className="text-[10px] font-mono text-blue-700 font-bold">
                              {editingResource.fileSize ? formatFileSize(editingResource.fileSize) : 'Stored in cloud'} • Click to replace file
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-blue-600 font-bold underline">Replace</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <UploadCloud className="w-8 h-8 text-blue-500 mx-auto" />
                        <p className="text-xs font-bold text-gray-800">
                          Click to select a file from your computer
                        </p>
                        <p className="text-[10px] text-gray-400">
                          File will be safely saved in Firebase Cloud Storage and shared with students.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Resource Title & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Resource Title:</label>
                  <input
                    type="text"
                    required
                    value={resTitle}
                    onChange={(e) => setResTitle(e.target.value)}
                    placeholder={
                      resType === 'quiz' ? 'e.g., Weekly Calculus Assessment #4' :
                      resType === 'note' ? 'e.g., Module 2 Lecture Slides & Formulas' :
                      'e.g., Chemistry Periodic Table Worksheet'
                    }
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Subject Track:</label>
                  <input
                    type="text"
                    value={resSubject}
                    onChange={(e) => setResSubject(e.target.value)}
                    placeholder="e.g. Mathematics"
                    className="w-full text-xs px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 text-gray-700 font-bold"
                  />
                </div>
              </div>

              {/* Web Link Input if in Link Mode */}
              {resUploadMode === 'link' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-700">Access URL / Resource Link:</label>
                    {resUrl.trim() && (
                      <a
                        href={resUrl.trim().startsWith('http') ? resUrl.trim() : `https://${resUrl.trim()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Test Link
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    required={resUploadMode === 'link'}
                    value={resUrl}
                    onChange={(e) => setResUrl(e.target.value)}
                    placeholder={
                      resType === 'quiz' ? 'e.g., https://forms.gle/... or https://quizizz.com/...' :
                      resType === 'note' ? 'e.g., https://drive.google.com/file/d/...' :
                      'e.g., https://khanacademy.org/...'
                    }
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-mono text-gray-800"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Provide Google Drive, Google Forms, Dropbox, Quizlet, YouTube, or external LMS link.
                  </p>
                </div>
              )}

              {/* Description / Instructions */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Instructions / Description (Optional):</label>
                <textarea
                  rows={2}
                  value={resDescription}
                  onChange={(e) => setResDescription(e.target.value)}
                  placeholder={
                    resType === 'quiz' ? 'Please complete this 20-minute timed quiz before Friday class...' :
                    resType === 'note' ? 'Read chapters 4 & 5 before Tuesday\'s lecture...' :
                    'Supplementary materials and practice problems...'
                  }
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                ></textarea>
              </div>

              {/* Upload Progress Bar if Saving File */}
              {savingResource && resUploadMode === 'file' && resFile && (
                <div className="space-y-1.5 p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex justify-between text-xs font-bold text-blue-800">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Uploading file to Firebase Storage...
                    </span>
                    <span className="font-mono">{resUploadProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                      style={{ width: `${resUploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Visibility Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <span className="text-xs font-bold text-gray-800 block">Immediate Student Visibility</span>
                  <span className="text-[11px] text-gray-500">
                    {resIsVisible ? 'Students enrolled in this course can view and download this immediately.' : 'Hidden as draft until you publish.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setResIsVisible(!resIsVisible)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    resIsVisible ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      resIsVisible ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowResourceModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingResource}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  {savingResource ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Storage...</span>
                    </>
                  ) : editingResource ? (
                    'Update Resource'
                  ) : (
                    'Publish Resource'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resource Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteResourceConfirm.isOpen}
        title="Delete Resource"
        message={
          <>
            Are you sure you want to delete <span className="font-extrabold text-slate-900">"{deleteResourceConfirm.title}"</span>? Enrolled students will no longer be able to access this item.
          </>
        }
        confirmText="Delete Resource"
        cancelText="Keep Item"
        onConfirm={executeResourceDeletion}
        onClose={() => setDeleteResourceConfirm({ isOpen: false, id: '', title: '' })}
        confirmBtnId="tutor_confirm_delete_resource_btn"
        cancelBtnId="tutor_cancel_delete_resource_btn"
      />

      {/* Class Profile Modal */}
      <ClassProfileModal
        isOpen={!!selectedClassForProfile}
        onClose={() => setSelectedClassForProfile(null)}
        classItem={selectedClassForProfile}
        currentUser={currentUser}
        bookings={bookings}
        allUsers={allStudents}
        payments={[]}
        attendanceRecords={attendanceRecords}
        onOpenScanner={(cls) => {
          setSelectedClassForScanner(cls);
          setShowClassScannerModal(true);
        }}
        onUpdateData={() => {
          refreshClasses();
          refreshBookings();
        }}
        showToast={showToast}
      />

      {/* Class Attendance QR Scanner Modal */}
      <ClassAttendanceQRScannerModal
        isOpen={showClassScannerModal || showQrModal}
        onClose={() => {
          setShowClassScannerModal(false);
          setShowQrModal(false);
          setSelectedClassForScanner(null);
        }}
        currentUser={currentUser}
        initialClass={selectedClassForScanner}
        tutorClasses={tutorClasses}
        bookings={rosterBookings.length > 0 ? rosterBookings : bookings}
        allUsers={allStudents}
        attendanceRecords={attendanceRecords}
        onAttendanceMarked={() => {
          loadAttendanceRecords();
          refreshBookings();
        }}
        showToast={showToast}
      />

      {/* Self Public Profile Preview Modal */}
      {currentUser && (
        <TutorProfileModal
          tutor={currentUser}
          isOpen={showSelfProfileModal}
          onClose={() => setShowSelfProfileModal(false)}
          reviews={[]}
        />
      )}

      {/* Camera and Gallery Profile Capture Modal */}
      <CameraProfileCapture
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
      />

      {/* Student Profile & Attendance History Inspector Modal */}
      {selectedStudentForProfile && (
        <StudentProfileModal
          isOpen={!!selectedStudentForProfile}
          onClose={() => setSelectedStudentForProfile(null)}
          student={selectedStudentForProfile}
          currentUser={currentUser}
          classes={tutorClasses}
          attendanceRecords={attendanceRecords}
          bookings={rosterBookings.length > 0 ? rosterBookings : bookings}
          showToast={showToast}
        />
      )}

      {/* Tutor Digital ID Card Modal */}
      {currentUser && (
        <DigitalStudentIDCardModal
          isOpen={showIdCardModal}
          onClose={() => setShowIdCardModal(false)}
          currentUser={currentUser}
          enrolledClasses={tutorClasses}
          bookings={[]}
          showToast={showToast}
          onOpenPhotoUpload={() => setShowCameraModal(true)}
        />
      )}
    </motion.div>
  );
};
