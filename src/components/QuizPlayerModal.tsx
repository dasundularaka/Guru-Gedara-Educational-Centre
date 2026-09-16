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
  PartyPopper,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Quiz, QuizSubmission, UserProfile } from '../types';
import { firestoreService } from '../lib/firestoreService';
import { useApp } from '../context/AppContext';
import { canUserViewQuiz } from '../utils/accessControl';

// Celebratory particle confetti animation helper
const fireQuizSubmissionConfetti = (passed: boolean, percentage: number) => {
  try {
    const runner = (confetti as any)?.default || confetti;
    if (typeof runner !== 'function') return;

    // 1. Initial burst
    runner({
      particleCount: passed ? 140 : 70,
      spread: passed ? 90 : 60,
      origin: { y: 0.6 },
      zIndex: 99999,
      colors: passed 
        ? ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'] 
        : ['#3b82f6', '#60a5fa', '#93c5fd', '#a7f3d0']
    });

    if (passed) {
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
  const { classes, bookings, currentUser: appUser } = useApp();
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

  // Timer states
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    quiz.durationMinutes && quiz.durationMinutes > 0 ? quiz.durationMinutes * 60 : 0
  );
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (initialSubmission) {
      setPhase('results');
      setSubmission(initialSubmission);
      setAnswers(initialSubmission.answers || {});
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

      // Trigger celebratory particle animation effect (confetti)
      fireQuizSubmissionConfetti(passed, percentage);

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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-black shadow-inner transition-colors ${
                  secondsRemaining < 120
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-white/20 text-white backdrop-blur-md'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(secondsRemaining)}</span>
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

            {/* Assessment Details Metric Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto">
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
                    onClick={() => setShowConfirmSubmit(true)}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    <Send className="w-3.5 h-3.5" /> Finish & Submit
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PHASE 3: RESULTS & DIAGNOSTIC REVIEW SCREEN                   */}
        {/* ------------------------------------------------------------- */}
        {phase === 'results' && submission && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-grow">
            {/* Top Score Banner */}
            <div
              className={`p-6 rounded-3xl text-center border space-y-3 ${
                submission.passed
                  ? 'bg-gradient-to-b from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : 'bg-gradient-to-b from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20 border-amber-200 dark:border-amber-800'
              }`}
            >
              <div
                className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center text-white font-mono text-2xl font-black shadow-lg ${
                  submission.passed ? 'bg-emerald-600 shadow-emerald-500/30' : 'bg-amber-600 shadow-amber-500/30'
                }`}
              >
                {submission.percentage}%
              </div>

              <div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider font-mono ${
                    submission.passed
                      ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                      : 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                  }`}
                >
                  {submission.passed ? 'Passed Assessment 🎉' : 'Needs Practice (Did Not Meet Pass Score)'}
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2">
                  You scored {submission.score} out of {submission.totalPoints} points
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Passing requirement: {quiz.passingScorePercentage || 50}% • Completed on{' '}
                  {new Date(submission.submittedAt).toLocaleDateString()}
                </p>

                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fireQuizSubmissionConfetti(submission.passed, submission.percentage)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 shadow-2xs transition-all hover:scale-105 cursor-pointer"
                    id="replay_confetti_btn"
                    title="Trigger celebratory confetti particles"
                  >
                    <PartyPopper className="w-3.5 h-3.5 text-amber-500" />
                    <span>Celebrate 🎉</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Detailed Question Review Breakdown */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
                  Question Breakdown & Solution Review
                </h4>
                <span className="text-xs font-bold text-slate-500">
                  {quiz.questions.length} Questions Evaluated
                </span>
              </div>

              {quiz.questions.map((q, idx) => {
                const studentAns = submission.answers[q.id];
                const isCorrect = studentAns && studentAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
                const pts = q.points || 1;

                return (
                  <div
                    key={q.id || idx}
                    className={`p-4 rounded-2xl border space-y-3 transition-all ${
                      isCorrect
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-800/60'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                        )}
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                          Question {idx + 1}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                          isCorrect
                            ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        }`}
                      >
                        {isCorrect ? `+${pts} / ${pts} Pts` : `0 / ${pts} Pts`}
                      </span>
                    </div>

                    {/* Question prompt */}
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                      {q.question}
                    </p>

                    {/* Answers compare */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono">
                          Your Answer:
                        </span>
                        <span
                          className={`font-bold mt-0.5 block ${
                            isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {studentAns || 'No Answer Chosen'}
                        </span>
                      </div>

                      {!isCorrect && (
                        <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase font-mono">
                            Correct Answer:
                          </span>
                          <span className="font-bold text-emerald-800 dark:text-emerald-200 mt-0.5 block">
                            {q.correctAnswer}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">Faculty Explanation: </span>
                          <span>{q.explanation}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Results Bottom Action */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
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
        )}

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
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Grading...' : 'Yes, Submit'}
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
