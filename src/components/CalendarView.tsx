import React, { useState } from 'react';
import { Calendar, Clock, BookOpen, AlertCircle, Plus, Check, Users, ShieldCheck, Activity } from 'lucide-react';
import { ClassItem, Booking, UserProfile, AttendanceRecord } from '../types';

interface CalendarViewProps {
  userRole: 'student' | 'tutor' | 'admin';
  userBookings?: Booking[];
  tutorClasses?: ClassItem[];
  tutorAvailability?: { day: string; slots: string[] }[];
  onAddAvailability?: (day: string, slot: string) => void;
  attendanceRecords?: AttendanceRecord[];
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const CalendarView: React.FC<CalendarViewProps> = ({ 
  userRole, 
  userBookings = [], 
  tutorClasses = [],
  tutorAvailability = [],
  onAddAvailability,
  attendanceRecords = []
}) => {
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [newSlotTime, setNewSlotTime] = useState("04:00 PM");

  // Helper: map out day-specific event lists
  const getEventsForDay = (day: string) => {
    if (userRole === 'student') {
      return userBookings.filter(b => b.dayOfWeek === day && b.status === 'active');
    } else if (userRole === 'tutor') {
      return tutorClasses.filter(c => c.dayOfWeek === day);
    } else {
      // Admin: show all
      return tutorClasses.filter(c => c.dayOfWeek === day);
    }
  };

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddAvailability && newSlotTime) {
      onAddAvailability(selectedDay, newSlotTime);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-blue-50 shadow-md p-6" id="academy_calendar">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 leading-tight">Tuition Class Schedule</h3>
            <p className="text-xs text-gray-500">Your personalized academic calendar planner</p>
          </div>
        </div>
        
        {/* Tutor special: set availability controls */}
        {userRole === 'tutor' && onAddAvailability && (
          <form onSubmit={handleAddSlot} className="flex gap-2 w-full sm:w-auto items-center">
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="text-xs rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 focus:ring-blue-500 font-sans"
            >
              {WEEKDAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input
              type="text"
              placeholder="e.g. 05:30 PM"
              value={newSlotTime}
              onChange={(e) => setNewSlotTime(e.target.value)}
              className="text-xs rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 focus:ring-blue-500 w-28 font-mono"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Slot
            </button>
          </form>
        )}
      </div>

      {/* Grid calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-3 mb-6">
        {WEEKDAYS.map((day) => {
          const events = getEventsForDay(day);
          const hasEvents = events.length > 0;
          const isTutorAvailable = tutorAvailability.find(a => a.day === day)?.slots || [];

          return (
            <div 
              key={day} 
              className={`rounded-xl p-3 border transition-all flex flex-col min-h-[140px] ${
                hasEvents 
                  ? 'bg-blue-50/25 border-blue-100' 
                  : 'bg-gray-50/50 border-gray-100'
              }`}
            >
              <span className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-1.5 mb-2 block">
                {day}
              </span>
              
              <div className="flex-1 space-y-2">
                {/* Booked Events Render */}
                {events.map((ev: any) => {
                  const classId = ev.classId || ev.id;
                  const classRecords = attendanceRecords.filter(r => r.classId === classId);
                  const presentCount = classRecords.filter(r => r.status === 'Present').length;
                  const totalRecorded = classRecords.length;
                  const attendanceRate = totalRecorded > 0 ? Math.round((presentCount / totalRecorded) * 100) : null;

                  return (
                    <div 
                      key={ev.id} 
                      className="p-2 rounded-xl bg-blue-600 text-white font-sans shadow-sm leading-tight hover:scale-102 transition-transform space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="font-mono font-medium text-[10px]">{ev.timeSlot || '9:00 AM'}</span>
                        </div>
                        {userRole === 'tutor' && attendanceRate !== null && (
                          <span className={`text-[8.5px] font-mono font-extrabold px-1.5 py-0.2 rounded-full flex items-center gap-0.5 ${
                            attendanceRate >= 85 
                              ? 'bg-emerald-400/30 text-emerald-100 border border-emerald-300/40' 
                              : attendanceRate >= 60 
                              ? 'bg-amber-400/30 text-amber-100 border border-amber-300/40' 
                              : 'bg-rose-400/30 text-rose-100 border border-rose-300/40'
                          }`}>
                            <Activity className="w-2 h-2" />
                            {attendanceRate}%
                          </span>
                        )}
                      </div>
                      <p className="font-bold truncate text-xs">{ev.classTitle || ev.title}</p>
                      <div className="flex items-center justify-between text-[9px] opacity-90">
                        <span className="truncate">Tutor: {ev.tutorName}</span>
                        {ev.bookedSlots !== undefined && (
                          <span className="font-mono">{ev.bookedSlots}/{ev.maxSlots} Seats</span>
                        )}
                      </div>

                      {/* Visual Mini Progress Bar for Tutor */}
                      {userRole === 'tutor' && attendanceRate !== null && (
                        <div className="w-full bg-black/20 rounded-full h-1 overflow-hidden">
                          <div 
                            style={{ width: `${attendanceRate}%` }} 
                            className={`h-full rounded-full ${
                              attendanceRate >= 85 ? 'bg-emerald-300' : attendanceRate >= 60 ? 'bg-amber-300' : 'bg-rose-300'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Tutor Availability Hours indicators */}
                {userRole === 'tutor' && events.length === 0 && isTutorAvailable.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-emerald-600 font-sans uppercase tracking-wider mb-1">Teaching Slots:</p>
                    {isTutorAvailable.map((slot, sIdx) => (
                      <span 
                        key={sIdx} 
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 roundedbg-emerald-50 text-emerald-700 text-[10px] font-mono border border-emerald-100"
                      >
                        <Check className="w-2.5 h-2.5" />
                        {slot}
                      </span>
                    ))}
                  </div>
                )}

                {!hasEvents && (userRole !== 'tutor' || isTutorAvailable.length === 0) && (
                  <div className="flex flex-col items-center justify-center py-4 text-gray-300">
                    <Clock className="w-5 h-5 opacity-40 mb-1" />
                    <span className="text-[9px]">Free Day</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50/30 p-3 rounded-lg border border-blue-50/50">
        <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <p>
          Students receive automated alerts 24 hours prior to calendar sessions. Tutors must update availability slots to enable bookings.
        </p>
      </div>
    </div>
  );
};
