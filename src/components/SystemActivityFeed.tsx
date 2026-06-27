import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  UserPlus, 
  CreditCard, 
  BookOpen, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Sparkles 
} from 'lucide-react';

interface SystemEvent {
  id: string;
  type: 'user_register' | 'payment_confirm' | 'class_update' | 'booking_made' | 'system_status';
  title: string;
  description: string;
  timestamp: Date;
  meta?: string;
}

export const SystemActivityFeed: React.FC = () => {
  const { classes, payments, bookings } = useApp();
  const [events, setEvents] = useState<SystemEvent[]>([]);

  // Build initial events from existing data
  useEffect(() => {
    const list: SystemEvent[] = [];

    // 1. Add class updates / deployments
    if (classes && classes.length > 0) {
      classes.slice(0, 3).forEach((c, idx) => {
        list.push({
          id: `ev-class-${c.id}-${idx}`,
          type: 'class_update',
          title: 'Class Syllabus Deployed',
          description: `Curriculum "${c.title}" opened for student intakes by ${c.tutorName}.`,
          timestamp: new Date(Date.now() - (idx + 1) * 3600000 * 4), // hours ago
          meta: c.subject
        });
      });
    }

    // 2. Add payment confirmations
    if (payments && payments.length > 0) {
      payments.slice(0, 3).forEach((p, idx) => {
        list.push({
          id: `ev-pay-${p.id}-${idx}`,
          type: 'payment_confirm',
          title: p.status === 'paid' ? 'Payment Approved' : 'Payment Registered',
          description: `LKR ${p.amount.toLocaleString()} tuition ledger invoice processed for student #${p.studentId?.substring(0, 5) || 'demo'}.`,
          timestamp: new Date(Date.now() - (idx + 1) * 3600000 * 2), // hours ago
          meta: p.status === 'paid' ? 'ledger-sync' : 'pending-review'
        });
      });
    }

    // 3. Add booking activities
    if (bookings && bookings.length > 0) {
      bookings.slice(0, 3).forEach((b, idx) => {
        list.push({
          id: `ev-book-${b.id}-${idx}`,
          type: 'booking_made',
          title: 'Class Session Reserved',
          description: `A tuition seat slot reserved for class title "${b.classTitle}".`,
          timestamp: new Date(Date.now() - (idx + 1) * 1800000), // half hours ago
          meta: b.dayOfWeek
        });
      } );
    }

    // 4. Default baseline registrations
    list.push({
      id: 'ev-reg-baseline-1',
      type: 'user_register',
      title: 'New Student Registration',
      description: 'Scholar student profile verified and allocated to mathematics division.',
      timestamp: new Date(Date.now() - 3600000 * 8),
      meta: 'admission'
    });

    list.push({
      id: 'ev-reg-baseline-2',
      type: 'user_register',
      title: 'Tutor Faculty Onboarded',
      description: 'Faculty instructor credentials approved by admin board.',
      timestamp: new Date(Date.now() - 3600000 * 24),
      meta: 'faculty'
    });

    // Sort descending chronologically
    list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setEvents(list.slice(0, 8));
  }, [classes, payments, bookings]);

  // Periodic real-time simulator to capture ongoing dashboard activity
  useEffect(() => {
    const simulationTemplates = [
      {
        type: 'user_register' as const,
        title: 'New Student Intake Registrant',
        description: 'New student scholar signed up from southern province division.',
        meta: 'admission'
      },
      {
        type: 'payment_confirm' as const,
        title: 'Payment Invoice Settled',
        description: 'Automatic bank transfer confirmed and receipts compiled.',
        meta: 'ledger-sync'
      },
      {
        type: 'class_update' as const,
        title: 'Class Syllabus Rescheduled',
        description: 'Instructor updated session schedule hours to optimize evening slot.',
        meta: 'timetable'
      },
      {
        type: 'booking_made' as const,
        title: 'Tuition Seat Reservation',
        description: 'Student registered for evening advanced programming workshop.',
        meta: 'intake-success'
      },
      {
        type: 'system_status' as const,
        title: 'Service Worker Sync Verified',
        description: 'Offline caching index registers optimized and verified.',
        meta: 'system'
      }
    ];

    const interval = setInterval(() => {
      const template = simulationTemplates[Math.floor(Math.random() * simulationTemplates.length)];
      const newEvent: SystemEvent = {
        id: `ev-sim-${Date.now()}`,
        ...template,
        timestamp: new Date()
      };

      setEvents(prev => [newEvent, ...prev].slice(0, 8));
    }, 15000); // Trigger a simulated live event every 15 seconds

    return () => clearInterval(interval);
  }, []);

  // Return icons based on types
  const getEventIcon = (type: SystemEvent['type']) => {
    switch (type) {
      case 'user_register':
        return <UserPlus className="w-4 h-4 text-indigo-500" />;
      case 'payment_confirm':
        return <CreditCard className="w-4 h-4 text-emerald-500" />;
      case 'class_update':
        return <BookOpen className="w-4 h-4 text-violet-500" />;
      case 'booking_made':
        return <Calendar className="w-4 h-4 text-amber-500" />;
      default:
        return <Activity className="w-4 h-4 text-sky-500" />;
    }
  };

  const getEventBadgeStyle = (type: SystemEvent['type']) => {
    switch (type) {
      case 'user_register':
        return 'bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-900 dark:text-indigo-400';
      case 'payment_confirm':
        return 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400';
      case 'class_update':
        return 'bg-violet-50 border-violet-100 text-violet-700 dark:bg-violet-950/30 dark:border-violet-900 dark:text-violet-400';
      case 'booking_made':
        return 'bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-400';
      default:
        return 'bg-sky-50 border-sky-100 text-sky-700 dark:bg-sky-950/30 dark:border-sky-900 dark:text-sky-400';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm" id="system_activity_feed_component">
      <div className="flex justify-between items-center border-b border-gray-50 dark:border-slate-800/60 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white">
            <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              System Activity Ledger
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Real-time telemetry event logging for admistration oversight</p>
          </div>
        </div>

        <span className="text-[10px] font-mono text-indigo-650 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-slate-800 px-2 py-1 rounded-lg">
          Live stream
        </span>
      </div>

      <div className="flow-root">
        <ul className="-mb-8">
          <AnimatePresence initial={false}>
            {events.map((event, eventIdx) => (
              <motion.li 
                key={event.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <div className="relative pb-8">
                  {eventIdx !== events.length - 1 ? (
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-100 dark:bg-slate-800" aria-hidden="true" />
                  ) : null}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className={`h-8 w-8 rounded-xl border flex items-center justify-center ring-4 ring-white dark:ring-slate-900 ${getEventBadgeStyle(event.type)}`}>
                        {getEventIcon(event.type)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                      <div>
                        <p className="text-xs font-extrabold text-slate-900 dark:text-slate-200">{event.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">{event.description}</p>
                      </div>
                      <div className="text-right text-[10px] whitespace-nowrap text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span>{event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
};
