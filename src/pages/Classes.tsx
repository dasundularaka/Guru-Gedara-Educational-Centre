import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ClassCard } from '../components/ClassCard';
import { firestoreService } from '../lib/firestoreService';
import { ConfirmModal } from '../components/ConfirmModal';
import { ClassProfileModal } from '../components/ClassProfileModal';
import { TutorProfileModal } from '../components/TutorProfileModal';
import { LiveChatModal } from '../components/LiveChatModal';
import { 
  Search, 
  SlidersHorizontal, 
  BookOpen, 
  AlertCircle, 
  Download, 
  UploadCloud, 
  FileText, 
  Trash2, 
  Plus, 
  ExternalLink 
} from 'lucide-react';
import { ClassItem, StudyMaterial, SubjectItem, UserProfile, AttendanceRecord } from '../types';
import { SubjectSelector } from '../components/SubjectSelector';
import { genericFirestoreService } from '../lib/genericFirestore';
import { binaryStore } from '../lib/binaryStore';
import { canUserViewStudyResource } from '../utils/accessControl';
import { recordMaterialAccess, getMaterialAccessInfo } from '../utils/resourceAudit';
import { MultifunctionalSearchFilter, FilterGroup, ActiveFilterTag } from '../components/MultifunctionalSearchFilter';

interface ClassesProps {
  onNavigateTab: (tab: string) => void;
}

const DEFAULT_SUBJECT_CATEGORIES = ["All Subjects", "Mathematics", "Physics", "English", "Coding"];

const INITIAL_MATERIALS: StudyMaterial[] = [];

