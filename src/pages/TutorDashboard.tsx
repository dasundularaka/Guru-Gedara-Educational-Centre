import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { SyncStatusIndicator } from '../components/SyncTelemetryConsole';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { SyncBadge } from '../components/SyncBadge';
import { firestoreService } from '../lib/firestoreService';
import { ClassItem, Booking, UserProfile, SubjectItem, PathwayItem, StudyMaterial, ResourceType } from '../types';
import { SubjectSelector } from '../components/SubjectSelector';
import { CalendarView } from '../components/CalendarView';
import { ChatWidget } from '../components/ChatWidget';
import { ClassProfileModal } from '../components/ClassProfileModal';
import { ClassAttendanceQRScannerModal } from '../components/ClassAttendanceQRScannerModal';
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
  Video,
  FileSpreadsheet,
  Layers,
  Filter,
  Copy,
  FolderOpen,
  Upload,
  Clock,
  Briefcase,
  Award,
  Eye
} from 'lucide-react';
import { AttendanceRecord } from '../types';
import { TutorAttendanceTracker } from '../components/TutorAttendanceTracker';
import { TutorProfileModal } from '../components/TutorProfileModal';
import { AttendanceHealthProgressBar } from '../components/AttendanceHealthProgressBar';

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
  const [savingResource, setSavingResource] = useState(false);

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
  const [newDesc, setNewDesc] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [generatingBanner, setGeneratingBanner] = useState(false);

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

  const handleOpenAddResourceModal = (preselectedClassId?: string) => {
    setEditingResource(null);
    setResTitle('');
    setResDescription('');
    setResUrl('');
    setResType('note');
    const targetClassId = preselectedClassId || (tutorClasses.length > 0 ? tutorClasses[0].id : '');
    setResClassId(targetClassId);
    const targetClass = tutorClasses.find(c => c.id === targetClassId) || tutorClasses[0];
    setResSubject(targetClass?.subject || 'Mathematics');
    setShowResourceModal(true);
  };

  const handleEditResourceModal = (mat: StudyMaterial) => {
    setEditingResource(mat);
    setResTitle(mat.title);
    setResDescription(mat.description || '');
    setResUrl(mat.referenceUrl);
    setResType(mat.type || 'note');
    setResClassId(mat.classId || '');
    setResSubject(mat.subject || 'Mathematics');
    setShowResourceModal(true);
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!resTitle.trim() || !resUrl.trim()) {
      showToast("Please provide both a Title and Reference URL for the resource.", "error");
      return;
    }

    let formattedUrl = resUrl.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = "https://" + formattedUrl;
    }

    setSavingResource(true);
    try {
      const targetClass = tutorClasses.find(c => c.id === resClassId);
      const subjectName = targetClass?.subject || resSubject || "General";

      if (editingResource) {
        await firestoreService.updateStudyMaterial(editingResource.id, {
          title: resTitle.trim(),
          description: resDescription.trim(),
          subject: subjectName,
          referenceUrl: formattedUrl,
          type: resType,
          classId: resClassId || undefined,
          classTitle: targetClass?.title || undefined
        });
        showToast(`Resource '${resTitle.trim()}' updated successfully!`, "success");
      } else {
        await firestoreService.saveStudyMaterial({
          title: resTitle.trim(),
          description: resDescription.trim(),
          subject: subjectName,
          referenceUrl: formattedUrl,
          type: resType,
          tutorId: currentUser.uid,
          tutorName: currentUser.name,
          classId: resClassId || undefined,
          classTitle: targetClass?.title || undefined
        });
        showToast(`Resource '${resTitle.trim()}' published to course!`, "success");
      }

      setShowResourceModal(false);
      setEditingResource(null);
      setResTitle('');
      setResDescription('');
      setResUrl('');
      setResClassId('');

      await fetchTutorMaterials();
    } catch (err) {
      showToast("Failed to save resource. Try again.", "error");
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

  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("Profile image must be under 5MB", "error");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfPhoto(reader.result as string);
      showToast("Photo uploaded! Click 'Save Profile Details' to publish changes.", "info");
    };
    reader.readAsDataURL(file);
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
          availability: tutorAvailability
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
              imageUrl: newImageUrl
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
              imageUrl: newImageUrl
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
      setNewImageUrl("");
      setClassFormMode('create');
      setEditingClassId(null);
    } catch (e) {
      showToast("Failed compiling class item creation.", "error");
    }
  };

  if (!currentUser) return null;

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

            {/* Class Creator trigger & QR Pass Trigger */}
            <div className="flex items-center gap-2">
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
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                {/* Left Side: Calendar Schedule View */}
                <div className="lg:col-span-8">
                  <CalendarView
                    userRole="tutor"
                    tutorClasses={tutorClasses}
                    tutorAvailability={tutorAvailability}
                    onAddAvailability={handleAddAvailability}
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
                      {rosterBookings.map((b) => (
                        <div 
                          key={b.id} 
                          className="p-4 border border-emerald-50 bg-emerald-50/10 rounded-2xl flex justify-between items-start transition-all hover:border-emerald-100"
                        >
                          <div>
                            <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-emerald-600 bg-emerald-100/40 px-1.5 rounded">Intake Student</span>
                            <h4 className="text-xs font-bold text-gray-900 mt-2 leading-tight">{b.studentName}</h4>
                            <p className="text-[11px] text-gray-500 mt-1">Booked: <span className="font-semibold text-gray-700 truncate">{b.classTitle}</span></p>
                            <p className="text-[10px] text-emerald-600 font-mono mt-1 font-semibold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Booked Slot: {b.dayOfWeek} at {b.timeSlot}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </motion.div>
            )}

            {/* Tab: Course Resources & Class Management */}
            {activeSubTab === 'resources' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-8"
              >
                {/* Section 1: Assigned Classes Directory */}
                <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        <h2 className="text-base font-extrabold text-gray-900 tracking-tight">Assigned Courses Directory</h2>
                        <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-150 font-mono">
                          {tutorClasses.length} Active Courses
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Directly manage study notes, quiz uploads, reference links, and assignment sheets for your specific courses.
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenAddResourceModal()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-colors cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Add Course Resource
                    </button>
                  </div>

                  {/* Grid of Assigned Classes */}
                  {tutorClasses.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200 space-y-2">
                      <BookOpen className="w-8 h-8 text-gray-300 mx-auto" />
                      <p className="text-xs font-bold text-gray-700">No assigned courses programmed yet</p>
                      <p className="text-[11px] text-gray-400">Click 'Launch Tuition Class' at the top of your workspace to create your first class.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tutorClasses.map((cls) => {
                        const classMaterials = tutorMaterials.filter(m => m.classId === cls.id);
                        const classBookings = rosterBookings.filter(b => b.classId === cls.id);
                        const notesCount = classMaterials.filter(m => m.type === 'note').length;
                        const quizzesCount = classMaterials.filter(m => m.type === 'quiz').length;
                        const linksCount = classMaterials.filter(m => m.type === 'link' || !m.type).length;
                        const isSelected = selectedResourceClassId === cls.id;

                        return (
                          <div
                            key={cls.id}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50/20 shadow-md ring-2 ring-blue-500/20'
                                : 'border-gray-200 bg-gray-50/30 hover:border-blue-200 hover:bg-white shadow-2xs'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-[9px] font-extrabold font-mono text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                  {cls.subject}
                                </span>
                                <span className="text-[10px] font-bold text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded-md">
                                  {classBookings.length}/{cls.maxSlots} Enrolled
                                </span>
                              </div>

                              <h3 className="text-sm font-extrabold text-gray-900 line-clamp-1" title={cls.title}>
                                {cls.title}
                              </h3>

                              <p className="text-[11px] text-gray-500 flex items-center gap-1 font-mono">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                {cls.dayOfWeek} • {cls.timeSlot}
                              </p>

                              {/* Resource count indicators */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-200/60">
                                <span className="text-[10px] font-bold text-slate-700 bg-white border border-gray-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
                                  {classMaterials.length} Items
                                </span>
                                {notesCount > 0 && (
                                  <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded">
                                    {notesCount} Notes
                                  </span>
                                )}
                                {quizzesCount > 0 && (
                                  <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 border border-amber-150 px-1.5 py-0.5 rounded">
                                    {quizzesCount} Quizzes
                                  </span>
                                )}
                                {linksCount > 0 && (
                                  <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-150 px-1.5 py-0.5 rounded">
                                    {linksCount} Links
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Card Action Buttons */}
                            <div className="flex items-center gap-2 pt-3 mt-1 border-t border-gray-100">
                              <button
                                onClick={() => {
                                  if (selectedResourceClassId === cls.id) {
                                    setSelectedResourceClassId('all');
                                  } else {
                                    setSelectedResourceClassId(cls.id);
                                  }
                                }}
                                className={`flex-1 text-xs py-1.5 px-2 font-bold rounded-xl transition-colors cursor-pointer text-center ${
                                  isSelected
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                {isSelected ? 'Selected Course' : 'Filter Resources'}
                              </button>
                              <button
                                onClick={() => handleOpenAddResourceModal(cls.id)}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border border-blue-150 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                                title="Attach new note, quiz, or link to this course"
                              >
                                <Plus className="w-3.5 h-3.5" /> Resource
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section 2: Course Resources Hub */}
                <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-6">
                  
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
                          placeholder="Search materials, notes, quizzes, links..."
                          className="w-full text-xs pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500 shadow-2xs"
                        />
                        {resourceSearchQuery && (
                          <button
                            onClick={() => setResourceSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
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
                        { id: 'note', label: 'Notes', icon: FileText },
                        { id: 'quiz', label: 'Quizzes', icon: HelpCircle },
                        { id: 'link', label: 'Links', icon: LinkIcon },
                        { id: 'file', label: 'Files', icon: FileSpreadsheet },
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
                        (m.subject || '').toLowerCase().includes(q)
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
                              <Plus className="w-4 h-4" /> Add Resource Now
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filtered.map((mat) => {
                          const resType = mat.type || 'link';
                          
                          const typeConfig = {
                            note: {
                              badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                              icon: FileText,
                              label: 'Lecture Note'
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
                                {/* Header: Badge & Date */}
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${typeConfig.badgeBg}`}>
                                    <IconComp className="w-3.5 h-3.5" />
                                    {typeConfig.label}
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    {new Date(mat.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </div>

                                {/* Title */}
                                <h3 className="text-sm font-extrabold text-gray-900 leading-snug line-clamp-2" title={mat.title}>
                                  {mat.title}
                                </h3>

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
                                <a
                                  href={mat.referenceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                                >
                                  <span>Open Resource</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>

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
                    {profPhoto ? (
                      <img
                        referrerPolicy="no-referrer"
                        src={profPhoto}
                        alt="Profile preview"
                        className="w-28 h-28 rounded-full object-cover mx-auto border-4 border-indigo-500/20 shadow-md ring-2 ring-indigo-500/10"
                      />
                    ) : (
                      <div className="w-28 h-28 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-4xl font-extrabold mx-auto border-2 border-indigo-200 shadow-sm">
                        {profName ? profName.charAt(0).toUpperCase() : "?"}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-extrabold text-gray-900">{profName || "My Profile"}</h4>
                    <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">{profQualification || "Academic Tutor"}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{currentUser.email}</p>
                  </div>

                  {/* Photo Upload Dropzone */}
                  <div className="border border-dashed border-gray-200 hover:border-indigo-400 bg-slate-50/60 rounded-xl p-3 text-center transition-all space-y-2">
                    <div className="flex justify-center">
                      <Upload className="w-5 h-5 text-indigo-600" />
                    </div>
                    <p className="text-[11px] font-bold text-gray-700">Upload Profile Picture</p>
                    <p className="text-[10px] text-gray-400">Supports PNG or JPG up to 5MB</p>
                    <label className="inline-block px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs">
                      Choose File
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={handlePhotoFileUpload}
                        className="hidden"
                      />
                    </label>
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
                <div className="bg-white border border-gray-150 rounded-2xl p-6">
                  <h3 className="text-base font-bold text-gray-900 border-b pb-4 border-gray-50 mb-4 flex items-center gap-2">
                    <Sliders className="w-4.5 h-4.5 text-blue-500" />
                    Faculty Communication Handles
                  </h3>
                  <p className="text-xs text-gray-400 mb-5">Configure which operational updates trigger real-time system copy alerts and email dispatches to your personal address.</p>

                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-gray-850">Class Attendance & Student Bookings</span>
                        <span className="block text-[10px] text-gray-400 mt-0.5">Receive immediate dashboard alerts when a student registers or books a class</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={notificationSettings.reminders}
                        onChange={(e) => updateNotificationSettings({ reminders: e.target.checked })}
                        className="w-4.5 h-4.5 rounded text-blue-600 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-gray-850">Tuition Invoices & Payment Settlements</span>
                        <span className="block text-[10px] text-gray-400 mt-0.5">Alert me when admin updates ledger records or logs payouts matched to my class</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={notificationSettings.payments}
                        onChange={(e) => updateNotificationSettings({ payments: e.target.checked })}
                        className="w-4.5 h-4.5 rounded text-blue-600 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-gray-850">Student Chat Messages</span>
                        <span className="block text-[10px] text-gray-400 mt-0.5">Get notified immediately when a scholar initiates or replies to a chat message</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={notificationSettings.messages}
                        onChange={(e) => updateNotificationSettings({ messages: e.target.checked })}
                        className="w-4.5 h-4.5 rounded text-blue-600 cursor-pointer"
                      />
                    </div>

                    {/* Email triggers toggle elements */}
                    <div className="border-t pt-5 border-dashed border-gray-100 space-y-4">
                      <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-blue-650 font-mono">Email Notification Triggers</h4>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-750">Class revisions & timing alterations</span>
                          <span className="block text-[9px] text-gray-400">Dispatch copies when schedule slots expand or curriculum titles update</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={!!notificationSettings.emailClassRevisions}
                          onChange={(e) => updateNotificationSettings({ emailClassRevisions: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-750">Booking & enrollment receipts</span>
                          <span className="block text-[9px] text-gray-400">Receive email alerts on active scholar registrations and seat counts</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={!!notificationSettings.emailBookingStatus}
                          onChange={(e) => updateNotificationSettings({ emailBookingStatus: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-750">Academic study worksheets & materials</span>
                          <span className="block text-[9px] text-gray-400">Receive copy confirmations when course worksheets or documents are uploaded</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={!!notificationSettings.emailStudyMaterials}
                          onChange={(e) => updateNotificationSettings({ emailStudyMaterials: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-750">Daily academy general announcements</span>
                          <span className="block text-[9px] text-gray-400">Receive general management notifications and bulletin board notices</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={!!notificationSettings.emailPerformanceLogs}
                          onChange={(e) => updateNotificationSettings({ emailPerformanceLogs: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t pt-4 border-dashed border-gray-100">
                      <div>
                        <span className="text-xs font-bold text-blue-700">Inbox Copy Sync</span>
                        <span className="block text-[9px] text-gray-400 leading-none mt-0.5">Route copy to faculty registered email address</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={notificationSettings.emailSync}
                        onChange={(e) => updateNotificationSettings({ emailSync: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-650"
                      />
                    </div>
                  </div>
                </div>
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

              <div className="grid grid-cols-2 gap-3">
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
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-100 shadow-2xl relative animate-fade-in font-sans space-y-5">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">
                    {editingResource ? 'Edit Course Resource' : 'Add New Course Resource'}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Publish notes, quizzes, links, or documents for your assigned students.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowResourceModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResource} className="space-y-4">
              {/* Course Selection */}
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
                  className="w-full text-xs px-3 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-bold"
                  required
                >
                  <option value="">-- Select Assigned Class --</option>
                  {tutorClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.subject} - {c.dayOfWeek})
                    </option>
                  ))}
                </select>
              </div>

              {/* Resource Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Resource Title:</label>
                <input
                  type="text"
                  required
                  value={resTitle}
                  onChange={(e) => setResTitle(e.target.value)}
                  placeholder="e.g., Module 3 Calculus Practice Quiz or Lecture Notes PDF"
                  className="w-full text-xs px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                />
              </div>

              {/* Resource Type & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Resource Type:</label>
                  <select
                    value={resType}
                    onChange={(e) => setResType(e.target.value as ResourceType)}
                    className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="note">📝 Lecture Note / PDF</option>
                    <option value="quiz">❓ Quiz / Exam Sheet</option>
                    <option value="link">🔗 Reference Link / Web URL</option>
                    <option value="file">📄 Document / Spreadsheet</option>
                    <option value="video">🎥 Video Session Link</option>
                    <option value="announcement">📢 Course Notice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Subject Track:</label>
                  <input
                    type="text"
                    value={resSubject}
                    onChange={(e) => setResSubject(e.target.value)}
                    placeholder="e.g. Mathematics"
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50"
                  />
                </div>
              </div>

              {/* URL / Link */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Access URL / Resource Link:</label>
                <input
                  type="text"
                  required
                  value={resUrl}
                  onChange={(e) => setResUrl(e.target.value)}
                  placeholder="e.g., https://drive.google.com/... or https://quiz.link/..."
                  className="w-full text-xs px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-mono"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Provide Google Drive, Dropbox, Quizlet, YouTube, or external LMS URL.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Instructions / Description (Optional):</label>
                <textarea
                  rows={3}
                  value={resDescription}
                  onChange={(e) => setResDescription(e.target.value)}
                  placeholder="Provide guidance on completing this quiz or reading notes before class..."
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                ></textarea>
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  {savingResource ? 'Saving...' : editingResource ? 'Update Resource' : 'Publish Resource'}
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
    </motion.div>
  );
};
