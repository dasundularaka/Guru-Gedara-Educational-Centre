import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, Check, X, Users, AlertCircle, Sparkles, CheckCircle2, ChevronRight, BookOpen } from 'lucide-react';
import { ConcludedCalendarSession, saveConcludedSessionAttendance } from '../lib/googleCalendarAttendanceUtils';
import { ClassItem, UserProfile } from '../types';

interface CalendarFinishAttendancePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ConcludedCalendarSession[];
  currentUser?: UserProfile;
  tutorClasses?: ClassItem[];
  onAttendanceSaved: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  executeWriteWithRetry?: any;
}

export const CalendarFinishAttendancePromptModal: React.FC<CalendarFinishAttendancePromptModalProps> = ({
  isOpen,
  onClose,
  sessions,
  currentUser,
  tutorClasses = [],
  onAttendanceSaved,
  showToast,
  executeWriteWithRetry
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [statusMap, setStatusMap] = useState<Record<string, 'Present' | 'Absent'>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [sessionTopic, setSessionTopic] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || sessions.length === 0) return null;

  const currentSession = sessions[activeIndex] || sessions[0];

  // Initialize status map for students if not set
  const getStatusForStudent = (studentId: string): 'Present' | 'Absent' => {
    if (statusMap[studentId]) return statusMap[studentId];
    const student = currentSession.bookedStudents.find(s => s.studentId === studentId);
    return student?.currentStatus || 'Present';
  };

  const handleSetStudentStatus = (studentId: string, status: 'Present' | 'Absent') => {
    setStatusMap(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSetAllStatus = (status: 'Present' | 'Absent') => {
    const updated: Record<string, 'Present' | 'Absent'> = { ...statusMap };
    currentSession.bookedStudents.forEach(s => {
      updated[s.studentId] = status;
    });
    setStatusMap(updated);
  };

  const handleSubmitCurrentSession = async () => {
    setIsSubmitting(true);
    try {
      // Build final status map combining existing defaults
      const finalStatusMap: Record<string, 'Present' | 'Absent'> = {};
      currentSession.bookedStudents.forEach(s => {
        finalStatusMap[s.studentId] = statusMap[s.studentId] || s.currentStatus || 'Present';
      });

      const count = await saveConcludedSessionAttendance(
        currentSession,
        finalStatusMap,
        notesMap,
        sessionTopic,
        currentUser,
        tutorClasses,
        executeWriteWithRetry
      );

      showToast(`Recorded attendance for ${count} student(s) in "${currentSession.classTitle}"!`, 'success');
      onAttendanceSaved();

      if (activeIndex < sessions.length - 1) {
        setActiveIndex(prev => prev + 1);
        setStatusMap({});
        setNotesMap({});
        setSessionTopic('');
      } else {
        onClose();
      }
    } catch (err: any) {
      showToast('Failed to save attendance: ' + (err.message || 'Error occurred'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full text-indigo-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-indigo-300 font-mono text-xs uppercase tracking-wider mb-2 font-bold">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Google Calendar Event Concluded Prompt</span>
              {currentSession.isGoogleCalendarSynced && (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] rounded-full font-bold">
                  Synced Calendar Event
                </span>
              )}
            </div>

            <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-300" />
              {currentSession.classTitle}
            </h3>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-indigo-200 font-mono">
              <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                <span>Session Ended: {currentSession.finishTimeStr} ({currentSession.date})</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                <Users className="w-3.5 h-3.5 text-blue-300" />
                <span>{currentSession.totalBooked} Booked Student{currentSession.totalBooked === 1 ? '' : 's'}</span>
              </div>
            </div>

            {sessions.length > 1 && (
              <div className="mt-4 flex items-center justify-between text-xs text-indigo-300 border-t border-white/10 pt-3">
                <span>Processing session {activeIndex + 1} of {sessions.length} concluded sessions</span>
                <div className="flex gap-1">
                  {sessions.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveIndex(idx);
                        setStatusMap({});
                        setNotesMap({});
                      }}
                      className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                        idx === activeIndex ? 'bg-amber-400 w-5' : 'bg-white/30 hover:bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            
            {/* Quick Action Bar & Session Topic */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <div className="flex-1 relative">
                <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Optional Session Topic (e.g., Chapter 4 Integration)..."
                  value={sessionTopic}
                  onChange={(e) => setSessionTopic(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 bg-white rounded-lg border border-slate-200 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-500 font-medium">Quick Mark:</span>
                <button
                  onClick={() => handleSetAllStatus('Present')}
                  className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> All Present
                </button>
                <button
                  onClick={() => handleSetAllStatus('Absent')}
                  className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> All Absent
                </button>
              </div>
            </div>

            {/* Booked Students Attendance Roster */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Booked Student Roster ({currentSession.bookedStudents.length})</span>
                <span className="text-slate-400 font-mono text-[11px]">Select Present / Absent per scholar</span>
              </div>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
                {currentSession.bookedStudents.map((student) => {
                  const status = getStatusForStudent(student.studentId);

                  return (
                    <div key={student.studentId} className="p-3.5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={student.photoURL}
                          alt={student.studentName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-extrabold text-slate-900">{student.studentName}</h5>
                            {student.grade && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.2 rounded font-mono">
                                {student.grade}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono">{student.email || `Student ID: ${student.studentId}`}</p>
                        </div>
                      </div>

                      {/* Status Toggle & Note Field */}
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <input
                          type="text"
                          placeholder="Optional note..."
                          value={notesMap[student.studentId] || ''}
                          onChange={(e) => setNotesMap({ ...notesMap, [student.studentId]: e.target.value })}
                          className="text-[11px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg w-32 focus:bg-white focus:border-indigo-500 outline-none"
                        />

                        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSetStudentStatus(student.studentId, 'Present')}
                            className={`px-3 py-1 rounded-md text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                              status === 'Present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" /> Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetStudentStatus(student.studentId, 'Absent')}
                            className={`px-3 py-1 rounded-md text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                              status === 'Absent'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" /> Absent
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Auto Notification Alert Notice */}
            <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900 font-sans">
              <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <p>
                <b>Automated Notifications Enabled:</b> Submitting attendance will automatically log records into the system ledger and send instant updates to students and their registered guardians.
              </p>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Remind Me Later
            </button>

            <button
              onClick={handleSubmitCurrentSession}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <>Processing...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Save & Confirm Session Attendance
                  {sessions.length > 1 && activeIndex < sessions.length - 1 && (
                    <ChevronRight className="w-4 h-4 ml-1" />
                  )}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
