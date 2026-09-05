import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../lib/firestoreService';
import { ClassItem, UserProfile } from '../types';
import { BookOpen, User, Calendar, CreditCard, Sparkles, ShieldCheck, X, Star, QrCode, AlertCircle, CheckCircle, CheckCircle2, Clock, Send, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { ReviewsModal } from './ReviewsModal';
import { ClassEnrollmentConfirmModal } from './ClassEnrollmentConfirmModal';
import { checkClassAvailability, AvailabilityCheckResult } from '../utils/tutorAvailability';

interface ClassCardProps {
  item: ClassItem;
  onBookSuccess?: () => void;
  onRedirectToLogin?: () => void;
  onBookClick?: () => void;
  onOpenClassProfile?: (classItem: ClassItem) => void;
  onOpenTutorProfile?: (tutor: UserProfile) => void;
  onOpenScanner?: (classItem: ClassItem) => void;
}

export const ClassCard: React.FC<ClassCardProps> = ({ 
  item, 
  onBookSuccess, 
  onRedirectToLogin,
  onOpenClassProfile,
  onOpenTutorProfile,
  onOpenScanner
}) => {
  const { currentUser, showToast, refreshClasses, refreshBookings, bookings, reviews, refreshUserProfile } = useApp();
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isFinalizingEnrollment, setIsFinalizingEnrollment] = useState(false);
  const [isJustRegistered, setIsJustRegistered] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Credit / Debit Card");

  // Secure payment gateway state variables
  const [gatewayType, setGatewayType] = useState<'stripe' | 'paypal'>('stripe');
  const [cardName, setCardName] = useState(currentUser?.name || "");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  const [payPalEmail, setPayPalEmail] = useState(currentUser?.email || "");
  const [payPalPassword, setPayPalPassword] = useState("");
  const [isPayPalLoggedIn, setIsPayPalLoggedIn] = useState(false);
  const [showPayPalLoginForm, setShowPayPalLoginForm] = useState(false);

  // State for Tutor Availability Check
  const [tutorProfile, setTutorProfile] = useState<UserProfile | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchTutor = async () => {
      if (!item.tutorId) return;
      try {
        setCheckingAvailability(true);
        const profile = await firestoreService.getUserProfile(item.tutorId);
        if (isMounted && profile) {
          setTutorProfile(profile);
        }
      } catch (e) {
        // Fallback silently
      } finally {
        if (isMounted) setCheckingAvailability(false);
      }
    };
    fetchTutor();
    return () => { isMounted = false; };
  }, [item.tutorId]);

  const availabilityResult: AvailabilityCheckResult = checkClassAvailability(item, tutorProfile);
  const isTutorUnavailable = !availabilityResult.isAvailable;

  const spotsLeft = item.maxSlots - item.bookedSlots;
  const isFull = spotsLeft <= 0;

  const classReviews = (reviews || []).filter(r => r.classId === item.id && r.status === 'approved');
  const avgRating = classReviews.length > 0 
    ? classReviews.reduce((sum, r) => sum + r.rating, 0) / classReviews.length 
    : 5.0;

  // Enrollment Status Checks
  const isStudent = currentUser?.role === 'student';
  const enrolledClassIds = currentUser?.selectedClasses || [];
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  
  const isEnrolled = isStudent && (
    enrolledClassIds.includes(item.id) ||
    safeBookings.some(b => (b.studentId === currentUser?.uid || b.studentEmail === currentUser?.email) && b.classId === item.id && b.status === 'active')
  );

  const isPendingRequest = isStudent && safeBookings.some(
    b => (b.studentId === currentUser?.uid || b.studentEmail === currentUser?.email) && b.classId === item.id && b.status === 'pending_approval'
  );

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

  const handleRequestEnrollment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      showToast("Please log in to request class enrollment.", "info");
      if (onRedirectToLogin) onRedirectToLogin();
      return;
    }

    if (currentUser.role !== 'student') {
      showToast("Only student accounts can request enrollment.", "error");
      return;
    }

    setSubmittingRequest(true);
    try {
      await firestoreService.requestClassEnrollment(
        currentUser.uid,
        currentUser.name || currentUser.username || 'Student',
        item,
        requestNote
      );

      showToast(`Enrollment request for '${item.title}' sent to administrators for manual approval.`, "success");
      setShowRequestModal(false);
      setRequestNote("");
      if (refreshBookings) await refreshBookings();
      if (refreshClasses) await refreshClasses();
      if (onBookSuccess) onBookSuccess();
    } catch (err: any) {
      showToast("Could not submit request. Please try again.", "error");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleTutorClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenTutorProfile) {
      if (tutorProfile) {
        onOpenTutorProfile(tutorProfile);
      } else if (item.tutorId) {
        const p = await firestoreService.getUserProfile(item.tutorId);
        if (p) {
          onOpenTutorProfile(p);
        } else {
          onOpenTutorProfile({
            uid: item.tutorId,
            name: item.tutorName,
            email: '',
            role: 'tutor',
            photoURL: item.tutorPhoto,
            createdAt: new Date().toISOString()
          });
        }
      }
    }
  };

  const handleEnrollClick = () => {
    if (!currentUser) {
      showToast("Please log in as a student to enroll in this class.", "info");
      if (onRedirectToLogin) onRedirectToLogin();
      return;
    }

    if (currentUser.role !== 'student') {
      showToast("Only accounts registered as Students can enroll in classes.", "error");
      return;
    }

    if (isTutorUnavailable) {
      showToast(availabilityResult.reason || "This tutor is currently unavailable for this class time.", "error");
      return;
    }

    if (isFull) {
      showToast("This class has reached maximum capacity.", "error");
      return;
    }

    // Open confirmation modal to prevent accidental sign-ups
    setShowConfirmModal(true);
  };

  const handleFinalizeEnrollment = async () => {
    if (!currentUser) return;

    setIsFinalizingEnrollment(true);
    try {
      // 1. Finalize class enrollment booking in database
      await firestoreService.bookClass(currentUser.uid, currentUser.name, item);

      // 2. Generate tuition payment record
      await firestoreService.createPayment(
        currentUser.uid, 
        currentUser.name, 
        item.id, 
        item.title, 
        item.price, 
        'Direct Class Enrollment Confirmation',
        'pending',
        {
          gateway: 'bank_transfer',
          currency: 'LKR',
          paymentType: 'class_fee'
        }
      );

      // 3. Trigger student & tutor in-app notifications
      await firestoreService.triggerNotification(
        currentUser.uid,
        "Class Enrollment Confirmed!",
        `Congratulations! You have successfully enrolled in '${item.title}' scheduled for ${item.schedule}.`,
        'payment'
      );

      if (item.tutorId) {
        await firestoreService.triggerNotification(
          item.tutorId,
          "New Student Registration",
          `Student '${currentUser.name}' has registered for your class: '${item.title}'.`,
          'reminder'
        );
      }

      // Close confirmation modal
      setShowConfirmModal(false);

      // Transition button with success animation into 'Registered' state
      setIsJustRegistered(true);
      setShowSuccessAnimation(true);

      showToast(`🎉 Successfully enrolled in ${item.title}! Your seat is confirmed.`, "success");

      // Stop pulsing burst after 3.2s, keep Registered state
      setTimeout(() => {
        setShowSuccessAnimation(false);
      }, 3200);

      // Update global context
      if (refreshBookings) await refreshBookings();
      if (refreshClasses) await refreshClasses();
      if (refreshUserProfile) await refreshUserProfile();
      if (onBookSuccess) onBookSuccess();
    } catch (err: any) {
      showToast("Enrollment failed. Please try again.", "error");
    } finally {
      setIsFinalizingEnrollment(false);
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

    if (isTutorUnavailable) {
      showToast(availabilityResult.reason || "This tutor is currently unavailable for this class time.", "error");
      return;
    }

    // Trigger payment sheet mockup
    setShowPayModal(true);
  };

  const executeEnrollment = async () => {
    if (!currentUser) return;

    let transactionDesc = "";
    if (gatewayType === 'stripe') {
      if (!cardName.trim() || !cardExpiry.trim() || !cardCvc.trim() || !cardNumber.trim()) {
        showToast("Please complete all Stripe Credit Card fields.", "error");
        return;
      }
      const cleanNum = cardNumber.replace(/\s+/g, '');
      const lastFour = cleanNum.slice(-4) || '4242';
      transactionDesc = `Stripe Card: Visa ending in ${lastFour}`;
    } else {
      if (!isPayPalLoggedIn) {
        showToast("Please log in to your secure Sandbox PayPal account.", "error");
        setShowPayPalLoginForm(true);
        return;
      }
      transactionDesc = `PayPal Account: ${payPalEmail || 'student@paypal.sandbox'}`;
    }

    setLoading(true);
    try {
      const txnId = gatewayType === 'stripe' 
        ? `ch_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`
        : `PAYID-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;

      const cleanNum = cardNumber.replace(/\s+/g, '');
      const lastFour = cleanNum.slice(-4) || '4242';

      // 1. Save payment record with complete gateway details
      await firestoreService.createPayment(
        currentUser.uid, 
        currentUser.name, 
        item.id, 
        item.title, 
        item.price, 
        transactionDesc,
        'paid',
        {
          gateway: gatewayType,
          transactionId: txnId,
          receiptUrl: `https://pay.tuition.ac/receipt/${item.id}_${Date.now()}`,
          cardLast4: gatewayType === 'stripe' ? lastFour : undefined,
          payerEmail: gatewayType === 'stripe' ? (currentUser.email || cardName) : payPalEmail,
          currency: 'LKR',
          paymentType: 'class_fee'
        }
      );

      // 2. Clear booking slot
      await firestoreService.bookClass(currentUser.uid, currentUser.name, item);

      // 3. Trigger alert notification
      await firestoreService.triggerNotification(
        currentUser.uid,
        "Class Enrolled Successfully!",
        `Congratulations! You have booked a seat in '${item.title}' scheduled for ${item.schedule}. Payment of LKR ${item.price} confirmed.`,
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
    <motion.div
      whileHover={{ y: -5, scale: 1.015, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="sleek-card overflow-hidden flex flex-col h-full bg-white group transition-all duration-300"
      id={`class_card_${item.id}`}
    >
      {item.imageUrl ? (
        <div 
          onClick={() => onOpenClassProfile && onOpenClassProfile(item)}
          className="h-40 w-full relative overflow-hidden bg-slate-900 cursor-pointer group"
        >
          <img 
            referrerPolicy="no-referrer"
            src={item.imageUrl} 
            alt={item.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ease-out"
          />
          <span className={`absolute top-3 left-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shadow-sm backdrop-blur-md bg-white/90 ${getSubjectColor(item.subject)}`}>
            {item.subject}
          </span>
          
          {/* Top-Right Small QR Scanner Button for Tutors & Admins */}
          {(currentUser?.role === 'tutor' || currentUser?.role === 'admin') && onOpenScanner && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenScanner(item);
              }}
              className="absolute top-3 right-3 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition-all cursor-pointer z-10 border border-indigo-400/40"
              title="Open QR Scanner for this class"
              id={`btn_card_qr_scanner_${item.id}`}
            >
              <QrCode className="w-3.5 h-3.5" />
            </button>
          )}

          {item.isFeatured && !((currentUser?.role === 'tutor' || currentUser?.role === 'admin') && onOpenScanner) && (
            <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-amber-500 text-white shadow-sm font-mono border border-amber-400">
              <Star className="w-2.5 h-2.5 fill-white" /> Featured
            </span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-3.5">
            <div 
              onClick={handleTutorClick}
              className="flex items-center gap-2 cursor-pointer hover:opacity-90 group/tutor"
              title={`View faculty profile for ${item.tutorName}`}
            >
              {item.tutorPhoto ? (
                <img 
                  referrerPolicy="no-referrer"
                  className="h-5 w-5 rounded-full object-cover border border-white/40 ring-1 ring-white/20" 
                  src={item.tutorPhoto} 
                  alt={item.tutorName} 
                />
              ) : (
                <div className="h-5 w-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[9px] font-bold">
                  <User className="w-2.5 h-2.5" />
                </div>
              )}
              <span className="text-[11px] text-white/90 font-medium whitespace-nowrap group-hover/tutor:underline">by {item.tutorName}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Decorative Subject Cover Fallback */
        <div 
          onClick={() => onOpenClassProfile && onOpenClassProfile(item)}
          className="p-6 bg-linear-to-br from-slate-50 to-slate-100/45 border-b border-slate-100 relative cursor-pointer"
        >
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getSubjectColor(item.subject)}`}>
            {item.subject}
          </span>

          {/* Top-Right Small QR Scanner Button for Tutors & Admins */}
          {(currentUser?.role === 'tutor' || currentUser?.role === 'admin') && onOpenScanner && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenScanner(item);
              }}
              className="absolute top-3 right-3 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition-all cursor-pointer z-10 border border-indigo-400/40"
              title="Open QR Scanner for this class"
              id={`btn_card_qr_scanner_${item.id}`}
            >
              <QrCode className="w-3.5 h-3.5" />
            </button>
          )}

          <h4 className="mt-3 text-sm font-extrabold text-slate-900 leading-snug tracking-tight hover:text-indigo-600 transition-colors">
            {item.title}
          </h4>
          
          {/* Tutor row */}
          <div 
            onClick={handleTutorClick}
            className="mt-4 flex items-center gap-2.5 cursor-pointer hover:opacity-80 group/tutor"
            title={`View faculty profile for ${item.tutorName}`}
          >
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
            <span className="text-xs text-slate-650 font-medium group-hover/tutor:underline">by {item.tutorName}</span>
          </div>
        </div>
      )}

      {/* Conditionally render Title outside the cover if we have a layout with imageUrl */}
      {item.imageUrl && (
        <div className="px-4 sm:px-6 pt-3 sm:pt-5 pb-1">
          <h4 
            onClick={() => onOpenClassProfile && onOpenClassProfile(item)}
            className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug tracking-tight hover:text-indigo-600 transition-colors cursor-pointer"
          >
            {item.title}
          </h4>
        </div>
      )}

      {/* Details body */}
      <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between">
        <p className="text-[11px] sm:text-xs text-slate-550 line-clamp-2 sm:line-clamp-3 mb-3 sm:mb-5 leading-relaxed">
          {item.description}
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="font-semibold">{item.schedule}</span>
            </div>
            {tutorProfile && (
              isTutorUnavailable ? (
                <span 
                  className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center gap-1"
                  title={availabilityResult.reason}
                >
                  <AlertCircle className="w-3 h-3" /> Unavailable
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Available
                </span>
              )
            )}
          </div>

          {isTutorUnavailable && availabilityResult.reason && (
            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-700 font-medium leading-tight">
              {availabilityResult.reason}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <div>
              <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider leading-none">Tuition Cost</span>
              <span className="text-lg font-extrabold text-indigo-600 font-sans leading-none block mt-1.5">
                LKR {item.price}<span className="text-xs text-slate-400 font-normal"> / month</span>
              </span>
            </div>

            {/* Spots remaining logic */}
            <div className="text-right">
              {isFull ? (
                <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-[10px] font-bold font-mono">
                  Full
                </span>
              ) : (
                <span className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg ${spotsLeft <= 3 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'}`}>
                  {spotsLeft} Left
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic button control based on user role & enrollment status */}
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => setShowReviewsModal(true)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="View student reviews"
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="font-mono text-xs">{avgRating.toFixed(1)}</span>
            <span className="text-[10px] text-slate-400 font-semibold">({classReviews.length})</span>
          </button>

          {/* Student: Registered / Enrolled State Button (with success animation on transition) */}
          {currentUser && isStudent && (isEnrolled || isJustRegistered) && (
            <motion.button
              onClick={() => onOpenClassProfile && onOpenClassProfile(item)}
              initial={showSuccessAnimation ? { scale: 0.94 } : false}
              animate={showSuccessAnimation ? { 
                scale: [1, 1.08, 0.98, 1],
                backgroundColor: ['#0f172a', '#059669', '#059669'],
                boxShadow: [
                  "0 0 0 0 rgba(16, 185, 129, 0.7)",
                  "0 0 0 12px rgba(16, 185, 129, 0)",
                  "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                ]
              } : false}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className={`flex-1 text-center py-2.5 px-4 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-emerald-600/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                showSuccessAnimation ? 'ring-2 ring-emerald-400 ring-offset-1' : ''
              }`}
              id={`registered_btn_${item.id}`}
              title="You are registered for this class. Click to open class profile"
            >
              {showSuccessAnimation ? (
                <motion.div
                  initial={{ scale: 0, rotate: -60 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 450, damping: 18 }}
                  className="flex items-center justify-center"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
                </motion.div>
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              )}
              <motion.span
                initial={showSuccessAnimation ? { opacity: 0, x: 4 } : false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
              >
                Registered
              </motion.span>
            </motion.button>
          )}

          {/* Student: Pending Request Button */}
          {currentUser && isStudent && !isEnrolled && !isJustRegistered && isPendingRequest && (
            <button
              onClick={() => showToast(`Your enrollment request for '${item.title}' has been submitted and is currently pending review & approval by academy administrators.`, "info")}
              className="flex-1 text-center py-2.5 px-3 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 shadow-xs transition-all duration-230 cursor-pointer flex items-center justify-center gap-1.5"
              id={`pending_btn_${item.id}`}
              title="Enrollment request pending review and approval by administrators"
            >
              <Clock className="w-3.5 h-3.5 animate-pulse text-amber-600 shrink-0" />
              <span className="truncate">Requested (Pending)</span>
            </button>
          )}

          {/* Student: Unenrolled -> Enrollment Button */}
          {currentUser && isStudent && !isEnrolled && !isJustRegistered && !isPendingRequest && (
            <button
              onClick={handleEnrollClick}
              disabled={isFull || isTutorUnavailable}
              className={`flex-1 text-center py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                isFull 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : isTutorUnavailable
                    ? 'bg-rose-50 text-rose-500 border border-rose-200 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-950 text-white shadow-md hover:shadow-lg hover:shadow-slate-900/10 active:scale-[0.98]'
              }`}
              id={`enroll_btn_${item.id}`}
              title={isFull ? 'Class is full' : isTutorUnavailable ? availabilityResult.reason : `Enroll in ${item.title}`}
            >
              {isFull ? (
                'Full'
              ) : isTutorUnavailable ? (
                'Unavailable'
              ) : (
                <>
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Enroll in Class</span>
                </>
              )}
            </button>
          )}

          {/* Admin or Tutor: View Class Profile Button */}
          {currentUser && (currentUser.role === 'admin' || currentUser.role === 'tutor') && (
            <button
              onClick={() => onOpenClassProfile && onOpenClassProfile(item)}
              className="flex-1 text-center py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all duration-230 cursor-pointer flex items-center justify-center gap-1.5"
              id={`view_profile_btn_${item.id}`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Class Profile
            </button>
          )}

          {/* Guest / Not Logged In: Enroll Button */}
          {!currentUser && (
            <button
              onClick={() => {
                showToast("Please log in as a student to enroll in this class.", "info");
                if (onRedirectToLogin) onRedirectToLogin();
              }}
              className="flex-1 text-center py-2.5 px-4 rounded-xl text-xs font-extrabold bg-slate-900 hover:bg-slate-950 text-white shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              id={`login_enroll_btn_${item.id}`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Enroll Now</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal to Prevent Accidental Sign-ups */}
      {currentUser && (
        <ClassEnrollmentConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleFinalizeEnrollment}
          classItem={item}
          currentUser={currentUser}
          isProcessing={isFinalizingEnrollment}
        />
      )}

      {/* Student Class Enrollment Request Modal */}
      {showRequestModal && currentUser && (
        <div className="fixed inset-0 z-55 overflow-y-auto bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4" id="class_enrollment_request_modal">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-150 shadow-2xl relative font-sans">
            <button 
              onClick={() => setShowRequestModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-650 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getSubjectColor(item.subject)}`}>
                {item.subject}
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Class Enrollment Request</span>
            </div>

            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              Request Enrollment in {item.title}
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Your request will be sent directly to academy administrators for review and manual approval.
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-650">
                <span className="text-slate-400">Class Schedule:</span>
                <span className="font-semibold text-slate-900">{item.schedule}</span>
              </div>
              <div className="flex justify-between items-center text-slate-650">
                <span className="text-slate-400">Instructor:</span>
                <span className="font-semibold text-slate-900">{item.tutorName}</span>
              </div>
              <div className="flex justify-between items-center text-slate-650">
                <span className="text-slate-400">Monthly Tuition:</span>
                <span className="font-extrabold text-indigo-600 font-mono">LKR {item.price}.00</span>
              </div>
              <div className="flex justify-between items-center text-slate-650 pt-2 border-t border-slate-200">
                <span className="text-slate-400">Applicant:</span>
                <span className="font-bold text-slate-900">{currentUser.name} ({currentUser.email})</span>
              </div>
            </div>

            <form onSubmit={handleRequestEnrollment} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Applicant Note to Admins (Optional):
                </label>
                <textarea
                  rows={3}
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  placeholder="e.g., Requesting enrollment for academic semester 2026. Looking forward to attending classes."
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white transition-all font-sans leading-relaxed"
                ></textarea>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Once submitted, administrators will review your admission and verify scheduling. You will receive an immediate notification upon approval.</span>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="w-1/2 py-2.5 border border-slate-250 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="w-1/2 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  id="btn_submit_class_enrollment_request"
                >
                  {submittingRequest ? 'Submitting...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Mockup Modal overlay */}
      {showPayModal && (
        <div className="fixed inset-0 z-55 overflow-y-auto bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4" id="payment_gateway_modal">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-150 shadow-2xl relative font-sans">
            <button 
              onClick={() => setShowPayModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-650 p-1.5 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
              Secure Payment Gateway
            </h3>
            <p className="text-xs text-slate-500 mb-5">Select a secure checkout channel to enroll in this course:</p>

            <div className="bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-100">
              <span className="text-[9px] uppercase font-mono text-indigo-600 font-bold tracking-wider block">{item.subject} Class</span>
              <p className="text-sm font-extrabold text-slate-900 mt-1">{item.title}</p>
              <div className="flex justify-between items-center mt-3 text-xs text-slate-650 pt-2.5 border-t border-dashed border-slate-200">
                <span>Monthly Recurring fees Amount:</span>
                <span className="font-extrabold text-slate-900 font-mono">LKR {item.price}.00</span>
              </div>
            </div>

            {/* Gateway Selection Tabs */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              <button
                type="button"
                onClick={() => setGatewayType('stripe')}
                className={`py-2 px-3.5 rounded-xl border-2 text-center text-xs font-bold transition-all cursor-pointer ${gatewayType === 'stripe' ? 'border-indigo-600 bg-indigo-50/20 text-indigo-900' : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                Stripe Gateway
              </button>
              <button
                type="button"
                onClick={() => setGatewayType('paypal')}
                className={`py-2 px-3.5 rounded-xl border-2 text-center text-xs font-bold transition-all cursor-pointer ${gatewayType === 'paypal' ? 'border-indigo-600 bg-indigo-50/20 text-indigo-900' : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                PayPal Gateway
              </button>
            </div>

            {/* Stripe Card Field Form */}
            {gatewayType === 'stripe' && (
              <div className="space-y-3 mb-6 transition-all">
                <div className="flex justify-between items-center text-[10px] uppercase font-mono text-slate-400 font-extrabold">
                  <span>Enter Card Credentials</span>
                  <span className="text-indigo-600">Stripe Secure SSL</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-650 mb-1">Cardholder Name:</label>
                    <input
                      required
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="e.g. Elena Rostova"
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-650 mb-1">Credit Card Number:</label>
                    <div className="relative">
                      <input
                        required
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4242 4242 4242 4242"
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white font-mono"
                      />
                      <CreditCard className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-650 mb-1">Expiry Date:</label>
                      <input
                        required
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-650 mb-1">CVC Code:</label>
                      <input
                        required
                        type="password"
                        maxLength={4}
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        placeholder="123"
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white font-mono text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PayPal Sandbox Gateway */}
            {gatewayType === 'paypal' && (
              <div className="space-y-3 mb-6 transition-all text-xs">
                <div className="flex justify-between items-center text-[10px] uppercase font-mono text-slate-400 font-extrabold">
                  <span>PayPal Express Checkout</span>
                  <span className="text-amber-500">Sandbox Sandbox</span>
                </div>

                {!isPayPalLoggedIn ? (
                  <div className="p-4 border border-amber-100 rounded-2xl bg-amber-50/20 space-y-3">
                    <span className="text-[10px] font-extrabold block text-amber-700 leading-snug">🔒 A PayPal Login session is required to proceed:</span>
                    <div className="space-y-2">
                      <input
                        type="email"
                        value={payPalEmail}
                        onChange={(e) => setPayPalEmail(e.target.value)}
                        placeholder="PayPal Email: e.g. student@sandbox.com"
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-mono"
                      />
                      <input
                        type="password"
                        value={payPalPassword}
                        onChange={(e) => setPayPalPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!payPalEmail.trim() || !payPalPassword.trim()) {
                          showToast("Please enter email and password credentials for PayPal.", "error");
                          return;
                        }
                        setIsPayPalLoggedIn(true);
                        showToast("PayPal security session verified successfully!", "success");
                      }}
                      className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-lg tracking-wider"
                    >
                      Authenticate PayPal credentials
                    </button>
                  </div>
                ) : (
                  <div className="p-4 border border-emerald-100 bg-emerald-55/10 rounded-2xl text-center space-y-1">
                    <p className="text-emerald-700 text-[10px] font-bold">✓ PayPal Account Authorized</p>
                    <p className="text-slate-500 text-[10px] font-mono font-semibold">{payPalEmail}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPayPalLoggedIn(false);
                      }}
                      className="text-[9px] text-red-500 font-bold hover:underline"
                    >
                      Disconnect account
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowPayModal(false)}
                className="w-1/2 py-2.5 border border-slate-250 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={executeEnrollment}
                disabled={loading}
                className="w-1/2 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loading ? 'Processing...' : `Pay LKR ${item.price}.00 Now`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Reviews Modal */}
      <ReviewsModal
        isOpen={showReviewsModal}
        onClose={() => setShowReviewsModal(false)}
        title={`Student Reviews for ${item.title}`}
        targetName={item.title}
        reviews={classReviews}
      />
    </motion.div>
  );
};
