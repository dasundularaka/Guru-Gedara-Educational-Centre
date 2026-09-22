import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileQuestion, 
  Plus, 
  Clock, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Play, 
  RotateCcw, 
  Eye, 
  Edit, 
  Trash2, 
  Users, 
  BookOpen, 
  Search,
  Filter,
  Lock,
  Sparkles,
  BarChart3,
  Calendar,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { Quiz, QuizSubmission, ClassItem } from '../types';
import { firestoreService } from '../lib/firestoreService';
import { canUserViewQuiz, canUserManageQuiz } from '../utils/accessControl';
import { QuizBuilderModal } from './QuizBuilderModal';
import { QuizPlayerModal, fireQuizSubmissionConfetti } from './QuizPlayerModal';
import { QuizSubmissionsModal } from './QuizSubmissionsModal';
import { ConfirmModal } from './ConfirmModal';
import { DifficultyBadge } from './DifficultyBadge';

interface QuizListSectionProps {
  classId?: string;
  className?: string;
  showCreateButton?: boolean;
  onNavigateToClass?: (classId: string) => void;
}

export const QuizListSection: React.FC<QuizListSectionProps> = ({
  classId,
  className = '',
  showCreateButton = true,
  onNavigateToClass
}) => {
  const { currentUser, classes, showToast, bookings } = useApp();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'completed' | 'not_taken'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');

  // Modals state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  const [playerOpen, setPlayerOpen] = useState(false);
  const [activeQuizForPlayer, setActiveQuizForPlayer] = useState<Quiz | null>(null);
  const [initialSubmissionForPlayer, setInitialSubmissionForPlayer] = useState<QuizSubmission | null>(null);

  const [submissionsModalOpen, setSubmissionsModalOpen] = useState(false);
  const [activeQuizForSubmissions, setActiveQuizForSubmissions] = useState<Quiz | null>(null);

  const [deleteConfirmQuiz, setDeleteConfirmQuiz] = useState<Quiz | null>(null);

  const isTutorOrAdmin = currentUser?.role === 'tutor' || currentUser?.role === 'admin';
  const isStudent = currentUser?.role === 'student';

  // Load quizzes and real-time subscription
  useEffect(() => {
    setLoading(true);
    const unsub = firestoreService.subscribeQuizzes((data) => {
      setQuizzes(data || []);
      setLoading(false);
    }, classId);

    return () => {
      if (unsub) unsub();
    };
  }, [classId]);

  // Load submissions with real-time subscription
  useEffect(() => {
    if (!currentUser) return;
    const unsub = firestoreService.subscribeQuizSubmissions(
      (subs) => {
        setSubmissions(subs || []);
      },
      undefined,
      isStudent ? currentUser.uid : undefined
    );

    return () => {
      if (unsub) unsub();
    };
  }, [currentUser, isStudent]);

  // Map submissions by quizId for instant access (latest submission for current user)
  const latestSubmissionsByQuiz = useMemo(() => {
    const map = new Map<string, QuizSubmission>();
    if (!currentUser) return map;
    
    const userSubs = submissions
      .filter(s => {
        if (s.id?.startsWith('preview_')) return false;
        if (s.studentName?.toLowerCase().includes('preview')) return false;
        return (
          s.studentId === currentUser.uid ||
          s.studentId === currentUser.username ||
          (currentUser.email && s.studentEmail === currentUser.email)
        );
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    userSubs.forEach(s => {
      if (!map.has(s.quizId)) {
        map.set(s.quizId, s);
      }
    });
    return map;
  }, [submissions, currentUser]);

  // Count student submissions per quiz
  const studentAttemptsCountByQuiz = useMemo(() => {
    const map = new Map<string, number>();
    if (!currentUser || !isStudent) return map;

    const userSubs = submissions.filter(s => {
      if (s.id?.startsWith('preview_')) return false;
      if (s.studentName?.toLowerCase().includes('preview')) return false;
      return (
        s.studentId === currentUser.uid ||
        s.studentId === currentUser.username ||
        (currentUser.email && s.studentEmail === currentUser.email)
      );
    });

    userSubs.forEach(s => {
      map.set(s.quizId, (map.get(s.quizId) || 0) + 1);
    });
    return map;
  }, [submissions, currentUser, isStudent]);

  // Count total submissions per quiz for tutors/admins
  const totalSubmissionsCountByQuiz = useMemo(() => {
    const map = new Map<string, number>();
    submissions.forEach(s => {
      if (s.id?.startsWith('preview_')) return false;
      if (s.studentName?.toLowerCase().includes('preview')) return false;
      map.set(s.quizId, (map.get(s.quizId) || 0) + 1);
    });
    return map;
  }, [submissions]);

  // Check enrollment for student
  const isStudentEnrolledInClass = (targetClassId?: string) => {
    if (!currentUser) return false;
    if (currentUser.role !== 'student') return true;
    if (!targetClassId) return true;

    // Direct selectedClasses
    if (currentUser.selectedClasses?.includes(targetClassId)) return true;

    // Active or approved booking
    const activeBooking = (bookings || []).find(b => 
      b.classId === targetClassId &&
      (b.studentId === currentUser.uid || 
       b.studentId === currentUser.username || 
       (currentUser.email && b.studentEmail && b.studentEmail.toLowerCase() === currentUser.email.toLowerCase())) &&
      (b.status === 'active' || b.status === 'approved' || b.status === 'pending_approval')
    );
    return Boolean(activeBooking);
  };

  // Available classes for tutor to assign quizzes to
  const availableClassesForTutor: ClassItem[] = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return classes || [];
    
    const userUid = (currentUser.uid || '')?.toLowerCase();
    const userName = (currentUser.name || '')?.toLowerCase();
    const userUsername = (currentUser.username || '')?.toLowerCase();
    const userDisplayName = (currentUser.displayName || '')?.toLowerCase();
    const userEmail = (currentUser.email || '')?.toLowerCase();

    return (classes || []).filter(c => {
      const cTutorId = (c.tutorId || '')?.toLowerCase();
      const cTutorName = (c.tutorName || '')?.toLowerCase();
      const cTutorEmail = ((c as any).tutorEmail || '')?.toLowerCase();

      return (
        (cTutorId && (cTutorId === userUid || cTutorId === userUsername)) ||
        (cTutorName && (cTutorName === userName || (userDisplayName && cTutorName === userDisplayName))) ||
        (cTutorEmail && userEmail && cTutorEmail === userEmail)
      );
    });
  }, [classes, currentUser]);

  // Count of enrolled classes for student
  const studentEnrolledClassesCount = useMemo(() => {
    if (!currentUser || currentUser.role !== 'student') return 0;
    const enrolledIds = new Set<string>();
    (currentUser.selectedClasses || []).forEach(cid => {
      if (currentUser.classEnrollmentStatus?.[cid] !== 'suspended') {
        enrolledIds.add(cid);
      }
    });

    const userUid = (currentUser.uid || '')?.toLowerCase();
    const userUsername = (currentUser.username || '')?.toLowerCase();
    const userEmail = (currentUser.email || '')?.toLowerCase();

    (bookings || []).forEach(b => {
      if (b.status === 'active' || b.status === 'approved') {
        const bStudentId = (b.studentId || '')?.toLowerCase();
        const bStudentEmail = ((b as any).studentEmail || '')?.toLowerCase();
        const isMatch =
          (userUid && bStudentId === userUid) ||
          (userUsername && bStudentId === userUsername) ||
          (userEmail && bStudentEmail === userEmail);
        if (isMatch && currentUser.classEnrollmentStatus?.[b.classId] !== 'suspended') {
          enrolledIds.add(b.classId);
        }
      }
    });
    return enrolledIds.size;
  }, [currentUser, bookings]);

  // Handle save quiz from builder
  const handleSaveQuiz = async (quizData: Partial<Quiz>) => {
    try {
      await firestoreService.saveQuiz(quizData);
      showToast(quizData.id ? 'Quiz updated successfully' : 'New quiz created and published', 'success');
      setBuilderOpen(false);
      setEditingQuiz(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to save quiz', 'error');
    }
  };

  // Handle delete quiz
  const handleDeleteQuiz = async () => {
    if (!deleteConfirmQuiz) return;
    try {
      await firestoreService.deleteQuiz(deleteConfirmQuiz.id);
      showToast('Quiz deleted successfully', 'success');
      setDeleteConfirmQuiz(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete quiz', 'error');
    }
  };

  // Helper to resolve custom banner photo or auto-load relevant class banner image
  const resolveQuizBanner = (quiz: Quiz): string => {
    if (quiz.bannerImage && quiz.bannerImage.trim().length > 0) {
      return quiz.bannerImage.trim();
    }
    const targetClass = classes?.find(c => c.id === quiz.classId);
    if (targetClass?.imageUrl && targetClass.imageUrl.trim().length > 0) {
      return targetClass.imageUrl.trim();
    }
    // High-resolution thematic subject fallbacks
    const str = `${quiz.classTitle} ${quiz.title}`.toLowerCase();
    if (str.includes('math') || str.includes('calc') || str.includes('algebra') || str.includes('geometry')) {
      return 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80';
    }
    if (str.includes('physic') || str.includes('chem') || str.includes('science') || str.includes('lab')) {
      return 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80';
    }
    if (str.includes('code') || str.includes('program') || str.includes('tech') || str.includes('comput')) {
      return 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80';
    }
    if (str.includes('biolog') || str.includes('dna') || str.includes('medic') || str.includes('health')) {
      return 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=1200&q=80';
    }
    if (str.includes('english') || str.includes('lit') || str.includes('write') || str.includes('history')) {
      return 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1200&q=80';
    }
    return 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80';
  };

  // Helper to resolve relevant tutor profile photo and name automatically
  const resolveTutorAttribution = (quiz: Quiz) => {
    const targetClass = classes?.find(c => c.id === quiz.classId);
    const tutorName = quiz.tutorName || targetClass?.tutorName || 'Faculty Instructor';
    const tutorPhoto = quiz.tutorPhoto || targetClass?.tutorPhoto || '';
    return { tutorName, tutorPhoto };
  };

  // Filtered quizzes
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(q => {
      // 1. Core Role and Enrollment Permission Check
      if (!canUserViewQuiz(q, currentUser, classes, bookings)) {
        return false;
      }

      // 2. Class scope filter if a specific classId is provided
      if (classId && q.classId !== classId) {
        return false;
      }

      // 3. Class dropdown filter
      if (selectedClassFilter !== 'all' && q.classId !== selectedClassFilter) {
        return false;
      }

      // 4. Search query match
      const matchSearch =
        q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.classTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.description && q.description.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      // 5. Status filter
      if (statusFilter === 'published' && q.status !== 'published') return false;
      if (statusFilter === 'completed') {
        const sub = latestSubmissionsByQuiz.get(q.id);
        if (!sub) return false;
      }
      if (statusFilter === 'not_taken') {
        const sub = latestSubmissionsByQuiz.get(q.id);
        if (sub) return false;
      }

      // 6. Difficulty level filter
      if (difficultyFilter !== 'all') {
        const quizDiff = (q.difficulty || 'beginner').toLowerCase();
        if (quizDiff !== difficultyFilter) return false;
      }

      return true;
    });
  }, [quizzes, currentUser, classes, bookings, classId, selectedClassFilter, searchTerm, statusFilter, difficultyFilter, latestSubmissionsByQuiz]);

  // Overall Statistics for the modernized summary strip
  const stats = useMemo(() => {
    const totalVisible = filteredQuizzes.length;
    let completedCount = 0;
    let passedCount = 0;
    let totalScoreSum = 0;

    filteredQuizzes.forEach(q => {
      const sub = latestSubmissionsByQuiz.get(q.id);
      if (sub) {
        completedCount++;
        totalScoreSum += sub.percentage;
        if (sub.passed) passedCount++;
      }
    });

    const avgScore = completedCount > 0 ? Math.round(totalScoreSum / completedCount) : 0;
    const pendingCount = isStudent ? totalVisible - completedCount : 0;

    return { totalVisible, completedCount, passedCount, avgScore, pendingCount };
  }, [filteredQuizzes, latestSubmissionsByQuiz, isStudent]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Modern Top Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-mono font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>ACADEMY ASSESSMENT CENTER</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Quizzes & Test Assessments
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans font-normal">
              Validate subject mastery with timed checkpoints, customizable banner themes, dedicated faculty attributions, and enforced submission limits.
            </p>
          </div>

          {/* Action button for tutors / admins */}
          {isTutorOrAdmin && showCreateButton && (
            <button
              onClick={() => {
                setEditingQuiz(null);
                setBuilderOpen(true);
              }}
              className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 cursor-pointer shrink-0 hover:scale-[1.02] active:scale-[0.98]"
              id="create_quiz_top_btn"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Create New Assessment
            </button>
          )}
        </div>

        {/* Quick Analytics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-white/10">
          <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Available Tests</span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5 block">
              {stats.totalVisible}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">
              {isStudent ? 'To Complete' : 'Total Submissions'}
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono mt-0.5 block">
              {isStudent ? stats.pendingCount : submissions.length}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">
              {isStudent ? 'Graded Tests' : 'Graded Assessments'}
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-0.5 block">
              {stats.completedCount}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Average Score</span>
            <span className="text-xl sm:text-2xl font-black text-blue-400 font-mono mt-0.5 block">
              {stats.avgScore > 0 ? `${stats.avgScore}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Modern Filter & Search Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-grow max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search assessment titles, subjects, descriptions..."
              className="w-full pl-10 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 dark:text-white transition-all font-sans"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Class Filter Dropdown (if not scoped to single class) */}
            {!classId && classes && classes.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="bg-transparent text-slate-700 dark:text-slate-200 font-bold outline-none cursor-pointer text-xs"
                >
                  <option value="all">All Classes</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Difficulty Level Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Level:</span>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value as any)}
                className="bg-transparent text-slate-700 dark:text-slate-200 font-bold outline-none cursor-pointer text-xs"
                id="filter_difficulty_select"
                title="Filter by Difficulty Level"
              >
                <option value="all">All Levels</option>
                <option value="beginner">🟢 Beginner</option>
                <option value="intermediate">🟡 Intermediate</option>
                <option value="advanced">🟣 Advanced</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs font-bold">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>All Assessments</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-black/10 dark:bg-white/10">
              {filteredQuizzes.length}
            </span>
          </button>

          {isStudent && (
            <>
              <button
                onClick={() => setStatusFilter('not_taken')}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'not_taken'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>Pending / To Take</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-black/10 dark:bg-white/10">
                  {stats.pendingCount}
                </span>
              </button>

              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'completed'
                    ? 'bg-emerald-600 text-white shadow-xs font-black'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Completed & Graded</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-black/10 dark:bg-white/10">
                  {stats.completedCount}
                </span>
              </button>
            </>
          )}

          {isTutorOrAdmin && (
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'published'
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>Published Only</span>
            </button>
          )}
        </div>
      </div>

      {/* Quizzes List Cards */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400 font-mono animate-pulse">
          Loading assessments catalog and submission rules...
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center shadow-inner">
            {isStudent && studentEnrolledClassesCount === 0 ? (
              <Lock className="w-7 h-7 text-amber-500" />
            ) : (
              <FileQuestion className="w-7 h-7" />
            )}
          </div>
          <div>
            <h4 className="text-base font-black text-slate-900 dark:text-white">
              {searchTerm
                ? 'No matching quizzes found'
                : isStudent && studentEnrolledClassesCount === 0
                ? 'No Enrolled Classes Yet'
                : 'No Assessments Available'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 font-sans">
              {searchTerm
                ? 'Try broadening your search term or adjusting difficulty/class filters.'
                : isStudent && studentEnrolledClassesCount === 0
                ? 'Enroll into your active classes to unlock instructor-curated quizzes and tests.'
                : 'Tutors and administrators will publish new test checkpoints here.'}
            </p>
          </div>

          {isTutorOrAdmin && showCreateButton && (
            <button
              onClick={() => {
                setEditingQuiz(null);
                setBuilderOpen(true);
              }}
              className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Define First Quiz
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredQuizzes.map((quiz) => {
            const studentSubmission = latestSubmissionsByQuiz.get(quiz.id);
            const isEnrolled = isStudentEnrolledInClass(quiz.classId);
            const isPendingAssignment = Boolean(isStudent && !studentSubmission && isEnrolled);
            const bannerUrl = resolveQuizBanner(quiz);
            const { tutorName, tutorPhoto } = resolveTutorAttribution(quiz);

            // Attempts calculation
            const studentAttemptsCount = studentAttemptsCountByQuiz.get(quiz.id) || (studentSubmission ? 1 : 0);
            const totalStaffSubmissions = totalSubmissionsCountByQuiz.get(quiz.id) || 0;
            const isUnlimited = quiz.unlimitedAttempts !== false && !quiz.maxAttempts;
            const maxAttempts = quiz.maxAttempts && quiz.maxAttempts > 0 ? quiz.maxAttempts : 1;
            const isLimitReached = Boolean(isStudent && !isUnlimited && studentAttemptsCount >= maxAttempts);

            return (
              <motion.div
                key={quiz.id}
                id={`quiz_card_${quiz.id}`}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className={`bg-white dark:bg-slate-900 rounded-3xl border overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group ${
                  isPendingAssignment
                    ? 'border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-400/20'
                    : 'border-slate-200/90 dark:border-slate-800'
                }`}
              >
                {/* Visual Banner Photo with Floating Chips */}
                <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-slate-900 shrink-0">
                  <img
                    src={bannerUrl}
                    alt={quiz.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // Fallback image if broken
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80';
                    }}
                  />
                  {/* Subtle Dark Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-black/20" />

                  {/* Top Floating Badges */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 z-10">
                    <span className="px-3 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-mono font-bold border border-white/20 truncate max-w-[200px] shadow-sm">
                      {quiz.classTitle}
                    </span>

                    {/* Status badge */}
                    {isTutorOrAdmin ? (
                      <span
                        className={`px-3 py-1 rounded-xl text-[10px] font-mono font-bold uppercase backdrop-blur-md shadow-sm border ${
                          quiz.status === 'published'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {quiz.status}
                      </span>
                    ) : studentSubmission ? (
                      <span
                        className={`px-3 py-1 rounded-xl text-[10px] font-mono font-extrabold uppercase flex items-center gap-1.5 backdrop-blur-md shadow-sm border ${
                          studentSubmission.passed
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {studentSubmission.passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span>{studentSubmission.percentage}% - {studentSubmission.passed ? 'Passed' : 'Needs Work'}</span>
                      </span>
                    ) : !isEnrolled ? (
                      <span className="px-3 py-1 rounded-xl text-[10px] font-mono font-bold bg-slate-900/80 backdrop-blur-md text-slate-300 border border-white/20 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-400" /> Enrollment Required
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-xl text-[10px] font-mono font-black uppercase bg-indigo-950/80 backdrop-blur-md text-indigo-300 border border-indigo-500/50 flex items-center gap-1.5 shadow-md">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400"></span>
                        </span>
                        Pending Assessment
                      </span>
                    )}
                  </div>

                  {/* Bottom Floating Bar on Banner: Tutor Attribution and Attempt Limit */}
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between gap-2 z-10">
                    {/* [photo] By [Name] on Banner Overlay */}
                    <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/15 max-w-[65%]">
                      {tutorPhoto ? (
                        <img
                          src={tutorPhoto}
                          alt={tutorName}
                          className="w-5 h-5 rounded-full object-cover ring-1 ring-white/60 shrink-0"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                          {tutorName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-[11px] text-slate-200 truncate">
                        By <strong className="font-bold text-white">{tutorName}</strong>
                      </span>
                    </div>

                    {/* Attempt Policy Pill */}
                    <div className="flex items-center gap-1 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/15 text-[10px] font-mono text-slate-200 shrink-0">
                      {isStudent ? (
                        isUnlimited ? (
                          <span className="text-emerald-300 font-bold">♾️ Unlimited</span>
                        ) : (
                          <span className={`font-bold flex items-center gap-1 ${isLimitReached ? 'text-rose-400' : 'text-blue-300'}`}>
                            {isLimitReached && <Lock className="w-2.5 h-2.5" />}
                            {studentAttemptsCount}/{maxAttempts} Attempts
                          </span>
                        )
                      ) : (
                        <span>
                          {isUnlimited ? '♾️ Unlimited' : `Max ${maxAttempts} ${maxAttempts === 1 ? 'Attempt' : 'Attempts'}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Content Area */}
                <div className="p-5 space-y-4 flex-grow flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <DifficultyBadge quiz={quiz} size="xs" />
                      <span className="text-[11px] font-mono font-bold text-slate-400 flex items-center gap-1">
                        <FileQuestion className="w-3.5 h-3.5 text-blue-500" />
                        {quiz.questions.length} Questions
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {quiz.title}
                    </h3>

                    {quiz.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-sans font-normal">
                        {quiz.description}
                      </p>
                    )}
                  </div>

                  {/* Spec Strip */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        {quiz.durationMinutes ? `${quiz.durationMinutes} mins` : 'Untimed'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-emerald-500" />
                        Pass: {quiz.passingScorePercentage || 50}%
                      </span>
                    </div>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                      {quiz.totalPoints || quiz.questions.length} Points
                    </span>
                  </div>
                </div>

                {/* Card Footer / Action Buttons */}
                <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80">
                  {/* Student View */}
                  {isStudent && (
                    <div className="flex items-center gap-2 w-full justify-between">
                      {studentSubmission ? (
                        <>
                          <button
                            onClick={() => {
                              setActiveQuizForPlayer(quiz);
                              setInitialSubmissionForPlayer(studentSubmission);
                              setPlayerOpen(true);
                              if (studentSubmission.passed) {
                                fireQuizSubmissionConfetti(true, studentSubmission.percentage);
                              }
                            }}
                            className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                            id={`view_result_btn_${quiz.id}`}
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-500" /> View Result
                          </button>

                          {/* Retake button with attempt limit enforcement */}
                          {isLimitReached ? (
                            <button
                              disabled
                              title={`Maximum limit of ${maxAttempts} submissions reached.`}
                              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                            >
                              <Lock className="w-3.5 h-3.5" /> Limit Reached ({studentAttemptsCount}/{maxAttempts})
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setActiveQuizForPlayer(quiz);
                                setInitialSubmissionForPlayer(null);
                                setPlayerOpen(true);
                              }}
                              className="px-4 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-blue-200 dark:border-blue-900"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Retake Test
                            </button>
                          )}
                        </>
                      ) : isEnrolled ? (
                        <button
                          onClick={() => {
                            setActiveQuizForPlayer(quiz);
                            setInitialSubmissionForPlayer(null);
                            setPlayerOpen(true);
                          }}
                          className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Take Assessment Now
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (onNavigateToClass) {
                              onNavigateToClass(quiz.classId);
                            } else {
                              showToast(`Please enroll in "${quiz.classTitle}" to take this assessment.`, 'info');
                            }
                          }}
                          className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5 text-amber-500" /> Enroll in Class to Unlock
                        </button>
                      )}
                    </div>
                  )}

                  {/* Tutor / Admin View */}
                  {isTutorOrAdmin && (
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setActiveQuizForSubmissions(quiz);
                            setSubmissionsModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-blue-200 dark:border-blue-900"
                          title="View Student Results"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Results ({totalStaffSubmissions})</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveQuizForPlayer(quiz);
                            setInitialSubmissionForPlayer(null);
                            setPlayerOpen(true);
                          }}
                          className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-700"
                          title="Preview as Student"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Preview</span>
                        </button>
                      </div>

                      {canUserManageQuiz(quiz, currentUser, classes) && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingQuiz(quiz);
                              setBuilderOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Edit Quiz"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmQuiz(quiz)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Delete Quiz"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Guest View */}
                  {!currentUser && (
                    <button
                      onClick={() => showToast('Please sign in to take this test assessment.', 'info')}
                      className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Sign In to Take Assessment
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal: Quiz Builder (Tutor / Admin) */}
      {builderOpen && (
        <QuizBuilderModal
          isOpen={builderOpen}
          onClose={() => {
            setBuilderOpen(false);
            setEditingQuiz(null);
          }}
          onSave={handleSaveQuiz}
          initialQuiz={editingQuiz}
          availableClasses={availableClassesForTutor}
          currentUser={currentUser}
          defaultClassId={classId}
        />
      )}

      {/* Modal: Quiz Player (Student Assessment Taking & Solution Review) */}
      {playerOpen && activeQuizForPlayer && (
        <QuizPlayerModal
          quiz={activeQuizForPlayer}
          isOpen={playerOpen}
          onClose={() => {
            setPlayerOpen(false);
            setActiveQuizForPlayer(null);
            setInitialSubmissionForPlayer(null);
          }}
          currentUser={currentUser}
          initialSubmission={initialSubmissionForPlayer}
          attemptsCount={studentAttemptsCountByQuiz.get(activeQuizForPlayer.id) || 0}
          onSubmissionSuccess={async (newSub) => {
            if (newSub.id?.startsWith('preview_') || currentUser?.role === 'admin' || currentUser?.role === 'tutor') {
              return;
            }
            setSubmissions(prev => [newSub, ...prev]);
            showToast(`Assessment submitted! You scored ${newSub.percentage}% (${newSub.score}/${newSub.totalPoints} pts).`, 'success');
          }}
        />
      )}

      {/* Modal: Quiz Submissions (Tutor review of student performance) */}
      {submissionsModalOpen && activeQuizForSubmissions && (
        <QuizSubmissionsModal
          quiz={activeQuizForSubmissions}
          isOpen={submissionsModalOpen}
          onClose={() => {
            setSubmissionsModalOpen(false);
            setActiveQuizForSubmissions(null);
          }}
        />
      )}

      {/* Confirm Delete Modal */}
      {deleteConfirmQuiz && (
        <ConfirmModal
          isOpen={!!deleteConfirmQuiz}
          title="Delete Assessment?"
          message={`Are you sure you want to permanently delete "${deleteConfirmQuiz.title}"? All questions and student score records associated with this quiz will also be removed.`}
          confirmText="Delete Quiz"
          variant="danger"
          onConfirm={handleDeleteQuiz}
          onClose={() => setDeleteConfirmQuiz(null)}
        />
      )}
    </div>
  );
};
