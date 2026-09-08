import React, { useState } from 'react';
import { X, ShieldCheck, AlertCircle, Calendar, CreditCard, Users, CheckCircle2, Loader2, User, Clock, Send } from 'lucide-react';
import { ClassItem, UserProfile } from '../types';
import { ModalWrapper } from './ModalWrapper';

interface ClassEnrollmentConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (note?: string) => Promise<void> | void;
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
  const [requestNote, setRequestNote] = useState<string>('');
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(requestNote.trim() || undefined);
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={() => {
        if (!isProcessing) onClose();
      }}
      maxWidth="lg"
      id="class_enrollment_confirm_modal"
      ariaLabel="Request Class Enrollment"
      closeOnBackdropClick={!isProcessing}
      closeOnEsc={!isProcessing}
      dialogClassName="p-5 sm:p-7 overflow-y-auto overscroll-contain relative font-sans"
    >
      {/* Top Close Button */}
      <button
        type="button"
        onClick={onClose}
        disabled={isProcessing}
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Close dialog"
        id="btn_close_enroll_confirm"
      >
        <X className="w-5 h-5" />
      </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Clock className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-indigo-600 block leading-none">
                Official Intake Policy
              </span>
              <h2 id="confirm_enrollment_title" className="text-lg font-extrabold text-slate-900 mt-1 leading-snug">
                Request Class Enrollment
              </h2>
            </div>
          </div>

          {/* Reassurance Notice Banner regarding manual admin approval */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2.5 mb-5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-bold">Administrative Approval Required:</strong> Self-enrollment is disabled. Confirming below will submit your official enrollment request to academy administrators for verification and approval.
            </div>
          </div>

          {/* Class Summary Card */}
          <div className="bg-slate-50/80 p-4.5 rounded-2xl border border-slate-200/70 space-y-3 mb-4 text-xs">
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
              <span className="text-slate-500">Requesting Student:</span>
              <span className="font-bold text-slate-800">
                {currentUser.name} <span className="text-slate-400 font-normal">(@{currentUser.username || currentUser.email})</span>
              </span>
            </div>
          </div>

          {/* Optional Student Note / Message */}
          <div className="mb-5">
            <label htmlFor="request_note_input" className="block text-xs font-bold text-slate-700 mb-1.5">
              Message to Academy Administration <span className="text-slate-400 font-normal">(optional)</span>:
            </label>
            <input
              id="request_note_input"
              type="text"
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              placeholder="e.g. Requesting admission for physical batch..."
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
              maxLength={150}
            />
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
              onClick={handleFormSubmit}
              disabled={isProcessing || spotsLeft <= 0}
              className="sm:w-2/3 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              id="btn_confirm_enroll_finalize"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-indigo-100" />
                  <span>Submit Enrollment Request</span>
                </>
              )}
            </button>
          </div>
    </ModalWrapper>
  );
};
