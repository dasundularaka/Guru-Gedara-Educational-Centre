import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../lib/firestoreService';
import { ClassItem, UserProfile, BannerImage, Review } from '../types';
import { ClassCard } from '../components/ClassCard';
import { TutorCard } from '../components/TutorCard';
import { 
  Sparkles, 
  GraduationCap, 
  BookOpen, 
  Cpu, 
  ShieldCheck, 
  Users, 
  School, 
  ArrowRight,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Star,
  MessageSquare,
  Send,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HomeProps {
  onNavigateTab: (tab: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigateTab }) => {
  const { classes, refreshClasses, reviews, showToast, currentUser } = useApp();
  const [highlightedClasses, setHighlightedClasses] = useState<ClassItem[]>([]);
  const [topTutors, setTopTutors] = useState<UserProfile[]>([]);
  const [banners, setBanners] = useState<BannerImage[]>([]);
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0);

  // Carousels active indexes
  const [tutorSlideIdx, setTutorSlideIdx] = useState(0);
  const [classSlideIdx, setClassSlideIdx] = useState(0);
  const [reviewSlideIdx, setReviewSlideIdx] = useState(0);

  // Comment submission state
  const [commentName, setCommentName] = useState('');
  const [commentRole, setCommentRole] = useState<'Student' | 'Parent'>('Student');
  const [commentRating, setCommentRating] = useState(5);
  const [commentText, setCommentText] = useState('');
  const [commentTarget, setCommentTarget] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const approvedReviews = useMemo(() => {
    return (reviews || []).filter(r => r.status === 'approved');
  }, [reviews]);

  useEffect(() => {
    const loadHomeRecords = async () => {
      try {
        await refreshClasses();
        // Load all tutors
        const list = await firestoreService.getAllUsers();
        const tutorsList = list.filter(u => u.role === 'tutor');
        setTopTutors(tutorsList);
      } catch (e) {
        console.warn(e);
      }
    };
    loadHomeRecords();

    // Subscribe to real-time users/tutors updates
    const unsubscribeUsers = firestoreService.subscribeUsers((allUsers) => {
      const tutorsList = allUsers.filter(u => u.role === 'tutor');
      setTopTutors(tutorsList);
    });

    // Subscribe to real-time classes updates
    const unsubscribeClasses = firestoreService.subscribeClasses((updatedClasses) => {
      setHighlightedClasses(updatedClasses);
    });

    // Real-time subscription for hero banners
    const unsubscribeBanners = firestoreService.subscribeBanners((bannerData) => {
      setBanners(bannerData.filter(b => b.active !== false));
    });

    return () => {
      unsubscribeUsers();
      unsubscribeClasses();
      unsubscribeBanners();
    };
  }, []);

  useEffect(() => {
    if (classes) {
      setHighlightedClasses(classes);
    }
  }, [classes]);

  // Pre-fill user details if logged in
  useEffect(() => {
    if (currentUser) {
      setCommentName(currentUser.name || '');
      if (currentUser.role === 'student') setCommentRole('Student');
    }
  }, [currentUser]);

  // Auto rotate banner carousel
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIdx(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const handleNextBanner = () => {
    if (banners.length === 0) return;
    setCurrentBannerIdx(prev => (prev + 1) % banners.length);
  };

  const handlePrevBanner = () => {
    if (banners.length === 0) return;
    setCurrentBannerIdx(prev => (prev - 1 + banners.length) % banners.length);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentName.trim() || !commentText.trim()) {
      showToast("Please enter your name and comment text.", "error");
      return;
    }

    setSubmittingComment(true);
    try {
      await firestoreService.createReview({
        studentId: currentUser?.uid || 'guest_' + Math.random().toString(36).substring(2, 7),
        studentName: `${commentName.trim()} (${commentRole})`,
        rating: commentRating,
        comment: commentText.trim(),
        classTitle: commentTarget.trim() || 'General Academy Feedback',
        status: 'pending'
      });

      showToast("Thank you! Your feedback has been submitted and is parked for admin approval.", "success");
      setCommentText('');
      setCommentTarget('');
    } catch (err) {
      showToast("Failed to submit review. Please try again.", "error");
    } finally {
      setSubmittingComment(false);
    }
  };

  // Screen size detection for responsive carousel items
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Carousel helpers
  const visibleTutorsCount = isMobile ? 1 : 3;
  const visibleClassesCount = isMobile ? 1 : 3;
  const visibleReviewsCount = isMobile ? 1 : 3;

  // Auto rotate tutors carousel
  useEffect(() => {
    if (topTutors.length <= visibleTutorsCount) return;
    const interval = setInterval(() => {
      setTutorSlideIdx(prev => (prev + 1) % topTutors.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [topTutors.length, visibleTutorsCount]);

  // Auto rotate classes carousel
  useEffect(() => {
    if (highlightedClasses.length <= visibleClassesCount) return;
    const interval = setInterval(() => {
      setClassSlideIdx(prev => (prev + 1) % highlightedClasses.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [highlightedClasses.length, visibleClassesCount]);

  // Auto rotate reviews carousel
  useEffect(() => {
    if (approvedReviews.length <= visibleReviewsCount) return;
    const interval = setInterval(() => {
      setReviewSlideIdx(prev => (prev + 1) % approvedReviews.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [approvedReviews.length, visibleReviewsCount]);

  const nextTutors = () => {
    setTutorSlideIdx(prev => (prev + 1) % Math.max(1, topTutors.length));
  };
  const prevTutors = () => {
    setTutorSlideIdx(prev => (prev - 1 + topTutors.length) % Math.max(1, topTutors.length));
  };

  const nextClasses = () => {
    setClassSlideIdx(prev => (prev + 1) % Math.max(1, highlightedClasses.length));
  };
  const prevClasses = () => {
    setClassSlideIdx(prev => (prev - 1 + highlightedClasses.length) % Math.max(1, highlightedClasses.length));
  };

  const nextReviews = () => {
    setReviewSlideIdx(prev => (prev + 1) % Math.max(1, approvedReviews.length));
  };
  const prevReviews = () => {
    setReviewSlideIdx(prev => (prev - 1 + approvedReviews.length) % Math.max(1, approvedReviews.length));
  };

  // Slice displayed items for carousels
  const displayedTutors = useMemo(() => {
    if (topTutors.length === 0) return [];
    const count = Math.min(topTutors.length, visibleTutorsCount);
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(topTutors[(tutorSlideIdx + i) % topTutors.length]);
    }
    return result;
  }, [topTutors, tutorSlideIdx, visibleTutorsCount]);

  const displayedClasses = useMemo(() => {
    if (highlightedClasses.length === 0) return [];
    const count = Math.min(highlightedClasses.length, visibleClassesCount);
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(highlightedClasses[(classSlideIdx + i) % highlightedClasses.length]);
    }
    return result;
  }, [highlightedClasses, classSlideIdx, visibleClassesCount]);

  const displayedReviews = useMemo(() => {
    if (approvedReviews.length === 0) return [];
    const count = Math.min(approvedReviews.length, visibleReviewsCount);
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(approvedReviews[(reviewSlideIdx + i) % approvedReviews.length]);
    }
    return result;
  }, [approvedReviews, reviewSlideIdx, visibleReviewsCount]);

  return (
    <div className="bg-slate-50/20" id="homepage_container">
      
      {/* 1. HERO SECTION */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[10px] font-extrabold text-indigo-850 uppercase tracking-wider font-mono">
                  The Premium standard in academic tutoring
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Unlock Academic <span className="text-indigo-600 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Excellence</span> with Verified Faculty.
              </h1>

              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-lg">
                Connect with highly experienced Ph.D. academics and programming veterans. Access real-time class booking schedules, direct student-tutor chats, dynamic notifications, and a transparent progress ledger dashboard.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => onNavigateTab('classes')}
                  className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                  referrerPolicy="no-referrer"
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

      {/* 2. ADVERTISING BANNERS CAROUSEL */}
      {banners.length > 0 && (
        <div className="py-8 bg-slate-900 text-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 p-6 sm:p-10 min-h-[220px] flex items-center justify-between">
              
              <AnimatePresence mode="wait">
                {banners[currentBannerIdx] && (
                  <motion.div
                    key={banners[currentBannerIdx].id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col md:flex-row items-center justify-between gap-6 w-full"
                  >
                    <div className="space-y-3 max-w-xl">
                      <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[10px] font-bold font-mono tracking-widest uppercase">
                        Featured Highlight
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {banners[currentBannerIdx].title}
                      </h3>
                      {banners[currentBannerIdx].subtitle && (
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {banners[currentBannerIdx].subtitle}
                        </p>
                      )}
                      {banners[currentBannerIdx].linkUrl && (
                        <a 
                          href={banners[currentBannerIdx].linkUrl}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors mt-2"
                        >
                          Learn More <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {banners[currentBannerIdx].imageUrl && (
                      <div className="w-full md:w-80 h-44 rounded-2xl overflow-hidden border border-slate-800 shrink-0">
                        <img 
                          referrerPolicy="no-referrer"
                          src={banners[currentBannerIdx].imageUrl} 
                          alt={banners[currentBannerIdx].title}
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Controls */}
              <div className="absolute bottom-4 right-6 flex items-center gap-2">
                <button 
                  onClick={handlePrevBanner}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                  title="Previous banner"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex gap-1">
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentBannerIdx(i)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${i === currentBannerIdx ? 'w-6 bg-indigo-500' : 'w-2 bg-slate-700'}`}
                    />
                  ))}
                </div>
                <button 
                  onClick={handleNextBanner}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                  title="Next banner"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 3. LECTURERS / FACULTY CAROUSEL */}
      <div className="py-16 bg-blue-50/50 border-t border-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
            <div>
              <span className="text-xs font-bold text-blue-600 font-mono uppercase tracking-widest block leading-none">Meet the Faculty</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 tracking-tight mt-3">Respected Instructors</h2>
              <p className="text-xs text-gray-500 mt-1">Accredited professors, Ph.D. researchers, and industrial professionals</p>
            </div>

            <div className="flex items-center gap-2">
              {topTutors.length > 1 && (
                <div className="flex items-center gap-1.5 mr-2">
                  <button
                    onClick={prevTutors}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors shadow-xs cursor-pointer"
                    title="Previous faculty"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex gap-1 items-center px-1 max-w-[140px] overflow-x-auto no-scrollbar">
                    {topTutors.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setTutorSlideIdx(i)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          i === (tutorSlideIdx % topTutors.length) ? 'w-5 bg-indigo-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                        }`}
                        title={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={nextTutors}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors shadow-xs cursor-pointer"
                    title="Next faculty"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              <button
                onClick={() => onNavigateTab('tutors')}
                className="px-4 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                View All Faculty ({topTutors.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayedTutors.map(tut => (
              <TutorCard key={tut.uid} tutor={tut} onContactClick={() => onNavigateTab('tutors')} />
            ))}
          </div>
        </div>
      </div>

      {/* 4. CLASSES CAROUSEL */}
      <div className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
            <div>
              <span className="text-xs font-bold text-indigo-600 font-mono uppercase tracking-widest block leading-none">Curriculums</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">Featured Subject Classes</h2>
              <p className="text-xs text-slate-500 mt-1">AP Pre-Calculus, Quantum Physics, Web Engineering, and SAT Prep</p>
            </div>

            <div className="flex items-center gap-2">
              {highlightedClasses.length > 1 && (
                <div className="flex items-center gap-1.5 mr-2">
                  <button
                    onClick={prevClasses}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Previous class"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex gap-1 items-center px-1 max-w-[140px] overflow-x-auto no-scrollbar">
                    {highlightedClasses.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setClassSlideIdx(i)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          i === (classSlideIdx % highlightedClasses.length) ? 'w-5 bg-slate-900' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                        }`}
                        title={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={nextClasses}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Next class"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              <button
                onClick={() => onNavigateTab('classes')}
                className="px-4 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-950 transition-colors cursor-pointer"
              >
                All Curriculums ({highlightedClasses.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayedClasses.map(cls => (
              <ClassCard key={cls.id} item={cls} onBookClick={() => onNavigateTab('classes')} />
            ))}
          </div>
        </div>
      </div>

      {/* 5. COMMENTS & TESTIMONIALS CAROUSEL + SUBMISSION BOX */}
      <div className="py-16 bg-slate-50 border-t border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
            <div>
              <span className="text-xs font-bold text-blue-600 font-mono uppercase tracking-widest block leading-none">Community Feedback</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 tracking-tight mt-3">Parent & Student Reviews</h2>
              <p className="text-xs text-gray-500 mt-1">Real feedback approved by academy administration</p>
            </div>

            {approvedReviews.length > visibleReviewsCount && (
              <div className="flex items-center gap-2">
                <button
                  onClick={prevReviews}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shadow-xs"
                  title="Previous review"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextReviews}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shadow-xs"
                  title="Next review"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Approved reviews grid/carousel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {displayedReviews.length > 0 ? (
              displayedReviews.map((rev) => (
                <div key={rev.id} className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs relative flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3.5 h-3.5 ${i < rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} 
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-650 leading-relaxed font-sans italic">
                      "{rev.comment}"
                    </p>
                  </div>
                  <div className="mt-5 border-t border-slate-100 pt-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">{rev.studentName}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{rev.classTitle || rev.tutorName || 'Academy Feedback'}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-10 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                No approved reviews yet. Be the first to submit feedback below!
              </div>
            )}
          </div>

          {/* Interactive Comment Submission Box */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Write a Comment / Review</h3>
                <p className="text-xs text-slate-500">Your comment will be submitted to administrative staff for approval before appearing on the public carousel.</p>
              </div>
            </div>

            <form onSubmit={handleSubmitComment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1">Your Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={commentName}
                    onChange={(e) => setCommentName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1">Role / Persona</label>
                  <select 
                    value={commentRole}
                    onChange={(e) => setCommentRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-indigo-500"
                  >
                    <option value="Student">Student Scholar</option>
                    <option value="Parent">Parent / Guardian</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1">Target Course / Tutor (Optional)</label>
                  <input 
                    type="text" 
                    value={commentTarget}
                    onChange={(e) => setCommentTarget(e.target.value)}
                    placeholder="e.g. AP Calculus or Dr. Jenkins"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1">Overall Rating</label>
                  <div className="flex items-center gap-2 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setCommentRating(star)}
                        className="cursor-pointer focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star 
                          className={`w-5 h-5 ${star <= commentRating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} 
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-700 font-mono ml-2">{commentRating} / 5 Stars</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1">Your Detailed Feedback / Comment</label>
                <textarea 
                  required
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your experience regarding course content, teaching style, or general feedback..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submittingComment}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingComment ? "Submitting..." : "Submit Comment for Review"}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>

    </div>
  );
};
