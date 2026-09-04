import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Announcement, 
  AnnouncementPriority 
} from '../types';
import { AdminAnnouncementPanel } from '../components/AdminAnnouncementPanel';
import { ConfirmModal } from '../components/ConfirmModal';
import { firestoreService } from '../lib/firestoreService';
import { 
  Megaphone, 
  Search, 
  Pin, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Bell, 
  Calendar, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Layers, 
  Plus, 
  Trash2, 
  Edit3, 
  Filter, 
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  ChevronDown,
  ShieldCheck,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AnnouncementsProps {
  onNavigateTab: (tab: string) => void;
}

const PRIORITY_BADGE_CONFIG: Record<AnnouncementPriority, {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
  icon: any;
}> = {
  urgent: {
    label: 'Urgent Priority',
    bg: 'bg-rose-50 dark:bg-rose-950/60',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    dot: 'bg-rose-500 animate-pulse',
    icon: AlertCircle
  },
  high: {
    label: 'High Priority',
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
    icon: AlertTriangle
  },
  normal: {
    label: 'Normal Priority',
    bg: 'bg-blue-50 dark:bg-blue-950/60',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
    icon: Info
  },
  low: {
    label: 'Low / Routine',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
    icon: Bell
  }
};

export const Announcements: React.FC<AnnouncementsProps> = ({ onNavigateTab }) => {
  const { currentUser, announcements, refreshAnnouncements, classes, bookings, showToast } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  // Deletion modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    announcement: Announcement | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    announcement: null,
    isDeleting: false
  });

  const isAdmin = currentUser?.role === 'admin';
  const isTutor = currentUser?.role === 'tutor';
  const isStudent = currentUser?.role === 'student';

  // Classes the student is enrolled in
  const studentEnrolledClassIds = useMemo(() => {
    if (!isStudent || !currentUser) return [];
    const fromBookings = bookings
      .filter(b => b.studentId === currentUser.uid && b.status === 'active')
      .map(b => b.classId);
    const fromProfile = currentUser.selectedClasses || [];
    return Array.from(new Set([...fromBookings, ...fromProfile]));
  }, [isStudent, currentUser, bookings]);

  // Classes the tutor teaches
  const tutorTaughtClassIds = useMemo(() => {
    if (!isTutor || !currentUser) return [];
    return classes
      .filter(c => 
        c.tutorId === currentUser.uid || 
        c.tutorName === currentUser.name || 
        (c.tutorEmail && currentUser.email && c.tutorEmail.toLowerCase() === currentUser.email.toLowerCase())
      )
      .map(c => c.id);
  }, [isTutor, currentUser, classes]);

  // Audience filtering:
  // - Admin sees everything
  // - Student sees: targetType === 'all' OR 'all_students' OR ('classes' matching studentEnrolledClassIds)
  // - Tutor sees: targetType === 'all' OR 'tutors_only' OR ('classes' matching tutorTaughtClassIds)
  const audienceFilteredAnnouncements = useMemo(() => {
    return announcements.filter(ann => {
      if (isAdmin) return true;

      if (ann.targetType === 'all') return true;

      if (isStudent) {
        if (ann.targetType === 'all_students') return true;
        if (ann.targetType === 'classes' && ann.targetClassIds) {
          return ann.targetClassIds.some(cid => studentEnrolledClassIds.includes(cid));
        }
        return false;
      }

      if (isTutor) {
        if (ann.targetType === 'tutors_only') return true;
        if (ann.targetType === 'classes' && ann.targetClassIds) {
          return ann.targetClassIds.some(cid => tutorTaughtClassIds.includes(cid));
        }
        return false;
      }

      return false;
    });
  }, [announcements, isAdmin, isStudent, isTutor, studentEnrolledClassIds, tutorTaughtClassIds]);

  // Search & Filter
  const filteredAnnouncements = useMemo(() => {
    return audienceFilteredAnnouncements.filter(ann => {
      const matchesSearch = 
        ann.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ann.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ann.category && ann.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ann.authorName && ann.authorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ann.targetClassTitles && ann.targetClassTitles.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchesPriority = selectedPriority === 'all' || ann.priority === selectedPriority;
      const matchesCategory = selectedCategory === 'all' || ann.category === selectedCategory;

      return matchesSearch && matchesPriority && matchesCategory;
    });
  }, [audienceFilteredAnnouncements, searchTerm, selectedPriority, selectedCategory]);

  // Unique categories in dataset
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    audienceFilteredAnnouncements.forEach(a => {
      if (a.category) cats.add(a.category);
    });
    return Array.from(cats);
  }, [audienceFilteredAnnouncements]);

  const handleDeleteClick = (ann: Announcement) => {
    setDeleteModal({
      isOpen: true,
      announcement: ann,
      isDeleting: false
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.announcement) return;
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));

    try {
      await firestoreService.deleteAnnouncement(deleteModal.announcement.id);
      await refreshAnnouncements();
      showToast("Announcement deleted successfully.", "success");
      setDeleteModal({ isOpen: false, announcement: null, isDeleting: false });
    } catch (e) {
      showToast("Could not delete announcement.", "error");
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const handleEditClick = (ann: Announcement) => {
    setEditingAnnouncement(ann);
    setShowAdminPanel(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatAnnouncementDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoStr;
    }
  };

  return (
    <div className="bg-slate-50/50 dark:bg-slate-950 min-h-screen py-8 sm:py-12 font-sans" id="announcements_page_view">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Top Hero Banner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 text-xs font-black tracking-wide">
                <Megaphone className="w-3.5 h-3.5" />
                <span>Institutional Bulletins & Notices</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Academy Announcements
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Official notices, examination timetables, holiday schedules, and cohort-specific updates from the academic directorate.
              </p>

              {/* Audience Context Tag */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                  <Eye className="w-3.5 h-3.5 text-indigo-500" /> Viewing as:
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {currentUser?.role || 'Guest'}
                </span>
                {isStudent && (
                  <span className="text-[11px] text-slate-500">
                    Filtered for your enrolled classes & general student notices
                  </span>
                )}
                {isTutor && (
                  <span className="text-[11px] text-slate-500">
                    Showing faculty operations & assigned class bulletins
                  </span>
                )}
                {isAdmin && (
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                    Admin mode: All broadcast cohorts visible
                  </span>
                )}
              </div>
            </div>

            {/* Admin Broadcast Trigger */}
            {isAdmin && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingAnnouncement(null);
                    setShowAdminPanel(!showAdminPanel);
                  }}
                  className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  id="btn_admin_create_announcement"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAdminPanel ? 'Close Announcement Panel' : 'Publish New Announcement'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Admin Broadcast Panel (Collapsible / Toggleable) */}
        <AnimatePresence>
          {isAdmin && showAdminPanel && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <AdminAnnouncementPanel
                editingAnnouncement={editingAnnouncement}
                onClearEditing={() => setEditingAnnouncement(null)}
                onSuccess={() => {
                  setShowAdminPanel(false);
                  setEditingAnnouncement(null);
                }}
                onCancel={() => {
                  setShowAdminPanel(false);
                  setEditingAnnouncement(null);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search announcements by keyword, author, or class..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                id="search_announcements_input"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 shrink-0 hidden sm:inline">Priority:</span>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                id="filter_priority_select"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low / Routine</option>
              </select>
            </div>

            {/* Category Filter */}
            {availableCategories.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 shrink-0 hidden sm:inline">Category:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                  id="filter_category_select"
                >
                  <option value="all">All Categories</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Quick Priority Tags */}
          <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 shrink-0">Quick Filter:</span>
            
            <button
              onClick={() => setSelectedPriority('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedPriority === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All ({audienceFilteredAnnouncements.length})
            </button>

            <button
              onClick={() => setSelectedPriority('urgent')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                selectedPriority === 'urgent'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              Urgent ({audienceFilteredAnnouncements.filter(a => a.priority === 'urgent').length})
            </button>

            <button
              onClick={() => setSelectedPriority('high')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                selectedPriority === 'high'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              High ({audienceFilteredAnnouncements.filter(a => a.priority === 'high').length})
            </button>

            <button
              onClick={() => setSelectedPriority('normal')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                selectedPriority === 'normal'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              }`}
            >
              <Info className="w-3 h-3" />
              Normal ({audienceFilteredAnnouncements.filter(a => a.priority === 'normal').length})
            </button>

            <button
              onClick={() => setSelectedPriority('low')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                selectedPriority === 'low'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Bell className="w-3 h-3" />
              Routine ({audienceFilteredAnnouncements.filter(a => a.priority === 'low').length})
            </button>
          </div>
        </div>

        {/* Announcement List */}
        <div className="space-y-4">
          {filteredAnnouncements.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 mx-auto flex items-center justify-center">
                <Megaphone className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  No announcements found
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {searchTerm || selectedPriority !== 'all' || selectedCategory !== 'all'
                    ? "Try adjusting your search criteria or filter tags."
                    : "There are currently no active announcements for your cohort."}
                </p>
              </div>
              {(searchTerm || selectedPriority !== 'all' || selectedCategory !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedPriority('all');
                    setSelectedCategory('all');
                  }}
                  className="px-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredAnnouncements.map((ann) => {
                const priorityBadge = PRIORITY_BADGE_CONFIG[ann.priority] || PRIORITY_BADGE_CONFIG.normal;
                const PriorityIcon = priorityBadge.icon;

                return (
                  <motion.div
                    key={ann.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white dark:bg-slate-900 border rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-md transition-all space-y-4 ${
                      ann.isPinned
                        ? 'border-indigo-300 dark:border-indigo-800/80 ring-2 ring-indigo-500/10'
                        : priorityBadge.border
                    }`}
                    id={`announcement_card_${ann.id}`}
                  >
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Priority Badge */}
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border ${priorityBadge.bg} ${priorityBadge.text} ${priorityBadge.border}`}>
                          <span className={`w-2 h-2 rounded-full ${priorityBadge.dot}`} />
                          <PriorityIcon className="w-3.5 h-3.5" />
                          <span>{priorityBadge.label}</span>
                        </span>

                        {/* Category Badge */}
                        {ann.category && (
                          <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {ann.category}
                          </span>
                        )}

                        {/* Pinned Pill */}
                        {ann.isPinned && (
                          <span className="px-2 py-1 rounded-xl text-[11px] font-bold bg-indigo-600 text-white flex items-center gap-1 shadow-xs">
                            <Pin className="w-3 h-3" /> Pinned
                          </span>
                        )}
                      </div>

                      {/* Date & Author */}
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatAnnouncementDate(ann.createdAt)}</span>
                      </div>
                    </div>

                    {/* Announcement Title & Content */}
                    <div className="space-y-2">
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
                        {ann.title}
                      </h3>
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                        {ann.content}
                      </p>
                    </div>

                    {/* Class badges if specific class targeting */}
                    {ann.targetType === 'classes' && ann.targetClassTitles && ann.targetClassTitles.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-emerald-500" /> Target Classes:
                        </span>
                        {ann.targetClassTitles.map((cTitle, idx) => (
                          <span 
                            key={idx}
                            className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                          >
                            {cTitle}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer: Target Metadata & Admin Actions */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap items-center gap-4 text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Audience: <strong>
                            {ann.targetType === 'all' && 'All Academy'}
                            {ann.targetType === 'all_students' && 'Students Only'}
                            {ann.targetType === 'tutors_only' && 'Faculty Tutors Only'}
                            {ann.targetType === 'classes' && `${ann.targetClassIds?.length || 0} Specific Classes`}
                          </strong></span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span>Issued by: <strong className="text-slate-700 dark:text-slate-300">{ann.authorName}</strong></span>
                        </div>
                      </div>

                      {/* Admin Management Tools */}
                      {isAdmin && (
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleEditClick(ann)}
                            className="p-1.5 px-2.5 rounded-xl text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 font-bold transition-colors flex items-center gap-1 cursor-pointer border border-indigo-200 dark:border-indigo-800"
                            title="Edit announcement"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteClick(ann)}
                            className="p-1.5 px-2.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold transition-colors flex items-center gap-1 cursor-pointer border border-rose-200 dark:border-rose-800"
                            title="Delete announcement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Announcement"
        message={`Are you sure you want to delete "${deleteModal.announcement?.title}"? This notice will be permanently removed from the academy bulletin.`}
        confirmText="Delete Announcement"
        cancelText="Cancel"
        isLoading={deleteModal.isDeleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteModal({ isOpen: false, announcement: null, isDeleting: false })}
        variant="danger"
      />
    </div>
  );
};
