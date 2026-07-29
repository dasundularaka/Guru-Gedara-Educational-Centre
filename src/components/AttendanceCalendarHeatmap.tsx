import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar, ChevronLeft, ChevronRight, Info, Sparkles, Filter, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { AttendanceRecord, ClassItem, Booking } from '../types';

interface AttendanceCalendarHeatmapProps {
  attendanceRecords: AttendanceRecord[];
  classes?: ClassItem[];
  bookings?: Booking[];
  studentId?: string; // If provided, shows heatmap for a single student
  title?: string;
  subtitle?: string;
}

export const AttendanceCalendarHeatmap: React.FC<AttendanceCalendarHeatmapProps> = ({
  attendanceRecords,
  classes = [],
  bookings = [],
  studentId,
  title = "Semester Daily Attendance & Activity Heatmap",
  subtitle = "Daily attendance pattern across weeks and months of the current academic term"
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [hoveredCell, setHoveredCell] = useState<{
    dateStr: string;
    dayName?: string;
    dayOfWeek: string;
    presentCount: number;
    totalCount: number;
    rate: number;
    records: AttendanceRecord[];
  } | null>(null);

  // Generate date matrix for the past 16 weeks (approx 112 days)
  const heatmapData = useMemo(() => {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 111); // 16 weeks back

    // Filter relevant records based on studentId and selectedSubject
    const relevantRecords = attendanceRecords.filter(r => {
      const matchStudent = !studentId || r.studentId === studentId;
      const matchSubject = selectedSubject === 'all' || r.classId === selectedSubject;
      return matchStudent && matchSubject;
    });

    // Group records by YYYY-MM-DD
    const recordsByDate = new Map<string, AttendanceRecord[]>();
    relevantRecords.forEach(r => {
      const list = recordsByDate.get(r.date) || [];
      list.push(r);
      recordsByDate.set(r.date, list);
    });

    // Build day cells
    const days = [];
    const curr = new Date(startDate);
    
    while (curr <= today) {
      const dateStr = curr.toISOString().split('T')[0];
      const records = recordsByDate.get(dateStr) || [];
      const presentCount = records.filter(r => r.status === 'Present').length;
      const totalCount = records.length;
      
      // Calculate rate or synthetic status
      let rate = totalCount > 0 ? (presentCount / totalCount) * 100 : -1;
      
      // If student specific view and no record for a past day, check if it was a scheduled session day
      const dayOfWeek = curr.toLocaleDateString('en-US', { weekday: 'long' });
      const dayNameShort = curr.toLocaleDateString('en-US', { weekday: 'short' });
      
      days.push({
        dateObj: new Date(curr),
        dateStr,
        dayOfWeek,
        dayNameShort,
        monthName: curr.toLocaleDateString('en-US', { month: 'short' }),
        dayNumber: curr.getDate(),
        presentCount,
        totalCount,
        rate: Math.round(rate),
        records
      });

      curr.setDate(curr.getDate() + 1);
    }

    return days;
  }, [attendanceRecords, studentId, selectedSubject]);

  // Group days into 16 week columns (7 days each)
  const weeksMatrix = useMemo(() => {
    const weeks: typeof heatmapData[] = [];
    for (let i = 0; i < heatmapData.length; i += 7) {
      weeks.push(heatmapData.slice(i, i + 7));
    }
    return weeks;
  }, [heatmapData]);

  // Color intensity helper function
  const getCellBgColor = (cell: (typeof heatmapData)[0]) => {
    if (cell.rate === -1) {
      // No attendance recorded on this day
      return 'bg-slate-100 hover:border-slate-300';
    }
    if (cell.rate >= 90) return 'bg-emerald-600 border-emerald-700 text-white shadow-2xs';
    if (cell.rate >= 75) return 'bg-emerald-400 border-emerald-500 text-slate-900';
    if (cell.rate >= 50) return 'bg-amber-400 border-amber-500 text-slate-900';
    if (cell.rate > 0) return 'bg-rose-400 border-rose-500 text-slate-900';
    return 'bg-rose-600 border-rose-700 text-white'; // 0% present
  };

  // Extract distinct subjects for dropdown
  const distinctSubjects = useMemo(() => {
    const map = new Map<string, string>();
    classes.forEach(c => map.set(c.id, c.title));
    return Array.from(map.entries());
  }, [classes]);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6 font-sans">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-650" /> {title}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        {/* Filter Dropdown */}
        {distinctSubjects.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="all">All Registered Courses</option>
              {distinctSubjects.map(([id, title]) => (
                <option key={id} value={id}>{title}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Heatmap Grid Matrix */}
      <div className="space-y-3">
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[680px]">
            
            {/* Days of week row labels header */}
            <div className="grid grid-flow-col auto-cols-fr gap-1.5 mb-2 pl-8">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                <span key={idx} className="text-[10px] font-bold text-slate-400 font-mono text-center">
                  {day}
                </span>
              ))}
            </div>

            {/* Weeks Heatmap Grid */}
            <div className="space-y-1.5">
              {weeksMatrix.map((week, wIdx) => {
                const monthLabel = week[0]?.monthName || '';
                const showMonthLabel = wIdx === 0 || (wIdx > 0 && weeksMatrix[wIdx - 1][0]?.monthName !== monthLabel);

                return (
                  <div key={wIdx} className="flex items-center gap-1.5">
                    
                    {/* Month Indicator Label */}
                    <span className="w-8 text-[9px] font-bold font-mono text-slate-400 uppercase tracking-tighter text-right pr-1">
                      {showMonthLabel ? monthLabel : ''}
                    </span>

                    {/* 7 Days in Week */}
                    <div className="grid grid-cols-7 gap-1.5 flex-1">
                      {week.map((cell, dIdx) => (
                        <div
                          key={dIdx}
                          onMouseEnter={() => setHoveredCell(cell)}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`h-7 rounded-lg border transition-all duration-150 cursor-pointer flex items-center justify-center text-[10px] font-extrabold ${getCellBgColor(
                            cell
                          )}`}
                          title={`${cell.dateStr} (${cell.dayOfWeek}): ${cell.rate >= 0 ? cell.rate + '%' : 'No Sessions Recorded'}`}
                        >
                          {cell.rate >= 0 ? `${cell.rate}%` : ''}
                        </div>
                      ))}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Legend Scale */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Attendance Rate Scale:</span>
            <div className="flex items-center gap-1.5 font-mono text-[10px]">
              <span className="inline-block w-4 h-4 rounded bg-slate-100 border border-slate-200" title="No activity" /> No Class
              <span className="inline-block w-4 h-4 rounded bg-rose-600 text-white font-extrabold text-[8px] text-center" /> 0-49%
              <span className="inline-block w-4 h-4 rounded bg-amber-400 text-slate-900 font-extrabold text-[8px] text-center" /> 50-74%
              <span className="inline-block w-4 h-4 rounded bg-emerald-400 text-slate-900 font-extrabold text-[8px] text-center" /> 75-89%
              <span className="inline-block w-4 h-4 rounded bg-emerald-600 text-white font-extrabold text-[8px] text-center" /> 90-100%
            </div>
          </div>

          <span className="text-[10px] text-indigo-650 font-mono font-bold bg-indigo-50 px-2.5 py-1 rounded-lg">
            Hover cell to view daily records
          </span>
        </div>
      </div>

      {/* Hovered Cell Detail Card */}
      {hoveredCell && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-slate-900 text-white rounded-xl text-xs space-y-2 shadow-lg border border-slate-800"
        >
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="font-bold text-indigo-300 font-mono">
              {hoveredCell.dateStr} ({hoveredCell.dayOfWeek})
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold font-mono uppercase ${
              hoveredCell.rate >= 80 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}>
              {hoveredCell.rate >= 0 ? `${hoveredCell.rate}% Attendance` : 'No Class Logged'}
            </span>
          </div>

          {hoveredCell.records.length > 0 ? (
            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
              {hoveredCell.records.map((r, idx) => (
                <div key={idx} className="flex justify-between items-center text-[11px] py-0.5">
                  <span className="text-slate-300">{r.studentName} — <span className="text-slate-400 font-mono">{r.classTitle}</span></span>
                  <span className={r.status === 'Present' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic">No student attendance logs were submitted on this date.</p>
          )}
        </motion.div>
      )}

    </div>
  );
};
