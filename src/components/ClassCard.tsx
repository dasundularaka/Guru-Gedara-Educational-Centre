import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../lib/firestoreService';
import { ClassItem } from '../types';
import { BookOpen, User, Calendar, CreditCard, Sparkles, ShieldCheck, X } from 'lucide-react';
import { motion } from 'motion/react';

interface ClassCardProps {
  item: ClassItem;
  onBookSuccess?: () => void;
  onRedirectToLogin?: () => void;
}

export const ClassCard: React.FC<ClassCardProps> = ({ item, onBookSuccess, onRedirectToLogin }) => {
  const { currentUser, showToast, refreshClasses } = useApp();
  const [loading, setLoading] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Stripe Gateway (Visa ending in 4242)");

  // Secure payment gateway state variables
  const [gatewayType, setGatewayType] = useState<'stripe' | 'paypal'>('stripe');
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  const [payPalEmail, setPayPalEmail] = useState("");
  const [payPalPassword, setPayPalPassword] = useState("");
  const [isPayPalLoggedIn, setIsPayPalLoggedIn] = useState(false);
  const [showPayPalLoginForm, setShowPayPalLoginForm] = useState(false);

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
      // 1. Save payment record
      await firestoreService.createPayment(
        currentUser.uid, 
        currentUser.name, 
        item.id, 
        item.title, 
        item.price, 
        transactionDesc,
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
    <motion.div
      whileHover={{ y: -5, scale: 1.015, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="sleek-card overflow-hidden flex flex-col h-full bg-white group transition-all duration-300"
      id={`class_card_${item.id}`}
    >
      {item.imageUrl ? (
        <div className="h-40 w-full relative overflow-hidden bg-slate-900">
          <img 
            referrerPolicy="no-referrer"
            src={item.imageUrl} 
            alt={item.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ease-out"
          />
          <span className={`absolute top-3 left-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shadow-sm backdrop-blur-md bg-white/90 ${getSubjectColor(item.subject)}`}>
            {item.subject}
          </span>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-3.5">
            <div className="flex items-center gap-2">
              {item.tutorPhoto ? (
                <img 
                  referrerPolicy="no-referrer"
                  className="h-5 w-5 rounded-full object-cover border border-white/40" 
                  src={item.tutorPhoto} 
                  alt={item.tutorName} 
                />
              ) : (
                <div className="h-5 w-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[9px] font-bold">
                  <User className="w-2.5 h-2.5" />
                </div>
              )}
              <span className="text-[11px] text-white/90 font-medium whitespace-nowrap">by {item.tutorName}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Decorative Subject Cover Fallback */
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
      )}

      {/* Conditionally render Title outside the cover if we have a layout with imageUrl */}
      {item.imageUrl && (
        <div className="px-6 pt-5 pb-1">
          <h4 className="text-sm font-extrabold text-slate-900 leading-snug tracking-tight hover:text-indigo-600 transition-colors cursor-pointer">
            {item.title}
          </h4>
        </div>
      )}

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
                <span className="font-extrabold text-slate-900 font-mono">${item.price}.00</span>
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
                {loading ? 'Processing...' : `Pay $${item.price}.00 Now`}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
