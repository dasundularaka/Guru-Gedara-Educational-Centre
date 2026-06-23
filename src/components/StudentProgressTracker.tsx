import React, { useState, useMemo } from 'react';
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
  Compass
} from 'lucide-react';
import { Booking, ClassItem, UserProfile } from '../types';

interface StudentProgressTrackerProps {
  currentUser: UserProfile;
  userBookings: Booking[];
  classes: ClassItem[];
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
    weeklyGrades
  };
}

export const StudentProgressTracker: React.FC<StudentProgressTrackerProps> = ({ currentUser, userBookings, classes }) => {
  const [selectedClassId, setSelectedClassId] = useState<string>("overall");
  
  // Predictor state
  const [predictSubject, setPredictSubject] = useState<string>("overall");
  const [desiredGrade, setDesiredGrade] = useState<number>(90);
  const [currentScore, setCurrentScore] = useState<number>(85);
  const [remainingWeight, setRemainingWeight] = useState<number>(30); // e.g. final is 30%

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
      // Return beautiful synthetic demo courses so the student sees how it works if not enrolled yet
      const fallbackCourses = [
        { id: "demo_math", title: "AP Calculus AB: Mastering the Core", subject: "Mathematics", tutor: "Dr. Sarah Jenkins" },
        { id: "demo_coding", title: "Web Development Essentials: HTML, CSS, JS", subject: "Coding", tutor: "David Kross" },
        { id: "demo_physics", title: "Newtonian Physics & Classical Mechanics", subject: "Physics", tutor: "Prof. Marcus Chen" }
      ];
      return fallbackCourses.map(c => getCourseMetrics(c.id, c.title, c.subject, c.tutor));
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

  // Weekly aggregate trend or course-specific trend
  const trendData = useMemo(() => {
    if (selectedClassId === "overall") {
      // Mean score of all courses per week
      return Array.from({ length: 6 }).map((_, idx) => {
        const weekStr = `Week ${idx + 1}`;
        let sum = 0;
        progressList.forEach(course => {
          sum += course.weeklyGrades[idx]?.score || 85;
        });
        return {
          name: weekStr,
          "Average Grade": Math.round(sum / progressList.length)
        };
      });
    } else {
      const selected = progressList.find(c => c.classId === selectedClassId);
      if (!selected) return [];
      return selected.weeklyGrades.map(wg => ({
        name: wg.week,
        "Syllabus Grade": wg.score
      }));
    }
  }, [progressList, selectedClassId]);

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
      
      {/* Dynamic Info Header Badge */}
      {activeBookings.length === 0 && (
        <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-start gap-3.5 mb-2">
          <div className="p-2 bg-orange-100 text-orange-850 rounded-xl">
            <Sparkles className="w-5 h-5 text-orange-700 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-orange-950">Viewing Course Simulator Analytics</h4>
            <p className="text-[11px] text-orange-700 leading-relaxed mt-0.5">
              You are currently registered in 0 active courses. We are displaying a fully-simulated standard syllabus report for demo purposes. Register in courses in the Academic Classes panel to automatically connect secure academic charts!
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
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Grade Progress Timeline</h3>
                <p className="text-[11px] text-slate-400">Weekly average test scores from study units coursework.</p>
              </div>
              
              {/* Dropdown to isolate specific course or review overall */}
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="overall">All Courses Average</option>
                {progressList.map(course => (
                  <option key={course.classId} value={course.classId}>{course.title}</option>
                ))}
              </select>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-68 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorGrade" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
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
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderRadius: '12px', 
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey={selectedClassId === "overall" ? "Average Grade" : "Syllabus Grade"} 
                    stroke="#4f46e5" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorGrade)" 
                  />
                </AreaChart>
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

    </div>
  );
};
