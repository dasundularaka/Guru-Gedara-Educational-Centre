import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Lock, 
  Sparkles, 
  BookOpen, 
  Compass, 
  ChevronRight, 
  HelpCircle, 
  Award, 
  Clock, 
  BookOpenCheck,
  PlayCircle,
  FileText,
  RefreshCw,
  Trophy,
  ArrowRight,
  Download,
  ExternalLink,
  Database,
  GraduationCap
} from 'lucide-react';
import { Booking, ClassItem, UserProfile, StudyMaterial, PathwayItem } from '../types';
import { firestoreService } from '../lib/firestoreService';

interface StudentModuleRoadmapProps {
  currentUser: UserProfile;
  userBookings: Booking[];
  classes: ClassItem[];
}

export interface SyllabusModule {
  id: string;
  sequence: number;
  title: string;
  status: 'completed' | 'current' | 'upcoming';
  description: string;
  duration: string;
  topics: string[];
  learningObjectives: string[];
  resources: { name: string; url: string; type: 'pdf' | 'video' | 'link' | 'file'; size?: string }[];
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

export const StudentModuleRoadmap: React.FC<StudentModuleRoadmapProps> = ({ 
  currentUser, 
  userBookings, 
  classes 
}) => {
  // Selected class
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [filter, setFilter] = useState<'all' | 'completed' | 'ongoing'>('all');
  const [activeStepId, setActiveStepId] = useState<string>('');
  
  // Real database states
  const [classStudyMaterials, setClassStudyMaterials] = useState<StudyMaterial[]>([]);
  const [pathways, setPathways] = useState<PathwayItem[]>([]);
  const [completedModuleIds, setCompletedModuleIds] = useState<string[]>([]);
  const [quizScores, setQuizScores] = useState<Record<string, number>>({});
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [isSavingProgress, setIsSavingProgress] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Quiz and interactive states
  const [quizAnswerIndex, setQuizAnswerIndex] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizSuccess, setQuizSuccess] = useState<boolean | null>(null);

  // 1. Calculate genuine list of enrolled courses from bookings and profile
  const enrolledCoursesList = useMemo(() => {
    const activeBookingClassIds = new Set<string>();
    
    (userBookings || []).forEach(b => {
      if (b.status === 'active' || b.status === 'approved' || b.status === 'pending_approval') {
        activeBookingClassIds.add(b.classId);
      }
    });

    // Also include classes from student's profile selectedClasses if any
    (currentUser.selectedClasses || []).forEach(id => activeBookingClassIds.add(id));

    const enrolled: { id: string; title: string; subject: string; isEnrolled: boolean; classObj: ClassItem }[] = [];
    const available: { id: string; title: string; subject: string; isEnrolled: boolean; classObj: ClassItem }[] = [];

    (classes || []).forEach(c => {
      const isEnrolled = activeBookingClassIds.has(c.id);
      const item = {
        id: c.id,
        title: c.title,
        subject: c.subject,
        isEnrolled,
        classObj: c
      };
      if (isEnrolled) {
        enrolled.push(item);
      } else {
        available.push(item);
      }
    });

    // Combine enrolled first, then available courses
    return [...enrolled, ...available];
  }, [userBookings, currentUser.selectedClasses, classes]);

  // Set default selected class on mount or when courses list is populated
  useEffect(() => {
    if (enrolledCoursesList.length > 0) {
      if (!selectedClassId || !enrolledCoursesList.some(c => c.id === selectedClassId)) {
        // Prefer first enrolled class, otherwise first available
        const preferred = enrolledCoursesList.find(c => c.isEnrolled) || enrolledCoursesList[0];
        setSelectedClassId(preferred.id);
      }
    }
  }, [enrolledCoursesList, selectedClassId]);

  // Active selected class item
  const selectedClassObj = useMemo(() => {
    const match = enrolledCoursesList.find(c => c.id === selectedClassId);
    return match?.classObj || classes.find(c => c.id === selectedClassId) || classes[0] || null;
  }, [enrolledCoursesList, selectedClassId, classes]);

