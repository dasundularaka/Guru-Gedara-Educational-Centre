import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../lib/firestoreService';
import { 
  Announcement, 
  AnnouncementPriority, 
  AnnouncementTargetType, 
  ClassItem 
} from '../types';
import { 
  Megaphone, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Bell, 
  Pin, 
  Users, 
  GraduationCap, 
  BookOpen, 
  CheckSquare, 
  Square, 
  Eye, 
  Sparkles,
  X,
  Layers,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminAnnouncementPanelProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  editingAnnouncement?: Announcement | null;
  onClearEditing?: () => void;
}

const CATEGORIES = [
  "Academic Calendar",
  "Exams & Evaluations",
  "Curriculum & Syllabi",
  "Tuition & Fees",
  "Faculty Operations",
  "Campus Alert",
  "General Notice"
];

const PRIORITIES: { 
  value: AnnouncementPriority; 
  label: string; 
  sublabel: string; 
  color: string; 
  badgeBg: string; 
  badgeText: string; 
  borderColor: string;
  icon: any;
}[] = [
  {
    value: 'urgent',
    label: 'Urgent Priority',
    sublabel: 'Emergency or immediate action required',
    color: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/60',
    badgeText: 'text-rose-700 dark:text-rose-300',
    borderColor: 'border-rose-200 dark:border-rose-800',
    icon: AlertCircle
  },
  {
    value: 'high',
    label: 'High Priority',
    sublabel: 'Important academic deadlines & exam notices',
    color: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
    badgeText: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: AlertTriangle
  },
  {
    value: 'normal',
    label: 'Normal Priority',
    sublabel: 'Standard operational updates and reminders',
    color: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/60',
    badgeText: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: Info
  },
  {
    value: 'low',
    label: 'Low / Routine',
    sublabel: 'General academic information and guidelines',
    color: 'text-slate-600 dark:text-slate-400',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-700 dark:text-slate-300',
    borderColor: 'border-slate-200 dark:border-slate-700',
    icon: Bell
  }
];

