import React from 'react';
import { useApp } from '../context/AppContext';
import { QuizListSection } from '../components/QuizListSection';
import { FileQuestion, GraduationCap, CheckCircle2, Award, Sparkles, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

interface QuizzesProps {
  onNavigateTab?: (tab: string) => void;
}

export const Quizzes: React.FC<QuizzesProps> = ({ onNavigateTab }) => {
  const { currentUser } = useApp();
  const isTutorOrAdmin = currentUser?.role === 'tutor' || currentUser?.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-10 shadow-xl border border-white/10"
        >
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>Interactive Assessments & Exams</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Course Quizzes & Knowledge Checks
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Test your understanding across science, mathematics, technology, and language disciplines.
              Track your scores, review detailed solution explanations, and monitor your academic progress.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Instant scoring & answer feedback
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" /> Verified passing certificates & marks
              </span>
              <span className="flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-300" /> Created by certified faculty
              </span>
            </div>
          </div>

          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none hidden md:block" />
        </motion.div>

        {/* Core Assessments Component */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 dark:border-slate-800">
          <QuizListSection 
            showCreateButton={isTutorOrAdmin} 
            onNavigateToClass={(classId) => {
              if (onNavigateTab) {
                onNavigateTab('classes');
              } else {
                window.dispatchEvent(new CustomEvent('app_navigate_tab', { detail: { tab: 'classes', classId } }));
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};
