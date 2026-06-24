import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../lib/firestoreService';
import { UserProfile } from '../types';
import { Star, Award, GraduationCap, DollarSign, Mail, Send, X, MessageSquareReply } from 'lucide-react';
import { motion } from 'motion/react';
import { ReviewsModal } from './ReviewsModal';

interface TutorCardProps {
  tutor: UserProfile;
}

export const TutorCard: React.FC<TutorCardProps> = ({ tutor }) => {
  const { currentUser, showToast, reviews } = useApp();
  const [showChatModal, setShowChatModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  // Retrieve detail sections
  const details = tutor.tutorDetails;
  if (!details) return null;

  const tutorReviews = reviews.filter(r => r.tutorId === tutor.uid && r.status === 'approved');
  const avgRating = tutorReviews.length > 0 
    ? tutorReviews.reduce((sum, r) => sum + r.rating, 0) / tutorReviews.length 
    : 5.0;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      showToast("Please login first to chat with Dr. " + tutor.name, "info");
      return;
    }

    if (!messageText.trim()) return;

    setSending(true);
    try {
      await firestoreService.sendDirectMessage(
        currentUser.uid,
        currentUser.name,
        tutor.uid,
        messageText
      );
      showToast(`Message successfully sent to ${tutor.name}!`, "success");
      setMessageText("");
      setShowChatModal(false);
    } catch (err) {
      showToast("Failed to compile direct feedback message.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.015, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="sleek-card p-6 flex flex-col justify-between h-full bg-white"
      id={`tutor_card_${tutor.uid}`}
    >
      <div>
        {/* Profile Header */}
        <div className="flex gap-4 items-start mb-5">
          {tutor.photoURL ? (
            <img 
              referrerPolicy="no-referrer"
              className="h-14 w-14 rounded-2xl object-cover ring-2 ring-slate-100" 
              src={tutor.photoURL} 
              alt={tutor.name} 
            />
          ) : (
            <div className="h-14 w-14 rounded-2xl bg-slate-100 text-slate-800 font-extrabold flex items-center justify-center text-lg">
              {tutor.name.substr(0,2).toUpperCase()}
            </div>
          )}

          <div>
            <h4 className="text-sm font-extrabold text-slate-900 leading-tight">{tutor.name}</h4>
            
            {/* Badges and rating */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <button 
                onClick={() => setShowReviewsModal(true)}
                className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 border border-amber-100 px-2 py-0.5 rounded-lg text-xs font-bold text-slate-800 transition-colors cursor-pointer"
                title="View verified tutor reviews"
              >
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="font-mono text-xs">{avgRating.toFixed(1)}</span>
                <span className="text-[9px] text-slate-400">({tutorReviews.length})</span>
              </button>
              <span className="text-[10px] text-slate-400 font-semibold">({details.experience}+ Years Exp)</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-5">
          {details.bio}
        </p>

        {/* Credentials */}
        <div className="space-y-2.5 mb-5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-[11px] text-slate-600">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
            <span className="truncate font-semibold text-slate-700" title={details.qualification}>{details.qualification}</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <span className="truncate font-bold text-emerald-700 uppercase tracking-wide text-[9px] font-mono">Verified Faculty Member</span>
          </div>
        </div>

        {/* Subjects taught */}
        <div className="mb-5">
          <span className="block text-[9px] text-slate-400 font-mono uppercase tracking-widest mb-2">Instruction Subjects:</span>
          <div className="flex flex-wrap gap-1.5">
            {details.subjects.map((sub, sIdx) => (
              <span 
                key={sIdx} 
                className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
              >
                {sub}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-5 mt-auto">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider block leading-none">Tuition Rate</span>
            <span className="text-sm font-extrabold text-slate-900 block mt-1.5 leading-none font-mono">
              ${details.hourlyRate}/Hr
            </span>
          </div>

          {currentUser?.uid !== tutor.uid && (
            <button
              onClick={() => {
                if (!currentUser) {
                  showToast("Please log in to open communication chat.", "info");
                  return;
                }
                setShowChatModal(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-white bg-slate-100 hover:bg-slate-900 transition-all border border-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" /> Direct Chat
            </button>
          )}
        </div>
      </div>

      {/* Message Chat Drawer Overlay */}
      {showChatModal && currentUser && (
        <div className="fixed inset-0 z-55 overflow-y-auto bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-150 shadow-2xl relative">
            <button 
              onClick={() => setShowChatModal(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-650 p-1.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              {tutor.photoURL ? (
                <img className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100" src={tutor.photoURL} alt="" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center ring-2 ring-slate-100">
                  TM
                </div>
              )}
              <div>
                <h3 className="text-xs font-extrabold text-slate-900">Direct Chat: Dr. {tutor.name}</h3>
                <p className="text-[10px] text-slate-400 font-medium">Response average: 2-3 hours</p>
              </div>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-755 mb-2">Draft Message:</label>
                <textarea
                  required
                  rows={4}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Ask about class schedules, study materials, or request subject syllabus guidelines..."
                  className="w-full text-xs rounded-xl p-3 border border-slate-200 outline-none focus:border-indigo-600 font-sans leading-relaxed bg-slate-50 focus:bg-white transition-all focus:ring-4 focus:ring-indigo-100"
                ></textarea>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <MessageSquareReply className="w-3.5 h-3.5 text-indigo-500" /> Auto-sync chat logs to both dashboards
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChatModal(false)}
                  className="w-1/2 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-650 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending || !messageText.trim()}
                  className="w-1/2 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send Message'} <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reviews Modal */}
      <ReviewsModal
        isOpen={showReviewsModal}
        onClose={() => setShowReviewsModal(false)}
        title={`Student Reviews for ${tutor.name}`}
        targetName={tutor.name}
        reviews={tutorReviews}
      />
    </motion.div>
  );
};
