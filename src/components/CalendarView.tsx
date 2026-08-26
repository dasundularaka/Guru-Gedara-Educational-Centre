import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  BookOpen, 
  AlertCircle, 
  Plus, 
  Check, 
  Users, 
  ShieldCheck, 
  Activity, 
  Trash2, 
  CalendarDays, 
  Repeat, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  ChevronLeft, 
  ChevronRight,
  Info,
  CalendarCheck
} from 'lucide-react';
import { ClassItem, Booking, UserProfile, AttendanceRecord, RecurringAvailabilitySlot, SpecificDateAvailability } from '../types';

interface CalendarViewProps {
  userRole: 'student' | 'tutor' | 'admin';
  userBookings?: Booking[];
  tutorClasses?: ClassItem[];
  tutorAvailability?: { day: string; slots: string[] }[];
  recurringAvailability?: RecurringAvailabilitySlot[];
  specificDateAvailability?: SpecificDateAvailability[];
  onAddAvailability?: (day: string, slot: string) => void;
  onUpdateRecurringAvailability?: (slots: RecurringAvailabilitySlot[]) => void;
  onUpdateSpecificDateAvailability?: (slots: SpecificDateAvailability[]) => void;
  attendanceRecords?: AttendanceRecord[];
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const CalendarView: React.FC<CalendarViewProps> = ({ 
  userRole, 
  userBookings = [], 
  tutorClasses = [],
  tutorAvailability = [],
  recurringAvailability = [],
  specificDateAvailability = [],
  onAddAvailability,
  onUpdateRecurringAvailability,
  onUpdateSpecificDateAvailability,
  attendanceRecords = []
}) => {
  const [activeView, setActiveView] = useState<'weekly' | 'recurring' | 'specific_dates'>('weekly');
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [newSlotTime, setNewSlotTime] = useState("04:00 PM");

  // Recurring slot form states
  const [recDay, setRecDay] = useState("Monday");
  const [recStartTime, setRecStartTime] = useState("09:00 AM");
  const [recEndTime, setRecEndTime] = useState("11:00 AM");
  const [recSubject, setRecSubject] = useState("");
  const [recMaxStudents, setRecMaxStudents] = useState(25);

  // Specific date form states
  const [specDate, setSpecDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [specStartTime, setSpecStartTime] = useState("09:00 AM");
  const [specEndTime, setSpecEndTime] = useState("12:00 PM");
  const [specIsAvailable, setSpecIsAvailable] = useState(true);
  const [specReason, setSpecReason] = useState("");

  // Month navigation for date picker
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  // Helper: map out day-specific event lists
  const getEventsForDay = (day: string) => {
    if (userRole === 'student') {
      return userBookings.filter(b => b.dayOfWeek === day && b.status === 'active');
    } else {
      return tutorClasses.filter(c => c.dayOfWeek === day);
    }
  };

  const handleAddQuickSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddAvailability && newSlotTime) {
      onAddAvailability(selectedDay, newSlotTime);
      newSlotTime && setNewSlotTime("04:00 PM");
    }
  };

