import React from 'react';
import { X, ShieldCheck, AlertCircle, Calendar, CreditCard, Users, CheckCircle2, Loader2, User, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ClassItem, UserProfile } from '../types';

interface ClassEnrollmentConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  classItem: ClassItem;
  currentUser: UserProfile;
  isProcessing?: boolean;
}

export const ClassEnrollmentConfirmModal: React.FC<ClassEnrollmentConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  classItem,
  currentUser,
  isProcessing = false
}) => {
  if (!isOpen) return null;

  const spotsLeft = classItem.maxSlots - classItem.bookedSlots;

  const getSubjectBadgeStyle = (subject: string) => {
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
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans"
        id="class_enrollment_confirm_modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm_enrollment_title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-200/80 shadow-2xl relative"
        >
          {/* Top Close Button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="Close dialog"
            id="btn_close_enroll_confirm"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-indigo-600 block leading-none">
                Enrollment Verification
              </span>
              <h2 id="confirm_enrollment_title" className="text-lg font-extrabold text-slate-900 mt-1 leading-snug">
                Confirm Class Enrollment
              </h2>
            </div>
          </div>

          {/* Reassurance Notice Banner to prevent accidental sign-ups */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2.5 mb-5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-bold">Review your enrollment details:</strong> Confirming below will finalize your official registration and reserve your seat in this class.
            </div>
          </div>

          {/* Class Summary Card */}
          <div className="bg-slate-50/80 p-4.5 rounded-2xl border border-slate-200/70 space-y-3 mb-5 text-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getSubjectBadgeStyle(classItem.subject)}`}>
                {classItem.subject}
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-500">
                {classItem.level || 'Standard Academic Level'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Course Title</span>
              <h3 className="text-sm font-extrabold text-slate-900 mt-0.5">
                {classItem.title}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 block leading-none">Instructor</span>
                  <span className="font-semibold text-slate-800 text-[11px] truncate block">{classItem.tutorName}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-500 shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block leading-none">Schedule</span>
                  <span className="font-semibold text-slate-800 text-[11px]">{classItem.schedule}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-emerald-500 shrink-0">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block leading-none">Monthly Fee</span>
                  <span className="font-extrabold text-indigo-600 text-[11px] font-mono">LKR {classItem.price}.00</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-amber-500 shrink-0">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block leading-none">Capacity</span>
                  <span className="font-bold text-slate-700 text-[11px] font-mono">
                    {spotsLeft > 0 ? `${spotsLeft} spots available` : 'Roster Full'}
                  </span>
                </div>
              </div>
            </div>

            {/* Enrolling Student Account Details */}
            <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Enrolling Student:</span>
              <span className="font-bold text-slate-800">
                {currentUser.name} <span className="text-slate-400 font-normal">({currentUser.email})</span>
              </span>
            </div>
          </div>

          {/* Action Footer Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="sm:w-1/3 py-2.5 px-4 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              id="btn_cancel_enroll_confirm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isProcessing || spotsLeft <= 0}
              className="sm:w-2/3 py-2.5 px-4 bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              id="btn_confirm_enroll_finalize"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Finalizing Enrollment...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Confirm & Finalize Enrollment</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
