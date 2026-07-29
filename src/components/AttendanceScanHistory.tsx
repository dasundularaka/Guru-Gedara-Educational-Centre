import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  Clock, 
  Search, 
  Calendar, 
  BookOpen, 
  QrCode, 
  ShieldCheck, 
  Filter, 
  ArrowUpDown,
  Download
} from 'lucide-react';
import { AttendanceRecord, ClassItem } from '../types';

interface AttendanceScanHistoryProps {
  attendanceRecords: AttendanceRecord[];
  classes?: ClassItem[];
  title?: string;
  studentName?: string;
}

export const AttendanceScanHistory: React.FC<AttendanceScanHistoryProps> = ({
  attendanceRecords = [],
  classes = [],
  title = "Attendance Check-In Scan History",
  studentName
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Filter & Sort Chronological Scan History
  const filteredRecords = attendanceRecords
    .filter(record => {
      const matchesSearch = 
        record.classTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.date.includes(searchTerm);
      
      const matchesClass = selectedClassFilter === 'all' || record.classId === selectedClassFilter;
      return matchesSearch && matchesClass;
    })
    .sort((a, b) => {
      const timeA = new Date(a.markedAt || a.date).getTime();
      const timeB = new Date(b.markedAt || b.date).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

  // Export Scan History as CSV
  const exportHistoryCsv = () => {
    if (filteredRecords.length === 0) return;
    const headers = ['Date', 'Student Name', 'Course Title', 'Status', 'Timestamp', 'Verification Method'];
    const rows = filteredRecords.map(r => [
      r.date,
      `"${r.studentName}"`,
      `"${r.classTitle}"`,
      r.status,
      new Date(r.markedAt).toLocaleString(),
      'Dynamic QR Pass'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Scan_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5 font-sans">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-650" /> {title}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Chronological audit log of successful QR code & digital attendance check-ins {studentName ? `for ${studentName}` : ''}
          </p>
        </div>

        {/* CSV Export Button */}
        <button
          onClick={exportHistoryCsv}
          disabled={filteredRecords.length === 0}
          className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5 text-indigo-600" /> Export CSV Log
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search course or date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
          />
        </div>

        {/* Filter Course */}
        {classes.length > 0 && (
          <div className="relative">
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold cursor-pointer"
            >
              <option value="all">All Enrolled Courses</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Sort order toggle */}
        <button
          onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
          className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" /> 
          Sort: {sortOrder === 'newest' ? 'Most Recent First' : 'Oldest First'}
        </button>

      </div>

      {/* Scan History Log List */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-10 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400 space-y-2">
          <QrCode className="w-8 h-8 mx-auto text-slate-300 animate-pulse" />
          <p className="text-xs font-bold text-slate-600">No Scan Attendance Logs Found</p>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
            Check-ins completed using classroom QR passes will appear here with full timestamp verification details.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-2xs">
          {filteredRecords.map((record) => {
            const formattedTime = new Date(record.markedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            });
            const formattedDate = new Date(record.date || record.markedAt).toLocaleDateString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      {record.classTitle}
                      <span className="text-[9px] font-extrabold font-mono uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                        Verified QR Pass
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono flex items-center gap-2">
                      <span>Scholar: {record.studentName}</span>
                      <span>•</span>
                      <span>Session ID: {record.classId}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-right font-mono">
                    <span className="text-xs font-bold text-slate-800 block">{formattedDate}</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3 text-slate-400" /> {formattedTime}
                    </span>
                  </div>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase font-mono ${
                    record.status === 'Present' 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    <CheckCircle2 className="w-3 h-3" /> {record.status}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="text-right text-[10px] text-slate-400 font-mono">
        Showing {filteredRecords.length} verified scan logs
      </div>

    </div>
  );
};
