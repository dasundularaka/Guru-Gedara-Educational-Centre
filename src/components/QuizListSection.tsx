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
  Check, 
  Search,
  Filter,
  Lock
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

  // Load submissions for student with real-time subscription
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

  // Map submissions by quizId for instant access
  const latestSubmissionsByQuiz = useMemo(() => {
    const map = new Map<string, QuizSubmission>();
    if (!currentUser) return map;
    
    // Sort so latest submission wins
    const userSubs = submissions
      .filter(s => s.studentId === currentUser.uid || s.studentId === currentUser.username || (currentUser.email && s.studentEmail === currentUser.email))
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    userSubs.forEach(s => {
      if (!map.has(s.quizId)) {
        map.set(s.quizId, s);
      }
    });
    return map;
  }, [submissions, currentUser]);

  // Check enrollment for student
  const isStudentEnrolledInClass = (targetClassId?: string) => {
    if (!currentUser) return false;
    if (currentUser.role !== 'student') return true;
    if (!targetClassId) return true;

    // Check direct selectedClasses
    if (currentUser.selectedClasses?.includes(targetClassId)) return true;

    // Check bookings with all student identifier matches and valid statuses
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
      showToast(quizData.id ? 'Quiz updated successfully!' : 'Quiz published successfully!', 'success');
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

  // Filtered quizzes strictly adhering to authorization rules:
  // - Admins can see all quizzes (draft & published, all tutors and all classes)
  // - Tutors can ONLY see quizzes for classes they teach / are assigned to, or created by them
  // - Students can ONLY see published quizzes for classes they are actively enrolled in
  // - Non-enrolled students and unassigned tutors cannot see any quizzes
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

      // 3. Search query match
      const matchSearch =
        q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.classTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.description && q.description.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      // 4. Status filter
      if (statusFilter === 'published' && q.status !== 'published') return false;
      if (statusFilter === 'completed') {
        const sub = latestSubmissionsByQuiz.get(q.id);
        if (!sub) return false;
      }
      if (statusFilter === 'not_taken') {
        const sub = latestSubmissionsByQuiz.get(q.id);
        if (sub) return false;
      }

      // 5. Difficulty level filter
      if (difficultyFilter !== 'all') {
        const quizDiff = (q.difficulty || 'beginner').toLowerCase();
        if (quizDiff !== difficultyFilter) return false;
      }

      return true;
    });
  }, [quizzes, currentUser, classes, bookings, classId, searchTerm, statusFilter, difficultyFilter, latestSubmissionsByQuiz]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-blue-600" />
            <span>Quizzes & Test Assessments</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-mono font-bold">
              {filteredQuizzes.length}
            </span>
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Evaluate subject mastery with timed checkpoints and automated scoring.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isTutorOrAdmin && showCreateButton && (
            <button
              onClick={() => {
                setEditingQuiz(null);
                setBuilderOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Test / Quiz
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
        {/* Search */}
        <div className="relative flex-grow max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search assessments..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-600 dark:text-white"
          />
        </div>

        {/* Filter pills & Difficulty selector */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
          {/* Difficulty Dropdown */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Level:</span>
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

          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}
          >
            All Quizzes
          </button>

          {isStudent && (
            <>
              <button
                onClick={() => setStatusFilter('not_taken')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  statusFilter === 'not_taken'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Pending / To Take
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  statusFilter === 'completed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Completed & Graded
              </button>
            </>
          )}

          {isTutorOrAdmin && (
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                statusFilter === 'published'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Published Only
            </button>
          )}
        </div>
      </div>

      {/* Quizzes List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-mono">
          Loading assessments catalog...
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="py-12 text-center bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
            {isStudent && studentEnrolledClassesCount === 0 ? (
              <Lock className="w-6 h-6 text-amber-500" />
            ) : (
              <FileQuestion className="w-6 h-6" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {searchTerm
                ? 'No matching quizzes found'
                : isStudent && studentEnrolledClassesCount === 0
                ? 'No Enrolled Classes Found'
                : isStudent
                ? 'No Quizzes Available for Your Enrolled Classes'
                : currentUser?.role === 'tutor'
                ? 'No Quizzes for Your Assigned Classes'
                : 'No Quizzes Available'}
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm
                ? 'No quizzes match your search criteria. Try a different query.'
                : isStudent && studentEnrolledClassesCount === 0
                ? 'Quizzes, mock exams, and assessments are only shown for classes you are actively enrolled in. Enroll in a class to access quizzes.'
                : isStudent
                ? 'Your instructors have not published any quizzes yet for your enrolled classes. Please check back later.'
                : currentUser?.role === 'tutor'
                ? 'You do not have any quizzes assigned to your classes yet. Click "+ Create Test / Quiz" to design assessments for your students.'
                : 'No quizzes have been created yet in the academy. Click "+ Create Test / Quiz" to design assessments.'}
            </p>
          </div>
          {isStudent && studentEnrolledClassesCount === 0 && (
            <button
              onClick={() => {
                if (onNavigateToClass) {
                  onNavigateToClass('');
                } else {
                  window.dispatchEvent(new CustomEvent('app_navigate_tab', { detail: { tab: 'classes' } }));
                }
              }}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <BookOpen className="w-3.5 h-3.5" /> Explore Classes to Enroll
            </button>
          )}
          {isTutorOrAdmin && showCreateButton && (
            <button
              onClick={() => {
                setEditingQuiz(null);
                setBuilderOpen(true);
              }}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Define First Quiz
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuizzes.map((quiz) => {
            const studentSubmission = latestSubmissionsByQuiz.get(quiz.id);
            const isEnrolled = isStudentEnrolledInClass(quiz.classId);
            const isPendingAssignment = Boolean(isStudent && !studentSubmission && isEnrolled);

            return (
              <motion.div
                key={quiz.id}
                id={`quiz_card_${quiz.id}`}
                animate={
                  isPendingAssignment
                    ? {
                        boxShadow: [
                          '0 0 0 0 rgba(99, 102, 241, 0)',
                          '0 0 0 3px rgba(99, 102, 241, 0.22)',
                          '0 0 20px 4px rgba(99, 102, 241, 0.2)',
                          '0 0 0 0 rgba(99, 102, 241, 0)'
                        ],
                        borderColor: [
                          'rgba(226, 232, 240, 1)',
                          'rgba(129, 140, 248, 0.85)',
                          'rgba(99, 102, 241, 0.95)',
                          'rgba(226, 232, 240, 1)'
                        ]
                      }
                    : {}
                }
                transition={
                  isPendingAssignment
                    ? {
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }
                    : undefined
                }
                className={`bg-white dark:bg-slate-900 rounded-3xl border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative ${
                  isPendingAssignment
                    ? 'border-indigo-400 dark:border-indigo-500'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                {/* Top Row: Class tag, Status & Metadata */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-mono font-bold truncate max-w-[180px]">
                        {quiz.classTitle}
                      </span>
                      {/* Difficulty Level Badge on Quiz Cards */}
                      <DifficultyBadge quiz={quiz} size="xs" />
                    </div>

                    {/* Status badge for Tutors */}
                    {isTutorOrAdmin ? (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          quiz.status === 'published'
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        }`}
                      >
                        {quiz.status}
                      </span>
                    ) : studentSubmission ? (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase flex items-center gap-1 ${
                          studentSubmission.passed
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                        }`}
                      >
                        {studentSubmission.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {studentSubmission.percentage}% - {studentSubmission.passed ? 'Passed' : 'Needs Work'}
                      </span>
                    ) : !isEnrolled ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-600 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" /> Enrollment Required
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 flex items-center gap-1.5 shadow-2xs">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                        </span>
                        Pending Assignment
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">
                      {quiz.title}
                    </h4>
                    {quiz.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 font-sans">
                        {quiz.description}
                      </p>
                    )}
                  </div>

                  {/* Quiz Metrics */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium pt-1">
                    <span className="flex items-center gap-1">
                      <FileQuestion className="w-3.5 h-3.5 text-blue-500" />
                      {quiz.questions.length} Questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      {quiz.durationMinutes ? `${quiz.durationMinutes} mins` : 'Untimed'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      Pass: {quiz.passingScorePercentage || 50}%
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-wrap items-center justify-between gap-2">
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
                            className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            id={`view_result_btn_${quiz.id}`}
                          >
                            <Eye className="w-3.5 h-3.5" /> View Result
                          </button>

                          <button
                            onClick={() => {
                              setActiveQuizForPlayer(quiz);
                              setInitialSubmissionForPlayer(null);
                              setPlayerOpen(true);
                            }}
                            className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-blue-200 dark:border-blue-900"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Retake
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveQuizForPlayer(quiz);
                            setInitialSubmissionForPlayer(null);
                            setPlayerOpen(true);
                          }}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Take Assessment Now
                        </button>
                      )}
                    </div>
                  )}

                  {/* Tutor / Admin View */}
                  {isTutorOrAdmin && (
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setActiveQuizForSubmissions(quiz);
                            setSubmissionsModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-blue-200 dark:border-blue-900"
                          title="View Student Results"
                        >
                          <Users className="w-3.5 h-3.5" /> Results
                        </button>

                        <button
                          onClick={() => {
                            setActiveQuizForPlayer(quiz);
                            setInitialSubmissionForPlayer(null);
                            setPlayerOpen(true);
                          }}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="Preview as Student"
                        >
                          <Eye className="w-3.5 h-3.5" /> Preview
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
          onSubmissionSuccess={async (newSub) => {
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
