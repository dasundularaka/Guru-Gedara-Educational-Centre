import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ClassCard } from '../components/ClassCard';
import { firestoreService } from '../lib/firestoreService';
import { ConfirmModal } from '../components/ConfirmModal';
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
import { ClassItem, StudyMaterial, SubjectItem } from '../types';
import { SubjectSelector } from '../components/SubjectSelector';
import { genericFirestoreService } from '../lib/genericFirestore';
import { binaryStore } from '../lib/binaryStore';

interface ClassesProps {
  onNavigateTab: (tab: string) => void;
}

const DEFAULT_SUBJECT_CATEGORIES = ["All Subjects", "Mathematics", "Physics", "English", "Coding"];

const INITIAL_MATERIALS: StudyMaterial[] = [];

export const Classes: React.FC<ClassesProps> = ({ onNavigateTab }) => {
  const { classes, refreshClasses, currentUser, showToast, bookings } = useApp();
  
  // Tab Switch: 'classes' or 'resources'
  const [activeTab, setActiveTab] = useState<'classes' | 'resources'>('classes');

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
  const [showEnrolledOnly, setShowEnrolledOnly] = useState<boolean>(
    currentUser?.role === 'student' && enrolledClassIds.length > 0
  );

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

    // Access control rule:
    // "If an admin or tutor upload study resourse to a class, that one can see relevant tutor, all admins and enrolled students only. Nobody not in I mentioned above groups can view."
    const isAdmin = currentUser?.role === 'admin';
    const isTutor = currentUser?.role === 'tutor';
    const isStudent = currentUser?.role === 'student';

    result = result.filter(m => {
      // If hidden from students, only admins or author tutor can see
      if (m.isVisible === false && !isAdmin && (!isTutor || m.tutorId !== currentUser?.uid)) {
        return false;
      }

      // If associated with a class:
      if (m.classId) {
        if (isAdmin) return true;
        if (isTutor) {
          const classObj = classes.find(c => c.id === m.classId);
          return m.tutorId === currentUser?.uid || 
                 Boolean(classObj && (
                   classObj.tutorId === currentUser?.uid || 
                   classObj.tutorName === currentUser?.name || 
                   (currentUser?.email && classObj.tutorEmail && currentUser.email.toLowerCase() === classObj.tutorEmail.toLowerCase())
                 ));
        }
        if (isStudent) {
          const isSuspended = currentUser?.classEnrollmentStatus?.[m.classId] === 'suspended' || currentUser?.status === 'suspended';
          if (isSuspended) return false;
          return enrolledClassIds.includes(m.classId) || bookings.some(b => b.classId === m.classId && (b.studentId === currentUser?.uid || (b as any).studentEmail === currentUser?.email) && b.status === 'active');
        }
        return false; // Non-enrolled users and guests cannot see class study resources
      }

      // General materials without classId
      return true;
    });

    setFilteredMaterials(result);
  }, [studyMaterials, resSearchTerm, resSelectedSubject, currentUser, enrolledClassIds, classes, bookings]);

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

  return (
    <div className="bg-slate-50/40 min-h-screen py-10" id="classes_search_viewport">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Banner Header */}
        <div className="mb-8">
          <span className="text-[10px] font-mono font-bold text-indigo-650 uppercase tracking-widest block leading-none">Catalog & Library</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">Syllabus & Material Portal</h1>
          <p className="text-xs text-slate-500 mt-1.5">Access structured tutoring courses, download curated syllabus materials, and upload homework guides.</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-8" id="classes_view_navigation_tabs">
          <button
            onClick={() => setActiveTab('classes')}
            className={`py-3 px-6 text-xs sm:text-sm font-extrabold border-b-2 transition-all cursor-pointer ${
              activeTab === 'classes'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Tuition Classes
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`py-3 px-6 text-xs sm:text-sm font-extrabold border-b-2 transition-all cursor-pointer ${
              activeTab === 'resources'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Study Resources ({studyMaterials.length})
          </button>
        </div>

        {/* Render Tab Contents */}
        {activeTab === 'classes' ? (
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

            {/* Mobile Category Pill Scroller */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 mb-4">
              {subjectCategories.map(sub => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                    selectedSubject === sub 
                      ? 'bg-indigo-600 text-white shadow-sm font-extrabold' 
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>

            {/* Filters and search blocks */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:p-6 mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-center">
                
                {/* Search Input */}
                <div className="relative sm:col-span-2 md:col-span-6">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search classes or tutors..."
                    className="w-full text-xs pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 transition-all font-sans text-slate-900 dark:text-white"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm("")}
                      className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Availability status Selector */}
                <div className="sm:col-span-1 md:col-span-3">
                  <select
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value as 'all' | 'open' | 'full')}
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-600 transition-all font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <option value="all">Availability: All</option>
                    <option value="open">Available Slots</option>
                    <option value="full">Fully Booked</option>
                  </select>
                </div>

                {/* Sort order Selector */}
                <div className="sm:col-span-1 md:col-span-3">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-600 transition-all font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <option value="default">Sort: Default</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="spots_left">Seats Left</option>
                  </select>
                </div>

              </div>

              {/* Advanced Course Level, Day of Week, and Time of Day Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                {/* Level Selector */}
                <div>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-600 transition-all font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <option value="All Levels">Level: All Grades</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Middle School">Middle School</option>
                    <option value="High School">High School</option>
                    <option value="AP Prep">AP Prep</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                {/* Day of the Week Selector */}
                <div>
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-600 transition-all font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <option value="All Days">Day: All Days</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>

                {/* Time of Day Selector */}
                <div>
                  <select
                    value={selectedTimeOfDay}
                    onChange={(e) => setSelectedTimeOfDay(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-600 transition-all font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <option value="All Times">Time: All Times</option>
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                  </select>
                </div>
              </div>
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
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* STUDY RESOURCES TAB */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left side upload form - Only visible to tutors */}
            {currentUser?.role === 'tutor' && (
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-fit">
                <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3">
                  <UploadCloud className="w-5 h-5 text-indigo-650" />
                  <h3 className="text-sm font-extrabold text-slate-900">Upload Study Material</h3>
                </div>
                
                <form onSubmit={handleUploadResource} className="space-y-4">
                  {/* Mode Selector */}
                  <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setUploadMode('file')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        uploadMode === 'file' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('link')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        uploadMode === 'link' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Web Link / Drive
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Material Title *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. AP Calculus Limits Revision Sheet"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      className="w-full text-xs px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-indigo-650 focus:bg-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Brief Description *</label>
                    <textarea 
                      required
                      rows={2}
                      placeholder="e.g. Comprehensive worksheet with solutions for limits evaluation..."
                      value={uploadDesc}
                      onChange={(e) => setUploadDesc(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-indigo-650 focus:bg-white font-medium resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <SubjectSelector 
                        value={uploadSubject}
                        onChange={setUploadSubject}
                        label="Subject Category"
                        allowCustom={false}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Associated Class (Optional)</label>
                      <select 
                        value={uploadClassId}
                        onChange={(e) => setUploadClassId(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none font-bold text-slate-700 cursor-pointer"
                      >
                        <option value="">-- No Class --</option>
                        {tutorClasses.map(c => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Resource Type</label>
                      <select
                        value={uploadType}
                        onChange={(e) => setUploadType(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none font-bold text-slate-700 cursor-pointer"
                      >
                        <option value="Notes">Notes / Handout</option>
                        <option value="Assignment">Assignment / Worksheet</option>
                        <option value="PastPaper">Past Paper / Quiz</option>
                        <option value="Video">Video Link</option>
                        <option value="Link">External Reference</option>
                        <option value="Other">Other Document</option>
                      </select>
                    </div>
                  </div>

                  {uploadMode === 'file' ? (
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Select File (PDF, Word, Images, etc.) *</label>
                      <input 
                        type="file" 
                        required={uploadMode === 'file'}
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="w-full text-xs px-3 py-2 bg-slate-50 rounded-xl border border-dashed border-indigo-200 outline-none text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                      {uploadFile && (
                        <p className="mt-1 text-[11px] text-slate-500 font-mono">
                          Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Reference Link / URL *</label>
                      <input 
                        type="url" 
                        required={uploadMode === 'link'}
                        placeholder="https://drive.google.com/..."
                        value={uploadUrl}
                        onChange={(e) => setUploadUrl(e.target.value)}
                        className="w-full text-xs px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-indigo-650 focus:bg-white font-medium"
                      />
                    </div>
                  )}

                  {isUploading && uploadProgress > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-indigo-600">
                        <span>Uploading file...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full rounded-full transition-all duration-200" 
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isUploading}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isUploading ? "Uploading..." : "Publish Study Resource"}</span>
                  </button>
                </form>
              </div>
            )}

            {/* Right side Catalog List of Resources */}
            <div className={`${currentUser?.role === 'tutor' ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-6`}>
              
              {/* Material Search and Filtering */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={resSearchTerm}
                    onChange={(e) => setResSearchTerm(e.target.value)}
                    placeholder="Search resources by title, description or tutor..."
                    className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-indigo-650 focus:bg-white transition-all font-sans"
                  />
                </div>

                <div className="w-full md:w-48">
                  <select
                    value={resSelectedSubject}
                    onChange={(e) => setResSelectedSubject(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-indigo-650 focus:bg-white transition-all font-bold text-slate-700 cursor-pointer"
                  >
                    {subjectCategories.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resource Cards Grid */}
              {filteredMaterials.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-4 animate-pulse" />
                  <h3 className="text-xs font-extrabold text-slate-900 font-sans">No materials found</h3>
                  <p className="text-xs text-slate-500 mt-2 pb-2 leading-relaxed">
                    There are no syllabus study resources currently matching your filter conditions.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredMaterials.map((mat) => (
                    <div 
                      key={mat.id} 
                      className="bg-white border border-slate-200/90 hover:border-indigo-200 rounded-3xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.015)] transition-all flex flex-col justify-between"
                      id={`resource_card_${mat.id}`}
                    >
                      <div>
                        {/* Subject and Delete header */}
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                            mat.subject.toLowerCase() === 'mathematics' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            mat.subject.toLowerCase() === 'physics' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            mat.subject.toLowerCase() === 'english' ? 'bg-pink-50 text-pink-700 border-pink-200' :
                            mat.subject.toLowerCase() === 'coding' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            'bg-gray-50 text-gray-700 border-gray-200'
                          }`}>
                            {mat.subject}
                          </span>
                          
                          {/* Only creator or admin can delete */}
                          {(currentUser?.uid === mat.tutorId || currentUser?.role === 'admin') && (
                            <button 
                              onClick={() => handleDeleteResource(mat.id, mat.title)}
                              className="text-slate-450 hover:text-rose-600 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                              title="Delete Resource Reference"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Title and description */}
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 mb-1 leading-snug tracking-tight">
                          {mat.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3 mb-4">
                          {mat.description}
                        </p>
                      </div>

                      {/* Footer information */}
                      <div className="border-t border-slate-100 pt-4 mt-auto">
                        {mat.classTitle && (
                          <div className="text-[9px] text-indigo-650 font-bold mb-2 flex items-center gap-1">
                            <FileText className="w-3 h-3 text-indigo-400" />
                            <span className="truncate">Class: {mat.classTitle}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center gap-2">
                          <div className="text-[10px] text-slate-400 leading-none">
                            <span className="block font-medium">Uploaded by:</span>
                            <span className="block font-bold text-slate-700 mt-0.5">{mat.tutorName}</span>
                          </div>
                          
                          <button 
                            type="button"
                            onClick={() => binaryStore.openOrDownload(mat)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-indigo-600 text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download / Open</span>
                            <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}

            </div>

          </div>
        )}

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
    </div>
  );
};
