import React from 'react';
import { Review } from '../types';
import { X, Star, Calendar, Smile } from 'lucide-react';

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  targetName: string;
  reviews: Review[];
}

export const ReviewsModal: React.FC<ReviewsModalProps> = ({
  isOpen,
  onClose,
  title,
  targetName,
  reviews
}) => {
  if (!isOpen) return null;

  // Calculate statistics
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
    : 5.0;

  const starCounts = [0, 0, 0, 0, 0]; // index 0 = 1 star, ..., index 4 = 5 stars
  reviews.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) {
      starCounts[r.rating - 1]++;
    }
  });

  return (
    <div className="fixed inset-0 z-55 overflow-y-auto bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-150 shadow-2xl relative font-sans max-h-[85vh] flex flex-col">
        {/* Header */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 p-1.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4 pr-8">
          <span className="text-[9px] uppercase font-mono text-indigo-600 font-bold tracking-wider block">Reviews & Feedback</span>
          <h3 className="text-base font-extrabold text-slate-900 mt-1 leading-snug">{title}</h3>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-6">
          {totalReviews === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100">
              <Smile className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No approved reviews yet</p>
              <p className="text-[10px] text-slate-400 mt-1">Be the first to leave a stellar 5-star review from your dashboard!</p>
            </div>
          ) : (
            <>
              {/* Rating Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100 items-center">
                <div className="sm:col-span-4 text-center sm:border-r sm:border-slate-200/60 py-2">
                  <span className="text-3xl font-extrabold text-slate-900 leading-none block font-mono">
                    {avgRating.toFixed(1)}
                  </span>
                  <div className="flex justify-center gap-0.5 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`w-3.5 h-3.5 ${
                          star <= Math.round(avgRating) 
                            ? 'fill-amber-400 text-amber-400' 
                            : 'text-slate-200 fill-slate-200'
                        }`} 
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-1.5">
                    {totalReviews} {totalReviews === 1 ? 'Review' : 'Reviews'}
                  </span>
                </div>

                {/* Stars Breakdown */}
                <div className="sm:col-span-8 space-y-2">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = starCounts[stars - 1];
                    const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                    return (
                      <div key={stars} className="flex items-center gap-2 text-xs">
                        <span className="w-3 text-right font-bold text-slate-600 text-[11px] font-mono">{stars}</span>
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-400 rounded-full transition-all duration-500" 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="w-6 text-left text-[10px] text-slate-400 font-mono font-bold">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Individual Comments List */}
              <div className="space-y-4">
                <span className="block text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">
                  Verified Scholar Feedback
                </span>
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div 
                      key={r.id} 
                      className="p-4 bg-white border border-slate-150 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-2"
                    >
                      {/* Author Header */}
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-center gap-2.5">
                          {r.studentPhotoURL ? (
                            <img 
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 rounded-full object-cover border border-slate-100" 
                              src={r.studentPhotoURL} 
                              alt={r.studentName} 
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                              {r.studentName.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="text-xs font-bold text-slate-800 block leading-tight">
                              {r.studentName}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium block mt-0.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {new Date(r.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                            </span>
                          </div>
                        </div>

                        {/* Rating block */}
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`w-3 h-3 ${
                                star <= r.rating 
                                  ? 'fill-amber-400 text-amber-400' 
                                  : 'text-slate-150 fill-slate-150'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>

                      {/* Course reference badge if any */}
                      {r.classTitle && (
                        <span className="inline-block bg-slate-100/80 border border-slate-200 text-slate-600 text-[9px] font-bold font-mono px-2 py-0.5 rounded-md">
                          Course: {r.classTitle}
                        </span>
                      )}

                      {/* Comment text */}
                      <p className="text-xs text-slate-600 leading-relaxed font-sans">
                        {r.comment}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-100 pt-4 mt-4 flex justify-between items-center text-[10px] text-slate-400 font-semibold">
          <span>All reviews are moderated for respect and compliance.</span>
        </div>
      </div>
    </div>
  );
};
