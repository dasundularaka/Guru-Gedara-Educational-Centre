import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import { Clock, Hourglass, Calendar, AlertCircle, CalendarPlus } from 'lucide-react';
import { Booking } from '../types';

interface UpcomingSession {
  classId: string;
  classTitle: string;
  tutorName: string;
  date: Date;
  dayOfWeek: string;
  timeSlot: string;
}

const getNextOccurrence = (dayOfWeek: string, timeSlot: string): Date => {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const targetDayIndex = days.indexOf(dayOfWeek.toLowerCase().trim());
  const now = new Date();
  
  if (targetDayIndex === -1) {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000); // fallback to tomorrow
  }

  let hours = 9;
  let minutes = 0;
  const timeMatch = timeSlot.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10);
    minutes = parseInt(timeMatch[2], 10);
    const ampm = timeMatch[3];
    if (ampm) {
      if (ampm.toUpperCase() === "PM" && hours < 12) {
        hours += 12;
      } else if (ampm.toUpperCase() === "AM" && hours === 12) {
        hours = 0;
      }
    }
  }

  const result = new Date(now);
  result.setHours(hours, minutes, 0, 0);

  const currentDayIndex = now.getDay();
  let daysToAdd = targetDayIndex - currentDayIndex;

  if (daysToAdd < 0 || (daysToAdd === 0 && now.getTime() > result.getTime())) {
    daysToAdd += 7;
  }

  result.setDate(now.getDate() + daysToAdd);
  return result;
};

const getUpcomingSessions = (activeBookings: Booking[]): UpcomingSession[] => {
  const sessions: UpcomingSession[] = [];
  
  activeBookings.forEach(booking => {
    // Project 3 future occurrences of this class to cover cases where students have fewer than 3 classes
    const nextOccur = getNextOccurrence(booking.dayOfWeek, booking.timeSlot);
    
    // Occur 1
    sessions.push({
      classId: booking.classId,
      classTitle: booking.classTitle,
      tutorName: booking.tutorName,
      date: nextOccur,
      dayOfWeek: booking.dayOfWeek,
      timeSlot: booking.timeSlot
    });

    // Occur 2 (+7 days)
    const secondOccur = new Date(nextOccur);
    secondOccur.setDate(nextOccur.getDate() + 7);
    sessions.push({
      classId: booking.classId,
      classTitle: booking.classTitle,
      tutorName: booking.tutorName,
      date: secondOccur,
      dayOfWeek: booking.dayOfWeek,
      timeSlot: booking.timeSlot
    });

    // Occur 3 (+14 days)
    const thirdOccur = new Date(nextOccur);
    thirdOccur.setDate(nextOccur.getDate() + 14);
    sessions.push({
      classId: booking.classId,
      classTitle: booking.classTitle,
      tutorName: booking.tutorName,
      date: thirdOccur,
      dayOfWeek: booking.dayOfWeek,
      timeSlot: booking.timeSlot
    });
  });

  // Sort chronologically
  sessions.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Return top 3
  return sessions.slice(0, 3);
};

