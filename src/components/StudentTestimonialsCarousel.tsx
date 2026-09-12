import React, { useState, useEffect, useRef } from 'react';
import { 
  Quote, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  GraduationCap, 
  Award, 
  CheckCircle2, 
  Sparkles,
  School,
  TrendingUp,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface StudentSuccessStory {
  id: string;
  name: string;
  avatar: string;
  achievement: string;
  currentRole: string;
  batch: string;
  subject: string;
  tutorName: string;
  score: string;
  quote: string;
  badge: string;
  verified: boolean;
}

const FORMER_STUDENT_STORIES: StudentSuccessStory[] = [
  {
    id: 'story-1',
    name: 'Dilhara Jayawardena',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
    achievement: 'Island 1st Rank - Physical Sciences',
    currentRole: 'Computer Science & Engineering, University of Moratuwa',
    batch: 'Batch of 2023',
    subject: 'Combined Mathematics & Advanced Physics',
    tutorName: 'Prof. Kalinga Bandara & Dr. Aruna Shantha',
    score: '3 A*s (Z-Score 2.91)',
    badge: 'Island 1st Topper',
    verified: true,
    quote: 'The rigorous problem-solving sessions and step-by-step doubt clearing transformed my approach to Mathematics. The structured revision roadmap was the key to achieving the top rank in the country.'
  },
  {
    id: 'story-2',
    name: 'Kavindu Senanayake',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop',
    achievement: 'Direct Entry to Faculty of Medicine, Colombo',
    currentRole: 'Medical Student (MBBS), University of Colombo',
    batch: 'Batch of 2024',
    subject: 'Biology & Chemistry',
    tutorName: 'Dr. Nilmini Weerasinghe',
    score: 'Distinction 3 As (Z-Score 2.68)',
    badge: 'Faculty of Medicine',
    verified: true,
    quote: 'Gurugedara faculty broke down complex biological pathways into memorable visual logic. The mock examinations mirrored the real exam difficulty with 100% precision.'
  },
  {
    id: 'story-3',
    name: 'Shenali Perera',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop',
    achievement: 'Top in South Asia - Cambridge A/L Economics',
    currentRole: 'Economics & Finance Scholar, London School of Economics',
    batch: 'Class of 2023',
    subject: 'Economics & Business Studies',
    tutorName: 'Mr. Rohan Gunaratne',
    score: 'A* A* A with Cambridge Outstanding Learner Award',
    badge: 'Cambridge High Achiever',
    verified: true,
    quote: 'The personalized tutor feedback on essay structure and real-world microeconomic case studies gave me the critical edge to earn the Cambridge Outstanding Learner Award.'
  },
  {
    id: 'story-4',
    name: 'Anushka Wickramasinghe',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    achievement: 'Top 10 Island Rank - Biological Sciences',
    currentRole: 'Biomedical Engineering Researcher',
    batch: 'Batch of 2022',
    subject: 'Advanced Chemistry & Organic Synthesis',
    tutorName: 'Dr. Sarath Gamage',
    score: '3 As (Z-Score 2.74)',
    badge: 'Island Top 10',
    verified: true,
    quote: 'I used to struggle with Organic Chemistry mechanisms until I enrolled here. The live interactive problem labs and detailed syllabus roadmaps made all the difference in my university entrance.'
  },
  {
    id: 'story-5',
    name: 'Rashmi Fernando',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    achievement: 'Full Scholarship - Software Engineering',
    currentRole: 'Associate Software Engineer & Tech Fellow',
    batch: 'Class of 2024',
    subject: 'Information & Communication Technology (ICT)',
    tutorName: 'Eng. Dimuthu Kumara',
    score: 'A* in ICT & Mathematics',
    badge: 'Tech Scholar',
    verified: true,
    quote: 'Practical coding assignments and continuous mentorship helped me build real-world software applications during my studies, leading straight to a prestigious tech scholarship.'
  },
  {
    id: 'story-6',
    name: 'Tharindu Rathnayake',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    achievement: 'District 1st Rank - Commerce Stream',
    currentRole: 'Accounting & Finance Analyst',
    batch: 'Batch of 2023',
    subject: 'Accounting & Business Statistics',
    tutorName: 'Mrs. Priyanthi Silva',
    score: '3 As (Z-Score 2.52)',
    badge: 'District 1st Topper',
    verified: true,
    quote: 'The speed-solving techniques and past-paper analytical sessions gave me unmatched confidence. I finished my final accounting paper 30 minutes early with full accuracy.'
  }
];

export const StudentTestimonialsCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const storiesCount = FORMER_STUDENT_STORIES.length;

  const nextSlide = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % storiesCount);
  };

  const prevSlide = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + storiesCount) % storiesCount);
  };

  const goToSlide = (idx: number) => {
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
  };

  // Auto-play rotating carousel with pause-on-hover
  useEffect(() => {
    if (isPaused) return;

    autoPlayRef.current = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % storiesCount);
    }, 6000);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isPaused, storiesCount]);

  const current = FORMER_STUDENT_STORIES[currentIndex];

  return (
    <section 
      className="py-12 sm:py-20 bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      id="student_testimonials_section"
    >
      {/* Decorative ambient background glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 sm:mb-14">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 text-[11px] font-black uppercase tracking-widest font-mono">
              <Award className="w-3.5 h-3.5 text-indigo-400" />
              <span>Proven Social Proof & Alumni Excellence</span>
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Student <span className="bg-linear-to-r from-indigo-300 via-sky-200 to-white bg-clip-text text-transparent">Success Stories</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Real results from former students who turned academic ambition into university admissions, top national ranks, and international honors.
            </p>
          </div>

          {/* Controls & Nav */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={prevSlide}
              className="p-2.5 sm:p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all backdrop-blur-md cursor-pointer active:scale-95 flex items-center justify-center shadow-lg"
              title="Previous Success Story"
              aria-label="Previous Testimonial"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="flex items-center gap-1.5 px-2">
              {FORMER_STUDENT_STORIES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goToSlide(i)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    i === currentIndex 
                      ? 'w-6 sm:w-8 bg-linear-to-r from-indigo-400 to-sky-400 shadow-sm' 
                      : 'w-2 bg-white/20 hover:bg-white/40'
                  }`}
                  title={`Go to testimonial ${i + 1}`}
                  aria-label={`Testimonial ${i + 1}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={nextSlide}
              className="p-2.5 sm:p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all backdrop-blur-md cursor-pointer active:scale-95 flex items-center justify-center shadow-lg"
              title="Next Success Story"
              aria-label="Next Testimonial"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Featured Rotating Testimonial Card */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
              transition={{ duration: 0.55, ease: [0.25, 1, 0.5, 1] }}
              className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur-xl p-6 sm:p-10 lg:p-12 shadow-2xl relative overflow-hidden"
            >
              {/* Giant decorative watermark quote */}
              <Quote className="absolute top-4 right-6 sm:top-8 sm:right-10 w-24 h-24 sm:w-36 sm:h-36 text-white/5 pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
                
                {/* Left: Scholar Profile & Score Card */}
                <div className="lg:col-span-5 flex flex-col items-start gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img 
                        referrerPolicy="no-referrer"
                        src={current.avatar} 
                        alt={current.name}
                        className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl object-cover ring-2 ring-indigo-400/50 shadow-xl"
                      />
                      {current.verified && (
                        <div 
                          className="absolute -bottom-1.5 -right-1.5 p-1 bg-emerald-500 text-white rounded-full ring-2 ring-slate-900 shadow-md"
                          title="Verified Alumni Scholar"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                          {current.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-extrabold uppercase">
                          Alumni
                        </span>
                      </div>
                      <p className="text-xs text-indigo-300 font-medium">
                        {current.currentRole}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span>{current.batch}</span>
                        <span>•</span>
                        <span>{current.subject}</span>
                      </div>
                    </div>
                  </div>

                  {/* Highlights Badge Pill */}
                  <div className="w-full flex flex-wrap gap-2 pt-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-black">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                      {current.achievement}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-black">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      {current.score}
                    </span>
                  </div>

                  {/* Mentoring faculty credit */}
                  <div className="w-full mt-2 p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 text-xs flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Mentored by Faculty:</span>
                      <span className="font-bold text-white">{current.tutorName}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Rich Testimonial Quote & Star Rating */}
                <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className="w-4 h-4 text-amber-400 fill-amber-400" 
                      />
                    ))}
                    <span className="ml-2 text-xs font-bold text-amber-300 font-mono">
                      5.0 Verified Review
                    </span>
                  </div>

                  <blockquote className="text-base sm:text-xl md:text-2xl font-medium text-slate-100 leading-relaxed italic">
                    "{current.quote}"
                  </blockquote>

                  {/* Trust Metrics Bar */}
                  <div className="pt-4 border-t border-white/10 grid grid-cols-3 gap-3">
                    <div>
                      <span className="text-base sm:text-xl font-black text-white font-mono block">98.4%</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Exam Success</span>
                    </div>
                    <div>
                      <span className="text-base sm:text-xl font-black text-indigo-300 font-mono block">350+</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Uni Admissions</span>
                    </div>
                    <div>
                      <span className="text-base sm:text-xl font-black text-sky-300 font-mono block">45+</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Island Top 10</span>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Thumbnail quick preview row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
          {FORMER_STUDENT_STORIES.map((story, idx) => {
            const active = idx === currentIndex;
            return (
              <button
                key={story.id}
                type="button"
                onClick={() => goToSlide(idx)}
                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  active 
                    ? 'bg-indigo-600/30 border-indigo-400 ring-2 ring-indigo-400/40 shadow-md' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10 opacity-70 hover:opacity-100'
                }`}
              >
                <img 
                  referrerPolicy="no-referrer"
                  src={story.avatar} 
                  alt={story.name}
                  className="w-8 h-8 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-[11px] font-black text-white truncate">{story.name}</div>
                  <div className="text-[9px] text-indigo-300 truncate font-mono">{story.badge}</div>
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
};
