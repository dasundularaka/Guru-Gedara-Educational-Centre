import React, { useState, useEffect } from 'react';
import { 
  X, 
  Award, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  Search,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Quiz, QuizSubmission } from '../types';
import { firestoreService } from '../lib/firestoreService';

interface QuizSubmissionsModalProps {
  quiz: Quiz;
  isOpen: boolean;
  onClose: () => void;
}

export const QuizSubmissionsModal: React.FC<QuizSubmissionsModalProps> = ({
  quiz,
  isOpen,
  onClose
}) => {
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const data = await firestoreService.getQuizSubmissions(quiz.id);
        setSubmissions(data || []);
      } catch (err) {
        console.warn("Error loading submissions:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [quiz.id, isOpen]);

  if (!isOpen) return null;

  const totalSubmissions = submissions.length;
  const passedCount = submissions.filter(s => s.passed).length;
  const passRate = totalSubmissions > 0 ? Math.round((passedCount / totalSubmissions) * 100) : 0;
  const avgScore = totalSubmissions > 0
    ? Math.round(submissions.reduce((acc, s) => acc + s.percentage, 0) / totalSubmissions)
    : 0;

  const filtered = submissions.filter(s => 
    s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.studentEmail && s.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full my-6 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
              <Users className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-blue-200 font-bold block">
                {quiz.classTitle}
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                Student Submissions: {quiz.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aggregate Stats */}
        <div className="grid grid-cols-3 gap-3 p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Submissions</span>
            <span className="text-base font-black text-slate-800 dark:text-slate-100 font-mono">
              {totalSubmissions}
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Average Score</span>
            <span className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">
              {avgScore}%
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Pass Rate</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {passRate}%
            </span>
          </div>
        </div>

        {/* Submissions List */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-grow">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student name or email..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-600 dark:text-white"
            />
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-mono">
              Loading student attempts...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 font-sans space-y-1">
              <p className="font-bold">No submissions found</p>
              <p className="text-[11px] text-slate-400">
                {searchTerm ? 'Try a different search query.' : 'Enrolled students have not attempted this quiz yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((sub) => {
                const isExpanded = expandedSubmissionId === sub.id;
                return (
                  <div
                    key={sub.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all shadow-xs"
                  >
                    {/* Header Row */}
                    <div
                      onClick={() => setExpandedSubmissionId(isExpanded ? null : sub.id)}
                      className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl font-mono text-xs font-black flex items-center justify-center ${
                            sub.passed
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                          }`}
                        >
                          {sub.percentage}%
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                              {sub.studentName}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                                sub.passed
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300'
                              }`}
                            >
                              {sub.passed ? 'Passed' : 'Failed'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {sub.studentEmail || 'Registered Scholar'} •{' '}
                            {new Date(sub.submittedAt).toLocaleDateString()} {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                          {sub.score} / {sub.totalPoints} pts
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Detailed Question Answers Accordion */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-850/40"
                        >
                          <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider pt-2">
                            Individual Question Results:
                          </div>

                          {quiz.questions.map((q, qIdx) => {
                            const studentAns = sub.answers[q.id];
                            const isCorrect =
                              studentAns &&
                              studentAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();

                            return (
                              <div
                                key={q.id || qIdx}
                                className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                                  isCorrect
                                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                                    : 'bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-800/50'
                                }`}
                              >
                                <div className="flex items-center justify-between font-bold">
                                  <span className="text-slate-800 dark:text-slate-200">
                                    Q{qIdx + 1}: {q.question}
                                  </span>
                                  <span
                                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md ${
                                      isCorrect ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'
                                    }`}
                                  >
                                    {isCorrect ? `+${q.points || 1} Pts` : '0 Pts'}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[11px] font-medium pt-1">
                                  <div>
                                    <span className="text-slate-400 block font-mono text-[9px] uppercase">
                                      Student Answer:
                                    </span>
                                    <span className={isCorrect ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                                      {studentAns || 'Skipped'}
                                    </span>
                                  </div>
                                  {!isCorrect && (
                                    <div>
                                      <span className="text-slate-400 block font-mono text-[9px] uppercase">
                                        Correct Key:
                                      </span>
                                      <span className="text-emerald-700 font-bold">
                                        {q.correctAnswer}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