export const Classes: React.FC<ClassesProps> = ({ onNavigateTab }) => {
  const { 
    classes, 
    refreshClasses, 
    currentUser, 
    showToast, 
    bookings, 
    payments, 
    reviews, 
    refreshBookings, 
    refreshUserProfile,
    deepLinkedClassId,
    setDeepLinkedClassId 
  } = useApp();
  
  // Tab Switch: 'classes' or 'resources'
  const [activeTab, setActiveTab] = useState<'classes' | 'resources'>('classes');

  // Deep-linking handler for direct notification navigation
  useEffect(() => {
    if (deepLinkedClassId && classes.length > 0) {
      const targetClass = classes.find(c => c.id === deepLinkedClassId);
      if (targetClass) {
        setActiveTab('classes');
        setSelectedClassForProfile(targetClass);
        setDeepLinkedClassId(null);
      }
    }
  }, [deepLinkedClassId, classes, setDeepLinkedClassId]);

  // Dynamic Subjects from DB
  const [subjectCategories, setSubjectCategories] = useState<string[]>(DEFAULT_SUBJECT_CATEGORIES);

  // Classes states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All Subjects");
  const [sortBy, setSortBy] = useState("default");
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'open' | 'full'>('all');
  const [selectedLevel, setSelectedLevel] = useState("All Levels");
  const [selectedDay, setSelectedDay] = useState("All Days");
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState("All Times");
  const [filteredClasses, setFilteredClasses] = useState<ClassItem[]>([]);

  // Modals for Class Profile and Tutor Profile
  const [selectedClassForProfile, setSelectedClassForProfile] = useState<ClassItem | null>(null);
  const [selectedTutorForProfile, setSelectedTutorForProfile] = useState<UserProfile | null>(null);
  const [selectedTutorForChat, setSelectedTutorForChat] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // Resources states
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const [resSearchTerm, setResSearchTerm] = useState("");
  const [resSelectedSubject, setResSelectedSubject] = useState("All Subjects");
  const [filteredMaterials, setFilteredMaterials] = useState<StudyMaterial[]>([]);
  
  // Resource upload form states (for Tutors)
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadSubject, setUploadSubject] = useState("Mathematics");
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadClassId, setUploadClassId] = useState("");
  const [uploadType, setUploadType] = useState<any>("Notes");
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    refreshClasses();
    const unsubMaterials = firestoreService.subscribeStudyMaterials(undefined, (mats) => {
      setStudyMaterials(mats || []);
    });
    const unsubSubjects = firestoreService.subscribeSubjects((dbSubjects) => {
      const names = (dbSubjects || []).map(s => s.name);
      const merged = Array.from(new Set(["All Subjects", ...DEFAULT_SUBJECT_CATEGORIES.filter(c => c !== "All Subjects"), ...names]));
      setSubjectCategories(merged);
    });

    const loadModalData = async () => {
      try {
        const [users, atts] = await Promise.all([
          firestoreService.getAllUsers(),
          firestoreService.getAttendanceRecords()
        ]);
        setAllUsers(users || []);
        setAttendanceRecords(atts || []);
      } catch (e) {
        console.warn("Could not load supporting modal data in Classes", e);
      }
    };
    loadModalData();

    return () => {
      unsubMaterials();
      unsubSubjects();
    };
  }, []);

  const fetchSubjectsList = async () => {
    try {
      const dbSubjects = await firestoreService.getSubjects();
      if (dbSubjects && dbSubjects.length > 0) {
        const names = dbSubjects.map(s => s.name);
        const merged = Array.from(new Set(["All Subjects", ...DEFAULT_SUBJECT_CATEGORIES.filter(c => c !== "All Subjects"), ...names]));
        setSubjectCategories(merged);
      }
    } catch (e) {
      console.warn("Could not fetch DB subjects in Classes.tsx", e);
    }
  };

  // Fetch Study Materials
  const fetchStudyMaterials = async () => {
    try {
      const list = await firestoreService.getStudyMaterials();
      setStudyMaterials(list || []);
    } catch (e) {
      console.warn("Failed retrieving study materials", e);
      setStudyMaterials([]);
    }
  };

  const enrolledClassIds = currentUser?.selectedClasses || [];
  const [showEnrolledOnly, setShowEnrolledOnly] = useState<boolean>(false);

  // Filter Tuition Classes
  useEffect(() => {
    let result = [...classes];

    if (currentUser?.role === 'student' && showEnrolledOnly && enrolledClassIds.length > 0) {
      result = result.filter(c => enrolledClassIds.includes(c.id));
    }

    if (selectedSubject !== "All Subjects") {
      result = result.filter(c => c.subject.toLowerCase() === selectedSubject.toLowerCase());
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.title.toLowerCase().includes(term) || 
        c.description.toLowerCase().includes(term) ||
        c.tutorName.toLowerCase().includes(term)
      );
    }

    if (availabilityFilter === "open") {
      result = result.filter(c => c.bookedSlots < c.maxSlots);
    } else if (availabilityFilter === "full") {
      result = result.filter(c => c.bookedSlots >= c.maxSlots);
    }

    // Class Level Filter (Beginner, High School, Middle School, AP Prep, Advanced, etc)
    if (selectedLevel !== "All Levels") {
      const levelLower = selectedLevel.toLowerCase();
      result = result.filter(c => {
        const titleMatch = c.title.toLowerCase().includes(levelLower);
        const descMatch = c.description.toLowerCase().includes(levelLower);
        const tagMatch = (c.tags || []).some(tag => tag.toLowerCase().includes(levelLower));
        return titleMatch || descMatch || tagMatch;
      });
    }

    // Day of the Week Filter
    if (selectedDay !== "All Days") {
      const dayLower = selectedDay.toLowerCase();
      result = result.filter(c => (c.dayOfWeek || "").toLowerCase() === dayLower);
    }

    // Time of the Day Filter
    if (selectedTimeOfDay !== "All Times") {
      result = result.filter(c => {
        const slot = (c.timeSlot || "").toLowerCase();
        if (selectedTimeOfDay === "Morning") {
          return slot.includes("am") || slot.includes("morning");
        } else if (selectedTimeOfDay === "Afternoon") {
          // 12:00 PM to 04:59 PM
          return slot.includes("pm") && (slot.startsWith("12") || slot.startsWith("01") || slot.startsWith("02") || slot.startsWith("03") || slot.startsWith("04") || slot.startsWith("1") || slot.startsWith("2") || slot.startsWith("3") || slot.startsWith("4"));
        } else if (selectedTimeOfDay === "Evening") {
          // 05:00 PM onwards
          return slot.includes("pm") && (slot.startsWith("05") || slot.startsWith("06") || slot.startsWith("07") || slot.startsWith("08") || slot.startsWith("09") || slot.startsWith("5") || slot.startsWith("6") || slot.startsWith("7") || slot.startsWith("8") || slot.startsWith("9"));
        }
        return true;
      });
    }

    if (sortBy === "price_asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === "spots_left") {
      result.sort((a, b) => (a.maxSlots - a.bookedSlots) - (b.maxSlots - b.bookedSlots));
    }

    setFilteredClasses(result);
  }, [classes, searchTerm, selectedSubject, sortBy, availabilityFilter, selectedLevel, selectedDay, selectedTimeOfDay, showEnrolledOnly, enrolledClassIds.length]);

  // Filter Study Materials with Strict Role & Class Enrollment Access Control
  useEffect(() => {
    let result = [...studyMaterials];

    if (resSelectedSubject !== "All Subjects") {
      result = result.filter(m => m.subject.toLowerCase() === resSelectedSubject.toLowerCase());
    }

    if (resSearchTerm.trim()) {
      const term = resSearchTerm.toLowerCase();
      result = result.filter(m => 
        m.title.toLowerCase().includes(term) || 
        m.description.toLowerCase().includes(term) ||
        m.tutorName.toLowerCase().includes(term) ||
        (m.classTitle && m.classTitle.toLowerCase().includes(term))
      );
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Access control rule using centralized utility:
    // Only authorized faculty tutor, administrators, and enrolled students can view class resources
    result = result.filter(m => canUserViewStudyResource(m, currentUser, classes, bookings));

    setFilteredMaterials(result);
  }, [studyMaterials, resSearchTerm, resSelectedSubject, currentUser, classes, bookings]);

  // Handle study material upload
  const handleUploadResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    if (currentUser.role !== 'tutor' && currentUser.role !== 'admin') {
      showToast("Only tutors and administrators have permission to upload study materials.", "error");
      return;
    }
    
    if (!uploadTitle.trim() || !uploadDesc.trim()) {
      showToast("Please provide a title and description for the material.", "error");
      return;
    }

    if (uploadMode === 'file' && !uploadFile) {
      showToast("Please choose a file to upload.", "error");
      return;
    }

    if (uploadMode === 'link') {
      if (!uploadUrl.trim()) {
        showToast("Please provide a valid reference URL.", "error");
        return;
      }
      if (!uploadUrl.startsWith("http://") && !uploadUrl.startsWith("https://")) {
        showToast("Please enter a valid reference URL starting with http:// or https://", "error");
        return;
      }
    }

    if (uploadClassId) {
      const selectedClassItem = classes.find(c => c.id === uploadClassId);
      if (currentUser.role === 'tutor') {
        const isAssigned = selectedClassItem && (
          selectedClassItem.tutorId === currentUser.uid ||
          selectedClassItem.tutorName === currentUser.name ||
          (currentUser.email && selectedClassItem.tutorEmail && currentUser.email.toLowerCase() === selectedClassItem.tutorEmail.toLowerCase())
        );
        if (!isAssigned) {
          showToast("You are not the assigned faculty tutor for this class.", "error");
          return;
        }
      }
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const selectedClassItem = classes.find(c => c.id === uploadClassId);
      let finalUrl = uploadUrl.trim();
      let finalFileName = '';
      let finalFileSize = 0;
      let finalFileType = '';
      let finalStoragePath = '';

      if (uploadMode === 'file' && uploadFile) {
        const uploadRes = await firestoreService.uploadResourceFile(
          uploadFile,
          uploadClassId || 'general',
          currentUser.uid,
          (progress) => setUploadProgress(progress)
        );
        finalUrl = uploadRes.url;
        finalFileName = uploadRes.fileName;
        finalFileSize = uploadRes.fileSize;
        finalFileType = uploadRes.fileType;
        finalStoragePath = uploadRes.storagePath;
      }

      await firestoreService.saveStudyMaterial({
        title: uploadTitle.trim(),
        description: uploadDesc.trim(),
        subject: uploadSubject,
        referenceUrl: finalUrl,
        type: uploadType,
        tutorId: currentUser.uid,
        tutorName: currentUser.name,
        classId: uploadClassId || undefined,
        classTitle: selectedClassItem?.title || undefined,
        isVisible: true,
        fileName: finalFileName || undefined,
        fileSize: finalFileSize || undefined,
        fileType: finalFileType || undefined,
        storagePath: finalStoragePath || undefined
      });

      showToast(`Study material '${uploadTitle}' published successfully!`, "success");
      
      // Reset form fields
      setUploadTitle("");
      setUploadDesc("");
      setUploadUrl("");
      setUploadClassId("");
      setUploadFile(null);
      setUploadProgress(0);
      
      // Refresh list
      await fetchStudyMaterials();
    } catch (error: any) {
      showToast(error?.message || "Failed to upload study material. Try again.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    id: string;
    title: string;
    isDeleting: boolean;
  }>({
    isOpen: false,
    id: '',
    title: '',
    isDeleting: false
  });

  // Handle study material deletion
  const handleDeleteResource = (id: string, title: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      id,
      title,
      isDeleting: false
    });
  };

  const confirmDeleteResource = async () => {
    if (!deleteConfirmModal.id) return;
    setDeleteConfirmModal(prev => ({ ...prev, isDeleting: true }));
    try {
      await firestoreService.deleteStudyMaterial(deleteConfirmModal.id);
      showToast("Study material removed successfully.", "success");
      await fetchStudyMaterials();
      setDeleteConfirmModal({ isOpen: false, id: '', title: '', isDeleting: false });
    } catch (err) {
      showToast("Failed to delete study material.", "error");
      setDeleteConfirmModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  // Get current user's authorized classes to link resources to (only assigned classes for tutors, all for admin)
  const tutorClasses = currentUser?.role === 'admin' 
    ? classes 
    : classes.filter(c => 
        c.tutorId === currentUser?.uid || 
        c.tutorName === currentUser?.name || 
        (Boolean(currentUser?.email) && Boolean(c.tutorEmail) && currentUser?.email?.toLowerCase() === c.tutorEmail?.toLowerCase())
      );

  // Multifunctional Filter groups for Classes
  const classFilterGroups: FilterGroup[] = [
    {
      id: 'subject',
      title: 'Subject Stream',
      value: selectedSubject,
      onChange: setSelectedSubject,
      options: subjectCategories.map(sub => ({
        label: sub,
        value: sub,
        badge: sub === 'All Subjects' ? classes.length : classes.filter(c => c.subject.toLowerCase() === sub.toLowerCase()).length
      }))
    },
    {
      id: 'availability',
      title: 'Slot Availability',
      value: availabilityFilter,
      onChange: (val) => setAvailabilityFilter(val as any),
      options: [
        { label: 'All Classes', value: 'all' },
        { label: 'Available Seats', value: 'open' },
        { label: 'Fully Booked', value: 'full' }
      ]
    },
    {
      id: 'sort',
      title: 'Sort Ordering',
      value: sortBy,
      onChange: setSortBy,
      options: [
        { label: 'Default Order', value: 'default' },
        { label: 'Price: Low to High', value: 'price_asc' },
        { label: 'Price: High to Low', value: 'price_desc' },
        { label: 'Fewest Seats Left', value: 'spots_left' }
      ]
    },
    {
      id: 'level',
      title: 'Academic Level / Grade',
      value: selectedLevel,
      onChange: setSelectedLevel,
      options: ['All Levels', 'Beginner', 'Middle School', 'High School', 'AP Prep', 'Advanced'].map(lvl => ({
        label: lvl,
        value: lvl
      }))
    },
    {
      id: 'day',
      title: 'Class Day',
      value: selectedDay,
      onChange: setSelectedDay,
      options: ['All Days', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => ({
        label: d,
        value: d
      }))
    },
    {
      id: 'time',
      title: 'Time of Day',
      value: selectedTimeOfDay,
      onChange: setSelectedTimeOfDay,
      options: ['All Times', 'Morning', 'Afternoon', 'Evening'].map(t => ({
        label: t,
        value: t
      }))
    }
  ];

  const activeClassTags: ActiveFilterTag[] = [];
  if (selectedSubject !== 'All Subjects') {
    activeClassTags.push({
      id: 'subject',
      label: 'Subject',
      valueLabel: selectedSubject,
      onRemove: () => setSelectedSubject('All Subjects')
    });
  }
  if (availabilityFilter !== 'all') {
    activeClassTags.push({
      id: 'avail',
      label: 'Availability',
      valueLabel: availabilityFilter === 'open' ? 'Open' : 'Full',
      onRemove: () => setAvailabilityFilter('all')
    });
  }
  if (sortBy !== 'default') {
    const sortLabels: Record<string, string> = {
      price_asc: 'Price ↑',
      price_desc: 'Price ↓',
      spots_left: 'Seats Left'
    };
    activeClassTags.push({
      id: 'sort',
      label: 'Sort',
      valueLabel: sortLabels[sortBy] || sortBy,
      onRemove: () => setSortBy('default')
    });
  }
  if (selectedLevel !== 'All Levels') {
    activeClassTags.push({
      id: 'level',
      label: 'Level',
      valueLabel: selectedLevel,
      onRemove: () => setSelectedLevel('All Levels')
    });
  }
  if (selectedDay !== 'All Days') {
    activeClassTags.push({
      id: 'day',
      label: 'Day',
      valueLabel: selectedDay,
      onRemove: () => setSelectedDay('All Days')
    });
  }
  if (selectedTimeOfDay !== 'All Times') {
    activeClassTags.push({
      id: 'time',
      label: 'Time',
      valueLabel: selectedTimeOfDay,
      onRemove: () => setSelectedTimeOfDay('All Times')
    });
  }

  const resetAllClassFilters = () => {
    setSearchTerm('');
    setSelectedSubject('All Subjects');
    setAvailabilityFilter('all');
    setSortBy('default');
    setSelectedLevel('All Levels');
    setSelectedDay('All Days');
    setSelectedTimeOfDay('All Times');
  };

  return (
    <div className="bg-slate-50/40 min-h-screen py-10" id="classes_search_viewport">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Banner Header */}
        <div className="mb-8">
          <span className="text-[10px] font-mono font-bold text-indigo-650 uppercase tracking-widest block leading-none">Catalog & Curriculum</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">Tuition Classes & Syllabus</h1>
          <p className="text-xs text-slate-500 mt-1.5">Browse available academic classes, manage enrollments, and access course notes, study documents, and video lessons directly within each class profile.</p>
        </div>

        {/* Classes Content */}
        <div>
          {/* Student View Toggle */}
            {currentUser?.role === 'student' && enrolledClassIds.length > 0 && (
              <div className="mb-6 flex items-center gap-2 bg-indigo-50/70 dark:bg-indigo-950/40 p-1.5 rounded-2xl border border-indigo-100/80 dark:border-indigo-900/50 w-full sm:w-fit">
                <button
                  onClick={() => setShowEnrolledOnly(true)}
                  className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center ${
                    showEnrolledOnly 
                      ? 'bg-indigo-650 text-white shadow-sm' 
                      : 'text-indigo-900 dark:text-indigo-300 hover:bg-indigo-100/70'
                  }`}
                >
                  My Classes ({enrolledClassIds.length})
                </button>
                <button
                  onClick={() => setShowEnrolledOnly(false)}
                  className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center ${
                    !showEnrolledOnly 
                      ? 'bg-indigo-650 text-white shadow-sm' 
                      : 'text-indigo-900 dark:text-indigo-300 hover:bg-indigo-100/70'
                  }`}
                >
                  All Classes
                </button>
              </div>
            )}

            {/* Multifunctional Search Bar and Filter Button */}
            <div className="mb-8">
              <MultifunctionalSearchFilter
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Search classes by title, subject, tutor, or schedule..."
                searchId="classes_multifunctional_search_input"
                filterButtonLabel="Class Filters"
                filterGroups={classFilterGroups}
                activeFilterCount={activeClassTags.length}
                onResetFilters={resetAllClassFilters}
                activeTags={activeClassTags}
              />
            </div>

            {/* Classes grid display */}
            {filteredClasses.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-sm mx-auto shadow-sm">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-4 animate-pulse" />
                <h3 className="text-xs font-extrabold text-slate-900 font-sans">No matching entries</h3>
                <p className="text-xs text-slate-500 mt-2 pb-5 leading-relaxed">
                  We couldn't spot any registered tuition class matched to: "{searchTerm || selectedSubject}".
                </p>
                <button
                  onClick={() => { 
                    setSearchTerm(""); 
                    setSelectedSubject("All Subjects"); 
                    setSortBy("default"); 
                    setAvailabilityFilter("all"); 
                    setSelectedLevel("All Levels");
                    setSelectedDay("All Days");
                    setSelectedTimeOfDay("All Times");
                  }}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Reset Search Parameters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClasses.map((item) => (
                  <div key={item.id} className="h-full">
                    <ClassCard 
                      item={item} 
                      onBookSuccess={() => onNavigateTab('dashboard')}
                      onRedirectToLogin={() => onNavigateTab('auth')}
                      onOpenClassProfile={(cls) => setSelectedClassForProfile(cls)}
                      onOpenTutorProfile={(tut) => setSelectedTutorForProfile(tut)}
                    />
                  </div>
                ))}
              </div>
            )}
        </div>

      </div>

      <ConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        title="Delete Study Material"
        message={
          <>
            Are you sure you want to delete <span className="font-extrabold text-slate-900">"{deleteConfirmModal.title}"</span>? Enrolled students will no longer be able to view or download this file.
          </>
        }
        confirmText="Delete Material"
        cancelText="Cancel"
        isLoading={deleteConfirmModal.isDeleting}
        onConfirm={confirmDeleteResource}
        onClose={() => setDeleteConfirmModal(prev => ({ ...prev, isOpen: false }))}
        confirmBtnId="delete_material_confirm_btn"
        cancelBtnId="delete_material_cancel_btn"
      />

      {/* Class Profile Modal */}
      {selectedClassForProfile && currentUser && (
        <ClassProfileModal
          isOpen={!!selectedClassForProfile}
          onClose={() => setSelectedClassForProfile(null)}
          classItem={selectedClassForProfile}
          currentUser={currentUser}
          bookings={bookings || []}
          allUsers={allUsers || []}
          payments={payments || []}
          attendanceRecords={attendanceRecords || []}
          onUpdateData={async () => {
            if (refreshClasses) await refreshClasses();
            if (refreshBookings) await refreshBookings();
            if (refreshUserProfile) await refreshUserProfile();
          }}
          showToast={showToast}
        />
      )}

      {/* Tutor Profile Modal */}
      {selectedTutorForProfile && (
        <TutorProfileModal
          tutor={selectedTutorForProfile}
          isOpen={!!selectedTutorForProfile}
          onClose={() => setSelectedTutorForProfile(null)}
          reviews={reviews || []}
          onContactClick={() => {
            const t = selectedTutorForProfile;
            setSelectedTutorForProfile(null);
            setSelectedTutorForChat(t);
          }}
        />
      )}

      {/* Live Chat Modal */}
      {selectedTutorForChat && (
        <LiveChatModal
          isOpen={!!selectedTutorForChat}
          onClose={() => setSelectedTutorForChat(null)}
          tutor={selectedTutorForChat}
          currentUser={currentUser}
          showToast={showToast}
        />
      )}
    </div>
  );
};
