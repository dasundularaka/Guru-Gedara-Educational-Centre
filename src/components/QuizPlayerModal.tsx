import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Clock, 
  Award, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw, 
  Send, 
  BookOpen, 
  AlertTriangle, 
  Check, 
  HelpCircle,
  Sparkles,
  Lock,
  CheckSquare,
  Lightbulb,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Quiz, QuizSubmission, UserProfile } from '../types';
import { firestoreService } from '../lib/firestoreService';
import { useApp } from '../context/AppContext';
import { canUserViewQuiz } from '../utils/accessControl';
import { DifficultyBadge } from './DifficultyBadge';

// Celebratory particle confetti animation helper - strictly ONLY runs when passed is true
export const fireQuizSubmissionConfetti = (passed: boolean, percentage: number) => {
  // If student failed in quiz, do not show celebrating animation
  if (!passed) return;

  try {
    const runner = (confetti as any)?.default || confetti;
    if (typeof runner !== 'function') return;

    // 1. Initial burst
    runner({
      particleCount: 140,
      spread: 90,
      origin: { y: 0.6 },
      zIndex: 99999,
      colors: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308']
    });

    // 2. Multi-stage celebratory cannons
    setTimeout(() => {
      runner({
        particleCount: 60,
        angle: 60,
        spread: 70,
        origin: { x: 0.05, y: 0.7 },
        zIndex: 99999,
        colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899']
      });
    }, 250);

    setTimeout(() => {
      runner({
        particleCount: 60,
        angle: 120,
        spread: 70,
        origin: { x: 0.95, y: 0.7 },
        zIndex: 99999,
        colors: ['#8b5cf6', '#10b981', '#3b82f6', '#06b6d4']
      });
    }, 450);

    // Star & circle confetti burst if high mark (>= 80%)
    if (percentage >= 80) {
      setTimeout(() => {
        runner({
          particleCount: 50,
          spread: 120,
          origin: { y: 0.45 },
          shapes: ['star', 'circle'] as any,
          zIndex: 99999,
          colors: ['#fbbf24', '#f59e0b', '#eab308', '#fde047', '#fff']
        });
      }, 700);
    }
  } catch (err) {
    console.warn("Confetti particle trigger failed:", err);
  }
};

interface QuizPlayerModalProps {
  quiz: Quiz;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  onSubmissionSuccess?: (submission: QuizSubmission) => void;
  initialSubmission?: QuizSubmission | null;
}

