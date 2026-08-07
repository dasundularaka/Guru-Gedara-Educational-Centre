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

interface ClassesProps {
  onNavigateTab: (tab: string) => void;
}

const DEFAULT_SUBJECT_CATEGORIES = ["All Subjects", "Mathematics", "Physics", "English", "Coding"];

const INITIAL_MATERIALS: StudyMaterial[] = [];

export const Classes: React.FC<ClassesProps> = ({ onNavigateTab }) => {
  const { classes, refreshClasses, currentUser, showToast } = useApp();
  
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

  // Fetch Study Materials from genericFirestoreService
  const fetchStudyMaterials = async () => {
    try {
      const list = await genericFirestoreService.getCollection<StudyMaterial>('study_materials');
      setStudyMaterials(list || []);
    } catch (e) {
      console.warn("Failed retrieving study materials", e);
      setStudyMaterials([]);
    }
  };

  // Filter Tuition Classes
  useEffect(() => {
    let result = [...classes];

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
  }, [classes, searchTerm, selectedSubject, sortBy, availabilityFilter, selectedLevel, selectedDay, selectedTimeOfDay]);

  // Filter Study Materials
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
        m.tutorName.toLowerCase().includes(term)
      );
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredMaterials(result);
  }, [studyMaterials, resSearchTerm, resSelectedSubject]);

  // Handle study material upload
  const handleUploadResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    if (!uploadTitle.trim() || !uploadUrl.trim() || !uploadDesc.trim()) {
      showToast("Please fill in all the required fields for study material.", "error");
      return;
    }

    // Basic URL validation
    if (!uploadUrl.startsWith("http://") && !uploadUrl.startsWith("https://")) {
      showToast("Please enter a valid reference URL starting with http:// or https://", "error");
      return;
    }

    setIsUploading(true);
    try {
      const selectedClassItem = classes.find(c => c.id === uploadClassId);
      
      const newMaterial: Omit<StudyMaterial, 'id'> = {
        title: uploadTitle.trim(),
        description: uploadDesc.trim(),
        subject: uploadSubject,
        referenceUrl: uploadUrl.trim(),
        tutorId: currentUser.uid,
        tutorName: currentUser.name,
        classId: uploadClassId || undefined,
        classTitle: selectedClassItem?.title || undefined,
        createdAt: new Date().toISOString()
      };

      const docId = await genericFirestoreService.addDocument('study_materials', newMaterial);
      showToast(`Study material '${uploadTitle}' uploaded successfully!`, "success");
      
      // Reset form fields
      setUploadTitle("");
      setUploadDesc("");
      setUploadUrl("");
      setUploadClassId("");
      
      // Refresh list
      await fetchStudyMaterials();
    } catch (error) {
      showToast("Failed to upload study material. Try again.", "error");
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
      await genericFirestoreService.deleteDocument('study_materials', deleteConfirmModal.id);
      showToast("Study material removed successfully.", "success");
      await fetchStudyMaterials();
      setDeleteConfirmModal({ isOpen: false, id: '', title: '', isDeleting: false });
    } catch (err) {
      showToast("Failed to delete study material.", "error");
      setDeleteConfirmModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  // Get current user's classes to link resources to
  const tutorClasses = classes.filter(c => c.tutorId === currentUser?.uid);

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
            {/* Filters and search blocks */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.01)] p-5 sm:p-7 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                
                {/* Search Input */}
                <div className="relative md:col-span-5">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search classes by title, topic tags, or tutor name..."
                    className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-indigo-600 focus:bg-white transition-all font-sans"
                  />
                </div>

                {/* Subject Selector */}
                <div className="md:col-span-2">
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-indigo-600 focus:bg-white transition-all font-bold text-slate-700 cursor-pointer"
                  >
                    {subjectCategories.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                {/* Availability status Selector */}
                <div className="md:col-span-3">
                  <select
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value as 'all' | 'open' | 'full')}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-indigo-600 focus:bg-white transition-all font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="all">Availability: All Classes</option>
                    <option value="open">Availability: Available Slots</option>
                    <option value="full">Availability: Fully Booked</option>
                  </select>
                </div>

                {/* Sort order Selector */}
                <div className="md:col-span-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-indigo-600 focus:bg-white transition-all font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="default">Sort by: Default</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="spots_left">Available Seats Left</option>
                  </select>
                </div>

              </div>

              {/* Advanced Course Level, Day of Week, and Time of Day Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
                {/* Level Selector */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Class Level</label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-indigo-600 focus:bg-white transition-all font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="All Levels">All Levels / Grades</option>
                    <option value="Beginner">Beginner / Elementary</option>
                    <option value="Middle School">Middle School / Foundations</option>
                    <option value="High School">High School / Senior</option>
                    <option value="AP Prep">AP Prep / Exams</option>
                    <option value="Advanced">Advanced / Honors</option>
                  </select>
                </div>

                {/* Day of the Week Selector */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Day of Week</label>
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-indigo-600 focus:bg-white transition-all font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="All Days">All Days of Week</option>
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
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Time of Day</label>
                  <select
                    value={selectedTimeOfDay}
                    onChange={(e) => setSelectedTimeOfDay(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-indigo-600 focus:bg-white transition-all font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="All Times">All Times of Day</option>
                    <option value="Morning">Morning (AM / early slots)</option>
                    <option value="Afternoon">Afternoon (12:00 PM - 05:00 PM)</option>
                    <option value="Evening">Evening (05:00 PM onwards)</option>
                  </select>
                </div>
              </div>

              {/* Quick pills */}
              <div className="flex gap-2 flex-wrap items-center mt-5 border-t border-slate-100 pt-5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">Quick Filters:</span>
                {subjectCategories.map(sub => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubject(sub)}
                    className={`px-3 py-1 rounded-full border text-[11px] transition-all font-bold cursor-pointer ${
                      selectedSubject === sub 
                        ? 'bg-slate-900 text-white border-slate-900 font-extrabold shadow-sm' 
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
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
                      rows={3}
                      placeholder="e.g. Formulative guide and worksheets with answers keys for limits assessment checks..."
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

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Reference Link / URL *</label>
                    <input 
                      type="url" 
                      required
                      placeholder="https://example.com/materials/calculus_notes.pdf"
                      value={uploadUrl}
                      onChange={(e) => setUploadUrl(e.target.value)}
                      className="w-full text-xs px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-indigo-650 focus:bg-white font-medium"
                    />
                  </div>

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
                          
                          <a 
                            href={mat.referenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-indigo-600 text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download / Open</span>
                            <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                          </a>
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