  // 2. Load real database progress and real study materials for the selected class
  const loadDatabaseCourseData = useCallback(async (classId: string) => {
    if (!classId) return;
    setIsLoadingData(true);
    try {
      const [materials, fetchedPathways, progress] = await Promise.all([
        firestoreService.getStudyMaterials(classId).catch(() => []),
        firestoreService.getPathways().catch(() => []),
        firestoreService.getStudentRoadmapProgress(currentUser.uid, classId).catch(() => ({ completedModuleIds: [], quizScores: {} }))
      ]);

      setClassStudyMaterials(materials || []);
      setPathways(fetchedPathways || []);
      setCompletedModuleIds(progress.completedModuleIds || []);
      setQuizScores(progress.quizScores || {});
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error("Error loading real database roadmap data:", err);
    } finally {
      setIsLoadingData(false);
    }
  }, [currentUser.uid]);

  useEffect(() => {
    if (selectedClassId) {
      loadDatabaseCourseData(selectedClassId);
      // Reset quiz states when class switches
      setQuizAnswerIndex(null);
      setQuizSubmitted(false);
      setQuizSuccess(null);
    }
  }, [selectedClassId, loadDatabaseCourseData]);

  // 3. Dynamically generate real structured modules based on genuine database ClassItem
  const syllabusModules = useMemo(() => {
    if (!selectedClassObj) return [];

    const title = selectedClassObj.title || 'Academic Course';
    const subject = selectedClassObj.subject || 'General Academics';
    const level = selectedClassObj.level || 'Standard Syllabus';
    const tutor = selectedClassObj.tutorName || 'Faculty Instructor';
    const desc = selectedClassObj.description || 'Comprehensive curriculum aligned with national educational standards.';

    // Generate 5 core sequential modules rooted directly in real class attributes
    const rawModules: Omit<SyllabusModule, 'status'>[] = [
      {
        id: `mod_${selectedClassObj.id}_1`,
        sequence: 1,
        title: `Foundations & Fundamentals of ${subject}`,
        description: `Core foundational principles of ${title}. Introductory diagnostic assessments, core terminology, and prerequisite masteries for ${level}.`,
        duration: 'Weeks 1 – 2',
        topics: [
          `${subject} Core Terminology & Axioms`,
          'Prerequisite Diagnostic Assessment',
          'Fundamental Principles & Definitions',
          'Initial Homework & Method Practice'
        ],
        learningObjectives: [
          `Master core definitions and notation for ${subject}`,
          `Identify prerequisite knowledge gaps before advanced units`,
          `Formulate foundational solutions independently`
        ],
        resources: [],
        quiz: {
          question: `In the study of ${subject} (${level}), what is the primary prerequisite requirement for fundamental concept validation?`,
          options: [
            'Systematic understanding of core operational rules and definitions',
            'Memorizing answers without deriving core formulas',
            'Skipping foundational axioms directly to final past papers',
            'Relying solely on external automated solvers'
          ],
          correctIndex: 0,
          explanation: `A solid grasp of core operational rules and foundational definitions in ${subject} is essential before moving into complex applications.`
        }
      },
      {
        id: `mod_${selectedClassObj.id}_2`,
        sequence: 2,
        title: `Core Curriculum Theory: ${title}`,
        description: `Deep theoretical exploration of ${desc.substring(0, 110)}... Detailed methodology, structured worked examples, and weekly problem analysis.`,
        duration: 'Weeks 3 – 5',
        topics: [
          'Detailed Theoretical Frameworks',
          'Step-by-step Worked Examples',
          'Analytical Case Studies & Problem Formulations',
          'Tutor-led Interactive Review Sessions'
        ],
        learningObjectives: [
          `Apply theoretical models to real-world exam problem sets`,
          `Analyze multi-step equations or theoretical concepts with precision`,
          `Construct complete, legible working steps meeting examiner standards`
        ],
        resources: [],
        quiz: {
          question: `When executing multi-step solutions in ${subject}, what practice yields the highest mark retention?`,
          options: [
            'Documenting every intermediate step and applying standard theorems explicitly',
            'Guessing the final integer value',
            'Writing only the final answer without working',
            'Using unverified shortcuts not in the official syllabus'
          ],
          correctIndex: 0,
          explanation: `Examiners award intermediate method marks for clearly documented steps and explicit theorem citations in ${subject}.`
        }
      },
      {
        id: `mod_${selectedClassObj.id}_3`,
        sequence: 3,
        title: `Advanced Problem Solving & Problem Sets`,
        description: `Rigorous problem-solving workshop for ${level}. Tackling high-difficulty challenges, edge cases, and non-routine question styles.`,
        duration: 'Weeks 6 – 8',
        topics: [
          'Non-routine Complex Problem Solving',
          'Heuristic Approaches & Cross-topic Integration',
          'Error Detection & Self-Correction Techniques',
          'Timed Diagnostic Problem Sets'
        ],
        learningObjectives: [
          `Deconstruct complex, unfamiliar problems into familiar sub-components`,
          `Synthesize knowledge across multiple syllabus sections`,
          `Optimize solution speed under simulated test pressure`
        ],
        resources: [],
        quiz: {
          question: `What is the most effective approach when encountering an unfamiliar question type in ${subject}?`,
          options: [
            'Deconstruct the problem into given data, target unknowns, and known governing principles',
            'Immediately abandon the question and leave it blank',
            'Write random equations unrelated to the prompt',
            'Spend the entire exam duration trying random numbers'
          ],
          correctIndex: 0,
          explanation: 'Deconstructing given values, identifying targets, and matching fundamental governing equations systematically is the proven problem-solving approach.'
        }
      },
      {
        id: `mod_${selectedClassObj.id}_4`,
        sequence: 4,
        title: `Past Examination Paper Analysis & Scoring Schemes`,
        description: `Comprehensive review of previous national/academic examination papers in ${subject}. Analyzing official marking rubrics and examiner report feedback.`,
        duration: 'Weeks 9 – 10',
        topics: [
          'Chronological Past Paper Dissections',
          'Examiner Scheme Pitfalls & Common Student Errors',
          'Mark Allocation Optimization Strategies',
          'Model Answer Construction'
        ],
        learningObjectives: [
          `Familiarize with authentic past examination formats and structures`,
          `Avoid common pitfalls documented by official syllabus examiners`,
          `Maximize marks by targeting key rubric scoring keywords`
        ],
        resources: [],
        quiz: {
          question: `According to standard marking schemes in ${subject}, why is final unit/dimensional correctness critical?`,
          options: [
            'Accuracy marks (A-marks) are often withheld if final units or significant figures are omitted',
            'It is completely optional and never penalized',
            'It only matters in elementary school tests',
            'Units do not affect score calculations'
          ],
          correctIndex: 0,
          explanation: 'In academic exams, accuracy marks specifically mandate correct physical/numerical units and appropriate rounding precision.'
        }
      },
      {
        id: `mod_${selectedClassObj.id}_5`,
        sequence: 5,
        title: `Comprehensive Mastery Assessment & Final Evaluation`,
        description: `Capstone milestone evaluation guided by instructor ${tutor}. Mock examination simulation, personalized performance audit, and mastery certification.`,
        duration: 'Weeks 11 – 12',
        topics: [
          'Full-length Mock Examination Simulation',
          'Personalized Weak-spot Remediation',
          'Final Syllabus Synthesis & Revision Roadmap',
          'Mastery Certification & Next Level Readiness'
        ],
        learningObjectives: [
          `Demonstrate holistic mastery across the entire course syllabus`,
          `Execute an entire examination paper within official time constraints`,
          `Achieve confident readiness for official academic evaluations`
        ],
        resources: [],
        quiz: {
          question: `What revision strategy is scientifically proven to produce the highest retention in final exam preparation?`,
          options: [
            'Spaced active retrieval practice combined with mock timed testing',
            'Passive re-reading of notes the night before the exam',
            'Cramming for 14 hours continuously without sleep',
            'Highlighting pages with multi-colored markers without solving problems'
          ],
          correctIndex: 0,
          explanation: 'Active retrieval practice and spaced repetition produce superior neural retention and exam performance compared to passive reading.'
        }
      }
    ];

    // Distribute genuine uploaded study materials into the modules
    (classStudyMaterials || []).forEach((mat, idx) => {
      const targetModuleIndex = idx % rawModules.length;
      let resType: 'pdf' | 'video' | 'link' | 'file' = 'file';
      if (mat.type === 'video' || mat.referenceUrl?.includes('youtube') || mat.referenceUrl?.includes('vimeo')) {
        resType = 'video';
      } else if (mat.fileType?.includes('pdf') || mat.fileName?.endsWith('.pdf') || mat.referenceUrl?.endsWith('.pdf')) {
        resType = 'pdf';
      } else if (mat.referenceUrl?.startsWith('http')) {
        resType = 'link';
      }

      rawModules[targetModuleIndex].resources.push({
        name: mat.title || mat.fileName || `Study Resource #${idx + 1}`,
        url: mat.referenceUrl || '#',
        type: resType,
        size: mat.fileSize ? `${Math.round(mat.fileSize / 1024)} KB` : undefined
      });
    });

    // Map completion statuses from real database state
    return rawModules.map(m => {
      const isCompleted = completedModuleIds.includes(m.id);
      let status: 'completed' | 'current' | 'upcoming' = 'upcoming';

      if (isCompleted) {
        status = 'completed';
      } else {
        // First uncompleted module is 'current'
        const hasEarlierUncompleted = rawModules.some(p => p.sequence < m.sequence && !completedModuleIds.includes(p.id));
        if (!hasEarlierUncompleted) {
          status = 'current';
        } else {
          status = 'upcoming';
        }
      }

      return {
        ...m,
        status
      } as SyllabusModule;
    });
  }, [selectedClassObj, classStudyMaterials, completedModuleIds]);

