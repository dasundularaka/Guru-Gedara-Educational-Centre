import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../lib/firestoreService';
import { ClassItem, UserProfile } from '../types';
import { ClassCard } from '../components/ClassCard';
import { TutorCard } from '../components/TutorCard';
import { ClassScheduleWidget } from '../components/ClassScheduleWidget';
import { 
  Sparkles, 
  GraduationCap, 
  BookOpen, 
  Cpu, 
  Compass, 
  CheckCircle2, 
  ShieldCheck, 
  Users, 
  School, 
  Bookmark, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { motion } from 'motion/react';

interface HomeProps {
  onNavigateTab: (tab: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigateTab }) => {
  const { classes, refreshClasses } = useApp();
  const [highlightedClasses, setHighlightedClasses] = useState<ClassItem[]>([]);
  const [topTutors, setTopTutors] = useState<UserProfile[]>([]);

  useEffect(() => {
    const loadHomeRecords = async () => {
      try {
        await refreshClasses();
        // Load some tutors
        const list = await firestoreService.getAllUsers();
        const tutors = list.filter(u => u.role === 'tutor').slice(0, 3);
        setTopTutors(tutors);
      } catch (e) {
        console.warn(e);
      }
    };
    loadHomeRecords();
  }, []);

  useEffect(() => {
    if (classes && classes.length > 0) {
      setHighlightedClasses(classes.slice(0, 3));
    }
  }, [classes]);

  return (
    <div className="bg-slate-50/20" id="homepage_container">
      {/* 1. Hero banner Section */}
      <div className="relative overflow-hidden bg-linear-to-b from-slate-50 via-white to-white py-16 sm:py-24">
        {/* Abstract background circles */}
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-indigo-50/40 mix-blend-multiply filter blur-3xl opacity-50 animate-pulse"></div>
        <div className="absolute bottom-10 left-10 w-72 h-72 rounded-full bg-slate-100/30 mix-blend-multiply filter blur-2xl opacity-40"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3  py-1 bg-indigo-50/60 border border-indigo-100 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-indigo-650" />
                <span className="text-[10px] font-extrabold text-indigo-850 uppercase tracking-wider font-mono">
                  The Premium standard in academic tutoring
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Unlock Academic <span className="text-indigo-600 bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Excellence</span> with Verified Faculty.
              </h1>

              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-lg">
                Connect with highly experienced Ph.D. academics and programming veterans. Access real-time class booking schedules, direct student-tutor chats, dynamic notifications, and a transparent progress ledger dashboard.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => onNavigateTab('classes')}
                  className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-xs shadow-md hover:shadow-lg hover:shadow-slate-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  id="hero_classes_cta"
                >
                  Explore Class Subjects <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigateTab('tutors')}
                  className="px-6 py-3.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-extrabold text-xs transition-colors text-center cursor-pointer"
                  id="hero_tutors_cta"
                >
                  Meet Faculty Tutors
                </button>
              </div>

              {/* Verified badges */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-700 font-sans">100% Certified</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-700 font-sans">No Hidden Fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4.5 h-4.5 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-700 font-sans">98% Grade Match</span>
                </div>
              </div>
            </motion.div>

            {/* Illustration/Image mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative hidden lg:block"
            >
              <div className="bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-3xl p-2.5 shadow-2xl shadow-blue-200 relative overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600" 
                  alt="Students Studying" 
                  className="rounded-2xl w-full object-cover h-[350px] brightness-95" 
                />
                
                {/* Overlay metric cards */}
                <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl border border-blue-50 shadow-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-lg font-extrabold text-blue-955 block leading-none">1,240+</span>
                    <span className="text-[10px] text-gray-400 font-medium block mt-1 uppercase">Active Scholars</span>
                  </div>
                </div>

                <div className="absolute -top-6 -right-6 bg-white p-4 rounded-2xl border border-blue-50 shadow-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <School className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-lg font-extrabold text-emerald-800 block leading-none">35+</span>
                    <span className="text-[10px] text-gray-400 font-medium block mt-1 uppercase">Subject Curriculums</span>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </div>

      {/* 2. Path subject tracks */}
      <div className="py-16 bg-gray-50/50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-lg mx-auto mb-12">
            <span className="text-xs font-bold text-blue-600 font-mono uppercase tracking-widest block leading-none">Educational Pipelines</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 tracking-tight mt-3">Advanced Course Pathways</h2>
            <p className="text-xs text-gray-500 mt-2">Tailored subjects prepared by board-accredited educators designed to strengthen foundational concepts.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-blue-100 transition-all hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 border border-blue-100">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Advanced Mathematics</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">Algebra basics, Linear curves, Vector matrices, Trigonometry structures, and full AP Pre-Calculus preparation.</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-purple-100 transition-all hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 border border-purple-100">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Interactive Science</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">Newtonian mechanics, electrostatics, thermodynamics, organic chemistry basics, and verified virtual laboratory modules.</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-pink-100 transition-all hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center mb-4 border border-pink-100">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">English & Creative Writing</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">Essay outline methodologies, SAT reading grammar guides, literature interpretation templates, and vocabulary growth circles.</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-emerald-100 transition-all hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-100">
                <Bookmark className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Coding & CS</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">Full-stack web concepts, algorithm patterns, object oriented python scripting, and database structure templates.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Highlighted Classes */}
      <div className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12">
            <div>
              <span className="text-xs font-bold text-blue-600 font-mono uppercase tracking-widest block leading-none">Enroll Now</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 tracking-tight mt-3">Featured Classes Open for intake</h2>
              <p className="text-xs text-gray-500 mt-2">Limited-capacity courses. Reserve a seat today.</p>
            </div>
            <button
              onClick={() => onNavigateTab('classes')}
              className="mt-4 sm:mt-0 text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
            >
              View Full Subjects Directory <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {highlightedClasses.length === 0 ? (
              <div className="col-span-3 text-center py-10 text-gray-400 text-sm">
                Synchronizing available schedules with Cloud Database...
              </div>
            ) : (
              highlightedClasses.map((item) => (
                <div key={item.id}>
                  <ClassCard 
                    item={item} 
                    onBookSuccess={() => onNavigateTab('dashboard')} 
                    onRedirectToLogin={() => onNavigateTab('auth')} 
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Class Schedule Widget Section */}
      <div className="py-16 bg-slate-50 dark:bg-slate-950/20 border-t border-b border-slate-100 dark:border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ClassScheduleWidget />
        </div>
      </div>

      {/* 4. Faculty highlights */}
      <div className="py-16 bg-blue-50/50 border-t border-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12">
            <div>
              <span className="text-xs font-bold text-blue-600 font-mono uppercase tracking-widest block leading-none">Meet the Faculty</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 tracking-tight mt-3">Highly-Respected Instructors</h2>
              <p className="text-xs text-gray-500 mt-2">Ph.D. academics and programming veterans with verifiable curriculum success.</p>
            </div>
            <button
              onClick={() => onNavigateTab('tutors')}
              className="mt-4 sm:mt-0 text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
            >
              Browse Full Faculty Directory <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topTutors.length === 0 ? (
              <div className="col-span-3 text-center py-10 text-gray-450 text-xs">
                Mapping expert tutors list...
              </div>
            ) : (
              topTutors.map((tutor) => (
                <div key={tutor.uid}>
                  <TutorCard tutor={tutor} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 5. Testimonial showcase */}
      <div className="py-16 sm:py-24 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-lg mx-auto mb-16">
            <span className="text-xs font-bold text-blue-600 font-mono uppercase tracking-widest block leading-none">Scholarly Praise</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 tracking-tight mt-3">Testimonials from Parents & Students</h2>
            <p className="text-xs text-gray-500 mt-2">See how our dynamic class calendars and tracking metrics help achieve premium goals.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 relative">
              <span className="text-4xl text-blue-200 font-serif absolute top-3 left-4 leading-none select-none">“</span>
              <p className="text-xs text-gray-650 leading-relaxed font-sans relative z-10 pt-4">
                The interactive math sessions with Dr. Jenkins were absolutely game-changing. My son's AP Calculus grades spiked from a C+ to an A in less than three months. The visual calendars make bookings incredibly simple!
              </p>
              <div className="mt-5 border-t border-gray-100 pt-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase">
                  LH
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-800 block">Lucas H. (Parent)</span>
                  <span className="text-[10px] text-gray-400 block font-mono">AP Prep Core</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 relative">
              <span className="text-4xl text-blue-200 font-serif absolute top-3 left-4 leading-none select-none">“</span>
              <p className="text-xs text-gray-650 leading-relaxed font-sans relative z-10 pt-4">
                David Kross's web development essentials has been fantastic. Building real dynamic landing pages instead of running slides had me hooked from lesson one. The student dashboard tracks my bills and schedules perfectly.
              </p>
              <div className="mt-5 border-t border-gray-100 pt-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase">
                  AM
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-800 block">Alex Mercer (Student)</span>
                  <span className="text-[10px] text-gray-400 block font-mono">Grade 11 Web Dev</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 relative">
              <span className="text-4xl text-blue-200 font-serif absolute top-3 left-4 leading-none select-none">“</span>
              <p className="text-xs text-gray-650 leading-relaxed font-sans relative z-10 pt-4">
                As a working parent, the customizable notification preferences (messages, sessions confirmations) give me incredible peace of mind. I can easily monitor tutor feedbacks and track ledger payouts transparently.
              </p>
              <div className="mt-5 border-t border-gray-100 pt-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase">
                  RW
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-800 block">Rachel W. (Parent)</span>
                  <span className="text-[10px] text-gray-400 block font-mono">Algebra Foundations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