  const handleAddRecurringSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateRecurringAvailability) return;

    const newSlot: RecurringAvailabilitySlot = {
      id: 'rec_' + Math.random().toString(36).substring(2, 9),
      dayOfWeek: recDay,
      startTime: recStartTime,
      endTime: recEndTime,
      subject: recSubject.trim() || undefined,
      maxStudents: Number(recMaxStudents) || 20,
      isActive: true
    };

    const updated = [...recurringAvailability, newSlot];
    onUpdateRecurringAvailability(updated);
    setRecSubject("");
  };

  const handleToggleRecurringSlot = (id: string) => {
    if (!onUpdateRecurringAvailability) return;
    const updated = recurringAvailability.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s);
    onUpdateRecurringAvailability(updated);
  };

  const handleDeleteRecurringSlot = (id: string) => {
    if (!onUpdateRecurringAvailability) return;
    const updated = recurringAvailability.filter(s => s.id !== id);
    onUpdateRecurringAvailability(updated);
  };

  const handleAddSpecificDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateSpecificDateAvailability || !specDate) return;

    const newEntry: SpecificDateAvailability = {
      id: 'spec_' + Math.random().toString(36).substring(2, 9),
      date: specDate,
      startTime: specStartTime,
      endTime: specEndTime,
      isAvailable: specIsAvailable,
      reason: specReason.trim() || (specIsAvailable ? 'Available Special Session' : 'Unavailable / Personal Leave')
    };

    // Filter out existing for same date/time or append
    const updated = [...specificDateAvailability.filter(s => !(s.date === specDate && s.startTime === specStartTime)), newEntry];
    onUpdateSpecificDateAvailability(updated);
    setSpecReason("");
  };

  const handleDeleteSpecificDate = (id: string) => {
    if (!onUpdateSpecificDateAvailability) return;
    const updated = specificDateAvailability.filter(s => s.id !== id);
    onUpdateSpecificDateAvailability(updated);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-6 space-y-6" id="academy_calendar">
      
      {/* Calendar Header with Mode Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 leading-tight">
              {userRole === 'tutor' ? 'Faculty Availability & Class Schedule' : 'Tuition Class Timetable'}
            </h3>
            <p className="text-xs text-slate-400">
              {userRole === 'tutor' ? 'Manage recurring teaching slots and specific unavailable dates' : 'Your real-time academic course schedule'}
            </p>
          </div>
        </div>

        {/* View Mode Switcher for Tutor */}
        {userRole === 'tutor' && (
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveView('weekly')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'weekly' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Weekly Timetable
            </button>
            <button
              onClick={() => setActiveView('recurring')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'recurring' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" /> Recurring Slots
              {recurringAvailability.length > 0 && (
                <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded-full text-[9px] font-mono">
                  {recurringAvailability.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveView('specific_dates')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'specific_dates' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" /> Specific Dates & Leave
              {specificDateAvailability.length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[9px] font-mono">
                  {specificDateAvailability.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 1. WEEKLY TIMETABLE VIEW */}
      {activeView === 'weekly' && (
        <div className="space-y-6">
          {/* Quick Slot Form for Tutors */}
          {userRole === 'tutor' && onAddAvailability && (
            <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Quick Add Available Slot:</span>
              </div>
              <form onSubmit={handleAddQuickSlot} className="flex gap-2 flex-wrap items-center">
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="text-xs rounded-xl border border-slate-200 bg-white px-3 py-1.5 focus:border-indigo-500 font-medium"
                >
                  {WEEKDAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="e.g. 05:30 PM"
                  value={newSlotTime}
                  onChange={(e) => setNewSlotTime(e.target.value)}
                  className="text-xs rounded-xl border border-slate-200 bg-white px-3 py-1.5 focus:border-indigo-500 w-32 font-mono text-center"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Save Slot
                </button>
              </form>
            </div>
          )}

          {/* 7-Day Grid Calendar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            {WEEKDAYS.map((day) => {
              const events = getEventsForDay(day);
              const hasEvents = events.length > 0;
              const isTutorAvailable = tutorAvailability.find(a => a.day === day)?.slots || [];
              const dayRecurring = recurringAvailability.filter(r => r.dayOfWeek.toLowerCase() === day.toLowerCase() && r.isActive);

              return (
                <div 
                  key={day} 
                  className={`rounded-2xl p-3.5 border transition-all flex flex-col min-h-[160px] ${
                    hasEvents 
                      ? 'bg-indigo-50/20 border-indigo-150' 
                      : 'bg-slate-50/40 border-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <span className="text-xs font-extrabold text-slate-850">
                      {day}
                    </span>
                    {(hasEvents || dayRecurring.length > 0) && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    {/* Booked / Scheduled Classes */}
                    {events.map((ev: any) => {
                      const classId = ev.classId || ev.id;
                      const classRecords = attendanceRecords.filter(r => r.classId === classId);
                      const presentCount = classRecords.filter(r => r.status === 'Present').length;
                      const totalRecorded = classRecords.length;
                      const attendanceRate = totalRecorded > 0 ? Math.round((presentCount / totalRecorded) * 100) : null;

                      return (
                        <div 
                          key={ev.id} 
                          className="p-2.5 rounded-xl bg-indigo-600 text-white font-sans shadow-xs leading-tight hover:shadow-md transition-all space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 opacity-80" />
                              <span className="font-mono font-bold text-[10px]">{ev.timeSlot || '09:00 AM'}</span>
                            </div>
                            {userRole === 'tutor' && attendanceRate !== null && (
                              <span className="text-[8px] font-mono font-black px-1.5 py-0.2 rounded-full bg-black/20 text-white flex items-center gap-0.5">
                                <Activity className="w-2 h-2" />
                                {attendanceRate}%
                              </span>
                            )}
                          </div>
                          <p className="font-bold truncate text-[11px] leading-snug">{ev.classTitle || ev.title}</p>
                          <div className="flex items-center justify-between text-[9px] text-indigo-100">
                            <span className="truncate">{ev.tutorName || ev.subject}</span>
                            {ev.bookedSlots !== undefined && (
                              <span className="font-mono">{ev.bookedSlots}/{ev.maxSlots || 30}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Recurring Availability Slots Badges */}
                    {dayRecurring.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-700 block font-mono">
                          Recurring Window:
                        </span>
                        {dayRecurring.map((rec) => (
                          <div 
                            key={rec.id}
                            className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-150 text-emerald-800 text-[10px] font-mono leading-tight flex items-center justify-between"
                          >
                            <span className="truncate">{rec.startTime} - {rec.endTime}</span>
                            <Check className="w-2.5 h-2.5 text-emerald-600 flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Legacy Slots indicators */}
                    {userRole === 'tutor' && events.length === 0 && dayRecurring.length === 0 && isTutorAvailable.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-700 block font-mono">
                          Available Slots:
                        </span>
                        {isTutorAvailable.map((slot, sIdx) => (
                          <div 
                            key={sIdx} 
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-mono border border-emerald-150"
                          >
                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                            {slot}
                          </div>
                        ))}
                      </div>
                    )}

                    {!hasEvents && dayRecurring.length === 0 && (userRole !== 'tutor' || isTutorAvailable.length === 0) && (
                      <div className="flex flex-col items-center justify-center py-6 text-slate-300">
                        <Clock className="w-4 h-4 opacity-40 mb-1" />
                        <span className="text-[9px] font-medium">Free Day</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. RECURRING AVAILABILITY SLOTS MANAGER */}
      {activeView === 'recurring' && userRole === 'tutor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Creator Form */}
          <div className="lg:col-span-5 bg-slate-50 border border-slate-150 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-indigo-600" />
              <h4 className="text-sm font-extrabold text-slate-900">Define Recurring Weekly Slot</h4>
            </div>
            <p className="text-xs text-slate-500">
              Set fixed times you are available to teach every week. Students booking classes will be verified against these slots.
            </p>

            <form onSubmit={handleAddRecurringSlot} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">Day of Week</label>
                <select
                  value={recDay}
                  onChange={(e) => setRecDay(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700"
                >
                  {WEEKDAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">Start Time</label>
                  <input
                    type="text"
                    value={recStartTime}
                    onChange={(e) => setRecStartTime(e.target.value)}
                    placeholder="09:00 AM"
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-center"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">End Time</label>
                  <input
                    type="text"
                    value={recEndTime}
                    onChange={(e) => setRecEndTime(e.target.value)}
                    placeholder="11:00 AM"
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-center"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">Subject Focus (Optional)</label>
                  <input
                    type="text"
                    value={recSubject}
                    onChange={(e) => setRecSubject(e.target.value)}
                    placeholder="e.g. Mathematics"
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">Max Capacity</label>
                  <input
                    type="number"
                    value={recMaxStudents}
                    onChange={(e) => setRecMaxStudents(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-center"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                <Plus className="w-4 h-4" /> Add Recurring Availability Slot
              </button>
            </form>
          </div>

          {/* Slots List */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-mono font-bold uppercase text-slate-400">Active Weekly Schedule</span>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full font-mono">
                {recurringAvailability.filter(r => r.isActive).length} Active Slots
              </span>
            </div>

            {recurringAvailability.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-150 rounded-2xl">
                <Repeat className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No recurring availability slots added yet.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Use the form on the left to set weekly availability slots.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recurringAvailability.map((slot) => (
                  <div
                    key={slot.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      slot.isActive 
                        ? 'bg-white border-slate-200 shadow-xs' 
                        : 'bg-slate-50/60 border-slate-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        slot.isActive ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {slot.dayOfWeek.slice(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900">{slot.dayOfWeek}</span>
                          {slot.subject && (
                            <span className="px-2 py-0.2 bg-slate-100 text-slate-600 rounded-md text-[9px] font-bold">
                              {slot.subject}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {slot.startTime} - {slot.endTime} • Max {slot.maxStudents || 25} Students
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleRecurringSlot(slot.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                          slot.isActive 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {slot.isActive ? 'Active' : 'Paused'}
                      </button>
                      <button
                        onClick={() => handleDeleteRecurringSlot(slot.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SPECIFIC DATES & BLACKOUT LEAVE MANAGER */}
      {activeView === 'specific_dates' && userRole === 'tutor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Creator Form */}
          <div className="lg:col-span-5 bg-slate-50 border border-slate-150 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-indigo-600" />
              <h4 className="text-sm font-extrabold text-slate-900">Add Specific Date Availability / Leave</h4>
            </div>
            <p className="text-xs text-slate-500">
              Declare special one-time teaching availability windows or block out personal leave / holidays to prevent student bookings.
            </p>

            <form onSubmit={handleAddSpecificDate} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">Target Date</label>
                <input
                  type="date"
                  value={specDate}
                  onChange={(e) => setSpecDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-700"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">Status on Date</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSpecIsAvailable(true)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      specIsAvailable 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Available to Teach
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpecIsAvailable(false)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      !specIsAvailable 
                        ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-xs' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-600" /> Unavailable / Leave
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">Start Time</label>
                  <input
                    type="text"
                    value={specStartTime}
                    onChange={(e) => setSpecStartTime(e.target.value)}
                    placeholder="09:00 AM"
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">End Time</label>
                  <input
                    type="text"
                    value={specEndTime}
                    onChange={(e) => setSpecEndTime(e.target.value)}
                    placeholder="12:00 PM"
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">Reason / Note</label>
                <input
                  type="text"
                  value={specReason}
                  onChange={(e) => setSpecReason(e.target.value)}
                  placeholder={specIsAvailable ? "e.g. Special weekend review workshop" : "e.g. Attending university faculty seminar"}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl"
                />
              </div>

              <button
                type="submit"
                className={`w-full py-2.5 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2 ${
                  specIsAvailable ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <Plus className="w-4 h-4" /> {specIsAvailable ? 'Save Available Window' : 'Block Out Date / Mark Leave'}
              </button>
            </form>
          </div>

          {/* Specific Dates List */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-mono font-bold uppercase text-slate-400">Scheduled Date Exceptions</span>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full font-mono">
                {specificDateAvailability.length} Entries
              </span>
            </div>

            {specificDateAvailability.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-150 rounded-2xl">
                <CalendarCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No specific date overrides configured.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Your standard weekly timetable and recurring slots will apply to all dates.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {specificDateAvailability.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      entry.isAvailable 
                        ? 'bg-emerald-50/40 border-emerald-200' 
                        : 'bg-rose-50/40 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold text-xs ${
                        entry.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        <span className="text-[9px] font-mono leading-none">
                          {new Date(entry.date).toLocaleDateString(undefined, { month: 'short' })}
                        </span>
                        <span className="text-sm leading-none mt-0.5">
                          {new Date(entry.date).getDate()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border ${
                            entry.isAvailable 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                              : 'bg-rose-100 text-rose-800 border-rose-200'
                          }`}>
                            {entry.isAvailable ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                            {entry.isAvailable ? 'Special Available Window' : 'Unavailable / Leave'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-850 mt-1">
                          {entry.reason || (entry.isAvailable ? 'Available for classes' : 'Leave')}
                        </p>
                        {entry.startTime && entry.endTime && (
                          <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                            Time Window: {entry.startTime} - {entry.endTime}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteSpecificDate(entry.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                      title="Remove entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advisory Bottom Banner */}
      <div className="flex items-center gap-2.5 text-xs text-slate-500 bg-slate-50 p-3.5 rounded-2xl border border-slate-150">
        <Info className="w-4 h-4 text-indigo-600 flex-shrink-0" />
        <p>
          Students booking classes are verified against your live availability and blackout leave dates in real time.
        </p>
      </div>
    </div>
  );
};