export const QuizPlayerModal: React.FC<QuizPlayerModalProps> = ({
  quiz,
  isOpen,
  onClose,
  currentUser,
  onSubmissionSuccess,
  initialSubmission
}) => {
  const { classes, bookings, currentUser: appUser, showToast } = useApp();
  const effectiveUser = currentUser || appUser;
  const isAuthorized = canUserViewQuiz(quiz, effectiveUser, classes, bookings);

  // Phase: 'briefing' | 'taking' | 'results'
  const [phase, setPhase] = useState<'briefing' | 'taking' | 'results'>(
    initialSubmission ? 'results' : 'briefing'
  );

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<{ [questionId: string]: string }>(
    initialSubmission?.answers || {}
  );
  const [submission, setSubmission] = useState<QuizSubmission | null>(initialSubmission || null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState<boolean>(false);

  // Review Answers filter state
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'wrong'>('all');

  // Timer states
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    quiz.durationMinutes && quiz.durationMinutes > 0 ? quiz.durationMinutes * 60 : 0
  );
  const startTimeRef = useRef<number>(Date.now());
  const lowTimeToastFiredRef = useRef<boolean>(false);
  const [showInModalToast, setShowInModalToast] = useState<boolean>(false);

  const totalDurationSeconds = quiz.durationMinutes && quiz.durationMinutes > 0 ? quiz.durationMinutes * 60 : 0;
  const isTimed = totalDurationSeconds > 0;
  // Threshold is 10% of total allotted time (e.g. for 15 mins = 900s, 10% = 90s)
  const lowTimeThreshold = isTimed ? Math.max(10, Math.floor(totalDurationSeconds * 0.10)) : 0;
  const isLowTime = isTimed && phase === 'taking' && secondsRemaining > 0 && secondsRemaining <= lowTimeThreshold;

  // Trigger subtle notification toast when less than 10% of time remaining
  useEffect(() => {
    if (isLowTime && !lowTimeToastFiredRef.current) {
      lowTimeToastFiredRef.current = true;
      setShowInModalToast(true);
      if (showToast) {
        showToast(
          `⏱️ Time Alert: Less than 10% time remaining! ${Math.floor(secondsRemaining / 60)}m ${secondsRemaining % 60}s left. Please review and finalize your answers.`,
          'warning'
        );
      }
      const hideTimer = setTimeout(() => {
        setShowInModalToast(false);
      }, 7000);
      return () => clearTimeout(hideTimer);
    }
  }, [isLowTime, secondsRemaining, showToast]);

  useEffect(() => {
    if (initialSubmission) {
      setPhase('results');
      setSubmission(initialSubmission);
      setAnswers(initialSubmission.answers || {});
      // If student passed, show celebrating animation on viewing result
      if (initialSubmission.passed) {
        fireQuizSubmissionConfetti(true, initialSubmission.percentage);
      }
    } else {
      setPhase('briefing');
      setSubmission(null);
      setAnswers({});
      setCurrentQuestionIndex(0);
      setSecondsRemaining(quiz.durationMinutes && quiz.durationMinutes > 0 ? quiz.durationMinutes * 60 : 0);
    }
  }, [quiz.id, initialSubmission]);

  // Active Timer Effect during 'taking' phase
  useEffect(() => {
    if (phase !== 'taking' || !quiz.durationMinutes || quiz.durationMinutes <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, quiz.durationMinutes]);

  if (!isOpen) return null;

  const currentQ = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.keys(answers).length;

  const handleStartQuiz = () => {
    startTimeRef.current = Date.now();
    setPhase('taking');
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSecondsRemaining(quiz.durationMinutes && quiz.durationMinutes > 0 ? quiz.durationMinutes * 60 : 0);
  };

  const handleSelectAnswer = (questionId: string, optionValue: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionValue
    }));
  };

  const handleTimeExpired = async () => {
    // Auto submit when time is up
    await executeSubmission();
  };

  const executeSubmission = async () => {
    setIsSubmitting(true);
    try {
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
      
      // Calculate score
      let earnedPoints = 0;
      let totalPoints = 0;

      quiz.questions.forEach(q => {
        const pts = q.points || 1;
        totalPoints += pts;
        const studentAns = answers[q.id];
        if (studentAns && studentAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
          earnedPoints += pts;
        }
      });

      const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
      const passPct = quiz.passingScorePercentage !== undefined ? quiz.passingScorePercentage : 50;
      const passed = percentage >= passPct;

      const newSubmission = await firestoreService.submitQuizAnswers({
        quizId: quiz.id,
        quizTitle: quiz.title,
        classId: quiz.classId,
        classTitle: quiz.classTitle,
        studentId: currentUser?.uid || 'guest_scholar',
        studentName: currentUser?.name || currentUser?.displayName || 'Enrolled Scholar',
        studentEmail: currentUser?.email || '',
        answers,
        score: earnedPoints,
        totalPoints,
        percentage,
        passed,
        timeSpentSeconds: timeSpent
      });

      setSubmission(newSubmission);
      setPhase('results');
      setShowConfirmSubmit(false);

      // Trigger celebratory particle animation effect ONLY if passed
      if (passed) {
        fireQuizSubmissionConfetti(true, percentage);
      }

      // Trigger notification for the tutor
      if (quiz.tutorId && currentUser?.uid && quiz.tutorId !== currentUser.uid) {
        try {
          await firestoreService.triggerNotification(
            quiz.tutorId,
            `Quiz Completed: ${quiz.title}`,
            `${currentUser.name || currentUser.displayName || 'A student'} completed "${quiz.title}" with a score of ${percentage}% (${earnedPoints}/${totalPoints} pts).`,
            'announcement',
            {
              classId: quiz.classId,
              quizId: quiz.id,
              targetType: 'quiz',
              targetId: quiz.id
            }
          );
        } catch (_) {}
      }

      if (onSubmissionSuccess) {
        onSubmissionSuccess(newSubmission);
      }
    } catch (err) {
      console.warn("Error submitting quiz:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format seconds to mm:ss
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-8 text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            Access Restricted
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            This assessment is reserved exclusively for scholars actively enrolled in <strong className="text-slate-800 dark:text-slate-200">{quiz.classTitle}</strong> or the assigned faculty tutor.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close Assessment
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full my-6 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
              <BookOpen className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-blue-200 font-bold block">
                {quiz.classTitle}
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-white line-clamp-1">
                {quiz.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Countdown timer if in taking phase */}
            {phase === 'taking' && quiz.durationMinutes && quiz.durationMinutes > 0 && (
              <div
                id="quiz_countdown_timer"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-black shadow-inner transition-all duration-300 ${
                  isLowTime
                    ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400 ring-offset-2 ring-offset-blue-900 shadow-lg shadow-red-500/50 scale-105'
                    : 'bg-white/20 text-white backdrop-blur-md'
                }`}
                title={isLowTime ? 'Less than 10% of time remaining! Please review your answers.' : 'Remaining test time'}
              >
                <Clock className={`w-3.5 h-3.5 ${isLowTime ? 'animate-spin' : ''}`} />
                <span>{formatTimer(secondsRemaining)}</span>
                {isLowTime && (
                  <span className="w-2 h-2 rounded-full bg-white animate-ping ml-0.5" />
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subtle In-Modal Floating Toast for Low Time (< 10%) */}
        <AnimatePresence>
          {showInModalToast && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.96 }}
              className="px-4 py-3 bg-slate-900/95 dark:bg-slate-800/95 text-white border border-red-500/60 shadow-xl flex items-center justify-between gap-3 shrink-0"
              id="quiz_low_time_floating_toast"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-red-400 animate-pulse" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-red-300 flex items-center gap-1.5">
                    <span>⏱️ Time Alert: Less than 10% Time Remaining</span>
                  </span>
                  <p className="text-[11px] text-slate-300">
                    Only <span className="font-mono font-bold text-white underline">{formatTimer(secondsRemaining)}</span> remaining! Please review and finalize your answers.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInModalToast(false)}
                className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-white/10 cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Visual Pulse Banner when in Taking Phase and Time < 10% */}
        {phase === 'taking' && isLowTime && (
          <div
            id="quiz_timer_pulse_banner"
            className="px-4 py-2 bg-red-500/15 dark:bg-red-950/70 border-b border-red-500/30 flex items-center justify-between gap-3 text-red-700 dark:text-red-300 text-xs font-bold animate-pulse shrink-0"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
              </span>
              <Clock className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
              <span>
                Final Countdown: Less than 10% remaining (<span className="font-mono font-black">{formatTimer(secondsRemaining)}</span> left)
              </span>
            </div>
            <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-900/80 text-red-700 dark:text-red-200">
              Review Answers
            </span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PHASE 1: BRIEFING SCREEN                                      */}
        {/* ------------------------------------------------------------- */}
        {phase === 'briefing' && (
          <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-grow text-slate-800 dark:text-slate-100">
            <div className="text-center max-w-lg mx-auto space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center shadow-inner">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Ready to take this Assessment?
              </h3>
              {quiz.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                  {quiz.description}
                </p>
              )}
            </div>

            {/* Assessment Details Metric Grid with Difficulty Badge */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-2xl mx-auto">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Questions</span>
                <span className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">
                  {quiz.questions.length}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Total Marks</span>
                <span className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {quiz.totalPoints || quiz.questions.length} Pts
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Time Limit</span>
                <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                  {quiz.durationMinutes ? `${quiz.durationMinutes}m` : 'Untimed'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Pass Benchmark</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {quiz.passingScorePercentage || 50}%
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center flex flex-col items-center justify-between col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Difficulty</span>
                <DifficultyBadge quiz={quiz} size="xs" />
              </div>
            </div>

            {/* Rules / Guidance */}
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 space-y-1.5 max-w-xl mx-auto">
              <div className="flex items-center gap-2 font-bold text-blue-800 dark:text-blue-300">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Assessment Instructions</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                <li>Review each question carefully and select the single best answer.</li>
                <li>You can freely navigate between questions before submitting.</li>
                <li>Answers are instantly graded upon submission with diagnostic solutions.</li>
              </ul>
            </div>

            {/* Action */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleStartQuiz}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-extrabold shadow-lg shadow-blue-500/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                Start Quiz Now →
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PHASE 2: TAKING QUIZ                                          */}
        {/* ------------------------------------------------------------- */}
        {phase === 'taking' && currentQ && (
          <div className="flex flex-col flex-grow overflow-hidden">
            {/* Stepper Progress Bar */}
            <div className="px-5 sm:px-6 pt-4 pb-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                <span>
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>
                <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                  {answeredCount} of {totalQuestions} Answered
                </span>
              </div>

              {/* Stepper Dots / Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {quiz.questions.map((q, idx) => {
                  const isAnswered = Boolean(answers[q.id]);
                  const isCurrent = idx === currentQuestionIndex;
                  return (
                    <button
                      key={q.id || idx}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`h-7 px-2.5 rounded-lg text-[11px] font-mono font-bold transition-all shrink-0 cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-xs'
                          : isAnswered
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-grow space-y-6">
              {/* Question Header & Points */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                    {currentQ.type === 'true_false' ? 'True / False Question' : 'Multiple Choice'}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed font-sans">
                    {currentQ.question}
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-mono font-extrabold shrink-0 border border-blue-200 dark:border-blue-900">
                  {currentQ.points || 1} Pts
                </span>
              </div>

              {/* Answer Options Selection */}
              {currentQ.type === 'multiple_choice' ? (
                <div className="space-y-3">
                  {currentQ.options.map((opt, optIdx) => {
                    const isSelected = answers[currentQ.id] === opt;
                    const letter = String.fromCharCode(65 + optIdx);
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectAnswer(currentQ.id, opt)}
                        className={`w-full p-3.5 sm:p-4 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : letter}
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 flex-grow font-sans">
                          {opt}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* True / False Options */
                <div className="grid grid-cols-2 gap-4">
                  {['True', 'False'].map((tfVal) => {
                    const isSelected = answers[currentQ.id] === tfVal;
                    return (
                      <button
                        key={tfVal}
                        type="button"
                        onClick={() => handleSelectAnswer(currentQ.id, tfVal)}
                        className={`p-6 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                          isSelected
                            ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-600 dark:border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                            isSelected
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                          }`}
                        >
                          {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : ''}
                        </span>
                        <span className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                          {tfVal}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Stepper Navigation Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              <div className="flex items-center gap-2">
                {currentQuestionIndex < totalQuestions - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    Next Question <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (answeredCount < totalQuestions) {
                        setShowConfirmSubmit(true);
                      } else {
                        executeSubmission();
                      }
                    }}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                    id="finish_and_submit_quiz_btn"
                  >
                    <Send className="w-3.5 h-3.5" /> Finish & Submit
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PHASE 3: RESULTS & REVIEW ANSWERS SCREEN                      */}
        {/* ------------------------------------------------------------- */}
        {phase === 'results' && submission && (() => {
          // Pre-compute questions evaluation for Review Answers
          const evaluations = quiz.questions.map((q, idx) => {
            const studentAns = submission.answers[q.id];
            const isCorrect = Boolean(studentAns && studentAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase());
            const pts = q.points || 1;
            return {
              question: q,
              index: idx,
              studentAns,
              isCorrect,
              pts
            };
          });

          const correctQuestions = evaluations.filter(e => e.isCorrect);
          const wrongQuestions = evaluations.filter(e => !e.isCorrect);

          const displayedEvaluations = evaluations.filter(e => {
            if (reviewFilter === 'correct') return e.isCorrect;
            if (reviewFilter === 'wrong') return !e.isCorrect;
            return true;
          });

          return (
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-grow" id="quiz_results_and_review_screen">
              {/* Top Score Banner */}
              <div
                className={`p-6 rounded-3xl text-center border space-y-3.5 relative overflow-hidden ${
                  submission.passed
                    ? 'bg-gradient-to-b from-emerald-50 to-emerald-100/60 dark:from-emerald-950/40 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                    : 'bg-gradient-to-b from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-amber-900/20 border-amber-200 dark:border-amber-800'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <DifficultyBadge quiz={quiz} size="xs" />
                  <span className="text-[11px] font-mono text-slate-500 font-semibold">
                    {quiz.classTitle}
                  </span>
                </div>

                <div
                  className={`w-20 h-20 rounded-full mx-auto flex flex-col items-center justify-center text-white font-mono shadow-lg ${
                    submission.passed ? 'bg-emerald-600 shadow-emerald-500/30' : 'bg-amber-600 shadow-amber-500/30'
                  }`}
                >
                  <span className="text-2xl font-black leading-none">{submission.percentage}%</span>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-80 mt-0.5">Score</span>
                </div>

                <div>
                  <span
                    className={`px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider font-mono inline-flex items-center gap-1.5 ${
                      submission.passed
                        ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                        : 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                    }`}
                  >
                    {submission.passed ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Passed Assessment 🎉
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" /> Needs Practice (Below {quiz.passingScorePercentage || 50}% pass mark)
                      </>
                    )}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-2">
                    You earned {submission.score} out of {submission.totalPoints} points
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Pass requirement: {quiz.passingScorePercentage || 50}% • Submitted on{' '}
                    {new Date(submission.submittedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Review Answers Control Bar & Quick Stats */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Review Answers</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      See which questions you got right or wrong and view brief explanations for correct answers.
                    </p>
                  </div>

                  {/* Filter Tabs: All, Got Right, Got Wrong */}
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setReviewFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        reviewFilter === 'all'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      All ({quiz.questions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewFilter('correct')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        reviewFilter === 'correct'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      }`}
                      id="filter_got_right_btn"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Got Right ({correctQuestions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewFilter('wrong')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        reviewFilter === 'wrong'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                      }`}
                      id="filter_got_wrong_btn"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Got Wrong ({wrongQuestions.length})
                    </button>
                  </div>
                </div>

                {/* Quick Question Jump Buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 mr-1 shrink-0">
                    Jump to:
                  </span>
                  {evaluations.map((e) => (
                    <a
                      key={e.question.id || e.index}
                      href={`#review_question_${e.index + 1}`}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                        e.isCorrect
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:scale-105'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:scale-105'
                      }`}
                      title={`Question ${e.index + 1}: ${e.isCorrect ? 'Got Right' : 'Got Wrong'}`}
                    >
                      <span>Q{e.index + 1}</span>
                      {e.isCorrect ? (
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <X className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                      )}
                    </a>
                  ))}
                </div>
              </div>

              {/* Detailed Question Review List */}
              <div className="space-y-4">
                {displayedEvaluations.length === 0 ? (
                  <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      No questions match the "{reviewFilter === 'correct' ? 'Got Right' : 'Got Wrong'}" filter.
                    </p>
                    <button
                      type="button"
                      onClick={() => setReviewFilter('all')}
                      className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      View all questions
                    </button>
                  </div>
                ) : (
                  displayedEvaluations.map(({ question: q, index: idx, studentAns, isCorrect, pts }) => {
                    return (
                      <div
                        key={q.id || idx}
                        id={`review_question_${idx + 1}`}
                        className={`p-4 sm:p-5 rounded-3xl border space-y-4 transition-all ${
                          isCorrect
                            ? 'bg-emerald-50/30 dark:bg-emerald-950/15 border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs'
                            : 'bg-rose-50/30 dark:bg-rose-950/15 border-rose-200/80 dark:border-rose-800/60 shadow-2xs'
                        }`}
                      >
                        {/* Header: Question Number, Got Right / Got Wrong badge, Points */}
                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-black px-2.5 py-1 rounded-xl bg-slate-900 text-white dark:bg-slate-800">
                              Question {idx + 1}
                            </span>

                            {/* Prominent Got Right or Got Wrong Badge */}
                            {isCorrect ? (
                              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Got Right</span>
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1.5 shadow-2xs">
                                <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                <span>Got Wrong</span>
                              </span>
                            )}
                          </div>

                          <span
                            className={`text-xs font-mono font-black px-2.5 py-1 rounded-xl border ${
                              isCorrect
                                ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 border-rose-300'
                            }`}
                          >
                            {isCorrect ? `+${pts} / ${pts} Pts` : `0 / ${pts} Pts`}
                          </span>
                        </div>

                        {/* Question Prompt */}
                        <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-relaxed font-sans">
                          {q.question}
                        </p>

                        {/* Options Breakdown with student answer vs correct answer */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-400 block">
                            Options & Answer Choices:
                          </span>
                          <div className="space-y-2">
                            {(q.type === 'multiple_choice' ? q.options : ['True', 'False']).map((opt, optIdx) => {
                              const isStudentPick = studentAns === opt;
                              const isCorrectAnswer = q.correctAnswer === opt;

                              let cardStyle = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';
                              if (isCorrectAnswer) {
                                cardStyle = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20';
                              } else if (isStudentPick && !isCorrect) {
                                cardStyle = 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20';
                              }

                              const letter = q.type === 'multiple_choice' ? String.fromCharCode(65 + optIdx) : opt[0];

                              return (
                                <div
                                  key={optIdx}
                                  className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 transition-colors ${cardStyle}`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span
                                      className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 ${
                                        isCorrectAnswer
                                          ? 'bg-emerald-600 text-white'
                                          : isStudentPick
                                          ? 'bg-rose-600 text-white'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                      }`}
                                    >
                                      {letter}
                                    </span>
                                    <span className="font-semibold text-xs sm:text-sm font-sans">{opt}</span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {isStudentPick && (
                                      <span
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase ${
                                          isCorrect
                                            ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100'
                                            : 'bg-rose-200 dark:bg-rose-800 text-rose-900 dark:text-rose-100'
                                        }`}
                                      >
                                        Your Choice {isCorrect ? '(Correct)' : '(Incorrect)'}
                                      </span>
                                    )}

                                    {isCorrectAnswer && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase bg-emerald-600 text-white flex items-center gap-1">
                                        <Check className="w-3 h-3 stroke-[3]" /> Correct Answer
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Brief Explanation for the Correct Answer */}
                        <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/90 dark:border-blue-900/60 space-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-blue-800 dark:text-blue-300 font-mono text-[11px] uppercase tracking-wider">
                            <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span>Brief Explanation for Correct Answer:</span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans pl-5 font-medium">
                            {q.explanation && q.explanation.trim().length > 0
                              ? q.explanation
                              : `The correct answer is "${q.correctAnswer}". This question assesses the fundamental principles taught in ${quiz.classTitle}.`}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Results Bottom Action Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleStartQuiz}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retake Test
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs"
                >
                  Done / Close
                </button>
              </div>
            </div>
          );
        })()}

        {/* Confirmation Modal when submitting */}
        <AnimatePresence>
          {showConfirmSubmit && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-5 text-center space-y-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 mx-auto flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Submit Assessment?
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    {answeredCount < totalQuestions
                      ? `You answered ${answeredCount} of ${totalQuestions} questions. Are you ready to submit and calculate your score?`
                      : 'All questions have been answered. Ready to submit and receive your score?'}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmSubmit(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Keep Reviewing
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={executeSubmission}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    id="confirm_finish_and_submit_btn"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSubmitting ? 'Grading...' : 'Finish & Submit'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
