import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../lib/firestoreService';
import { ClassItem } from '../types';
import { BookOpen, User, Calendar, CreditCard, Sparkles, ShieldCheck } from 'lucide-react';

interface ClassCardProps {
  item: ClassItem;
  onBookSuccess?: () => void;
  onRedirectToLogin?: () => void;
}

export const ClassCard: React.FC<ClassCardProps> = ({ item, onBookSuccess, onRedirectToLogin }) => {
  const { currentUser, showToast, refreshClasses } = useApp();
  const [loading, setLoading] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Visa ending in 4242");

  const spotsLeft = item.maxSlots - item.bookedSlots;
  const isFull = spotsLeft <= 0;

  // Render subject-colored pills
  const getSubjectColor = (subject: string) => {
    switch (subject.toLowerCase()) {
      case 'mathematics':
      case 'algebra':
      case 'calculus':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'physics':
      case 'science':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'english':
      case 'literature':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'coding':
      case 'computer science':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleBookingClick = () => {
    if (!currentUser) {
      showToast("Please log in to book tuition classes.", "info");
      if (onRedirectToLogin) onRedirectToLogin();
      return;
    }

    if (currentUser.role !== 'student') {
      showToast("Only accounts registered as Students can enroll in classes.", "error");
      return;
    }

    // Trigger payment sheet mockup
    setShowPayModal(true);
  };

  const executeEnrollment = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // 1. Save payment record
      await firestoreService.createPayment(
        currentUser.uid, 
        currentUser.name, 
        item.id, 
        item.title, 
        item.price, 
        paymentMethod,
        'paid'
      );

      // 2. Clear booking slot
      await firestoreService.bookClass(currentUser.uid, currentUser.name, item);

      // 3. Trigger alert notification
      await firestoreService.triggerNotification(
        currentUser.uid,
        "Class Enrolled Successfully!",
        `Congratulations! You have booked a seat in '${item.title}' scheduled for ${item.schedule}. Payment of $${item.price} confirmed.`,
        'payment'
      );

      // Notify Tutor as well!
      await firestoreService.triggerNotification(
        item.tutorId,
        "New Enrollment Intake",
        `Student '${currentUser.name}' has locked a booking for your class: '${item.title}'.`,
        'reminder'
      );

      showToast(`Successfully enrolled in ${item.title}! Check your dashboard.`, "success");
      setShowPayModal(false);
      
      // Update global context
      await refreshClasses();
      if (onBookSuccess) onBookSuccess();
    } catch (err: any) {
      showToast("Booking compilation failed. Try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sleek-card overflow-hidden flex flex-col h-full bg-white" id={`class_card_${item.id}`}>
      {/* Decorative Subject Cover */}
      <div className="p-6 bg-linear-to-br from-slate-50 to-slate-100/45 border-b border-slate-100 relative">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getSubjectColor(item.subject)}`}>
          {item.subject}
        </span>
        <h4 className="mt-3 text-sm font-extrabold text-slate-900 leading-snug tracking-tight hover:text-indigo-600 transition-colors cursor-pointer">
          {item.title}
        </h4>
        
        {/* Tutor row */}
        <div className="mt-4 flex items-center gap-2.5">
          {item.tutorPhoto ? (
            <img 
              referrerPolicy="no-referrer"
              className="h-6 w-6 rounded-full object-cover border border-slate-200" 
              src={item.tutorPhoto} 
              alt={item.tutorName} 
            />
          ) : (
            <div className="h-6 w-6 rounded-full bg-slate-100 text-slate-650 flex items-center justify-center text-[10px] font-bold">
              <User className="w-3 h-3" />
            </div>
          )}
          <span className="text-xs text-slate-650 font-medium">by {item.tutorName}</span>
        </div>
      </div>

      {/* Details body */}
      <div className="p-6 flex-1 flex flex-col justify-between">
        <p className="text-xs text-slate-550 line-clamp-3 mb-5 leading-relaxed">
          {item.description}
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span className="font-semibold">{item.schedule}</span>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <div>
              <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider leading-none">Tuition Cost</span>
              <span className="text-lg font-extrabold text-indigo-600 font-sans leading-none block mt-1.5">
                ${item.price}<span className="text-xs text-slate-400 font-normal"> / month</span>
              </span>
            </div>

            {/* Spots remaining logic */}
            <div className="text-right">
              {isFull ? (
                <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-[10px] font-bold font-mono">
                  Fully Booked
                </span>
              ) : (
                <span className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg ${spotsLeft <= 3 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'}`}>
                  {spotsLeft} Seats Ready
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic button control based on user role */}
        <button
          onClick={handleBookingClick}
          disabled={isFull || currentUser?.role === 'tutor' || currentUser?.role === 'admin'}
          className={`mt-5 w-full text-center py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-230 cursor-pointer ${
            isFull 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : currentUser?.role === 'tutor' || currentUser?.role === 'admin'
                ? 'bg-slate-50 text-slate-350 cursor-not-allowed border border-slate-150'
                : 'bg-slate-900 hover:bg-slate-950 text-white shadow-md hover:shadow-lg hover:shadow-slate-900/10'
          }`}
          id={`enroll_btn_${item.id}`}
        >
          {isFull ? 'Limit Reached' : 'Secure Premium Seat'}
        </button>
      </div>

      {/* Pay Mockup Modal overlay */}
      {showPayModal && (
        <div className="fixed inset-0 z-55 overflow-y-auto bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-150 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
              Tuition Fees Checkout
            </h3>
            <p className="text-xs text-slate-500 mb-5">Complete secure test booking for the following schedule:</p>

            <div className="bg-slate-50 p-4 rounded-2xl mb-5 border border-slate-100">
              <span className="text-[9px] uppercase font-mono text-indigo-600 font-bold tracking-wider block">{item.subject} Class</span>
              <p className="text-sm font-extrabold text-slate-900 mt-1">{item.title}</p>
              <div className="flex justify-between items-center mt-3 text-xs text-slate-650">
                <span>Monthly Recurring Bill:</span>
                <span className="font-extrabold text-slate-900">${item.price}.00</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-extrabold text-slate-700">Choose Academic Card Payment Method:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("Visa ending in 4242")}
                  className={`p-3.5 rounded-xl border text-left flex flex-col gap-1.5 transition-all ${paymentMethod === 'Visa ending in 4242' ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span className="text-[10px] font-bold font-mono">VISA **** 4242</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("Student Credit Wallet")}
                  className={`p-3.5 rounded-xl border text-left flex flex-col gap-1.5 transition-all ${paymentMethod === 'Student Credit Wallet' ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-bold font-mono">Scholarship Wallet</span>
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPayModal(false)}
                className="w-1/2 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={executeEnrollment}
                disabled={loading}
                className="w-1/2 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loading ? 'Processing...' : `Pay $${item.price}.00 Now`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