export const UpcomingDeadlines: React.FC = () => {
  const { bookings, currentUser } = useApp();
  const [upcoming, setUpcoming] = useState<UpcomingSession[]>([]);
  const [timeLefts, setTimeLefts] = useState<{ [key: string]: string }>({});

  // Export event as .ics file
  const handleAddToCalendar = (session: UpcomingSession) => {
    const startDate = new Date(session.date);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour duration
    
    const formatDateForICS = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };
    
    const startStr = formatDateForICS(startDate);
    const endStr = formatDateForICS(endDate);
    const nowStr = formatDateForICS(new Date());
    
    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Gurugedara Academy//Class Schedule//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:class_${session.classId}_${startDate.getTime()}@gurugedara.academy`,
      `DTSTAMP:${nowStr}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${session.classTitle}`,
      `DESCRIPTION:Tutor: ${session.tutorName}\\nClass Day: ${session.dayOfWeek}\\nTime Slot: ${session.timeSlot}`,
      "LOCATION:Gurugedara Academy Portal (Online Classroom)",
      "STATUS:CONFIRMED",
      "SEQUENCE:0",
      "BEGIN:VALARM",
      "TRIGGER:-PT15M",
      "ACTION:DISPLAY",
      "DESCRIPTION:Reminder: Your Gurugedara Academy class starts in 15 minutes!",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR"
    ];
    
    const icsContent = icsLines.join("\r\n");
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${session.classTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_session.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Fetch / filter active bookings for the student
  useEffect(() => {
    if (!currentUser) return;
    const activeStudentBookings = bookings.filter(
      b => b.studentId === currentUser.uid && b.status === 'active'
    );
    setUpcoming(getUpcomingSessions(activeStudentBookings));
  }, [bookings, currentUser]);

  // Update countdown clock every second
  useEffect(() => {
    const updateCountdowns = () => {
      const now = new Date().getTime();
      const newTimeLefts: { [key: string]: string } = {};

      upcoming.forEach((session, idx) => {
        const target = session.date.getTime();
        const diff = target - now;

        if (diff <= 0) {
          newTimeLefts[idx] = "Starting now!";
          return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        let formatted = "";
        if (days > 0) formatted += `${days}d `;
        if (hours > 0 || days > 0) formatted += `${hours}h `;
        formatted += `${minutes}m ${seconds}s`;

        newTimeLefts[idx] = formatted;
      });

      setTimeLefts(newTimeLefts);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, [upcoming]);

  if (upcoming.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)] text-center py-10" id="upcoming_deadlines_empty">
        <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
          <Calendar className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">No Upcoming Classes</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Enroll in active courses to unlock automated timelines, live session reminders, and countdown schedules.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-150/80 rounded-3xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01)]" id="upcoming_deadlines_root">
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-5">
        <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center">
          <Hourglass className="w-4.5 h-4.5 animate-spin" style={{ animationDuration: '6s' }} />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">Upcoming Live Session Deadlines</h3>
          <p className="text-[11px] text-slate-400">Real-time countdown to your next 3 scheduled study blocks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {upcoming.map((session, idx) => {
          const isUrgent = (session.date.getTime() - new Date().getTime()) < 30 * 60 * 1000; // Less than 30 mins
          const timeLeftStr = timeLefts[idx] || "Calculating...";

          return (
            <motion.div
              key={`${session.classId}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.3 }}
              className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                isUrgent 
                  ? 'bg-rose-50/40 border-rose-200 shadow-md ring-2 ring-rose-200' 
                  : 'bg-slate-50/50 border-slate-150 hover:border-slate-250 hover:bg-slate-50'
              }`}
            >
              {isUrgent && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-rose-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  <AlertCircle className="w-2.5 h-2.5" />
                  <span>URGENT</span>
                </div>
              )}

              <div>
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-indigo-650 font-bold uppercase tracking-wider mb-2">
                  <span>Session {idx + 1}</span>
                  <span>•</span>
                  <span>{session.dayOfWeek}</span>
                </div>

                <h4 className="text-xs font-extrabold text-slate-850 line-clamp-1 leading-snug" title={session.classTitle}>
                  {session.classTitle}
                </h4>
                <p className="text-[10px] text-slate-450 mt-1">
                  Instructor: <span className="font-semibold text-slate-650">{session.tutorName}</span>
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100/75 flex justify-between items-center">
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{session.timeSlot}</span>
                </div>

                <div className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold ${
                  isUrgent 
                    ? 'bg-rose-500 text-white shadow-xs' 
                    : 'bg-indigo-50/70 text-indigo-700 border border-indigo-100'
                }`}>
                  {timeLeftStr}
                </div>
              </div>

              {/* Exact calendar date display and Add to Calendar action button */}
              <div className="mt-3 pt-2.5 border-t border-slate-100/50 flex justify-between items-center">
                <button
                  onClick={() => handleAddToCalendar(session)}
                  className="inline-flex items-center gap-1 text-[10px] text-indigo-650 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold hover:underline bg-transparent border-none p-0 cursor-pointer"
                  title="Export session entry as .ics for Google Calendar or Outlook"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Add to Calendar</span>
                </button>
                <div className="text-[9px] text-slate-400 font-mono">
                  {session.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
