import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../lib/firestoreService';
import { ClassItem, UserProfile, BannerImage, Review } from '../types';
import { ClassCard } from '../components/ClassCard';
import { TutorCard } from '../components/TutorCard';
import { SmoothCarousel } from '../components/SmoothCarousel';
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
  CheckCircle2,
  Layers,
  Award
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
  const [isBannerHovered, setIsBannerHovered] = useState(false);

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

  // Auto rotate banner carousel with hover pause
  useEffect(() => {
    if (banners.length <= 1 || isBannerHovered) return;
    const interval = setInterval(() => {
      setCurrentBannerIdx(prev => (prev + 1) % banners.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [banners.length, isBannerHovered]);

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

  return (
    <div className="bg-slate-50/20" id="homepage_container">
      
      {/* 1. HERO SECTION */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white py-8 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4 sm:space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider font-mono">
                  Premier Academic Tutoring
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                Unlock Academic <span className="text-indigo-600 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Excellence</span> with Verified Faculty.
              </h1>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                Connect with verified subject experts. Real-time class booking, student-tutor chats, dynamic notifications, and progress tracking.
              </p>

              {/* Action buttons */}
              <div className="flex flex-row gap-2.5 pt-1">
                <button
                  onClick={() => onNavigateTab('classes')}
                  className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-xs shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  id="hero_classes_cta"
                >
                  <BookOpen className="w-4 h-4" /> Explore Classes
                </button>
                <button
                  onClick={() => onNavigateTab('tutors')}
                  className="flex-1 sm:flex-initial px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-extrabold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  id="hero_tutors_cta"
                >
                  <GraduationCap className="w-4 h-4 text-indigo-600" /> Faculty
                </button>
              </div>

              {/* Mobile Quick Action Tiles */}
              <div className="grid grid-cols-4 gap-2 pt-3 sm:hidden" id="mobile_quick_action_grid">
                <button
                  onClick={() => onNavigateTab('classes')}
                  className="flex flex-col items-center justify-center p-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 active:scale-95 transition-all text-center"
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-1.5 shadow-xs">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-tight">Classes</span>
                </button>

                <button
                  onClick={() => onNavigateTab('tutors')}
                  className="flex flex-col items-center justify-center p-2.5 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 active:scale-95 transition-all text-center"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-1.5 shadow-xs">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-tight">Faculty</span>
                </button>

                <button
                  onClick={() => onNavigateTab(currentUser ? 'dashboard' : 'classes')}
                  className="flex flex-col items-center justify-center p-2.5 bg-amber-50/70 dark:bg-amber-950/40 rounded-2xl border border-amber-100 dark:border-amber-900/60 active:scale-95 transition-all text-center"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center mb-1.5 shadow-xs">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-tight">Schedule</span>
                </button>

                <button
                  onClick={() => onNavigateTab(currentUser ? 'dashboard' : 'auth')}
                  className="flex flex-col items-center justify-center p-2.5 bg-purple-50/70 dark:bg-purple-950/40 rounded-2xl border border-purple-100 dark:border-purple-900/60 active:scale-95 transition-all text-center"
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-1.5 shadow-xs">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-tight">{currentUser ? 'Portal' : 'Sign In'}</span>
                </button>
              </div>

              {/* Verified badges */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-3 sm:pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300">Verified Faculty</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300">Live Booking</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300">Fast Progress</span>
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
        <div 
          className="py-8 bg-slate-900 text-white relative overflow-hidden"
          onMouseEnter={() => setIsBannerHovered(true)}
          onMouseLeave={() => setIsBannerHovered(false)}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 p-6 sm:p-10 min-h-[220px] flex items-center justify-between shadow-2xl">
              
              <AnimatePresence mode="wait">
                {banners[currentBannerIdx] && (
                  <motion.div
                    key={banners[currentBannerIdx].id}
                    initial={{ opacity: 0, x: 25 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -25 }}
                    transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
                    className="flex flex-col md:flex-row items-center justify-between gap-6 w-full"
                  >
                    <div className="space-y-3 max-w-xl">
                      <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[10px] font-bold font-mono tracking-widest uppercase inline-block">
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
                      <div className="w-full md:w-80 h-44 rounded-2xl overflow-hidden border border-slate-800 shrink-0 shadow-lg">
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
              <div className="absolute bottom-4 right-6 flex items-center gap-2 z-10">
                <button 
                  onClick={handlePrevBanner}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white transition-colors cursor-pointer active:scale-95"
                  title="Previous banner"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex gap-1">
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentBannerIdx(i)}
                      className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${i === currentBannerIdx ? 'w-6 bg-indigo-500' : 'w-2 bg-slate-700'}`}
                      title={`Go to banner ${i + 1}`}
                    />
                  ))}
                </div>
                <button 
                  onClick={handleNextBanner}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white transition-colors cursor-pointer active:scale-95"
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
          <SmoothCarousel
            items={topTutors}
            keyExtractor={(tutor) => tutor.uid}
            itemsPerView={{ base: 1, sm: 1, md: 2, lg: 3, xl: 3 }}
            autoPlay={true}
            autoPlayInterval={4200}
            pauseOnHover={true}
            accentColor="indigo"
            renderCustomControls={({ currentIndex, maxIndex, total, next, prev, goTo }) => (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
                <div>
                  <span className="text-xs font-bold text-blue-600 font-mono uppercase tracking-widest block leading-none">Meet the Faculty</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 tracking-tight mt-3">Respected Instructors</h2>
                  <p className="text-xs text-gray-500 mt-1">Accredited professors, Ph.D. researchers, and industrial professionals</p>
                </div>

                <div className="flex items-center gap-2">
                  {total > 1 && (
                    <div className="flex items-center gap-1.5 mr-2">
                      <button
                        type="button"
                        onClick={prev}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
                        title="Previous faculty"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="flex gap-1 items-center px-1 max-w-[140px] overflow-x-auto no-scrollbar">
                        {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                          <button
                            type="button"
                            key={i}
                            onClick={() => goTo(i)}
                            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                              i === currentIndex ? 'w-6 bg-indigo-600 shadow-xs' : 'w-2 bg-slate-300 hover:bg-slate-400'
                            }`}
                            title={`Go to slide ${i + 1}`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={next}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
                        title="Next faculty"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onNavigateTab('tutors')}
                    className="px-4 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors shadow-xs hover:shadow-md cursor-pointer"
                  >
                    View All Faculty ({topTutors.length})
                  </button>
                </div>
              </div>
            )}
            renderItem={(tut) => (
              <div className="h-full">
                <TutorCard tutor={tut} onContactClick={() => onNavigateTab('tutors')} />
              </div>
            )}
            emptyState={
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                No active tutors available at the moment.
              </div>
            }
          />
        </div>
      </div>

      {/* 4. CLASSES CAROUSEL */}
      <div className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SmoothCarousel
            items={highlightedClasses}
            keyExtractor={(cls) => cls.id}
            itemsPerView={{ base: 1, sm: 1, md: 2, lg: 3, xl: 3 }}
            autoPlay={true}
            autoPlayInterval={4600}
            pauseOnHover={true}
            accentColor="slate"
            renderCustomControls={({ currentIndex, maxIndex, total, next, prev, goTo }) => (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
                <div>
                  <span className="text-xs font-bold text-indigo-600 font-mono uppercase tracking-widest block leading-none">Curriculums</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">Featured Subject Classes</h2>
                  <p className="text-xs text-slate-500 mt-1">AP Pre-Calculus, Quantum Physics, Web Engineering, and SAT Prep</p>
                </div>

                <div className="flex items-center gap-2">
                  {total > 1 && (
                    <div className="flex items-center gap-1.5 mr-2">
                      <button
                        type="button"
                        onClick={prev}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
                        title="Previous class"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="flex gap-1 items-center px-1 max-w-[140px] overflow-x-auto no-scrollbar">
                        {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                          <button
                            type="button"
                            key={i}
                            onClick={() => goTo(i)}
                            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                              i === currentIndex ? 'w-6 bg-slate-900 shadow-xs' : 'w-2 bg-slate-300 hover:bg-slate-400'
                            }`}
                            title={`Go to slide ${i + 1}`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={next}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
                        title="Next class"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onNavigateTab('classes')}
                    className="px-4 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-950 transition-colors shadow-xs hover:shadow-md cursor-pointer"
                  >
                    All Curriculums ({highlightedClasses.length})
                  </button>
                </div>
              </div>
            )}
            renderItem={(cls) => (
              <div className="h-full">
                <ClassCard item={cls} onBookClick={() => onNavigateTab('classes')} />
              </div>
            )}
            emptyState={
              <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-200 text-slate-400 text-xs">
                No active classes available at the moment.
              </div>
            }
          />
        </div>
      </div>

      {/* 5. COMMENTS & TESTIMONIALS CAROUSEL + SUBMISSION BOX */}
      <div className="py-16 bg-slate-50 border-t border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <SmoothCarousel
            items={approvedReviews}
            keyExtractor={(rev) => rev.id}
            itemsPerView={{ base: 1, sm: 1, md: 2, lg: 3, xl: 3 }}
            autoPlay={true}
            autoPlayInterval={5000}
            pauseOnHover={true}
            accentColor="blue"
            className="mb-12"
            renderCustomControls={({ currentIndex, maxIndex, total, next, prev, goTo }) => (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
                <div>
                  <span className="text-xs font-bold text-blue-600 font-mono uppercase tracking-widest block leading-none">Community Feedback</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 tracking-tight mt-3">Parent & Student Reviews</h2>
                  <p className="text-xs text-gray-500 mt-1">Real feedback approved by academy administration</p>
                </div>

                {total > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={prev}
                      className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
                      title="Previous review"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex gap-1 items-center px-1 max-w-[140px] overflow-x-auto no-scrollbar">
                      {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                        <button
                          type="button"
                          key={i}
                          onClick={() => goTo(i)}
                          className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                            i === currentIndex ? 'w-6 bg-blue-600 shadow-xs' : 'w-2 bg-slate-300 hover:bg-slate-400'
                          }`}
                          title={`Go to slide ${i + 1}`}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={next}
                      className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
                      title="Next review"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
            renderItem={(rev) => (
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative flex flex-col justify-between h-full">
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
            )}
            emptyState={
              <div className="col-span-3 text-center py-10 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                No approved reviews yet. Be the first to submit feedback below!
              </div>
            }
          />

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
