import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  CheckCircle2, 
  Hourglass, 
  AlertTriangle, 
  Download, 
  FileText, 
  X, 
  Loader2, 
  Calendar, 
  DollarSign, 
  ArrowUpRight, 
  ShieldCheck, 
  Layers,
  Printer,
  Clock,
  Bell,
  BellRing,
  BellOff
} from 'lucide-react';
import { Payment } from '../types';
import { firestoreService } from '../lib/firestoreService';
import { GoogleCalendarPaymentReminders } from './GoogleCalendarPaymentReminders';

export const StudentPaymentHistory: React.FC = () => {
  const { payments, bookings = [], classes = [], currentUser, refreshPayments, showToast, refreshNotifications } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');
  
  // Modals state
  const [selectedInvoice, setSelectedInvoice] = useState<Payment | null>(null);
  const [payInvoice, setPayInvoice] = useState<Payment | null>(null);
  
  // Secure Gateway Sim State
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [processingPay, setProcessingPay] = useState(false);

  // Persistent state for automated payment deadline reminders
  const [notifiedPaymentIds, setNotifiedPaymentIds] = useState<string[]>(() => {
    if (!currentUser?.uid) return [];
    try {
      const saved = localStorage.getItem(`notified_payment_ids_${currentUser.uid}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const toggleDeadlineNotification = async (payment: Payment, diffDays: number) => {
    if (!currentUser) return;
    const paymentId = payment.id;
    const isCurrentlyNotified = notifiedPaymentIds.includes(paymentId);
    const updated = isCurrentlyNotified
      ? notifiedPaymentIds.filter(id => id !== paymentId)
      : [...notifiedPaymentIds, paymentId];

    setNotifiedPaymentIds(updated);
    try {
      localStorage.setItem(`notified_payment_ids_${currentUser.uid}`, JSON.stringify(updated));
    } catch (e) {
      console.error("LocalStorage save error:", e);
    }

    if (!isCurrentlyNotified) {
      // Request permission if browser supports it
      if ('Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          await Notification.requestPermission().catch(() => {});
        }
      }

      if (diffDays <= 3 && diffDays >= 0) {
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification("Guru Gedara: Payment Deadline Alert", {
              body: `Upcoming Fee Alert: Tuition payment for "${payment.classTitle}" (LKR ${payment.amount.toLocaleString()}) is due in ${diffDays} day(s).`,
              icon: '/favicon.ico'
            });
          } catch (e) {
            console.warn("Local browser notification couldn't be spawned:", e);
          }
        }
        showToast(`⚡ Alert set! Deadline for "${payment.classTitle}" is in ${diffDays} day(s). Notification triggered!`, "success");
      } else {
        showToast(`🔔 Automated 'Notify Me' enabled! You'll get a local browser notification 3 days prior to the deadline for "${payment.classTitle}".`, "success");
      }
    } else {
      showToast(`🔕 Automated reminder disabled for "${payment.classTitle}".`, "info");
    }
  };

  if (!currentUser) return null;

  // Flexible student matcher across UID, Username, Email, and Full Name
  const isStudentMatch = (studentId?: string, studentEmail?: string, studentName?: string) => {
    if (!currentUser) return false;
    if (studentId && (studentId === currentUser.uid || studentId === currentUser.username || studentId === (currentUser as any).id)) return true;
    if (studentEmail && currentUser.email && studentEmail.toLowerCase() === currentUser.email.toLowerCase()) return true;
    if (studentName && currentUser.name && studentName.toLowerCase() === currentUser.name.toLowerCase()) return true;
    return false;
  };

  // Find all active student bookings
  const userBookings = (bookings || []).filter(b => 
    isStudentMatch(b.studentId, (b as any).studentEmail, b.studentName) && b.status !== 'cancelled'
  );

  // 1. Direct matching payments from database
  const matchedRealPayments = (payments || []).filter(p => 
    isStudentMatch(p.studentId, (p as any).studentEmail, p.studentName) ||
    userBookings.some(b => b.classId === p.classId)
  );

  // 2. Synthesize payments for enrolled bookings or selectedClasses if no explicit payment record exists yet
  const matchedPaymentClassIds = new Set(matchedRealPayments.map(p => p.classId));
  const synthesizedPayments: Payment[] = [];

  userBookings.forEach(b => {
    if (!matchedPaymentClassIds.has(b.classId)) {
      const cls = (classes || []).find(c => c.id === b.classId);
      const classTitle = b.classTitle || cls?.title || 'Enrolled Tuition Course';
      const amount = cls?.price || 1500;
      const status = (b as any).paymentStatus || ((b.status as string) === 'pending_approval' ? 'pending' : 'paid');
      synthesizedPayments.push({
        id: `pay_b_${b.id}`,
        studentId: currentUser.uid,
        studentName: currentUser.name || currentUser.username || 'Scholar Student',
        classId: b.classId,
        classTitle,
        amount,
        paymentMethod: 'Online Tuition Portal',
        status,
        date: b.bookingDate || new Date().toISOString(),
        dueDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
      matchedPaymentClassIds.add(b.classId);
    }
  });

  (currentUser.selectedClasses || []).forEach(cId => {
    if (!matchedPaymentClassIds.has(cId)) {
      const cls = (classes || []).find(c => c.id === cId);
      if (cls) {
        synthesizedPayments.push({
          id: `pay_sel_${currentUser.uid}_${cls.id}`,
          studentId: currentUser.uid,
          studentName: currentUser.name || currentUser.username || 'Scholar Student',
          classId: cls.id,
          classTitle: cls.title,
          amount: cls.price || 1500,
          paymentMethod: 'Online Tuition Portal',
          status: 'pending',
          date: new Date().toISOString(),
          dueDate: new Date(Date.now() + 86400000 * 7).toISOString()
        });
        matchedPaymentClassIds.add(cId);
      }
    }
  });

  let studentPayments = [...matchedRealPayments, ...synthesizedPayments];

  // If student has no payments and no bookings, provide default tuition invoices for catalog classes
  if (studentPayments.length === 0) {
    const defaultClasses = (classes || []).slice(0, 2);
    if (defaultClasses.length > 0) {
      studentPayments = defaultClasses.map((cls, idx) => ({
        id: `pay_demo_${currentUser.uid}_${idx + 1}`,
        studentId: currentUser.uid,
        studentName: currentUser.name || currentUser.username || 'Scholar Student',
        classId: cls.id,
        classTitle: cls.title,
        amount: cls.price || 1500,
        paymentMethod: idx === 0 ? 'Visa Credit Card' : 'Online Gateway Pending',
        status: idx === 0 ? 'paid' : 'pending',
        date: new Date(Date.now() - idx * 86400000 * 3).toISOString(),
        dueDate: new Date(Date.now() + 86400000 * 7).toISOString()
      }));
    } else {
      studentPayments = [
        {
          id: `pay_demo_1`,
          studentId: currentUser.uid,
          studentName: currentUser.name || currentUser.username || 'Scholar Student',
          classId: 'class_calc_abc',
          classTitle: 'Advanced Applied Mathematics & Physics',
          amount: 2500,
          paymentMethod: 'Visa Credit Card',
          status: 'paid',
          date: new Date(Date.now() - 86400000 * 2).toISOString(),
          dueDate: new Date(Date.now() + 86400000 * 5).toISOString()
        },
        {
          id: `pay_demo_2`,
          studentId: currentUser.uid,
          studentName: currentUser.name || currentUser.username || 'Scholar Student',
          classId: 'class_physics_mechanics',
          classTitle: 'Classical Mechanics & Quantum Fundamentals',
          amount: 1800,
          paymentMethod: 'Online Gateway Pending',
          status: 'pending',
          date: new Date().toISOString(),
          dueDate: new Date(Date.now() + 86400000 * 7).toISOString()
        }
      ];
    }
  }

  const filteredPayments = studentPayments.filter(p => {
    const matchesSearch = p.classTitle.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Financial Summary Cards data
  const totalInvoiced = studentPayments.reduce((acc, p) => acc + p.amount, 0);
  const totalPaid = studentPayments.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0);
  const totalPending = studentPayments.filter(p => p.status === 'pending').reduce((acc, p) => acc + p.amount, 0);
  const totalFailed = studentPayments.filter(p => p.status === 'failed').reduce((acc, p) => acc + p.amount, 0);

  // Trigger Simulated Payment
  const handleSimulatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payInvoice) return;
    
    if (cardNumber.replace(/\s/g, '').length !== 16) {
      showToast("Please enter a valid 16-digit card number.", "info");
      return;
    }
    if (!expiry.match(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/)) {
      showToast("Please enter a valid expiry date (MM/YY).", "info");
      return;
    }
    if (cvv.length !== 3) {
      showToast("Please enter a valid 3-digit CVV code.", "info");
      return;
    }

    setProcessingPay(true);
    try {
      // Simulate gateway authorization latency
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update Payment state to Firestore/Local database
      await firestoreService.updatePaymentStatus(payInvoice.id, 'paid', payInvoice);
      
      // Trigger user alert/notification
      await firestoreService.triggerNotification(
        currentUser.uid,
        "Tuition Invoice Settled Successfully",
        `LKR ${payInvoice.amount.toLocaleString()} was processed successfully for '${payInvoice.classTitle}' via visa ending in ${cardNumber.slice(-4)}.`,
        'payment'
      );

      showToast(`Success! LKR ${payInvoice.amount.toLocaleString()} paid.`, "success");
      
      // Refresh global feeds
      await Promise.all([
        refreshPayments(),
        refreshNotifications()
      ]);

      setPayInvoice(null);
      setCardNumber('');
      setExpiry('');
      setCvv('');
    } catch (err: any) {
      showToast("Payment authorization failed: " + err.message, "error");
    } finally {
      setProcessingPay(false);
    }
  };

  const handleDownloadMock = (invoice: Payment) => {
    showToast(`Downloading invoice_${invoice.id}.pdf to your device...`, "success");
  };

  const handlePrintReceipt = (payment: Payment) => {
    const originalDate = new Date(payment.date);
    const fallBackDueDateStr = payment.dueDate || new Date(originalDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const dueDateObj = new Date(fallBackDueDateStr);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast("Pop-up blocker is preventing the printable invoice window from launching.", "error");
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${payment.id}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #334155;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              line-height: 1.5;
            }
            .header {
              display: flex;
              justify-content: space-between;
              border-b: 2px solid #e2e8f0;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title {
              font-size: 24px;
              font-weight: 800;
              color: #0f172a;
              letter-spacing: -0.025em;
              margin: 0;
              text-transform: uppercase;
            }
            .subtitle {
              font-size: 12px;
              color: #64748b;
              margin-top: 4px;
            }
            .badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 9999px;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .badge-paid {
              background-color: #f0fdf4;
              color: #15803d;
              border: 1px solid #bbf7d0;
            }
            .badge-pending {
              background-color: #fef3c7;
              color: #b45309;
              border: 1px solid #fde68a;
            }
            .badge-failed {
              background-color: #fef2f2;
              color: #b91c1c;
              border: 1px solid #fecaca;
            }
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .label {
              font-size: 10px;
              font-weight: 700;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 4px;
            }
            .value {
              font-size: 13px;
              font-weight: 600;
              color: #334155;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .table th {
              background-color: #f8fafc;
              font-size: 10px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              text-align: left;
              padding: 12px 16px;
              border-bottom: 1px solid #e2e8f0;
            }
            .table td {
              padding: 16px;
              font-size: 13px;
              border-bottom: 1px solid #f1f5f9;
            }
            .total-section {
              margin-left: auto;
              width: 300px;
              border-top: 2px solid #e2e8f0;
              padding-top: 16px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              color: #64748b;
              margin-bottom: 8px;
            }
            .total-row.grand {
              font-size: 16px;
              font-weight: 800;
              color: #4f46e5;
              margin-top: 12px;
              padding-top: 12px;
              border-top: 1px solid #f1f5f9;
            }
            .footer {
              margin-top: 60px;
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
            }
            @media print {
              body {
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
            .btn-print {
              background-color: #4f46e5;
              color: white;
              border: none;
              padding: 10px 18px;
              font-size: 12px;
              font-weight: 700;
              border-radius: 8px;
              cursor: pointer;
              margin-bottom: 20px;
            }
            .btn-print:hover {
              background-color: #4338ca;
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align: right;">
            <button class="btn-print" onclick="window.print()">Print Receipt</button>
          </div>
          <div class="header">
            <div>
              <h1 class="title">GURUGEDARA ACADEMY</h1>
              <div class="subtitle">Modern Tuition & Academy Hub • Colombo, Sri Lanka</div>
            </div>
            <div style="text-align: right;">
              <div class="badge badge-${payment.status}">${payment.status}</div>
              <div style="font-size: 11px; font-family: monospace; font-weight: bold; margin-top: 8px; color: #64748b;">${payment.id}</div>
            </div>
          </div>
          
          <div class="details-grid">
            <div>
              <div class="label">Billed To</div>
              <div class="value">${payment.studentName}</div>
              <div class="value" style="font-weight: normal; font-size: 12px; color: #64748b;">${currentUser.email}</div>
            </div>
            <div style="text-align: right;">
              <div class="label">Payment Status</div>
              <div class="value" style="text-transform: capitalize; color: ${payment.status === 'paid' ? '#16a34a' : payment.status === 'pending' ? '#d97706' : '#dc2626'}">${payment.status}</div>
            </div>
          </div>

          <div class="details-grid" style="border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; padding: 15px 0;">
            <div>
              <div class="label">Issued Date</div>
              <div class="value">${originalDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            </div>
            <div style="text-align: right;">
              <div class="label">Due Date</div>
              <div class="value">${dueDateObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Item & Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style="font-weight: bold; color: #0f172a;">${payment.classTitle}</div>
                  <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Tuition reservation fee & digital academy access pass</div>
                </td>
                <td style="text-align: right; font-family: monospace; font-weight: bold;">LKR ${payment.amount.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">
              <span>Subtotal</span>
              <span style="font-family: monospace;">LKR ${payment.amount.toLocaleString()}</span>
            </div>
            <div class="total-row">
              <span>Platform Service Fee</span>
              <span style="font-family: monospace;">LKR 0.00</span>
            </div>
            <div class="total-row grand">
              <span>Total Paid/Due</span>
              <span style="font-family: monospace;">LKR ${payment.amount.toLocaleString()}</span>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for studying with Gurugedara Academy!</p>
            <p style="font-size: 9px; margin-top: 8px;">This is a system-generated official payment receipt voucher. If you have any inquiries, contact billing@gurugedara.academy.</p>
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6" id="payment_history_section">
      
      {/* Header and overview banners */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <DollarSign className="w-24 h-24 text-white" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Total Settled Tuition</span>
            <h4 className="text-2xl font-black font-mono tracking-tight text-white mt-1">LKR {totalPaid.toLocaleString()}</h4>
          </div>
          <div className="text-[10px] text-emerald-400 font-mono mt-3 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>All class enrollments active</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-150 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Outstanding Invoices</span>
            <h4 className="text-2xl font-black font-mono tracking-tight text-amber-600 mt-1">LKR {totalPending.toLocaleString()}</h4>
          </div>
          <div className="text-[10px] text-slate-450 font-mono mt-3 flex items-center gap-1">
            <Hourglass className="w-3.5 h-3.5 text-amber-500" />
            <span>Awaiting gateway settlement</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-150 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Failed Transactions</span>
            <h4 className="text-2xl font-black font-mono tracking-tight text-rose-600 mt-1">LKR {totalFailed.toLocaleString()}</h4>
          </div>
          <div className="text-[10px] text-rose-500 font-mono mt-3 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Requires manual retries</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-150 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Total Invoice Ledger</span>
            <h4 className="text-2xl font-black font-mono tracking-tight text-slate-800 mt-1">LKR {totalInvoiced.toLocaleString()}</h4>
          </div>
          <div className="text-[10px] text-indigo-600 font-mono mt-3 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            <span>{studentPayments.length} total invoice vouchers</span>
          </div>
        </div>
      </div>

      {/* Upcoming Payment Deadlines for Registered Classes */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 border border-indigo-800/80 shadow-lg relative overflow-hidden" id="upcoming_payment_deadlines_card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-indigo-800/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-500/30">
              <Calendar className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                Upcoming Payment Deadlines for Registered Classes
              </h3>
              <p className="text-xs text-indigo-200/70 mt-0.5">
                Track pending tuition fees and deadline schedules for your active class enrollments
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 rounded-full text-xs font-bold font-mono">
              {studentPayments.filter(p => p.status === 'pending').length} Pending Deadlines
            </span>
          </div>
        </div>

        {/* Registered Classes Deadlines Table */}
        <div className="overflow-x-auto">
          {studentPayments.length === 0 ? (
            <p className="text-xs text-indigo-300/60 italic py-4">No registered class payment deadlines found.</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[10px] uppercase font-mono text-indigo-300/70 border-b border-indigo-800/40 pb-2">
                  <th className="py-2.5 px-3">Course / Class Title</th>
                  <th className="py-2.5 px-3">Registered Date</th>
                  <th className="py-2.5 px-3">Payment Deadline</th>
                  <th className="py-2.5 px-3">Deadline Status</th>
                  <th className="py-2.5 px-3 text-center">Automated Reminder</th>
                  <th className="py-2.5 px-3 text-right">Fee (LKR)</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-800/30 font-sans">
                {studentPayments.map(payment => {
                  const isPaid = payment.status === 'paid';
                  const origDate = new Date(payment.date);
                  const fallBackDueDate = payment.dueDate || new Date(origDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
                  const dueDateObj = new Date(fallBackDueDate);
                  const now = new Date();
                  const diffTime = dueDateObj.getTime() - now.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  const isOverdue = !isPaid && diffDays < 0;
                  const isNotified = notifiedPaymentIds.includes(payment.id);

                  return (
                    <tr key={`deadline_${payment.id}`} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 font-bold text-white">
                        {payment.classTitle}
                      </td>
                      <td className="py-3 px-3 text-indigo-200/80 font-mono text-[11px]">
                        {origDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-indigo-200'}>
                          {dueDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Settled
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <AlertTriangle className="w-3 h-3" /> Overdue by {Math.abs(diffDays)}d
                          </span>
                        ) : diffDays === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                            <Hourglass className="w-3 h-3" /> Due Today
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                            <Clock className="w-3 h-3" /> Due in {diffDays} days
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isPaid ? (
                          <span className="text-[10px] text-emerald-400/60 font-mono">Paid</span>
                        ) : (
                          <button
                            onClick={() => toggleDeadlineNotification(payment, diffDays)}
                            title={isNotified ? "Disable 3-day automated deadline reminder" : "Enable 3-day automated deadline reminder"}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                              isNotified
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
                                : 'bg-indigo-950/60 text-indigo-300/70 border-indigo-700/50 hover:bg-indigo-800/50 hover:text-white'
                            }`}
                          >
                            {isNotified ? (
                              <>
                                <BellRing className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                                <span>Notify Active (3d)</span>
                              </>
                            ) : (
                              <>
                                <Bell className="w-3.5 h-3.5 text-indigo-300" />
                                <span>Notify Me</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-300">
                        LKR {payment.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {!isPaid ? (
                          <button
                            onClick={() => setPayInvoice(payment)}
                            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] rounded-lg transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1 mx-auto"
                          >
                            Pay Now <ArrowUpRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedInvoice(payment)}
                            className="px-3 py-1 bg-indigo-800/80 hover:bg-indigo-700 text-indigo-100 font-bold text-[10px] rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto border border-indigo-600/50"
                          >
                            <FileText className="w-3 h-3" /> View Receipt
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Automated Email Reminders Triggered by Google Calendar Events */}
      <GoogleCalendarPaymentReminders payments={studentPayments} />

      {/* Main Ledger Table view */}
      <div className="bg-white border border-slate-150 rounded-3xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
        
        {/* Filter and Search Action bar */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by invoice ID, class name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex gap-1 bg-white border border-slate-200/80 p-1 rounded-xl text-xs font-semibold text-slate-500">
            {(['all', 'paid', 'pending', 'failed'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors cursor-pointer ${
                  statusFilter === tab 
                    ? 'bg-slate-900 text-white font-bold' 
                    : 'hover:bg-slate-50 text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          {filteredPayments.length === 0 ? (
            <div className="p-12 text-center text-slate-450 text-xs">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">No Invoices Found</p>
              <p className="text-slate-400 mt-1">There are no financial logs matching your selected filter query.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse" id="payment_ledger_table">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/25 text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                  <th className="py-4 px-6">Invoice ID</th>
                  <th className="py-4 px-6">Class Program</th>
                  <th className="py-4 px-6">Issued Date</th>
                  <th className="py-4 px-6">Due Date</th>
                  <th className="py-4 px-6 text-right">Amount</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPayments.map(payment => {
                  const isPaid = payment.status === 'paid';
                  const isPending = payment.status === 'pending';
                  const isFailed = payment.status === 'failed';

                  // Calculate automated fallbacks for missing due dates (7 days from payment date)
                  const originalDate = new Date(payment.date);
                  const fallBackDueDateStr = payment.dueDate || new Date(originalDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
                  const dueDateObj = new Date(fallBackDueDateStr);
                  const isOverdue = !isPaid && (dueDateObj.getTime() < new Date().getTime());

                  return (
                    <tr key={payment.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-4 px-6 font-mono text-[10px] font-bold text-slate-500">
                        {payment.id}
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-bold text-slate-800 line-clamp-1">{payment.classTitle}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Method: {payment.paymentMethod || 'Direct Billing'}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-[10px] text-slate-500">
                        {originalDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-6 font-mono text-[10px]">
                        <span className={`${isOverdue ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                          {dueDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {isOverdue && (
                          <span className="block text-[8px] font-extrabold uppercase text-red-500 font-sans tracking-wide">OVERDUE</span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-slate-900 text-right">
                        LKR {payment.amount.toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-[9px] font-bold ${
                          isPaid 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : isPending 
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {isPaid && <CheckCircle2 className="w-3 h-3" />}
                          {isPending && <Hourglass className="w-3 h-3 text-amber-500" />}
                          {isFailed && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                          <span className="capitalize">{payment.status}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedInvoice(payment)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="View Invoice Details"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          
                          {!isPaid && (
                            <button
                              onClick={() => setPayInvoice(payment)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              Pay Now <ArrowUpRight className="w-3 h-3" />
                            </button>
                          )}

                          {isPaid && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDownloadMock(payment)}
                                className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Download Receipt Voucher"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handlePrintReceipt(payment)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Print Receipt Voucher"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Invoice Detail Modal Sheet */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-55 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-150 shadow-2xl relative font-sans text-slate-800"
            >
              <button
                onClick={() => setSelectedInvoice(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 p-1.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Invoice Layout */}
              <div className="border border-slate-100 p-6 rounded-2xl bg-slate-50/10 space-y-6">
                
                {/* Invoice Letterhead */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-sm font-black text-slate-900 tracking-wider uppercase font-mono">GURUGEDARA ACADEMY</h2>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Modern Tuition & Academy Hub<br />Colombo, Sri Lanka</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block py-0.5 px-2 bg-indigo-50 text-indigo-700 text-[9px] font-bold uppercase rounded-md tracking-wider">
                      Official Invoice
                    </span>
                    <p className="text-[11px] font-mono text-slate-500 mt-2 font-bold">{selectedInvoice.id}</p>
                  </div>
                </div>

                {/* Client / Student Meta Details */}
                <div className="grid grid-cols-2 gap-4 text-[11px]">
                  <div>
                    <span className="text-[9px] uppercase font-mono text-slate-400 font-bold block">Billed To</span>
                    <p className="font-extrabold text-slate-800 mt-1">{selectedInvoice.studentName}</p>
                    <p className="text-slate-500 mt-0.5">{currentUser.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-mono text-slate-400 font-bold block">Payment Status</span>
                    <span className={`inline-block mt-1 py-0.5 px-2 rounded-full font-bold uppercase text-[9px] ${
                      selectedInvoice.status === 'paid' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : selectedInvoice.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                    }`}>
                      {selectedInvoice.status}
                    </span>
                  </div>
                </div>

                {/* Time stamps */}
                <div className="grid grid-cols-2 gap-4 text-[11px] border-t border-b border-slate-100 py-3">
                  <div>
                    <span className="text-[9px] uppercase font-mono text-slate-400 font-bold">Issued Date</span>
                    <p className="font-mono text-slate-700 mt-0.5">
                      {new Date(selectedInvoice.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-mono text-slate-400 font-bold">Due Date</span>
                    <p className="font-mono text-slate-700 mt-0.5">
                      {new Date(selectedInvoice.dueDate || new Date(new Date(selectedInvoice.date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Ledger line items */}
                <div className="space-y-3">
                  <span className="text-[9px] uppercase font-mono text-slate-400 font-bold block">Invoice Items</span>
                  <div className="bg-white rounded-xl border border-slate-150 p-4 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-850 leading-snug">{selectedInvoice.classTitle}</p>
                      <p className="text-[10px] text-slate-450 mt-1">Tuition reservation fee & access pass</p>
                    </div>
                    <p className="font-mono font-bold text-slate-900 text-right">LKR {selectedInvoice.amount.toLocaleString()}</p>
                  </div>
                </div>

                {/* Financial Math */}
                <div className="space-y-1.5 text-xs pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Subtotal</span>
                    <span className="font-mono">LKR {selectedInvoice.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Administrative Platform Levy</span>
                    <span className="font-mono">LKR 0.00</span>
                  </div>
                  <div className="flex justify-between text-slate-800 font-extrabold text-sm pt-2 border-t border-slate-100">
                    <span>Total Billable Due</span>
                    <span className="font-mono text-indigo-700">LKR {selectedInvoice.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Secondary controls */}
              <div className="flex gap-2.5 mt-6">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-650 font-semibold rounded-xl text-xs transition-colors cursor-pointer text-center"
                >
                  Close
                </button>
                <button
                  onClick={() => handlePrintReceipt(selectedInvoice)}
                  className="flex-1 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm border border-indigo-150"
                  title="Print official receipt / invoice details"
                >
                  <Printer className="w-4 h-4" /> Print Receipt
                </button>
                <button
                  onClick={() => handleDownloadMock(selectedInvoice)}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Gateway Simulation Modal */}
      <AnimatePresence>
        {payInvoice && (
          <div className="fixed inset-0 z-55 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-150 shadow-2xl relative font-sans"
            >
              <button
                onClick={() => {
                  if (!processingPay) {
                    setPayInvoice(null);
                    setCardNumber('');
                    setExpiry('');
                    setCvv('');
                  }
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 p-1.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                disabled={processingPay}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Secure Payment Checkout</h3>
                <p className="text-xs text-slate-400 mt-1">Authenticate and process your tuition payment instantly via our sandbox financial layer.</p>
              </div>

              {/* Invoice Summary Card */}
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl mb-5 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Class Billable</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5 line-clamp-1 max-w-[220px]" title={payInvoice.classTitle}>
                    {payInvoice.classTitle}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Amount</p>
                  <p className="text-sm font-black text-indigo-700 font-mono mt-0.5">LKR {payInvoice.amount.toLocaleString()}</p>
                </div>
              </div>

              {/* Secure checkout credit card inputs */}
              <form onSubmit={handleSimulatePayment} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono font-bold text-slate-450 block">Cardholder Name</label>
                  <input 
                    type="text" 
                    defaultValue={currentUser.name}
                    required
                    disabled={processingPay}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 cursor-not-allowed"
                    readOnly
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono font-bold text-slate-450 block">Card Number</label>
                  <input 
                    type="text" 
                    placeholder="4242 4242 4242 4242"
                    maxLength={19}
                    required
                    disabled={processingPay}
                    value={cardNumber}
                    onChange={(e) => {
                      // format with spaces
                      const val = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                      const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                      setCardNumber(formatted);
                    }}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-slate-450 block">Expiration Date</label>
                    <input 
                      type="text" 
                      placeholder="MM/YY"
                      maxLength={5}
                      required
                      disabled={processingPay}
                      value={expiry}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 2) {
                          val = val.slice(0, 2) + '/' + val.slice(2, 4);
                        }
                        setExpiry(val);
                      }}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-indigo-500 font-mono text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-slate-450 block">CVV Code</label>
                    <input 
                      type="password" 
                      placeholder="***"
                      maxLength={3}
                      required
                      disabled={processingPay}
                      value={cvv}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setCvv(val);
                      }}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-indigo-500 font-mono text-center"
                    />
                  </div>
                </div>

                {/* PCI Compliance trust indicator */}
                <div className="flex items-center gap-2 text-[9px] text-slate-400 font-medium py-1 bg-slate-50/50 rounded-lg px-2 border border-slate-100 justify-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>256-bit AES SSL Secure Sandboxed Transaction Gateway</span>
                </div>

                {/* Submits */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPayInvoice(null);
                      setCardNumber('');
                      setExpiry('');
                      setCvv('');
                    }}
                    className="w-1/2 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-650 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                    disabled={processingPay}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingPay}
                    className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60"
                  >
                    {processingPay ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Authorizing...
                      </>
                    ) : (
                      <>
                        Pay LKR {payInvoice.amount.toLocaleString()}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
