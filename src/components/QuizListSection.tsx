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
import { QuizBuilderModal } from './QuizBuilderModal';
import { QuizPlayerModal } from './QuizPlayerModal';
import { QuizSubmissionsModal } from './QuizSubmissionsModal';
import { ConfirmModal } from './ConfirmModal';

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
    if (!currentUser) return classes || [];
    if (currentUser.role === 'admin') return classes || [];
    const matched = (classes || []).filter(c => 
      c.tutorId === currentUser.uid || 
      c.tutorId === currentUser.username ||
      (c.tutorName && currentUser.name && c.tutorName.toLowerCase() === currentUser.name.toLowerCase()) ||
      ((c as any).tutorEmail && currentUser.email && (c as any).tutorEmail.toLowerCase() === currentUser.email.toLowerCase())
    );
    if (matched.length > 0) return matched;
    return classes || [];
  }, [classes, currentUser]);

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

  // Filtered quizzes
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(q => {
      // If student or public, only show published quizzes (tutors see drafts too)
      if (!isTutorOrAdmin && q.status !== 'published') return false;

      // Search match
      const matchSearch =
        q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.classTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.description && q.description.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      // Status filter
      if (statusFilter === 'published' && q.status !== 'published') return false;
      if (statusFilter === 'completed') {
        const sub = latestSubmissionsByQuiz.get(q.id);
        if (!sub) return false;
      }
      if (statusFilter === 'not_taken') {
        const sub = latestSubmissionsByQuiz.get(q.id);
        if (sub) return false;
      }

      return true;
    });
  }, [quizzes, searchTerm, statusFilter, isTutorOrAdmin, latestSubmissionsByQuiz]);

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

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold">
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
            <FileQuestion className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No quizzes available
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm
                ? 'No quizzes match your search criteria. Try a different query.'
                : isTutorOrAdmin
                ? 'You have not created any quizzes for this subject yet. Click "+ Create Test / Quiz" to design questions and mark answer keys.'
                : 'Your instructor has not published any quizzes yet for this course. Please check back later.'}
            </p>
          </div>
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

            return (
              <div
                key={quiz.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* Top Row: Class tag, Status & Metadata */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-mono font-bold truncate max-w-[200px]">
                      {quiz.classTitle}
                    </span>

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
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        Ready to Take
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
                            }}
                            className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Solutions & Review
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
                      ) : isEnrolled ? (
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
                      ) : (
                        <div className="flex items-center gap-2 w-full">
                          <button
                            onClick={() => {
                              setActiveQuizForPlayer(quiz);
                              setInitialSubmissionForPlayer(null);
                              setPlayerOpen(true);
                            }}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" /> Take Practice Test
                          </button>
                          <button
                            onClick={() => {
                              if (onNavigateToClass) {
                                onNavigateToClass(quiz.classId);
                              } else {
                                window.dispatchEvent(new CustomEvent('app_navigate_tab', { detail: { tab: 'classes', classId: quiz.classId } }));
                                showToast(`Navigate to ${quiz.classTitle} to view course details and enroll.`, 'info');
                              }
                            }}
                            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                            title="View Class Details"
                          >
                            <BookOpen className="w-3.5 h-3.5" /> Class Info
                          </button>
                        </div>
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
              </div>
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