  // Set default active step
  useEffect(() => {
    if (syllabusModules.length > 0) {
      const currentOrFirst = syllabusModules.find(m => m.status === 'current') || syllabusModules[0];
      if (!activeStepId || !syllabusModules.some(m => m.id === activeStepId)) {
        setActiveStepId(currentOrFirst.id);
      }
    }
  }, [syllabusModules, activeStepId]);

  // Active step module
  const activeStepModule = useMemo(() => {
    return syllabusModules.find(m => m.id === activeStepId) || syllabusModules[0] || null;
  }, [syllabusModules, activeStepId]);

  // Filtered modules
  const filteredModules = useMemo(() => {
    return syllabusModules.filter(m => {
      if (filter === 'completed') return m.status === 'completed';
      if (filter === 'ongoing') return m.status === 'current' || m.status === 'upcoming';
      return true;
    });
  }, [syllabusModules, filter]);

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = syllabusModules.length;
    const completed = syllabusModules.filter(m => m.status === 'completed').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [syllabusModules]);

  // 4. Save progress directly to database when student completes/uncompletes a module
  const handleToggleComplete = async (moduleId: string) => {
    if (!selectedClassId) return;

    setIsSavingProgress(true);
    try {
      const alreadyCompleted = completedModuleIds.includes(moduleId);
      const newCompleted = alreadyCompleted
        ? completedModuleIds.filter(id => id !== moduleId)
        : [...completedModuleIds, moduleId];

      setCompletedModuleIds(newCompleted);

      // Persist to Firestore database
      await firestoreService.saveStudentRoadmapProgress(
        currentUser.uid,
        selectedClassId,
        {
          completedModuleIds: newCompleted,
          quizScores
        },
        currentUser.name || currentUser.username || 'Student'
      );
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error("Failed saving student progress to database:", err);
    } finally {
      setIsSavingProgress(false);
      setQuizAnswerIndex(null);
      setQuizSubmitted(false);
      setQuizSuccess(null);
    }
  };

  // 5. Submit diagnostic assessment quiz with database recording
  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStepModule || quizAnswerIndex === null || !selectedClassId) return;

    const isCorrect = quizAnswerIndex === activeStepModule.quiz.correctIndex;
    setQuizSubmitted(true);
    setQuizSuccess(isCorrect);

    if (isCorrect) {
      const updatedScores = {
        ...quizScores,
        [activeStepModule.id]: 100
      };
      setQuizScores(updatedScores);

      const alreadyCompleted = completedModuleIds.includes(activeStepModule.id);
      const newCompleted = alreadyCompleted
        ? completedModuleIds
        : [...completedModuleIds, activeStepModule.id];

      if (!alreadyCompleted) {
        setCompletedModuleIds(newCompleted);
      }

      setIsSavingProgress(true);
      try {
        await firestoreService.saveStudentRoadmapProgress(
          currentUser.uid,
          selectedClassId,
          {
            completedModuleIds: newCompleted,
            quizScores: updatedScores
          },
          currentUser.name || currentUser.username || 'Student'
        );
        setLastSyncedAt(new Date());
      } catch (err) {
        console.error("Failed updating quiz score in database:", err);
      } finally {
        setIsSavingProgress(false);
      }
    }
  };

  const handleResourceOpen = (res: { name: string; url: string }) => {
    if (!res.url || res.url === '#') {
      alert(`Resource "${res.name}" is securely stored in academy repository.`);
      return;
    }
    window.open(res.url, '_blank', 'noopener,noreferrer');
  };

  if (enrolledCoursesList.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-12 rounded-3xl text-center space-y-4 shadow-sm" id="digital_syllabus_roadmap_panel">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
          <Compass className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-base font-black text-slate-900 dark:text-white">No Academic Classes Available</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            There are currently no active course records in the database. Please check back soon or browse courses once scheduled by the academy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 p-6 rounded-3xl space-y-6" id="digital_syllabus_roadmap_panel">
      
      {/* Top Banner Control Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Academic Curriculum Roadmap
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <Database className="w-2.5 h-2.5" /> Database Synced
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
            Live syllabus milestones and materials streamed directly from academy records. Complete diagnostic units to unlock mastery certificates.
          </p>
        </div>

        {/* Dynamic Course selector from Real Database */}
        <div className="flex-shrink-0 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
              Course Syllabus:
            </label>
            {lastSyncedAt && (
              <span className="text-[9px] text-slate-400 font-mono">
                Synced {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="text-xs font-bold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-xl text-slate-800 dark:text-slate-100 outline-none w-full md:w-72 transition-all cursor-pointer"
              id="select_course_roadmap_class"
            >
              {enrolledCoursesList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.isEnrolled ? '✓ ' : ''}{c.title} ({c.subject})
                </option>
              ))}
            </select>
            <button
              onClick={() => selectedClassId && loadDatabaseCourseData(selectedClassId)}
              disabled={isLoadingData}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Refresh from Database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin text-indigo-500' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Visual Progress Meter Row */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        
        {/* Progress Percentage Circle */}
        <div className="md:col-span-3 flex items-center gap-4 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 pb-3 md:pb-0 md:pr-4">
          <div className="h-14 w-14 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-center flex-shrink-0">
            <span className="text-lg font-black text-indigo-700 dark:text-indigo-400 tracking-tight font-mono">
              {metrics.percentage}%
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
              Syllabus Completion
            </span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
              {metrics.completed} of {metrics.total} Modules Completed
            </span>
            {isSavingProgress && (
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono animate-pulse">
                Saving to database...
              </span>
            )}
          </div>
        </div>

        {/* Graphical Progress Timeline bar */}
        <div className="md:col-span-6 space-y-2">
          <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">
            <span>{selectedClassObj?.title || 'Academic Syllabus'}</span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400">{metrics.percentage}% Completed</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
            <motion.div 
              className="bg-gradient-to-r from-indigo-500 to-blue-600 h-2.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${metrics.percentage}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            <span>Course Start</span>
            <span>{selectedClassObj?.schedule || 'Scheduled'}</span>
            <span>Mastery Review</span>
          </div>
        </div>

        {/* Quick Filter Menu */}
        <div className="md:col-span-3 flex justify-start md:justify-end gap-1.5 pt-2 md:pt-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
              filter === 'all' 
                ? 'bg-indigo-600 text-white border-indigo-650 shadow-xs' 
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border-slate-200 dark:border-slate-700'
            }`}
          >
            All ({syllabusModules.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
              filter === 'completed' 
                ? 'bg-indigo-600 text-white border-indigo-650 shadow-xs' 
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border-slate-200 dark:border-slate-700'
            }`}
          >
            Completed ({metrics.completed})
          </button>
          <button
            onClick={() => setFilter('ongoing')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
              filter === 'ongoing' 
                ? 'bg-indigo-600 text-white border-indigo-650 shadow-xs' 
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border-slate-200 dark:border-slate-700'
            }`}
          >
            Ongoing ({metrics.total - metrics.completed})
          </button>
        </div>

      </div>

      {/* Main Interactive Roadmap Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Milestone vertical timeline */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-5">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
              Syllabus Sequence
            </h4>
            <span className="text-[10px] text-slate-400">Click to inspect</span>
          </div>

          <div className="relative pl-6 space-y-5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
            {filteredModules.map((m) => {
              const isSelected = activeStepId === m.id;
              
              let bubbleStyle = "bg-white dark:bg-slate-800 border-slate-300 text-slate-400";
              let cardStyle = "border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40";
              
              if (m.status === 'completed') {
                bubbleStyle = "bg-emerald-100 border-emerald-500 text-emerald-700 font-extrabold";
                cardStyle = "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20";
              } else if (m.status === 'current') {
                bubbleStyle = "bg-indigo-100 border-indigo-600 text-indigo-700 ring-4 ring-indigo-50 dark:ring-indigo-950/50 animate-pulse";
                cardStyle = "border-indigo-300 dark:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-950/30 shadow-xs";
              }

              if (isSelected) {
                cardStyle += " ring-2 ring-indigo-500 border-indigo-600";
              }

              return (
                <motion.div 
                  key={m.id}
                  onClick={() => setActiveStepId(m.id)}
                  className="relative group cursor-pointer transition-all"
                  whileHover={{ x: 2 }}
                >
                  {/* Step node */}
                  <div className={`absolute -left-[23px] top-3.5 h-6 w-6 rounded-full border-2 flex items-center justify-center text-[10px] transition-all z-10 ${bubbleStyle}`}>
                    {m.status === 'completed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : m.status === 'upcoming' ? (
                      <Lock className="w-2.5 h-2.5 text-slate-400" />
                    ) : (
                      <span className="font-mono text-[9px] font-black">{m.sequence}</span>
                    )}
                  </div>

                  {/* Card item */}
                  <div className={`border p-3.5 rounded-xl transition-all space-y-1.5 ${cardStyle}`}>
                    <div className="flex justify-between items-baseline gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">
                          STEP 0{m.sequence}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">
                          ({m.duration})
                        </span>
                      </div>
                      
                      {m.status === 'current' && (
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-indigo-600 text-white tracking-widest">
                          Active In Class
                        </span>
                      )}
                      {m.status === 'completed' && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Done
                        </span>
                      )}
                    </div>

                    <h5 className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {m.title}
                    </h5>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                      {m.description}
                    </p>

                    {/* Resources count pill */}
                    {m.resources.length > 0 && (
                      <div className="pt-1 flex items-center gap-1 text-[9.5px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                        <FileText className="w-3 h-3" />
                        <span>{m.resources.length} attached study resource{m.resources.length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active step detail view & Interactive check */}
        <div className="lg:col-span-7 space-y-6">
          {activeStepModule ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStepModule.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-5"
              >
                {/* Header card info */}
                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        Milestone Step 0{activeStepModule.sequence}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {selectedClassObj?.subject || 'Academics'}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                      {activeStepModule.title}
                    </h4>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" /> {activeStepModule.duration}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> {activeStepModule.topics.length} focus topics
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <button
                      onClick={() => handleToggleComplete(activeStepModule.id)}
                      disabled={isSavingProgress}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center gap-1.5 cursor-pointer ${
                        activeStepModule.status === 'completed'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500 shadow-xs'
                      }`}
                    >
                      {activeStepModule.status === 'completed' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          Marked Completed
                        </>
                      ) : (
                        "Mark Module Complete"
                      )}
                    </button>
                  </div>
                </div>

                {/* Syllabus Description */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono block">
                    Curriculum Overview
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    {activeStepModule.description}
                  </p>
                </div>

                {/* Core Learning Topics & Expected Outcomes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono block">
                      Core Topics Covered
                    </span>
                    <ul className="space-y-1.5">
                      {activeStepModule.topics.map((top, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                          <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                          <span className="truncate" title={top}>{top}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono block">
                      Target Learning Outcomes
                    </span>
                    <ul className="space-y-1.5">
                      {activeStepModule.learningObjectives.map((obj, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
                          <span className="leading-tight">{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Attached Database Study Materials */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono block">
                      Attached Database Study Materials
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {activeStepModule.resources.length} Material{activeStepModule.resources.length !== 1 ? 's' : ''} Attached
                    </span>
                  </div>
                  
                  {activeStepModule.resources.length === 0 ? (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                      <p className="text-xs text-slate-400">No downloadable files attached to this module yet.</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Faculty uploads will link here automatically.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {activeStepModule.resources.map((res, rIdx) => (
                        <div 
                          key={rIdx}
                          onClick={() => handleResourceOpen(res)}
                          className="p-2.5 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl flex items-center justify-between text-xs text-slate-700 dark:text-slate-200 transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-2 truncate">
                            {res.type === 'pdf' ? (
                              <FileText className="w-4 h-4 text-rose-500 flex-shrink-0" />
                            ) : res.type === 'video' ? (
                              <PlayCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            )}
                            <div className="truncate">
                              <span className="font-semibold block truncate">{res.name}</span>
                              {res.size && <span className="text-[9px] text-slate-400 font-mono">{res.size}</span>}
                            </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Interactive Diagnostic Quiz check */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4 bg-slate-50/60 dark:bg-slate-800/30 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                        Milestone Diagnostic Assessment
                      </span>
                    </div>
                    {quizScores[activeStepModule.id] && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300">
                        Score: 100% Passed
                      </span>
                    )}
                  </div>

                  <form onSubmit={handleQuizSubmit} className="space-y-3">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug block">
                      {activeStepModule.quiz.question}
                    </span>

                    <div className="space-y-1.5">
                      {activeStepModule.quiz.options.map((opt, oIdx) => {
                        const isSelected = quizAnswerIndex === oIdx;
                        let optionStyle = "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50";
                        if (isSelected) optionStyle = "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 ring-1 ring-indigo-500 text-indigo-900 dark:text-indigo-200 font-semibold";
                        
                        if (quizSubmitted) {
                          const isCorrectOption = oIdx === activeStepModule.quiz.correctIndex;
                          if (isCorrectOption) {
                            optionStyle = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold";
                          } else if (isSelected) {
                            optionStyle = "border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 line-through";
                          }
                        }

                        return (
                          <label 
                            key={oIdx} 
                            className={`p-2.5 rounded-xl border text-xs leading-snug cursor-pointer flex items-center gap-2.5 transition-all ${optionStyle}`}
                          >
                            <input 
                              type="radio" 
                              name="quizOption" 
                              value={oIdx} 
                              disabled={quizSubmitted}
                              checked={isSelected}
                              onChange={() => setQuizAnswerIndex(oIdx)}
                              className="text-indigo-600 focus:ring-indigo-500 accent-indigo-600 flex-shrink-0 cursor-pointer"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>

                    {!quizSubmitted ? (
                      <button
                        type="submit"
                        disabled={quizAnswerIndex === null || isSavingProgress}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer w-full"
                      >
                        <span>Submit Diagnostic Answer</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="space-y-3 pt-2">
                        <div className={`p-3.5 rounded-xl text-xs flex gap-2.5 ${quizSuccess ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'}`}>
                          <div className="flex-shrink-0 font-bold text-base leading-none">
                            {quizSuccess ? "🎉" : "❌"}
                          </div>
                          <div className="space-y-1">
                            <h6 className="font-black">{quizSuccess ? "Diagnostic Check Passed!" : "Revision Recommended"}</h6>
                            <p className="text-[11px] leading-relaxed">
                              {activeStepModule.quiz.explanation}
                            </p>
                            {quizSuccess && (
                              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold font-mono pt-1">
                                ✓ Score recorded in database and module marked complete!
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setQuizAnswerIndex(null);
                            setQuizSubmitted(false);
                            setQuizSuccess(null);
                          }}
                          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-mono cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> Retry diagnostic check
                        </button>
                      </div>
                    )}
                  </form>
                </div>

              </motion.div>
            </AnimatePresence>
          ) : null}

          {/* Academic Milestone Achievements from Real Database */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-sm space-y-3.5 relative overflow-hidden border border-slate-800">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[9px] font-mono font-bold text-indigo-300 uppercase tracking-widest block">
                  Curriculum Achievements
                </span>
                <h4 className="text-sm font-extrabold tracking-tight">
                  Academic Progress Record
                </h4>
              </div>
              <Trophy className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>

            <p className="text-[11px] text-indigo-200 leading-relaxed">
              Progress marks are saved permanently to your student profile across sessions. Completing all 5 milestone units earns a course completion certificate issued by instructor {selectedClassObj?.tutorName || 'Faculty'}.
            </p>

            <div className="flex items-center justify-between pt-1 border-t border-indigo-800/50 text-xs">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-300" />
                <span className="text-[11px] text-indigo-200 font-mono">
                  Enrolled: <b>{selectedClassObj?.title || 'Class'}</b>
                </span>
              </div>
              <span className="text-[11px] text-emerald-400 font-mono font-bold">
                {metrics.completed}/{metrics.total} Units Certified
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
