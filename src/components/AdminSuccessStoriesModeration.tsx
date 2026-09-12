import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { StudentSuccessStory } from '../types';
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Clock, 
  Search, 
  Filter, 
  Sparkles, 
  User, 
  GraduationCap, 
  BookOpen, 
  ShieldCheck, 
  Quote, 
  ExternalLink,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  School
} from 'lucide-react';

export const AdminSuccessStoriesModeration: React.FC = () => {
  const { 
    successStories, 
    approveSuccessStory, 
    rejectSuccessStory, 
    deleteSuccessStory, 
    showToast 
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectingStoryId, setRejectingStoryId] = useState<string | null>(null);
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Filter list
  const filteredStories = successStories.filter((story) => {
    const matchesStatus = statusFilter === 'all' || story.status === statusFilter;
    const matchesSearch = 
      searchQuery.trim() === '' ||
      story.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.achievement.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.tutorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.currentRole.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = successStories.filter(s => s.status === 'pending').length;
  const approvedCount = successStories.filter(s => s.status === 'approved').length;
  const rejectedCount = successStories.filter(s => s.status === 'rejected').length;

  const handleApprove = async (storyId: string) => {
    setIsProcessing(storyId);
    try {
      await approveSuccessStory(storyId);
    } catch (err: any) {
      console.error("Failed to approve story:", err);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingStoryId) return;
    setIsProcessing(rejectingStoryId);
    try {
      await rejectSuccessStory(rejectingStoryId, rejectionFeedback.trim() || undefined);
      setRejectingStoryId(null);
      setRejectionFeedback('');
    } catch (err: any) {
      console.error("Failed to reject story:", err);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDelete = async (storyId: string, studentName: string) => {
    if (!window.confirm(`Are you sure you want to delete the success story submitted by ${studentName}?`)) {
      return;
    }
    setIsProcessing(storyId);
    try {
      await deleteSuccessStory(storyId);
    } catch (err: any) {
      console.error("Failed to delete story:", err);
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* Header & Description */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Award className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Student Success Stories Moderation Office
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Students and alumni submit their academic milestones to be parked here. Once approved by administrators, they are published directly to the homepage carousel for all users and visitors to see.
          </p>
        </div>

        {/* Stats Pills */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <div className="px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 block font-mono">
              Pending
            </span>
            <span className="text-lg font-black text-amber-800 dark:text-amber-200 font-mono">
              {pendingCount}
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block font-mono">
              Live Approved
            </span>
            <span className="text-lg font-black text-emerald-800 dark:text-emerald-200 font-mono">
              {approvedCount}
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block font-mono">
              Total
            </span>
            <span className="text-lg font-black text-slate-800 dark:text-slate-200 font-mono">
              {successStories.length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        
        {/* Status filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black capitalize transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                statusFilter === status
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {status === 'pending' && <Clock className="w-3 h-3 text-amber-400" />}
              {status === 'approved' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
              {status === 'rejected' && <XCircle className="w-3 h-3 text-rose-400" />}
              <span>{status}</span>
              <span className="text-[10px] opacity-75 font-mono">
                ({status === 'all' ? successStories.length : status === 'pending' ? pendingCount : status === 'approved' ? approvedCount : rejectedCount})
              </span>
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search scholar, subject, tutor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-hidden"
          />
        </div>
      </div>

      {/* Stories Moderation Grid / List */}
      <div className="space-y-4">
        {filteredStories.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-black text-slate-800 dark:text-white">
              No Success Stories Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              There are no student success stories matching your current filter criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredStories.map((story) => {
              const isPending = story.status === 'pending';
              const isApproved = story.status === 'approved';
              const isRejected = story.status === 'rejected';
              const isStoryProcessing = isProcessing === story.id;

              return (
                <div
                  key={story.id}
                  className={`p-5 sm:p-6 rounded-3xl border transition-all relative flex flex-col justify-between ${
                    isPending 
                      ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30 shadow-sm' 
                      : isApproved
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                        : 'bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/30 opacity-80'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Top Row: Student info & Status badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img 
                          referrerPolicy="no-referrer"
                          src={story.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop'} 
                          alt={story.name} 
                          className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-slate-800 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">
                              {story.name}
                            </h4>
                            {story.verified && (
                              <span title="Verified Scholar" className="inline-flex">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold block">
                            {story.currentRole}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {story.batch} • {new Date(story.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                          </span>
                        </div>
                      </div>

                      {/* Status pill */}
                      <div className="shrink-0">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30">
                            <Clock className="w-3 h-3" />
                            Parked for Approval
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Live on Home Carousel
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-500/30">
                            <XCircle className="w-3 h-3" />
                            Declined
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Achievement & Badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 text-xs font-black">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                        {story.achievement}
                      </span>
                      {story.score && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-black">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          {story.score}
                        </span>
                      )}
                      <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-mono font-bold">
                        {story.badge}
                      </span>
                    </div>

                    {/* Details Box */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-[9px] uppercase font-mono text-slate-400 block">Course / Stream</span>
                        <span className="font-bold text-slate-850 dark:text-slate-200">{story.subject}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-mono text-slate-400 block">Mentoring Faculty</span>
                        <span className="font-bold text-slate-850 dark:text-slate-200">{story.tutorName}</span>
                      </div>
                    </div>

                    {/* Student Quote */}
                    <blockquote className="text-xs text-slate-700 dark:text-slate-300 italic border-l-2 border-indigo-500 pl-3 leading-relaxed">
                      "{story.quote}"
                    </blockquote>

                    {/* Admin feedback if rejected */}
                    {isRejected && story.adminFeedback && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-[10px] uppercase">Rejection Reason Given:</span>
                          <p className="text-[11px]">{story.adminFeedback}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-150 dark:border-slate-800 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {!isApproved && (
                        <button
                          type="button"
                          id={`btn_approve_story_${story.id}`}
                          disabled={isStoryProcessing}
                          onClick={() => handleApprove(story.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve & Publish Live
                        </button>
                      )}

                      {!isRejected && (
                        <button
                          type="button"
                          id={`btn_reject_story_${story.id}`}
                          disabled={isStoryProcessing}
                          onClick={() => {
                            setRejectingStoryId(story.id);
                            setRejectionFeedback('');
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Decline Story
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      id={`btn_delete_story_${story.id}`}
                      disabled={isStoryProcessing}
                      onClick={() => handleDelete(story.id, story.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer ml-auto"
                      title="Permanently delete this submission"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject feedback dialog modal */}
      {rejectingStoryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full space-y-4"
          >
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Decline Success Story
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Provide optional feedback to inform the scholar why their submission was declined.
                </p>
              </div>
            </div>

            <textarea
              rows={3}
              placeholder="e.g. Please provide your student admission registration number or upload a higher resolution photo..."
              value={rejectionFeedback}
              onChange={(e) => setRejectionFeedback(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden leading-relaxed"
            />

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRejectingStoryId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-md cursor-pointer"
              >
                Confirm Decline
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};
