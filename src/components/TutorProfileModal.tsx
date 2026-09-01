import React from 'react';
import { UserProfile, Review } from '../types';
import { X, Star, Calendar, GraduationCap, Award, BookOpen, Clock, Heart, MessageSquare } from 'lucide-react';

interface TutorProfileModalProps {
  tutor: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  reviews: Review[];
  onContactClick?: () => void;
}

export const TutorProfileModal: React.FC<TutorProfileModalProps> = ({
  tutor,
  isOpen,
  onClose,
  reviews = [],
  onContactClick
}) => {
  if (!isOpen || !tutor) return null;

  const tutorName = tutor.name || tutor.displayName || tutor.username || 'Faculty Tutor';
  const details = tutor.tutorDetails || {
    bio: `${tutorName} is a verified academic faculty instructor at Guru Gedara Academy.`,
    subjects: tutor.preferredSubjects && tutor.preferredSubjects.length > 0 ? tutor.preferredSubjects : ['General Tuition'],
    expertiseAreas: [],
    qualification: 'Academic Faculty Specialist',
    experience: 3,
    rating: 5.0,
    availability: [],
    workingHours: [
      { day: 'Monday', enabled: true, startTime: '09:00 AM', endTime: '05:00 PM' },
      { day: 'Tuesday', enabled: true, startTime: '09:00 AM', endTime: '05:00 PM' },
      { day: 'Wednesday', enabled: true, startTime: '09:00 AM', endTime: '05:00 PM' },
      { day: 'Thursday', enabled: true, startTime: '09:00 AM', endTime: '05:00 PM' },
      { day: 'Friday', enabled: true, startTime: '09:00 AM', endTime: '05:00 PM' },
      { day: 'Saturday', enabled: true, startTime: '09:00 AM', endTime: '01:00 PM' },
    ],
    daysOff: ['Sunday']
  };

  const safeReviews = Array.isArray(reviews) ? reviews : [];
  const tutorReviews = safeReviews.filter(r => r.tutorId === tutor.uid && r.status === 'approved');
  const avgRating = tutorReviews.length > 0 
    ? tutorReviews.reduce((sum, r) => sum + r.rating, 0) / tutorReviews.length 
    : (details.rating || 5.0);

  // Star breakdown calculation
  const starCounts = [0, 0, 0, 0, 0];
  tutorReviews.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) {
      starCounts[r.rating - 1]++;
    }
  });

  const subjectsList = Array.isArray(details.subjects) && details.subjects.length > 0
    ? details.subjects 
    : (tutor.preferredSubjects || ['Academic Studies']);
  const expertiseList = Array.isArray(details.expertiseAreas) ? details.expertiseAreas : [];
  const workingHoursList = Array.isArray(details.workingHours) ? details.workingHours : [];
  const daysOffList = Array.isArray(details.daysOff) ? details.daysOff : [];
  const qualification = details.qualification || 'Academic Faculty Specialist';
  const experienceYears = details.experience ?? details.experienceYears ?? 3;
  const bio = details.bio || `${tutorName} is committed to delivering comprehensive, high-standard curriculum guidance.`;

  return (
    <div 
      className="fixed inset-0 z-55 overflow-y-auto bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4" 
      id={`tutor_profile_modal_${tutor.uid}`}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full border border-slate-150 shadow-2xl relative font-sans max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header close button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-650 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Scrollable Container */}
        <div className="overflow-y-auto flex-1 p-6 sm:p-8 space-y-6">
          
          {/* Section 1: Top Hero Profile */}
          <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left pb-6 border-b border-slate-100">
            {tutor.photoURL ? (
              <img 
                referrerPolicy="no-referrer"
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl object-cover ring-4 ring-slate-50 shadow-md" 
                src={tutor.photoURL} 
                alt={tutorName} 
              />
            ) : (
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-indigo-50 text-indigo-700 font-extrabold flex items-center justify-center text-2xl ring-4 ring-slate-50 shadow-sm">
                {tutorName.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 leading-tight">{tutorName}</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-150">
                  <Award className="w-2.5 h-2.5" /> Verified Faculty
                </span>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-600 text-xs">
                <GraduationCap className="w-4 h-4 text-indigo-500" />
                <span className="font-semibold">{qualification}</span>
              </div>

              {/* Status and Rate badges */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wide uppercase border ${
                  tutor.availabilityStatus === 'away' 
                    ? 'bg-amber-50 text-amber-700 border-amber-200' 
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${tutor.availabilityStatus === 'away' ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                  {tutor.availabilityStatus === 'away' ? 'Away / No Bookings' : 'Active / Accepting Students'}
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-50 text-pink-700 rounded-xl text-[10px] font-black border border-pink-100">
                  <Heart className="w-3 h-3 fill-pink-500 text-pink-500" /> {experienceYears}+ Yrs Exp
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Biography & Philosophy */}
          <div className="space-y-2.5">
            <h3 className="text-xs uppercase tracking-wider font-mono font-black text-slate-400">Teaching Biography & Philosophy</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-sans whitespace-pre-line bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              {bio}
            </p>
          </div>

          {/* Section 3: Subject Tracks & Areas of Expertise */}
          <div className="space-y-3">
            <div>
              <h3 className="text-xs uppercase tracking-wider font-mono font-black text-slate-400 mb-2">Instructed Subject Tracks</h3>
              <div className="flex flex-wrap gap-2">
                {subjectsList.map((sub, sIdx) => (
                  <span 
                    key={sIdx} 
                    className="px-3.5 py-1 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
                  >
                    {sub}
                  </span>
                ))}
              </div>
            </div>

            {/* Areas of Expertise / Specializations */}
            {expertiseList.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-wider font-mono font-black text-slate-400 mb-2">Areas of Expertise & Specializations</h3>
                <div className="flex flex-wrap gap-1.5">
                  {expertiseList.map((exp, eIdx) => (
                    <span 
                      key={eIdx} 
                      className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-150"
                    >
                      ★ {exp}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 3.5: Working Hours & Days Off Availability */}
          {(workingHoursList.length > 0 || daysOffList.length > 0) && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h3 className="text-xs uppercase tracking-wider font-mono font-black text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" /> Teaching Hours & Days Off
              </h3>

              {workingHoursList.length > 0 && (
                <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100 font-sans">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {workingHoursList.map((wh) => (
                      <div key={wh.day} className={`p-2 rounded-xl border ${wh.enabled ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-100/60 border-slate-150 text-slate-400 line-through'}`}>
                        <span className="block font-bold text-[11px]">{wh.day}</span>
                        <span className="block text-[10px] font-mono mt-0.5">
                          {wh.enabled ? `${wh.startTime} - ${wh.endTime}` : 'Off Day'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {daysOffList.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Declared Days Off:</span>
                  {daysOffList.map((off, oIdx) => (
                    <span key={oIdx} className="px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-150 rounded-lg text-[11px] font-bold">
                      🌴 {off}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 4: Verified Student Reviews & Ratings */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="text-xs uppercase tracking-wider font-mono font-black text-slate-400">Student Reviews & Ratings</h3>
              <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{avgRating.toFixed(1)} avg ({tutorReviews.length} reviews)</span>
              </div>
            </div>

            {tutorReviews.length === 0 ? (
              <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No student comments yet</p>
                <p className="text-[10px] text-slate-400 mt-1">Feedback from classes attended will be published here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Rating breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 items-center">
                  <div className="sm:col-span-4 text-center sm:border-r sm:border-slate-200/60 py-1">
                    <span className="text-3xl font-extrabold text-slate-900 block font-mono">
                      {avgRating.toFixed(1)}
                    </span>
                    <div className="flex justify-center gap-0.5 mt-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`w-3 h-3 ${
                            star <= Math.round(avgRating) 
                              ? 'fill-amber-400 text-amber-400' 
                              : 'text-slate-200 fill-slate-200'
                          }`} 
                        />
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-8 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count = starCounts[stars - 1];
                      const percent = tutorReviews.length > 0 ? (count / tutorReviews.length) * 100 : 0;
                      return (
                        <div key={stars} className="flex items-center gap-2 text-[11px]">
                          <span className="w-3 text-right font-bold text-slate-600 font-mono">{stars}</span>
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 flex-shrink-0" />
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-400 rounded-full" 
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="w-5 text-left text-[10px] text-slate-400 font-mono font-bold">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Individual Comments List */}
                <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                  {tutorReviews.map((r) => (
                    <div 
                      key={r.id} 
                      className="p-3.5 bg-white border border-slate-150 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.01)] space-y-1.5"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-xs font-bold text-slate-850 block">{r.studentName}</span>
                          {r.classTitle && (
                            <span className="text-[9px] text-indigo-600 font-bold font-mono">Course: {r.classTitle}</span>
                          )}
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`w-2.5 h-2.5 ${
                                star <= r.rating 
                                  ? 'fill-amber-400 text-amber-400' 
                                  : 'text-slate-150 fill-slate-150'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-650 leading-relaxed font-sans">{r.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Action Button Footer */}
        {onContactClick && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button 
              onClick={() => {
                onClose();
                onContactClick();
              }}
              className="py-2.5 px-6 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" /> Start Discussion
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
