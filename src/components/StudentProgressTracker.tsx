import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart, 
  Bar, 
  Cell, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  LineChart,
  Line
} from 'recharts';
import { 
  Award, 
  BookOpen, 
  Clock, 
  Target, 
  CheckCircle2, 
  TrendingUp, 
  Sparkles, 
  HelpCircle, 
  Percent, 
  ChevronRight,
  TrendingUpIcon,
  Calculator,
  Compass,
  GraduationCap,
  QrCode,
  AlertTriangle,
  Bell
} from 'lucide-react';
import { Booking, ClassItem, UserProfile, AttendanceRecord } from '../types';
import { AttendanceCalendarHeatmap } from './AttendanceCalendarHeatmap';
import { ClassQRCodeAttendanceModal } from './ClassQRCodeAttendanceModal';
import { AttendanceScanHistory } from './AttendanceScanHistory';
import { checkAndTriggerAttendanceAlerts } from '../lib/attendanceNotificationTrigger';

interface StudentProgressTrackerProps {
  currentUser: UserProfile;
  userBookings: Booking[];
  classes: ClassItem[];
  attendanceRecords?: AttendanceRecord[];
  onAttendanceMarked?: () => void;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface CourseProgress {
  classId: string;
  title: string;
  subject: string;
  tutorName: string;
  completion: number;          // e.g. 75 %
  grade: number;               // e.g. 88
  gradeLetter: string;         // e.g. "A-"
  attendance: number;          // e.g. 96
  completedAssignments: number;
  totalAssignments: number;
  weeklyGrades: { week: string; score: number }[];
  monthlyGrades: { month: string; score: number }[];
}

// Deterministic generator to make mock data realistic & unique per class
function getCourseMetrics(classId: string, title: string, subject: string, tutorName: string): CourseProgress {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  // Deterministic values
  const completion = 40 + (hash % 51); // 40% to 90%
  const grade = 75 + ((hash >> 2) % 21); // 75 to 95
  const attendance = 90 + ((hash >> 4) % 11); // 90 to 100
  
  const totalAssignments = 6 + (hash % 7); // 6 to 12
  const completedAssignments = Math.floor((completion / 100) * totalAssignments);

  let gradeLetter = "B";
  if (grade >= 93) gradeLetter = "A";
  else if (grade >= 90) gradeLetter = "A-";
  else if (grade >= 87) gradeLetter = "B+";
  else if (grade >= 83) gradeLetter = "B";
  else if (grade >= 80) gradeLetter = "B-";
  else if (grade >= 77) gradeLetter = "C+";
  else gradeLetter = "C";

  // Generate 6 weeks scores culminating around average grade
  const weeklyGrades = Array.from({ length: 6 }).map((_, idx) => {
    const weekNum = idx + 1;
    // rising trend
    const baseVal = grade - 5 + weekNum * 1.6;
    const noise = ((hash + weekNum) % 5) - 2; // -2 to +2
    const score = Math.round(Math.min(100, Math.max(60, baseVal + noise)));
    return {
      week: `Week ${weekNum}`,
      score
    };
  });

  // Generate last 3 months scores (April, May, June)
  const monthlyGrades = [
    { month: "April 2026", score: Math.round(Math.min(100, Math.max(60, grade - 4 + (hash % 5) - 2))) },
    { month: "May 2026", score: Math.round(Math.min(100, Math.max(60, grade - 1 + ((hash >> 1) % 5) - 2))) },
    { month: "June 2026", score: Math.round(Math.min(100, Math.max(60, grade + 2 + ((hash >> 2) % 5) - 2))) }
  ];

  return {
    classId,
    title,
    subject,
    tutorName,
    completion,
    grade,
    gradeLetter,
    attendance,
    completedAssignments,
    totalAssignments,
    weeklyGrades,
    monthlyGrades
  };
}

export const StudentProgressTracker: React.FC<StudentProgressTrackerProps> = ({ 
  currentUser, 
  userBookings, 
  classes,
  attendanceRecords = [],
  onAttendanceMarked,
  showToast
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>("overall");
  const [timeframe, setTimeframe] = useState<'weekly' | 'threeMonths'>('threeMonths');
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  
  // Predictor state
  const [predictSubject, setPredictSubject] = useState<string>("overall");
  const [desiredGrade, setDesiredGrade] = useState<number>(90);
  const [currentScore, setCurrentScore] = useState<number>(85);
  const [remainingWeight, setRemainingWeight] = useState<number>(30); // e.g. final is 30%

  // Check and trigger attendance threshold notification alert
  useEffect(() => {
    if (currentUser?.uid && userBookings.length > 0) {
      checkAndTriggerAttendanceAlerts(
        currentUser.uid,
        currentUser.name || 'Student',
        userBookings,
        attendanceRecords,
        80
      );
    }
  }, [currentUser, userBookings, attendanceRecords]);

  // Build course metrics for active classes
  const activeBookings = useMemo(() => {
    const seen = new Set<string>();
    return userBookings.filter(b => {
      if (b.status !== 'active') return false;
      if (seen.has(b.classId)) return false;
      seen.add(b.classId);
      return true;
    });
  }, [userBookings]);

  const progressList = useMemo(() => {
    if (activeBookings.length === 0) {
      return [];
    }

    return activeBookings.map(b => {
      // Find matching class logic for subjects
      const match = classes.find(c => c.id === b.classId);
      const subject = match?.subject || "Academics";
      return getCourseMetrics(b.classId, b.classTitle, subject, b.tutorName);
    });
  }, [activeBookings, classes]);

  // Overall metrics calculation
  const overallMetrics = useMemo(() => {
    if (progressList.length === 0) return { gpa: 4.0, completion: 0, grade: 0, attendance: 100, assignmentsSolved: 0, assignmentsTotal: 0 };
    
    const sumCompletion = progressList.reduce((acc, c) => acc + c.completion, 0);
    const sumGrade = progressList.reduce((acc, c) => acc + c.grade, 0);
    const sumAttendance = progressList.reduce((acc, c) => acc + c.attendance, 0);
    const totalSolved = progressList.reduce((acc, c) => acc + c.completedAssignments, 0);
    const totalCount = progressList.reduce((acc, c) => acc + c.totalAssignments, 0);
    
    const avgCompletion = Math.round(sumCompletion / progressList.length);
    const avgGrade = Math.round(sumGrade / progressList.length);
    const avgAttendance = Math.round(sumAttendance / progressList.length * 10) / 10;
    
    // Convert 100-pt grade to 4.0 scale
    // e.g. 95+ is 4.0, 90+ is 3.7, 85+ is 3.3, 80+ is 3.0, 75+ is 2.7
    let gpa = 2.0;
    if (avgGrade >= 93) gpa = 4.0;
    else if (avgGrade >= 90) gpa = 3.7;
    else if (avgGrade >= 87) gpa = 3.3;
    else if (avgGrade >= 83) gpa = 3.0;
    else if (avgGrade >= 80) gpa = 2.7;
    else if (avgGrade >= 75) gpa = 2.3;
    else gpa = 2.0;

    return {
      gpa,
      completion: avgCompletion,
      grade: avgGrade,
      attendance: avgAttendance,
      assignmentsSolved: totalSolved,
      assignmentsTotal: totalCount
    };
  }, [progressList]);

  // Weekly/Monthly aggregate trend or course-specific trend
  const [chartMode, setChartMode] = useState<'overall' | 'multisubject'>('multisubject');
  const [chartMetric, setChartMetric] = useState<'grade' | 'attendance'>('grade');

  const trendData = useMemo(() => {
    // Baseline sample courses if not enrolled in any class yet
    const displayList = progressList.length > 0 ? progressList : [
      getCourseMetrics("demo_math", "AP Calculus AB: Core Concepts", "Mathematics", "Dr. Sarah Jenkins"),
      getCourseMetrics("demo_physics", "College Physics Foundations", "Physics", "Elena Rostova"),
      getCourseMetrics("demo_coding", "Fullstack Web Development", "Coding", "Prof. Marcus Chen"),
      getCourseMetrics("demo_english", "Critical Writing & Literature", "English", "Claire Sterling")
    ];

    if (timeframe === 'weekly') {
      return Array.from({ length: 6 }).map((_, idx) => {
        const weekStr = `Week ${idx + 1}`;
        const row: Record<string, any> = { name: weekStr };

        let sumGrade = 0;
        let sumAtt = 0;

        displayList.forEach(course => {
          const score = course.weeklyGrades[idx]?.score || 85;
          const attScore = Math.min(100, Math.max(70, course.attendance - (5 - idx) * 1.2 + (idx % 2 === 0 ? 2 : -1)));
          
          row[course.subject] = chartMetric === 'grade' ? score : Math.round(attScore);
          sumGrade += score;
          sumAtt += attScore;
        });

        const count = displayList.length || 1;
        row["Average Grade"] = Math.round(sumGrade / count);
        row["Average Attendance"] = Math.round(sumAtt / count);
        row["Performance Index"] = chartMetric === 'grade' ? row["Average Grade"] : row["Average Attendance"];

        if (selectedClassId !== "overall") {
          const selected = displayList.find(c => c.classId === selectedClassId);
          if (selected) {
            row["Syllabus Grade"] = chartMetric === 'grade' 
              ? (selected.weeklyGrades[idx]?.score || 85)
              : Math.round(selected.attendance);
          }
        }

        return row;
      });
    } else {
      // 3 Months trend (April, May, June)
      const months = ["April 2026", "May 2026", "June 2026"];
      return months.map((monthStr, idx) => {
        const row: Record<string, any> = { name: monthStr };

        let sumGrade = 0;
        let sumAtt = 0;

        displayList.forEach(course => {
          const score = course.monthlyGrades[idx]?.score || 85;
          const attScore = Math.min(100, Math.max(75, course.attendance - (2 - idx) * 2));
          
          row[course.subject] = chartMetric === 'grade' ? score : Math.round(attScore);
          sumGrade += score;
          sumAtt += attScore;
        });

        const count = displayList.length || 1;
        row["Average Grade"] = Math.round(sumGrade / count);
        row["Average Attendance"] = Math.round(sumAtt / count);
        row["Performance Index"] = chartMetric === 'grade' ? row["Average Grade"] : row["Average Attendance"];

        if (selectedClassId !== "overall") {
          const selected = displayList.find(c => c.classId === selectedClassId);
          if (selected) {
            row["Syllabus Grade"] = chartMetric === 'grade' 
              ? (selected.monthlyGrades[idx]?.score || 85)
              : Math.round(selected.attendance);
          }
        }

        return row;
      });
    }
  }, [progressList, selectedClassId, timeframe, chartMetric]);

  // Subject-wise grouping for Radar/Bar Strengths
  const strengthData = useMemo(() => {
    const subjectsMap: Record<string, { totalGrade: number; totalComp: number; count: number }> = {};
    progressList.forEach(p => {
      if (!subjectsMap[p.subject]) {
        subjectsMap[p.subject] = { totalGrade: 0, totalComp: 0, count: 0 };
      }
      subjectsMap[p.subject].totalGrade += p.grade;
      subjectsMap[p.subject].totalComp += p.completion;
      subjectsMap[p.subject].count += 1;
    });

    return Object.entries(subjectsMap).map(([subject, chunk]) => ({
      subject,
      Grade: Math.round(chunk.totalGrade / chunk.count),
      Progress: Math.round(chunk.totalComp / chunk.count),
      fullMark: 100
    }));
  }, [progressList]);

  // Instructor milestones
  const milestones = useMemo(() => {
    const arr = [
      { id: "m1", title: "Perfect Homework streak", desc: "Completed 5 homework units on-time.", metric: "100% completion", date: "4 days ago", rank: "Silver" },
      { id: "m2", title: "Grade Mastery Peak", desc: "Reached 92% assessment marks on Calculus limits quiz.", metric: "92% Score", date: "1 week ago", rank: "Gold" },
      { id: "m3", title: "Attendance Champion", desc: "Attended all registered livestream course rooms.", metric: "100% Attendance", date: "2 weeks ago", rank: "Platinum" }
    ];
    return arr;
  }, []);

  // GPA status message
  const gpaStatus = useMemo(() => {
    if (overallMetrics.gpa >= 3.8) return { label: "Summa Cum Laude Status", color: "text-emerald-600 bg-emerald-50 border-emerald-100" };
    if (overallMetrics.gpa >= 3.5) return { label: "Dean's List High Honours", color: "text-indigo-600 bg-indigo-50 border-indigo-100" };
    return { label: "Standard Good Standing", color: "text-slate-600 bg-slate-50 border-slate-100" };
  }, [overallMetrics.gpa]);

  // Predictor formula: Target = Current*(1-Remaining) + Required*Remaining
  // Required = (Target - Current*(1 - RemainingWeight/100)) / (RemainingWeight/100)
  const calcRequiredPredictor = useMemo(() => {
    const weightFraction = remainingWeight / 100;
    if (weightFraction <= 0 || weightFraction >= 1) return null;
    const currentFraction = 1 - weightFraction;
    const needed = (desiredGrade - (currentScore * currentFraction)) / weightFraction;
    return Math.max(0, Math.round(needed * 10) / 10);
  }, [desiredGrade, currentScore, remainingWeight]);

  return (
    <div className="space-y-8" id="student_academic_progress_widget">
      
      {/* Attendance QR Pass Launch & Alerts Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              Class Attendance QR Pass & Tracker
            </h3>
            <p className="text-[11px] text-slate-300">
              Scan instructor's session QR code or view your attendance history.
            </p>
          </div>
        </div>

        <button
          id="btn_open_student_qr_scanner"
          onClick={() => setIsQrModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
        >
          <QrCode className="w-4 h-4" /> Scan Class QR Code
        </button>
      </div>

      {/* Low Attendance Automated Alert Banner */}
      {overallMetrics.attendance < 80 && (
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3.5 text-rose-900 shadow-2xs"
        >
          <div className="p-2 bg-rose-500 text-white rounded-xl shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                ⚠️ Automated Attendance Threshold Alert ({overallMetrics.attendance}% Standing)
              </h4>
              <span className="text-[10px] font-mono font-bold bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded-md">
                Threshold: 80% Minimum
              </span>
            </div>
            <p className="text-[11px] text-rose-800 leading-relaxed mt-1">
              Your overall attendance standing has dropped below the 80% requirement. Automated warnings have been recorded. Please attend upcoming live sessions or scan session QR passes to avoid academic penalties.
            </p>
          </div>
        </motion.div>
      )}

      {/* Dynamic Info Header Badge */}
      {activeBookings.length === 0 && (
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3.5 mb-2">
          <div className="p-2 bg-blue-100 text-blue-850 rounded-xl">
            <GraduationCap className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-950">No Enrolled Courses</h4>
            <p className="text-[11px] text-blue-700 leading-relaxed mt-0.5">
              You are currently not enrolled in any active classes. Browse the Subject Directory to enroll in classes and track real progress and grades!
            </p>
          </div>
        </div>
      )}

      {/* Grid of Key Indicators Card Desk */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Cumulative GPA Card */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Cumulative GPA</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{overallMetrics.gpa.toFixed(2)}</span>
                <span className="text-xs text-slate-400 font-bold">/ 4.00</span>
              </div>
            </div>
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
              <Award className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${gpaStatus.color}`}>
              {gpaStatus.label}
            </span>
          </div>
        </div>

        {/* Syllabus Completion Card */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Syllabus Completion</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{overallMetrics.completion}%</span>
              </div>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
              <Compass className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="space-y-1.5 pt-3 border-t border-slate-50">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-1000" 
                style={{ width: `${overallMetrics.completion}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>Overall progress index</span>
              <span className="text-blue-650 font-bold">Term target: 90%</span>
            </div>
          </div>
        </div>

        {/* Academic Grades Average Card */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">LMS Test Average</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{overallMetrics.grade}%</span>
                <span className="text-sm font-bold text-emerald-600 font-mono tracking-tight inline-flex items-center gap-0.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> +3%
                </span>
              </div>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <Target className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-450">
            <span>Average Letter standing:</span>
            <span className="font-mono font-black text-slate-800 text-xs px-2 py-0.5 bg-slate-100 rounded-md">
              {progressList[0]?.gradeLetter || "A-"}
            </span>
          </div>
        </div>

        {/* Live Attendance index */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Livestream Attendance</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{overallMetrics.attendance}%</span>
              </div>
            </div>
            <div className="p-2.5 bg-orange-50 text-orange-700 rounded-xl">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div className="pt-3 border-t border-slate-50 flex justify-between items-center text-[11px] text-slate-450">
            <span>Assignments solved:</span>
            <span className="font-mono font-bold text-slate-800">
              {overallMetrics.assignmentsSolved} / {overallMetrics.assignmentsTotal} units
            </span>
          </div>
        </div>

      </div>

      {/* Main Charts Deck Row - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Weekly Grade Journey Trend Area Chart */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Academic Performance Trend Lines</h3>
                <p className="text-[11px] text-slate-400">
                  {timeframe === 'threeMonths' ? 'Monthly performance trends over time powered by Recharts.' : 'Weekly average grade & attendance trajectory over coursework.'}
                </p>
              </div>
              
              {/* Dropdown & Timeframe isolate controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200/60">
                  <button
                    onClick={() => setChartMetric('grade')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${chartMetric === 'grade' ? 'bg-white text-indigo-650 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Grades (%)
                  </button>
                  <button
                    onClick={() => setChartMetric('attendance')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${chartMetric === 'attendance' ? 'bg-white text-indigo-650 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Attendance (%)
                  </button>
                </div>

                <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200/60">
                  <button
                    onClick={() => setTimeframe('weekly')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${timeframe === 'weekly' ? 'bg-white text-indigo-650 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setTimeframe('threeMonths')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${timeframe === 'threeMonths' ? 'bg-white text-indigo-650 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    3 Months
                  </button>
                </div>

                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="text-xs font-semibold px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="overall">All Subjects Overview</option>
                  {progressList.map(course => (
                    <option key={course.classId} value={course.classId}>{course.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recharts Line Chart */}
            <div className="h-68 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendData}
                  margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={11}
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    domain={[60, 100]} 
                    stroke="#94a3b8" 
                    fontSize={11}
                    tickLine={false} 
                    axisLine={false}
                    unit="%"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderRadius: '12px', 
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontWeight: 'bold' }} 
                  />

                  {selectedClassId === "overall" ? (
                    <>
                      <Line 
                        type="monotone" 
                        dataKey="Average Grade" 
                        name="Average Overall Score"
                        stroke="#4f46e5" 
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#4f46e5", strokeWidth: 2, stroke: "#ffffff" }}
                        activeDot={{ r: 7 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Mathematics" 
                        name="Mathematics"
                        stroke="#0284c7" 
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{ r: 3, fill: "#0284c7" }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Physics" 
                        name="Physics"
                        stroke="#059669" 
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{ r: 3, fill: "#059669" }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Coding" 
                        name="Coding"
                        stroke="#d97706" 
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{ r: 3, fill: "#d97706" }}
                      />
                    </>
                  ) : (
                    <Line 
                      type="monotone" 
                      dataKey="Syllabus Grade" 
                      name={`${classes.find(c => c.id === selectedClassId)?.title || "Course"} Trend`}
                      stroke="#4f46e5" 
                      strokeWidth={3.5}
                      dot={{ r: 5, fill: "#4f46e5", strokeWidth: 2, stroke: "#ffffff" }}
                      activeDot={{ r: 8 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-50 text-[10px] text-slate-400 mt-2 font-mono flex items-center justify-between">
            <span>Aggregating active digital worksheet updates</span>
            <span className="text-indigo-650 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Auto-sync enabled
            </span>
          </div>
        </div>

        {/* Syllabus completion rates by Course (Vertical or Simple Bar Chart) */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight mb-1">Weekly Course Progress</h3>
            <p className="text-[11px] text-slate-400 mb-6">Subject syllabuses completion rates side-by-side.</p>

            {/* Beautiful customized bar chart with custom color accents */}
            <div className="h-68 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={progressList.map(c => ({
                    name: c.subject,
                    "Progress %": c.completion,
                    fullTitle: c.title
                  }))}
                  margin={{ top: 10, right: 5, left: -25, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    stroke="#94a3b8" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderRadius: '12px', 
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    formatter={(value, name, props) => [
                      `${value}%`, 
                      props.payload.fullTitle
                    ]}
                  />
                  <Bar dataKey="Progress %" radius={[6, 6, 0, 0]} barSize={26}>
                    {progressList.map((entry, index) => {
                      const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-50 text-[11px] text-slate-450 mt-2 flex justify-between items-center bg-slate-50 p-2.5 rounded-xl">
            <span className="font-medium text-slate-500">Fastest pace:</span>
            <span className="font-extrabold text-slate-800">
              {progressList.reduce((max, c) => c.completion > max.completion ? c : max, progressList[0])?.subject || "N/A"} ({Math.max(...progressList.map(c => c.completion), 0)}%)
            </span>
          </div>
        </div>

      </div>

      {/* Grid of Subject Performance Insight & Study Predictor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Grade Predictor Calculator */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-semibold text-slate-900 border-b pb-3 border-slate-50 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-500" />
            Interactive Final Grade Target Predictor
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Specify your desired overall final grade goals for a subject and see what matching marks are required in remaining quizzes/exams to make it happen!
          </p>

          <div className="space-y-3.5 pt-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Grade Syllabus Target</label>
              <select
                value={predictSubject}
                onChange={(e) => {
                  const val = e.target.value;
                  setPredictSubject(val);
                  if (val !== "overall") {
                    const found = progressList.find(c => c.classId === val);
                    if (found) {
                      setCurrentScore(found.grade);
                    }
                  } else {
                    setCurrentScore(overallMetrics.grade);
                  }
                }}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl outline-none text-slate-700"
              >
                <option value="overall">All Courses Average</option>
                {progressList.map(c => (
                  <option key={c.classId} value={c.classId}>{c.title}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Desired Target %</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100"
                  value={desiredGrade}
                  onChange={(e) => setDesiredGrade(Number(e.target.value))}
                  className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-205 rounded-xl outline-none"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Current Grade %</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100"
                  value={currentScore}
                  onChange={(e) => setCurrentScore(Number(e.target.value))}
                  className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-205 rounded-xl outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Remaining Curriculum Weight
                </label>
                <span className="text-xs font-bold text-indigo-600 font-mono">{remainingWeight}%</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="95" 
                value={remainingWeight}
                onChange={(e) => setRemainingWeight(Number(e.target.value))}
                className="w-full accent-indigo-650 h-1.5 bg-slate-150 rounded"
              />
              <p className="text-[10px] text-slate-400 mt-1">E.g., final assessment is typically worth 20%-40% of standard terms.</p>
            </div>

            {/* Calculated output card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 mt-4">
              <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider block">Required average score on remaining assignments</span>
              {calcRequiredPredictor !== null ? (
                <div className="mt-1 flex items-baseline gap-2">
                  <span className={`text-2xl font-black ${calcRequiredPredictor > 100 ? 'text-red-600' : 'text-slate-900'}`}>
                    {calcRequiredPredictor}%
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {calcRequiredPredictor > 100 
                      ? "⚠️ Impossible standard target. Try optimizing your parameters." 
                      : calcRequiredPredictor > 90 
                        ? "🚀 High effort required. Perfect attendance & robust prep advised." 
                        : "👍 Highly realistic target with consistent baseline efforts."}
                  </span>
                </div>
              ) : (
                <span className="text-xs italic text-slate-400 mt-1 block">Analyzing predictor stats...</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Milestones Achievements & Subject Strengths Radar Chart/Grid */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-semibold text-slate-900 border-b pb-3 border-slate-50 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Syllabus Performance Highlights
            </h3>

            <div className="mt-4 space-y-3.5">
              {progressList.map(p => (
                <div key={p.classId} className="flex justify-between items-center p-3 bg-slate-50/40 border border-slate-100 rounded-xl hover:border-slate-200 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 leading-none">{p.title}</span>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-indigo-50 text-indigo-700 tracking-wider">
                        {p.subject}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-3">
                      <span>Completed assignments: <span className="font-bold text-slate-600">{p.completedAssignments} / {p.totalAssignments} units</span></span>
                      <span>Attendance: <span className="font-bold text-slate-600">{p.attendance}%</span></span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="block text-sm font-black text-slate-800">{p.grade}%</span>
                    <span className="block text-[9px] text-slate-400 font-mono uppercase">Letter rank: <b className="text-indigo-600 font-black">{p.gradeLetter}</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-semibold text-slate-900 border-b pb-3 border-gray-50 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-500 animate-pulse" />
              Recent Academic Milestones & Badges
            </h3>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {milestones.map(m => (
                <div key={m.id} className="p-3 border border-slate-100/80 bg-slate-50/10 rounded-xl space-y-1 hover:border-slate-200 transition-all">
                  <div className="flex justify-between items-start">
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold font-mono text-[8px] uppercase tracking-wider">{m.rank}</span>
                    <span className="text-[9px] text-slate-400">{m.date}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-850 mt-1">{m.title}</h4>
                  <p className="text-[10px] text-slate-400 leading-tight">{m.desc}</p>
                  <p className="text-[10px] text-indigo-600 font-black mt-1 font-mono">{m.metric}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Semester Daily Attendance & Activity Heatmap Component */}
      <AttendanceCalendarHeatmap
        attendanceRecords={attendanceRecords}
        classes={classes}
        bookings={userBookings}
        studentId={currentUser.uid}
        title="Your Daily Attendance & Activity Heatmap"
        subtitle="Visualizing your daily attendance history and session participation across the term"
      />

      {/* Chronological Attendance Check-In Scan History Log Component */}
      <AttendanceScanHistory
        attendanceRecords={attendanceRecords}
        classes={classes}
        studentName={currentUser.name}
      />

      {/* Class QR Code Attendance Scanner Modal */}
      <ClassQRCodeAttendanceModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        currentUser={currentUser}
        tutorClasses={classes}
        bookings={userBookings}
        attendanceRecords={attendanceRecords}
        onAttendanceMarked={onAttendanceMarked}
        showToast={showToast || ((msg) => console.log(msg))}
      />

    </div>
  );
};