export const AdminAnnouncementPanel: React.FC<AdminAnnouncementPanelProps> = ({
  onSuccess,
  onCancel,
  editingAnnouncement,
  onClearEditing
}) => {
  const { currentUser, classes, refreshAnnouncements, showToast } = useApp();

  const [title, setTitle] = useState(editingAnnouncement?.title || '');
  const [content, setContent] = useState(editingAnnouncement?.content || '');
  const [priority, setPriority] = useState<AnnouncementPriority>(editingAnnouncement?.priority || 'normal');
  const [targetType, setTargetType] = useState<AnnouncementTargetType>(editingAnnouncement?.targetType || 'all');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(editingAnnouncement?.targetClassIds || []);
  const [category, setCategory] = useState(editingAnnouncement?.category || 'General Notice');
  const [isPinned, setIsPinned] = useState(editingAnnouncement?.isPinned || false);
  const [isPreview, setIsPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classSearch, setClassSearch] = useState('');

  // Handle class selection toggle
  const toggleClass = (classId: string) => {
    setSelectedClassIds(prev => 
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  const selectAllClasses = () => {
    setSelectedClassIds(classes.map(c => c.id));
  };

  const deselectAllClasses = () => {
    setSelectedClassIds([]);
  };

  const filteredClassesList = classes.filter(c => 
    c.title.toLowerCase().includes(classSearch.toLowerCase()) ||
    c.subject.toLowerCase().includes(classSearch.toLowerCase()) ||
    (c.tutorName && c.tutorName.toLowerCase().includes(classSearch.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("Please enter an announcement heading.", "warning");
      return;
    }
    if (!content.trim()) {
      showToast("Please write the announcement message.", "warning");
      return;
    }
    if (targetType === 'classes' && selectedClassIds.length === 0) {
      showToast("Please select at least one class for this announcement.", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedClassesMeta = classes.filter(c => selectedClassIds.includes(c.id));
      const targetClassTitles = selectedClassesMeta.map(c => c.title);

      if (editingAnnouncement) {
        await firestoreService.updateAnnouncement(editingAnnouncement.id, {
          title: title.trim(),
          content: content.trim(),
          priority,
          targetType,
          targetClassIds: targetType === 'classes' ? selectedClassIds : [],
          targetClassTitles: targetType === 'classes' ? targetClassTitles : [],
          category,
          isPinned
        });
        showToast("Announcement updated successfully.", "success");
      } else {
        await firestoreService.createAnnouncement({
          title: title.trim(),
          content: content.trim(),
          priority,
          targetType,
          targetClassIds: targetType === 'classes' ? selectedClassIds : [],
          targetClassTitles: targetType === 'classes' ? targetClassTitles : [],
          category,
          authorId: currentUser?.uid || 'admin',
          authorName: currentUser?.displayName || currentUser?.name || 'Administrator',
          authorRole: 'admin',
          isPinned
        });
        showToast("Announcement published and notifications sent!", "success");
      }

      await refreshAnnouncements();

      if (onSuccess) onSuccess();
      if (onClearEditing) onClearEditing();

      // Reset form
      if (!editingAnnouncement) {
        setTitle('');
        setContent('');
        setPriority('normal');
        setTargetType('all');
        setSelectedClassIds([]);
        setCategory('General Notice');
        setIsPinned(false);
        setIsPreview(false);
      }
    } catch (err: any) {
      console.error("Announcement dispatch error:", err);
      showToast("Failed to publish announcement. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPriorityConfig = PRIORITIES.find(p => p.value === priority) || PRIORITIES[2];

  return (
    <div 
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl shadow-slate-100/50 dark:shadow-none font-sans"
      id="admin_announcement_panel"
    >
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {editingAnnouncement ? 'Edit Academy Announcement' : 'Publish Institutional Announcement'}
              </h3>
              <span className="text-[10px] uppercase font-mono font-extrabold tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Admin Broadcast
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Target specific cohorts with labelled priorities. Automated notifications are sent to recipients.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              isPreview 
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 text-indigo-600 dark:text-indigo-400' 
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
            id="btn_toggle_announcement_preview"
          >
            <Eye className="w-3.5 h-3.5" />
            {isPreview ? 'Back to Editor' : 'Live Card Preview'}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isPreview ? (
        /* Preview Card */
        <div className="py-6 max-w-2xl mx-auto space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
            Recipient View Mockup
          </div>
          
          <div className={`p-6 rounded-3xl border ${currentPriorityConfig.borderColor} ${currentPriorityConfig.badgeBg} shadow-sm space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${currentPriorityConfig.badgeBg} ${currentPriorityConfig.badgeText} border ${currentPriorityConfig.borderColor}`}>
                  <currentPriorityConfig.icon className="w-3.5 h-3.5" />
                  {currentPriorityConfig.label}
                </span>

                <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                  {category}
                </span>

                {isPinned && (
                  <span className="px-2 py-1 rounded-xl text-[11px] font-bold bg-indigo-600 text-white flex items-center gap-1">
                    <Pin className="w-3 h-3" /> Pinned
                  </span>
                )}
              </div>

              <span className="text-[11px] font-mono text-slate-400">
                Just now • By {currentUser?.name || 'Academic Administration'}
              </span>
            </div>

            <h4 className="text-lg font-black text-slate-900 dark:text-white leading-snug">
              {title || "Untitled Announcement"}
            </h4>

            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
              {content || "No message body specified yet. Type your announcement text in the editor."}
            </p>

            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                <span>Target: <strong>
                  {targetType === 'all' && 'All Academy (Students & Faculty)'}
                  {targetType === 'all_students' && 'Students Only'}
                  {targetType === 'tutors_only' && 'Tutors Only'}
                  {targetType === 'classes' && `${selectedClassIds.length} Selected Classes`}
                </strong></span>
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Direct Push Alert Triggered
              </span>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setIsPreview(false)}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              ← Edit details & publish
            </button>
          </div>
        </div>
      ) : (
        /* Edit Form */
        <form onSubmit={handleSubmit} className="mt-5 space-y-6">
          {/* 1. Target Audience Filter (Requirement: "admins can filter receivers and send announcements, like tutors only, all students only, or specific class or classes") */}
          <div className="space-y-2.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              1. Filter Target Receivers:
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose who will be able to see this announcement and receive the instant notification alert.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Option A: All Academy */}
              <button
                type="button"
                onClick={() => setTargetType('all')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  targetType === 'all'
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100/70'
                }`}
                id="target_filter_all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="p-2 rounded-xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs">
                    <Users className="w-4 h-4" />
                  </span>
                  {targetType === 'all' ? (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">All Academy</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Students, Tutors & Staff</div>
                </div>
              </button>

              {/* Option B: All Students Only */}
              <button
                type="button"
                onClick={() => setTargetType('all_students')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  targetType === 'all_students'
                    ? 'bg-blue-50/70 dark:bg-blue-950/50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100/70'
                }`}
                id="target_filter_all_students"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="p-2 rounded-xl bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs">
                    <GraduationCap className="w-4 h-4" />
                  </span>
                  {targetType === 'all_students' ? (
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">All Students Only</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Every enrolled student</div>
                </div>
              </button>

              {/* Option C: Tutors Only */}
              <button
                type="button"
                onClick={() => setTargetType('tutors_only')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  targetType === 'tutors_only'
                    ? 'bg-purple-50/70 dark:bg-purple-950/50 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100/70'
                }`}
                id="target_filter_tutors_only"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="p-2 rounded-xl bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs">
                    <BookOpen className="w-4 h-4" />
                  </span>
                  {targetType === 'tutors_only' ? (
                    <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">Tutors Only</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">All teaching faculty</div>
                </div>
              </button>

              {/* Option D: Specific Class or Classes */}
              <button
                type="button"
                onClick={() => setTargetType('classes')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  targetType === 'classes'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100/70'
                }`}
                id="target_filter_classes"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="p-2 rounded-xl bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs">
                    <Layers className="w-4 h-4" />
                  </span>
                  {targetType === 'classes' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">Specific Class(es)</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedClassIds.length > 0 ? `${selectedClassIds.length} class(es) selected` : 'Select classes below'}
                  </div>
                </div>
              </button>
            </div>

            {/* If Specific Classes selected, show interactive class picker */}
            <AnimatePresence>
              {targetType === 'classes' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 p-4 bg-slate-50 dark:bg-slate-800/70 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-3 overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        Select Target Classes:
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                        {selectedClassIds.length} of {classes.length} selected
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold">
                      <button
                        type="button"
                        onClick={selectAllClasses}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={deselectAllClasses}
                        className="text-slate-500 hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Filter input */}
                  <input
                    type="text"
                    value={classSearch}
                    onChange={(e) => setClassSearch(e.target.value)}
                    placeholder="Search by class title, subject, or tutor..."
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />

                  {/* Class options list */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {filteredClassesList.map((cls: ClassItem) => {
                      const isSelected = selectedClassIds.includes(cls.id);
                      return (
                        <div
                          key={cls.id}
                          onClick={() => toggleClass(cls.id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 text-xs select-none ${
                            isSelected
                              ? 'bg-emerald-100/50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-700 text-slate-900 dark:text-white font-bold'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100/50'
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-bold">{cls.title}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                              {cls.subject} • {cls.tutorName}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 2. Labelled Priorities (Requirement: "And add labelled priorities") */}
          <div className="space-y-2.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              2. Labelled Priority Level:
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Each priority features distinct badges, optical indicators, and notification urgency tags.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PRIORITIES.map((p) => {
                const Icon = p.icon;
                const isSelected = priority === p.value;

                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? `${p.badgeBg} ${p.borderColor} ring-2 ring-current shadow-xs`
                        : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100/70'
                    }`}
                    id={`priority_${p.value}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`p-1.5 rounded-lg ${p.badgeBg} ${p.color}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      {isSelected ? (
                        <CheckCircle2 className={`w-4 h-4 ${p.color}`} />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600" />
                      )}
                    </div>
                    <div>
                      <div className={`text-xs font-black ${isSelected ? p.color : 'text-slate-900 dark:text-white'}`}>
                        {p.label}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                        {p.sublabel}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Category & Pin Option */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Category / Classification:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50/70 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium focus:ring-2 focus:ring-indigo-500/20"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <Pin className="w-3.5 h-3.5 text-indigo-600" /> Pin Announcement to Top
                  </span>
                  <span className="text-[11px] text-slate-400 block">Stays highlighted at the summit of the bulletin</span>
                </div>
              </label>
            </div>
          </div>

          {/* 4. Title & Content */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Announcement Headline / Title:
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Year 2026 Advanced Level Mathematics Seminar Schedule Rescheduled"
                className="w-full text-sm font-bold px-4 py-3 bg-slate-50/70 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                id="announcement_title_input"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Announcement Body & Details:
              </label>
              <textarea
                required
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Detail the academic announcement with clear guidelines, dates, or required student preparations..."
                className="w-full text-xs p-4 bg-slate-50/70 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 leading-relaxed font-sans"
                id="announcement_content_textarea"
              />
            </div>
          </div>

          {/* Explicit Notice Reminder (Requirement: "Notifications and announcements are not same. If a user have a new announcement, send a notification informing as You have new announcement.") */}
          <div className="p-3.5 bg-blue-50/80 dark:bg-slate-800/80 border border-blue-200 dark:border-slate-700 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
            <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Automated Companion Notification Trigger:</span>
              <span className="text-[11px] text-blue-700 dark:text-blue-300">
                Publishing this announcement will post the notice on the official Announcements page AND immediately dispatch a notification reading:
                <em className="font-mono font-bold"> "You have new announcement: {title || '...'}"</em> to all matching receivers.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim()}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
              id="admin_btn_publish_announcement"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Publishing & Dispatching Alerts...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{editingAnnouncement ? 'Save & Broadcast Changes' : 'Publish & Broadcast Announcement'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
