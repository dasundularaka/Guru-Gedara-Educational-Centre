import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { 
  Star, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  X, 
  MessageSquare, 
  Send, 
  ThumbsUp, 
  HelpCircle,
  AlertCircle,
  Award,
  BookOpen,
  User,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { GoogleCalendarEvent, fetchGoogleCalendarEvents } from '../lib/googleCalendarService';
import { firestoreService } from '../lib/firestoreService';

interface GoogleCalendarPostClassFeedbackModalProps {
  events?: GoogleCalendarEvent[];
  onReviewSubmitted?: () => void;
}

export const GoogleCalendarPostClassFeedbackModal: React.FC<GoogleCalendarPostClassFeedbackModalProps> = ({
  events = [],
  onReviewSubmitted
}) => {
  const { currentUser, googleAccessToken, showToast, classes = [], bookings = [] } = useApp();

  const [activeFeedbackEvent, setActiveFeedbackEvent] = useState<GoogleCalendarEvent | null>(null);
  const [hoursElapsed, setHoursElapsed] = useState<number>(24);
  const [rating, setRating] = useState<number>(5);
  const [aspectRatings, setAspectRatings] = useState({
    teachingQuality: 5,
    materials: 5,
    pace: 5,
    clarity: 5
  });
  const [comment, setComment] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [fetchedEvents, setFetchedEvents] = useState<GoogleCalendarEvent[]>(events);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(false);

  // Storage key for dismissed or rated events
  const getStorageKey = (suffix: string) => `gcal_feedback_${suffix}_${currentUser?.uid || 'guest'}`;

  // Fetch events if token available and list empty
  useEffect(() => {
    if (googleAccessToken && events.length === 0) {
      setLoadingEvents(true);
      fetchGoogleCalendarEvents(googleAccessToken)
        .then(evs => setFetchedEvents(evs))
        .catch(err => console.warn("Google Calendar fetch for feedback modal error:", err))
        .finally(() => setLoadingEvents(false));
    } else if (events.length > 0) {
      setFetchedEvents(events);
    }
  }, [googleAccessToken, events]);

  // Check for events that ended >= 24 hours ago
  useEffect(() => {
    if (!currentUser) return;

    const ratedIds: string[] = JSON.parse(localStorage.getItem(getStorageKey('rated')) || '[]');
    const dismissedIds: string[] = JSON.parse(localStorage.getItem(getStorageKey('dismissed')) || '[]');

    const now = new Date();

    // Find first event where now >= eventEnd + 24 hours and not rated/dismissed
    const allCandidateEvents = fetchedEvents.length > 0 ? fetchedEvents : [];

    for (const evt of allCandidateEvents) {
      const evtId = evt.id || evt.summary;
      if (ratedIds.includes(evtId) || dismissedIds.includes(evtId)) {
        continue;
      }

      const endDateStr = evt.end?.dateTime || evt.end?.date;
      if (!endDateStr) continue;

      const endDateObj = new Date(endDateStr);
      const diffMs = now.getTime() - endDateObj.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Trigger condition: event ended 24 hours ago (or more)
      if (diffHours >= 24) {
        setActiveFeedbackEvent(evt);
        setHoursElapsed(Math.floor(diffHours));
        break;
      }
    }
  }, [fetchedEvents, currentUser]);

  // Handle Manual Trigger for Demo/Testing
  const handleSimulateTrigger = (evt?: GoogleCalendarEvent) => {
    if (evt) {
      setActiveFeedbackEvent(evt);
      setHoursElapsed(26); // Default 26h ago for simulation
      return;
    }

    // Default mock event if calendar has no past events
    const sampleClass = classes[0] || { title: 'Advanced Physics Mechanics', tutorName: 'Prof. K. L. Wickramasinghe' };
    const mockEvt: GoogleCalendarEvent = {
      id: `sim_event_${Date.now()}`,
      summary: `Guru Gedara: ${sampleClass.title}`,
      description: `Scheduled class session with ${sampleClass.tutorName || 'Faculty Leader'}.`,
      start: { dateTime: new Date(Date.now() - 28 * 3600 * 1000).toISOString() },
      end: { dateTime: new Date(Date.now() - 26 * 3600 * 1000).toISOString() }
    };
    setActiveFeedbackEvent(mockEvt);
    setHoursElapsed(26);
  };

  const handleDismiss = () => {
    if (activeFeedbackEvent) {
      const evtId = activeFeedbackEvent.id || activeFeedbackEvent.summary;
      const dismissedIds: string[] = JSON.parse(localStorage.getItem(getStorageKey('dismissed')) || '[]');
      if (!dismissedIds.includes(evtId)) {
        dismissedIds.push(evtId);
        localStorage.setItem(getStorageKey('dismissed'), JSON.stringify(dismissedIds));
      }
    }
    setActiveFeedbackEvent(null);
    showToast("Feedback prompt dismissed for this session.", "info");
  };

  const handleSnooze = () => {
    setActiveFeedbackEvent(null);
    showToast("Feedback reminder snoozed. We'll ask you again in 2 hours!", "info");
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFeedbackEvent || !currentUser) return;

    setSubmitting(true);
    try {
      // Parse class title from Google Calendar event summary
      const cleanTitle = activeFeedbackEvent.summary.replace(/^Guru Gedara:\s*/i, '').trim();
      const matchedClass = classes.find(c => c.title.toLowerCase().includes(cleanTitle.toLowerCase()) || cleanTitle.toLowerCase().includes(c.title.toLowerCase()));

      const reviewPayload = {
        studentId: currentUser.uid,
        studentName: currentUser.name || currentUser.displayName || currentUser.email.split('@')[0],
        studentPhotoURL: currentUser.photoURL || '',
        classId: matchedClass?.id || 'gcal_class_' + Date.now(),
        classTitle: cleanTitle,
        tutorId: matchedClass?.tutorId || 'tutor_default',
        tutorName: matchedClass?.tutorName || 'Guru Gedara Faculty',
        rating,
        comment: comment || `[24h Post-Class Automated Feedback] Rated ${rating}/5 stars for ${cleanTitle}. Teaching Quality: ${aspectRatings.teachingQuality}/5.`,
        status: 'pending' as const
      };

      await firestoreService.createReview(reviewPayload);

      // Save as rated to avoid re-triggering
      const evtId = activeFeedbackEvent.id || activeFeedbackEvent.summary;
      const ratedIds: string[] = JSON.parse(localStorage.getItem(getStorageKey('rated')) || '[]');
      if (!ratedIds.includes(evtId)) {
        ratedIds.push(evtId);
        localStorage.setItem(getStorageKey('rated'), JSON.stringify(ratedIds));
      }

      showToast(`⭐ Thank you! Your 24-hour post-class rating for "${cleanTitle}" was submitted successfully.`, "success");
      setActiveFeedbackEvent(null);
      setComment('');
      if (onReviewSubmitted) onReviewSubmitted();
    } catch (err: any) {
      console.error("Error submitting 24h feedback:", err);
      showToast("Failed to submit feedback: " + (err.message || 'Unknown error'), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingLabel = (val: number) => {
    switch (val) {
      case 5: return '⭐ 5/5 - Outstanding Session!';
      case 4: return '👍 4/5 - Very Good';
      case 3: return '👌 3/5 - Satisfactory';
      case 2: return '😐 2/2 - Needs Improvement';
      default: return '👎 1/5 - Unsatisfactory';
    }
  };

  return (
    <>
      {/* Simulation/Tester Control Banner in Calendar Tab */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-4 shadow-lg text-white flex flex-col md:flex-row items-center justify-between gap-4 my-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 rounded-xl">
            <Clock className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-indigo-200 font-mono flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Automated 24-Hour Post-Class Feedback Engine
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Automatically triggers a post-class rating modal 24 hours after a Google Calendar course session ends.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleSimulateTrigger()}
          className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
        >
          <Zap className="w-4 h-4 fill-slate-950" /> Test 24h Feedback Trigger Modal
        </button>
      </div>

      {/* Automated 24h Post-Class Feedback Modal Overlay */}
      <AnimatePresence>
        {activeFeedbackEvent && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-white text-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 shadow-2xl relative font-sans space-y-5 overflow-hidden"
            >
              {/* Decorative Accent Header Bar */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-600 via-blue-500 to-amber-400" />

              {/* Close / Snooze Button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                title="Dismiss feedback"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-full text-[10px] font-black uppercase font-mono tracking-wider flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3 text-indigo-600" /> Google Calendar Trigger
                  </span>
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-[10px] font-black uppercase font-mono tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" /> Ended {hoursElapsed}h Ago
                  </span>
                </div>

                <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                  How was your class session?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your Google Calendar class session finished {hoursElapsed} hours ago. Please rate your experience to guide instructors and help improve learning materials.
                </p>
              </div>

              {/* Event Information Card */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[10px] text-indigo-600 uppercase font-black">Course Event</span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Completed
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-800">
                  {activeFeedbackEvent.summary.replace(/^Guru Gedara:\s*/i, '')}
                </h4>
                {activeFeedbackEvent.description && (
                  <p className="text-[11px] text-slate-500 line-clamp-2 italic">
                    "{activeFeedbackEvent.description}"
                  </p>
                )}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Main Star Picker */}
                <div className="space-y-1.5 bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100 text-center">
                  <label className="block text-xs font-black text-slate-800 uppercase font-mono tracking-wider">
                    Overall Session Star Rating
                  </label>
                  
                  <div className="flex items-center justify-center gap-2 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 hover:scale-125 transition-transform cursor-pointer focus:outline-none"
                      >
                        <Star 
                          className={`w-8 h-8 ${
                            star <= rating 
                              ? 'fill-amber-400 text-amber-400 drop-shadow-xs' 
                              : 'text-slate-300 fill-slate-100'
                          }`} 
                        />
                      </button>
                    ))}
                  </div>

                  <p className="text-xs font-extrabold text-indigo-700">
                    {getRatingLabel(rating)}
                  </p>
                </div>

                {/* Aspect Ratings (Pills) */}
                <div className="space-y-2">
                  <span className="text-[11px] font-black text-slate-700 font-mono uppercase tracking-wider block">
                    Session Aspects Breakdown
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                        <span>Teaching Quality</span>
                        <span className="text-amber-600 font-mono">{aspectRatings.teachingQuality}/5</span>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button
                            key={`tq_${val}`}
                            type="button"
                            onClick={() => setAspectRatings(p => ({ ...p, teachingQuality: val }))}
                            className={`flex-1 h-2 rounded-full transition-all cursor-pointer ${
                              val <= aspectRatings.teachingQuality ? 'bg-indigo-600' : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                        <span>Course Materials</span>
                        <span className="text-amber-600 font-mono">{aspectRatings.materials}/5</span>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button
                            key={`mat_${val}`}
                            type="button"
                            onClick={() => setAspectRatings(p => ({ ...p, materials: val }))}
                            className={`flex-1 h-2 rounded-full transition-all cursor-pointer ${
                              val <= aspectRatings.materials ? 'bg-indigo-600' : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Written Comments */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Written Reflection & Suggestions
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share what went well during this session, homework doubts, or feedback for your tutor..."
                    className="w-full text-xs rounded-2xl p-3 border border-slate-200 outline-none focus:border-indigo-600 bg-slate-50 focus:bg-white transition-all focus:ring-4 focus:ring-indigo-100 font-sans"
                  />
                </div>

                {/* Footer Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSnooze}
                    className="flex-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Remind Me Later
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Submitting...' : 'Submit 24h Rating'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
