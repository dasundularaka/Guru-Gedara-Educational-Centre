import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { 
  Award, 
  X, 
  Sparkles, 
  GraduationCap, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  User, 
  Building2, 
  Calendar, 
  ShieldCheck,
  Quote,
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react';
import { StudentSuccessStory } from '../types';

interface StudentSuccessStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BADGE_PRESETS = [
  'Island 1st Topper',
  'Island Top 10',
  'District 1st Topper',
  'Faculty of Medicine',
  'Engineering Scholar',
  'Cambridge High Achiever',
  'Tech Scholar',
  'National Rank Holder',
  'Distinction Excellence',
  'Academic Honors'
];

export const StudentSuccessStoryModal: React.FC<StudentSuccessStoryModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, successStories, submitSuccessStory, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'submit' | 'my-stories'>('submit');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [achievement, setAchievement] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [batch, setBatch] = useState('Batch of 2024');
  const [subject, setSubject] = useState('');
  const [tutorName, setTutorName] = useState('');
  const [score, setScore] = useState('');
  const [badge, setBadge] = useState('Island Top 10');
  const [customBadge, setCustomBadge] = useState('');
  const [quote, setQuote] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.photoURL || '');

  if (!isOpen) return null;

  // Filter stories submitted by current student
  const myStories: StudentSuccessStory[] = successStories.filter(
    s => s.studentId === currentUser?.uid || (currentUser?.email && s.studentEmail === currentUser?.email)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      showToast("Please sign in to submit your success story.", "warning");
      return;
    }

    if (!achievement.trim() || !currentRole.trim() || !subject.trim() || !tutorName.trim() || !quote.trim()) {
      showToast("Please fill in all mandatory fields.", "warning");
      return;
    }

    if (quote.trim().length < 30) {
      showToast("Please write a descriptive testimonial quote (at least 30 characters).", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalBadge = badge === 'Custom' ? (customBadge.trim() || 'Academic Honors') : badge;

      await submitSuccessStory({
        achievement: achievement.trim(),
        currentRole: currentRole.trim(),
        batch: batch.trim(),
        subject: subject.trim(),
        tutorName: tutorName.trim(),
        score: score.trim() || 'Distinction Excellence',
        quote: quote.trim(),
        badge: finalBadge,
        avatar: avatarUrl.trim() || currentUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop'
      });

      // Reset form
      setAchievement('');
      setCurrentRole('');
      setSubject('');
      setTutorName('');
      setScore('');
      setQuote('');
      setActiveTab('my-stories');
    } catch (err: any) {
      console.error("Submission failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.25 }}
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                Student Success Stories
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                  Social Proof
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share your academic milestones to inspire fellow scholars.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-5 sm:px-6 pt-3 flex items-center gap-2 border-b border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTab('submit')}
            className={`pb-3 px-3 text-xs font-black border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'submit'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Submit New Story
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my-stories')}
            className={`pb-3 px-3 text-xs font-black border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'my-stories'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            My Submissions ({myStories.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'submit' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Parked Notice Banner */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-extrabold block">Admin Approval Workflow</span>
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                    Submitted stories are automatically parked for academy administrative review. Once approved by our academic board, your story will be published on the homepage carousel for all visitors and students.
                  </p>
                </div>
              </div>

              {/* Student Identity (Read-only / Pre-filled) */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img 
                    referrerPolicy="no-referrer"
                    src={avatarUrl || currentUser?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop'} 
                    alt={currentUser?.name || 'Student'} 
                    className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200"
                  />
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-white block">
                      {currentUser?.name || 'Student Account'}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {currentUser?.email} (Verified Student)
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Student
                </span>
              </div>

              {/* Grid Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Achievement */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    Achievement / Rank / Honors <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Island 1st Rank - Physical Science"
                    value={achievement}
                    onChange={(e) => setAchievement(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                {/* Current Role / University */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    Current University / Degree / Role <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Medicine (MBBS), University of Colombo"
                    value={currentRole}
                    onChange={(e) => setCurrentRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                {/* Subject / Stream */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    Subject / Stream <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Combined Mathematics & Advanced Physics"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                {/* Batch */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    Examination Batch / Year
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Batch of 2024"
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                {/* Mentoring Tutor */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    Mentoring Faculty / Tutor(s) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Prof. Kalinga Bandara & Dr. Aruna Shantha"
                    value={tutorName}
                    onChange={(e) => setTutorName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                {/* Examination Score / Z-Score */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    Results / Grades / Z-Score
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3 A*s (Z-Score 2.91)"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Badge selector */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  Recognition Badge
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {BADGE_PRESETS.map((b) => (
                    <button
                      type="button"
                      key={b}
                      onClick={() => {
                        setBadge(b);
                        setCustomBadge('');
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        badge === b
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setBadge('Custom')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      badge === 'Custom'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Custom Badge...
                  </button>
                </div>
                {badge === 'Custom' && (
                  <input
                    type="text"
                    placeholder="Type custom badge tag..."
                    value={customBadge}
                    onChange={(e) => setCustomBadge(e.target.value)}
                    className="mt-2 w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                )}
              </div>

              {/* Quote Testimonial */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  Your Testimonial & Experience <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  minLength={30}
                  placeholder="Describe your learning experience, how the tutors guided your preparation, key study tips, and the impact Gurugedara had on your academic journey..."
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden leading-relaxed"
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block text-right mt-0.5">
                  {quote.length} characters (minimum 30)
                </span>
              </div>

              {/* Avatar URL (Optional) */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  Profile Photo URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Parking for Admin Review...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Submit for Admin Approval
                    </>
                  )}
                </button>
              </div>

            </form>
          ) : (
            /* Submissions list */
            <div className="space-y-4">
              {myStories.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-150 dark:border-slate-800">
                  <Award className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2.5" />
                  <h3 className="text-sm font-black text-slate-800 dark:text-white">
                    No Success Stories Submitted Yet
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                    Have you completed a course, earned high marks, or gained university entrance? Share your success with our community.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('submit')}
                    className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Submit Your First Story
                  </button>
                </div>
              ) : (
                myStories.map((story) => {
                  const isPending = story.status === 'pending';
                  const isApproved = story.status === 'approved';
                  const isRejected = story.status === 'rejected';

                  return (
                    <div 
                      key={story.id}
                      className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <img 
                            referrerPolicy="no-referrer"
                            src={story.avatar} 
                            alt={story.name} 
                            className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                          />
                          <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">
                              {story.achievement}
                            </h4>
                            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                              {story.currentRole}
                            </span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div className="shrink-0">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              <Clock className="w-3 h-3" />
                              Parked for Admin Approval
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved & Published Live
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                              <AlertCircle className="w-3 h-3" />
                              Declined by Admin
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Details row */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[11px]">
                        <div>
                          <span className="text-slate-400 block uppercase font-mono text-[9px]">Subject</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{story.subject}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase font-mono text-[9px]">Tutor</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{story.tutorName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase font-mono text-[9px]">Results</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{story.score}</span>
                        </div>
                      </div>

                      {/* Quote preview */}
                      <blockquote className="text-xs text-slate-600 dark:text-slate-300 italic border-l-2 border-indigo-400 pl-3 leading-relaxed">
                        "{story.quote}"
                      </blockquote>

                      {/* Explanation note based on status */}
                      {isPending && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                          ⏳ Your story is queued in the admin moderation office. Once an administrator reviews and approves it, it will immediately appear on the home page carousel for all visitors.
                        </p>
                      )}
                      {isApproved && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10 font-medium">
                          🎉 Your story is live! It is featured on the homepage carousel and visible to all users.
                        </p>
                      )}
                      {isRejected && story.adminFeedback && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                          Feedback from administrator: {story.adminFeedback}
                        </p>
                      )}

                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

      </motion.div>
    </div>
  );
};
