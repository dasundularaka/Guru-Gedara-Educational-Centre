import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import { Calendar, Clock, BookOpen, Filter, User, Sparkles } from 'lucide-react';
import { ClassItem } from '../types';

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface ClassScheduleWidgetProps {
  compact?: boolean;
}

export const ClassScheduleWidget: React.FC<ClassScheduleWidgetProps> = ({ compact = false }) => {
  const { classes, currentUser } = useApp();
  const [filterEnrolledOnly, setFilterEnrolledOnly] = useState<boolean>(true);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("All");

  // Determine user context and enrolled class IDs
  const isLoggedIn = !!currentUser;
  const isStudent = currentUser?.role === 'student';
  const isTutor = currentUser?.role === 'tutor';
  const enrolledClassIds = currentUser?.selectedClasses || [];

  // Filter classes according to criteria
  const getFilteredClasses = () => {
    let list: ClassItem[] = classes || [];

    // Filter by day of week if specified
    if (selectedDayFilter !== "All") {
      list = list.filter(c => c.dayOfWeek?.toLowerCase() === selectedDayFilter.toLowerCase());
    }

    // Filter enrolled vs all
    if (isLoggedIn && filterEnrolledOnly) {
      if (isStudent) {
        // Enrolled student classes
        list = list.filter(c => enrolledClassIds.includes(c.id));
      } else if (isTutor) {
        // Classes taught by tutor
        list = list.filter(c => c.tutorId === currentUser.uid);
      }
    }

    return list;
  };

  const filteredList = getFilteredClasses();

  // Color mappings for subjects to give an ultra-premium visual accent
  const getSubjectColor = (subject: string) => {
    const s = (subject || "").toLowerCase();
    if (s.includes('math') || s.includes('calc')) return { bg: 'bg-indigo-50/70 border-indigo-150 text-indigo-750 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-300', dot: 'bg-indigo-500' };
    if (s.includes('physics') || s.includes('science')) return { bg: 'bg-emerald-50/70 border-emerald-150 text-emerald-750 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300', dot: 'bg-emerald-500' };
    if (s.includes('chem') || s.includes('bio')) return { bg: 'bg-teal-50/70 border-teal-150 text-teal-750 dark:bg-teal-950/40 dark:border-teal-900 dark:text-teal-300', dot: 'bg-teal-500' };
    if (s.includes('code') || s.includes('compute') || s.includes('python')) return { bg: 'bg-violet-50/70 border-violet-150 text-violet-750 dark:bg-violet-950/40 dark:border-violet-900 dark:text-violet-300', dot: 'bg-violet-500' };
    return { bg: 'bg-amber-50/70 border-amber-150 text-amber-750 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300', dot: 'bg-amber-500' };
  };

  return (
    <div className="sleek-card p-6" id="class_schedule_widget_root">
      {/* Header section with clean visual indicators */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center border border-indigo-100 dark:border-slate-700 text-indigo-650 dark:text-indigo-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              Weekly Study Planner
              {isLoggedIn && filterEnrolledOnly && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[9px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-2.5 h-2.5" /> Enrolled View
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Weekly scheduling grid mapped to faculty timetables</p>
          </div>
        </div>

        {/* Filters and toggle widgets */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Day Select Menu */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDayFilter}
              onChange={(e) => setSelectedDayFilter(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 outline-none font-sans cursor-pointer focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">All Days</option>
              {WEEKDAYS.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>

          {/* Enrolled vs All toggle */}
          {isLoggedIn && (
            <button
              onClick={() => setFilterEnrolledOnly(!filterEnrolledOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                filterEnrolledOnly
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {isStudent ? (filterEnrolledOnly ? "My Enrolled Classes" : "All Available Classes") : (filterEnrolledOnly ? "My Teaching Classes" : "All Centre Classes")}
            </button>
          )}
        </div>
      </div>

      {/* Grid schedule display */}
      {!compact ? (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {WEEKDAYS.map((day) => {
            const dayClasses = filteredList.filter(c => c.dayOfWeek?.toLowerCase() === day.toLowerCase());
            const isDaySelected = selectedDayFilter === "All" || selectedDayFilter.toLowerCase() === day.toLowerCase();

            if (!isDaySelected) return null;

            return (
              <div
                key={day}
                className={`rounded-2xl p-3 border transition-all flex flex-col min-h-[160px] ${
                  dayClasses.length > 0
                    ? 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-150 dark:border-slate-800'
                    : 'bg-slate-50/20 dark:bg-slate-950/10 border-slate-100 dark:border-slate-900/40 opacity-75'
                }`}
              >
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-2 mb-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{day}</span>
                  <span className="text-[9px] font-bold text-slate-400 font-mono">({dayClasses.length})</span>
                </div>

                <div className="flex-grow space-y-2">
                  {dayClasses.length > 0 ? (
                    dayClasses.map((item) => {
                      const colors = getSubjectColor(item.subject);
                      return (
                        <div
                          key={item.id}
                          className={`p-2.5 rounded-xl border text-[11px] leading-tight transition-all hover:translate-y-[-1px] cursor-pointer ${colors.bg}`}
                          title={`${item.title} taught by ${item.tutorName}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1.5 font-mono text-[9px]">
                            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                            <span className="font-semibold uppercase tracking-wider truncate max-w-[80px]">{item.subject}</span>
                          </div>

                          <h4 className="font-extrabold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug mb-1.5">{item.title}</h4>

                          <div className="flex items-center gap-1 text-[9px] text-slate-500 dark:text-slate-400 font-mono mt-auto">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span>{item.timeSlot || "9:00 AM"}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 text-[9px] text-slate-400 dark:text-slate-500 mt-1">
                            <User className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{item.tutorName}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-300 dark:text-slate-700">
                      <Clock className="w-5 h-5 opacity-40 mb-1" />
                      <span className="text-[9px] uppercase tracking-wider font-semibold font-mono">No Classes</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact List View for sidebars / dashboards */
        <div className="space-y-2.5">
          {filteredList.length > 0 ? (
            filteredList.slice(0, 5).map((item) => {
              const colors = getSubjectColor(item.subject);
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-all hover:bg-slate-50/40 dark:hover:bg-slate-900/30 ${colors.bg}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded">
                          {item.subject}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 font-mono">{item.dayOfWeek}</span>
                      </div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 mt-1 leading-snug">{item.title}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>Taught by <span className="font-semibold text-slate-700 dark:text-slate-300">{item.tutorName}</span></span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:self-center font-mono text-xs font-bold text-slate-700 dark:text-slate-300 self-end">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <span>{item.timeSlot || "9:00 AM"}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 bg-slate-50/50 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No scheduled sessions matches these filters.</p>
              <p className="text-[10px] text-slate-400 mt-1">Adjust filters or enroll in available subjects to populate schedule.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
