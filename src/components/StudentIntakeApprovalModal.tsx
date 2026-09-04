import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile, ClassItem, AdmissionFeeConfig, AdmissionFeeHistoryItem } from '../types';
import { firestoreService, INITIAL_ADMISSION_FEE_CONFIG } from '../lib/firestoreService';
import { useApp } from '../context/AppContext';
import { 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle, 
  DollarSign, 
  BookOpen, 
  User, 
  Phone, 
  MapPin, 
  CreditCard, 
  Receipt, 
  Sparkles, 
  Search, 
  CheckSquare, 
  Square,
  Lock,
  Layers,
  GraduationCap,
  History,
  Settings2,
  RefreshCw,
  Banknote,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  TrendingUp,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StudentIntakeApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: UserProfile | null;
  classes: ClassItem[];
  onApproveSuccess: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const StudentIntakeApprovalModal: React.FC<StudentIntakeApprovalModalProps> = ({
  isOpen,
  onClose,
  student,
  classes,
  onApproveSuccess,
  showToast
}) => {
  const { currentUser } = useApp();

  // Admission Fee Global Config & Audit History
  const [feeConfig, setFeeConfig] = useState<AdmissionFeeConfig>(INITIAL_ADMISSION_FEE_CONFIG);
  const [showFeeHistory, setShowFeeHistory] = useState(false);
  const [showEditFeeModal, setShowEditFeeModal] = useState(false);
  const [newFeeValue, setNewFeeValue] = useState<number>(2500);
  const [feeChangeReason, setFeeChangeReason] = useState<string>('');
  const [isUpdatingGlobalFee, setIsUpdatingGlobalFee] = useState(false);

  // Admission Payment States
  const [admissionFeeConfirmed, setAdmissionFeeConfirmed] = useState(false);
  const [admissionFeeAmount, setAdmissionFeeAmount] = useState<number>(2500);
  const [admissionPaymentMethod, setAdmissionPaymentMethod] = useState<string>('Cash at Academy Counter');
  const [admissionReceiptRef, setAdmissionReceiptRef] = useState<string>(`ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);

  // Class Selection & Tuition States
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [tuitionFeeConfirmed, setTuitionFeeConfirmed] = useState(false);
  const [classSearch, setClassSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch / Subscribe admission fee config
  useEffect(() => {
    let unsubscribe = () => {};
    if (isOpen) {
      firestoreService.getAdmissionFeeConfig().then(cfg => {
        setFeeConfig(cfg);
        setAdmissionFeeAmount(cfg.currentFee || 2500);
        setNewFeeValue(cfg.currentFee || 2500);
      }).catch(err => {
        console.warn("Could not fetch admission fee config:", err);
      });
      unsubscribe = firestoreService.subscribeAdmissionFeeConfig((cfg) => {
        setFeeConfig(cfg);
      });
    }
    return () => unsubscribe();
  }, [isOpen]);

  // Handle Global Fee Adjustment
  const handleUpdateGlobalFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (newFeeValue < 0 || isNaN(newFeeValue)) {
      showToast("Please provide a valid non-negative fee amount.", "error");
      return;
    }

    setIsUpdatingGlobalFee(true);
    try {
      const updated = await firestoreService.updateAdmissionFeeConfig(
        newFeeValue,
        {
          name: currentUser.name || 'Administrator',
          username: currentUser.username || 'GA00000000',
          uid: currentUser.uid
        },
        feeChangeReason.trim() || 'General intake revision'
      );
      setFeeConfig(updated);
      setAdmissionFeeAmount(newFeeValue);
      setShowEditFeeModal(false);
      setFeeChangeReason('');
      showToast(`Global admission fee updated to LKR ${newFeeValue.toLocaleString()} with audit record logged.`, "success");
    } catch (err: any) {
      showToast(err.message || "Failed to update global admission fee.", "error");
    } finally {
      setIsUpdatingGlobalFee(false);
    }
  };

  // Student's requested preferred subjects
  const preferredSubjects = useMemo(() => {
    if (!student) return [];
    if (student.preferredSubjects && student.preferredSubjects.length > 0) {
      return student.preferredSubjects;
    }
    if (student.studentDetails?.interests && student.studentDetails.interests.length > 0) {
      return student.studentDetails.interests;
    }
    if (student.selectedClasses && student.selectedClasses.length > 0) {
      return student.selectedClasses;
    }
    return [];
  }, [student]);

  // Selected classes objects & total tuition calculation
  const selectedClassesList = useMemo(() => {
    return classes.filter(c => selectedClassIds.includes(c.id));
  }, [classes, selectedClassIds]);

  const totalTuitionAmount = useMemo(() => {
    return selectedClassesList.reduce((sum, c) => sum + (c.price || 2500), 0);
  }, [selectedClassesList]);

  const totalPayableNow = admissionFeeAmount + (selectedClassesList.length > 0 ? totalTuitionAmount : 0);

  // Filtered available classes
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      const q = classSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        (c.tutorName || '').toLowerCase().includes(q)
      );
    });
  }, [classes, classSearch]);

  const handleToggleClass = (classId: string) => {
    if (selectedClassIds.includes(classId)) {
      setSelectedClassIds(prev => prev.filter(id => id !== classId));
    } else {
      setSelectedClassIds(prev => [...prev, classId]);
    }
  };

  const handleApprove = async () => {
    if (!student) return;

    // 1. Mandatory Admission Fee Validation
    if (!admissionFeeConfirmed) {
      showToast("Cannot approve submission: Admission fee payment confirmation is mandatory.", "error");
      return;
    }

    // 2. Mandatory Tuition Fee Validation if enrolling to classes
    if (selectedClassIds.length > 0 && !tuitionFeeConfirmed) {
      showToast("Cannot enroll student without confirming tuition fee collection for the selected classes.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      // 3. Generate unique username
      const allUsers = await firestoreService.getAllUsers();
      const g = student.gender || 'male';
      const prefix = g === 'male' ? 'GB' : 'GG';
      let uniqueUsername = "";
      let attempts = 0;
      while (attempts < 100) {
        const num = Math.floor(10000000 + Math.random() * 90000000).toString();
        const candidate = prefix + num;
        if (!allUsers.some(u => u.username === candidate)) {
          uniqueUsername = candidate;
          break;
        }
        attempts++;
      }
      if (!uniqueUsername) {
        uniqueUsername = prefix + Math.floor(10000000 + Math.random() * 90000000).toString();
      }

      // 4. Record Admission Fee in Payments Ledger
      await firestoreService.createPayment(
        student.uid,
        student.name,
        'admission_fee',
        'Academy Registration & Admission Fee',
        admissionFeeAmount,
        admissionPaymentMethod,
        'paid',
        {
          paymentType: 'admission',
          studentEmail: student.email,
          transactionId: admissionReceiptRef,
          currency: 'LKR'
        }
      );

      // 5. Enroll in selected classes and record Class Tuition Fee payments
      for (const cls of selectedClassesList) {
        try {
          await firestoreService.createBooking(student.uid, student.name, cls);
        } catch (bookingErr) {
          console.warn(`Booking record creation warning for ${cls.id}:`, bookingErr);
        }

        try {
          await firestoreService.createPayment(
            student.uid,
            student.name,
            cls.id,
            cls.title,
            cls.price || 2500,
            admissionPaymentMethod,
            'paid',
            {
              paymentType: 'monthly',
              studentEmail: student.email,
              transactionId: `TUI-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
              currency: 'LKR'
            }
          );
        } catch (payErr) {
          console.warn(`Tuition payment log warning for ${cls.id}:`, payErr);
        }
      }

      // 6. Update student profile status to approved
      await firestoreService.updateTutorProfile(student.uid, {
        status: 'approved',
        username: uniqueUsername,
        selectedClasses: selectedClassIds
      });

      // 7. Send notification to student
      await firestoreService.triggerNotification(
        student.uid,
        "🎉 Official Admission Approved!",
        `Congratulations! Your Guru Gedara student profile has been approved and activated. Your official Student ID is ${uniqueUsername}. You are enrolled in ${selectedClassesList.length} classes.`,
        "announcement"
      );

      showToast(`Student successfully approved and enrolled! Allocated ID: ${uniqueUsername}`, "success");
      onApproveSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to approve student intake:", err);
      showToast(err.message || "Failed to complete student admission approval.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !student) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white leading-tight">
                  Student Admission & Intake Review
                </h3>
                <p className="text-xs text-slate-400 font-sans">
                  Confirm Admission Fee & Assign Classes for {student.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200">
            {/* 1. Student Summary Banner */}
            <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-750 shadow-xs flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3.5">
                <img
                  src={student.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(student.name)}`}
                  alt={student.name}
                  className="w-13 h-13 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-xs shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">{student.name}</h4>
                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold rounded-full border border-amber-200 dark:border-amber-800 font-mono">
                      Pending Approval
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{student.email} • {student.phone || 'No Phone'}</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                    Grade: <strong className="text-indigo-600 dark:text-indigo-400">{student.studentDetails?.grade || (student as any).grade || 'Grade 11'}</strong> • Gender: <strong className="capitalize">{student.gender || 'male'}</strong>
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 w-full sm:w-auto">
                <div>Guardian: <strong className="text-slate-800 dark:text-slate-200">{student.guardianName || 'N/A'}</strong></div>
                <div className="mt-0.5 font-mono">{student.guardianPhone || 'N/A'}</div>
              </div>
            </div>

            {/* 2. Preferred Subjects Requested */}
            <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-750 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Preferred Subjects Requested by Student
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {preferredSubjects.length} Subject(s)
                </span>
              </div>
              {preferredSubjects.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {preferredSubjects.map((sub, i) => (
                    <span 
                      key={i}
                      className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl border border-indigo-200/80 dark:border-indigo-800 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> {sub}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No specific subjects noted during intake registration.</p>
              )}
            </div>

            {/* 3. Modernized Admission Fee Confirmation & System Rate Management */}
            <div className={`p-5 rounded-3xl border transition-all shadow-xs ${
              admissionFeeConfirmed 
                ? 'bg-gradient-to-br from-emerald-500/10 via-white to-emerald-500/5 dark:from-emerald-950/30 dark:via-slate-900 dark:to-emerald-950/10 border-emerald-300 dark:border-emerald-700/60 ring-2 ring-emerald-500/20' 
                : 'bg-white dark:bg-slate-850 border-slate-200/90 dark:border-slate-750'
            }`}>
              
              {/* Header Bar with Global Fee Config Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-slate-150 dark:border-slate-750">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    admissionFeeConfirmed 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'bg-indigo-150 text-indigo-750 dark:bg-indigo-950 dark:text-indigo-350'
                  }`}>
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      1. Admission Fee Verification
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      System Rate: <strong className="text-indigo-600 dark:text-indigo-400">LKR {feeConfig.currentFee.toLocaleString()}</strong> (Updated by {feeConfig.lastUpdatedBy || 'Admin'})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setShowEditFeeModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-indigo-200/70 dark:border-indigo-800"
                    title="Change academy-wide standard admission fee"
                  >
                    <Settings2 className="w-3 h-3" /> Change Standard Fee
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFeeHistory(!showFeeHistory)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                    title="View admission fee update history and audit trail"
                  >
                    <History className="w-3 h-3 text-amber-500" />
                    <span>Audit History ({feeConfig.history?.length || 0})</span>
                    {showFeeHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Fee History Drawer (Collapsible) */}
              {showFeeHistory && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-[11px] text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" /> Admission Fee Change Audit Trail
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Real-time System Logs</span>
                  </div>

                  {(!feeConfig.history || feeConfig.history.length === 0) ? (
                    <p className="text-[10px] text-slate-400 italic py-2 text-center">No fee changes logged yet. Current default is LKR {feeConfig.currentFee.toLocaleString()}.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {feeConfig.history.map((h, idx) => (
                        <div key={h.id || idx} className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-150 dark:border-slate-750 flex items-center justify-between gap-2 text-[10px]">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                              <span>LKR {h.previousFee?.toLocaleString() || 2500}</span>
                              <ArrowRight className="w-3 h-3 text-indigo-500" />
                              <span className="text-emerald-600 font-extrabold">LKR {h.newFee?.toLocaleString()}</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                              By <strong className="text-slate-700 dark:text-slate-300">{h.adminName}</strong> ({h.adminUsername || 'Admin'})
                            </p>
                            {h.reason && <p className="text-slate-600 dark:text-slate-300 italic mt-0.5">"{h.reason}"</p>}
                          </div>
                          <span className="text-slate-400 font-mono text-[9px] shrink-0">
                            {new Date(h.changedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Payment Details Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3.5 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Admission Fee (LKR)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={admissionFeeAmount}
                      onChange={(e) => setAdmissionFeeAmount(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setAdmissionFeeAmount(feeConfig.currentFee || 2500)}
                      className="absolute right-2 top-2 text-[9px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded cursor-pointer"
                      title="Reset to current official academy rate"
                    >
                      Default
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={admissionPaymentMethod}
                    onChange={(e) => setAdmissionPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Cash at Academy Counter">Cash at Academy Counter</option>
                    <option value="Bank Transfer Slip">Bank Transfer Slip</option>
                    <option value="Online Gateway (Card)">Online Gateway (Card)</option>
                    <option value="Direct Cheque">Direct Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Receipt / Transaction Ref
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={admissionReceiptRef}
                      onChange={(e) => setAdmissionReceiptRef(e.target.value)}
                      className="w-full px-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setAdmissionReceiptRef(`ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`)}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      title="Generate new receipt reference"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Modern Payment Verification Checkbox */}
              <div 
                onClick={() => setAdmissionFeeConfirmed(!admissionFeeConfirmed)}
                className={`mt-4 p-3.5 rounded-2xl border flex items-center gap-3.5 cursor-pointer select-none transition-all ${
                  admissionFeeConfirmed 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20' 
                    : 'bg-slate-50 dark:bg-slate-900/90 border-slate-200 dark:border-slate-750 hover:border-indigo-400 text-slate-800 dark:text-slate-200'
                }`}
                id="checkbox_confirm_admission_fee"
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  admissionFeeConfirmed 
                    ? 'bg-white text-emerald-600' 
                    : 'border-2 border-slate-400 dark:border-slate-600 text-transparent'
                }`}>
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <div className="text-xs flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs">
                      Verify & Confirm Admission Fee Collection (LKR {admissionFeeAmount.toLocaleString()})
                    </span>
                    <span className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                      admissionFeeConfirmed ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {admissionFeeConfirmed ? 'Verified & Paid' : 'Pending Verification'}
                    </span>
                  </div>
                  <p className={`text-[10.5px] mt-0.5 leading-tight ${admissionFeeConfirmed ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    Payment Method: <strong className={admissionFeeConfirmed ? 'text-white' : 'text-slate-700 dark:text-slate-300'}>{admissionPaymentMethod}</strong> • Ref: <span className="font-mono">{admissionReceiptRef}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Class Allocation & Tuition Fee Payment Confirmation */}
            <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-750 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    2. Allocate Tuition Classes & Confirm Class Fees
                  </h4>
                </div>
                {selectedClassIds.length > 0 && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {selectedClassIds.length} Class(es) Allocated • LKR {totalTuitionAmount.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Class Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                  placeholder="Filter classes by title, subject or tutor..."
                  className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500"
                />
              </div>

              {/* Class Options List */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {filteredClasses.length > 0 ? (
                  filteredClasses.map((cls) => {
                    const isSelected = selectedClassIds.includes(cls.id);
                    const isPreferred = preferredSubjects.some(s => 
                      cls.subject.toLowerCase().includes(s.toLowerCase()) || 
                      s.toLowerCase().includes(cls.subject.toLowerCase())
                    );

                    return (
                      <div
                        key={cls.id}
                        onClick={() => handleToggleClass(cls.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                          isSelected
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-2xs'
                            : 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {cls.title}
                              </span>
                              {isPreferred && (
                                <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[8.5px] font-bold rounded">
                                  Preferred Match
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              {cls.subject} • {cls.dayOfWeek || cls.schedule} {cls.timeSlot ? `(${cls.timeSlot})` : ''} • Tutor: {cls.tutorName || 'Faculty'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 font-mono font-bold text-xs text-slate-800 dark:text-slate-200 pl-2">
                          LKR {(cls.price || 2500).toLocaleString()}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 py-3 text-center">No matching classes found.</p>
                )}
              </div>

              {/* Tuition Payment Confirmation Checkbox (Required if classes selected) */}
              {selectedClassIds.length > 0 && (
                <div 
                  onClick={() => setTuitionFeeConfirmed(!tuitionFeeConfirmed)}
                  className={`mt-2 p-3 rounded-xl border flex items-center gap-3 cursor-pointer select-none transition-all ${
                    tuitionFeeConfirmed 
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                      : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-slate-800 dark:text-slate-200'
                  }`}
                  id="checkbox_confirm_tuition_fee"
                >
                  {tuitionFeeConfirmed ? (
                    <CheckSquare className="w-5 h-5 text-white shrink-0" />
                  ) : (
                    <Square className="w-5 h-5 text-amber-500 shrink-0" />
                  )}
                  <div className="text-xs">
                    <span className="font-black">
                      Confirm Tuition Fee Collection (LKR {totalTuitionAmount.toLocaleString()}) for {selectedClassIds.length} selected class(es).
                    </span>
                    <p className={`text-[10px] mt-0.5 ${tuitionFeeConfirmed ? 'text-emerald-100' : 'text-amber-700 dark:text-amber-400'}`}>
                      Students cannot be enrolled in classes without confirmed payment collected.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Total Financial Summary Banner */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Total Financial Settlement</span>
                <span className="text-xs text-slate-300 font-medium">
                  Admission (LKR {admissionFeeAmount.toLocaleString()}) + Tuition (LKR {totalTuitionAmount.toLocaleString()})
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-mono font-black text-amber-400">
                  LKR {totalPayableNow.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-h-[44px]"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSubmitting || !admissionFeeConfirmed || (selectedClassIds.length > 0 && !tuitionFeeConfirmed)}
              onClick={handleApprove}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-200 dark:shadow-none min-h-[44px]"
              id="confirm_admission_and_generate_id_btn"
            >
              {isSubmitting ? (
                <span>Allocating ID & Enrolling...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Confirm Admission & Allocate Student ID</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Modal: Adjust Global Academy Admission Fee */}
        {showEditFeeModal && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Adjust Global Admission Fee</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditFeeModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateGlobalFee} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Current Standard Fee (LKR)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`LKR ${feeConfig.currentFee.toLocaleString()}`}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-xs font-bold text-slate-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    New Standard Fee (LKR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={newFeeValue}
                    onChange={(e) => setNewFeeValue(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs font-black text-indigo-650 outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reason / Remarks for Change *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={feeChangeReason}
                    onChange={(e) => setFeeChangeReason(e.target.value)}
                    placeholder="e.g. 2026 Academic intake rate adjustment approved by administration"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/80 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <History className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    This change will be permanently logged in the audit history with your admin name (<strong>{currentUser?.name}</strong>), username (<strong>{currentUser?.username || 'GA00000000'}</strong>), and timestamp.
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditFeeModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingGlobalFee}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-all shadow-sm"
                  >
                    {isUpdatingGlobalFee ? "Updating..." : "Save & Log Change"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};

