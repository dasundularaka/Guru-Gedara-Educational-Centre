import React from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, ShieldCheck, TrendingUp, Sparkles } from 'lucide-react';

export interface AttendanceHealthProgressBarProps {
  presentCount: number;
  absentCount: number;
  unmarkedCount?: number;
  totalCount: number;
  size?: 'sm' | 'md' | 'lg';
  showBreakdown?: boolean;
  showHealthBadge?: boolean;
  compact?: boolean;
  label?: string;
  className?: string;
  sessionTitle?: string;
  sessionDate?: string;
}

export function getAttendanceHealthInfo(presentCount: number, totalCount: number) {
  if (totalCount === 0) {
    return {
      rate: 0,
      level: 'No Enrollment',
      color: 'slate',
      badgeBg: 'bg-slate-100 text-slate-600 border-slate-200',
      barColor: 'bg-slate-300',
      icon: Clock,
      description: 'No student registrations active'
    };
  }

  const rate = Math.round((presentCount / totalCount) * 100);

  if (rate >= 85) {
    return {
      rate,
      level: 'Optimal Health',
      color: 'emerald',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      barColor: 'bg-emerald-500',
      icon: ShieldCheck,
      description: 'High student attendance & engagement'
    };
  } else if (rate >= 70) {
    return {
      rate,
      level: 'Good Health',
      color: 'indigo',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      barColor: 'bg-indigo-500',
      icon: TrendingUp,
      description: 'Consistent class attendance'
    };
  } else if (rate >= 50) {
    return {
      rate,
      level: 'Moderate Health',
      color: 'amber',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      barColor: 'bg-amber-500',
      icon: AlertTriangle,
      description: 'Some students pending or absent'
    };
  } else {
    return {
      rate,
      level: 'Needs Attention',
      color: 'rose',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      barColor: 'bg-rose-500',
      icon: AlertTriangle,
      description: 'Low attendance rate recorded'
    };
  }
}

export const AttendanceHealthProgressBar: React.FC<AttendanceHealthProgressBarProps> = ({
  presentCount,
  absentCount,
  unmarkedCount,
  totalCount,
  size = 'md',
  showBreakdown = true,
  showHealthBadge = true,
  compact = false,
  label,
  className = '',
  sessionTitle,
  sessionDate
}) => {
  const calcUnmarked = unmarkedCount !== undefined 
    ? unmarkedCount 
    : Math.max(0, totalCount - presentCount - absentCount);

  const health = getAttendanceHealthInfo(presentCount, totalCount);
  const IconComponent = health.icon;

  const presentPercent = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;
  const absentPercent = totalCount > 0 ? (absentCount / totalCount) * 100 : 0;
  const unmarkedPercent = totalCount > 0 ? (calcUnmarked / totalCount) * 100 : 0;

  const barHeight = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3.5' : 'h-2.5';
  const radiusClass = size === 'sm' ? 'rounded-full' : 'rounded-lg';

  if (compact) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-800">{label || 'Attendance Health'}</span>
            {showHealthBadge && (
              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border font-mono ${health.badgeBg}`}>
                {health.rate}% Present
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono font-medium text-slate-500">
            {presentCount}/{totalCount} Present
          </span>
        </div>

        {/* Progress Bar Container */}
        <div className={`w-full bg-slate-100 overflow-hidden flex ${barHeight} ${radiusClass} shadow-inner`}>
          <div 
            style={{ width: `${presentPercent}%` }} 
            className="bg-emerald-500 transition-all duration-500 ease-out" 
            title={`Present: ${presentCount} (${Math.round(presentPercent)}%)`}
          />
          <div 
            style={{ width: `${absentPercent}%` }} 
            className="bg-rose-500 transition-all duration-500 ease-out" 
            title={`Absent: ${absentCount} (${Math.round(absentPercent)}%)`}
          />
          <div 
            style={{ width: `${unmarkedPercent}%` }} 
            className="bg-slate-300 transition-all duration-500 ease-out" 
            title={`Unmarked: ${calcUnmarked} (${Math.round(unmarkedPercent)}%)`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-50/80 border border-slate-100 rounded-2xl p-4 font-sans space-y-3 ${className}`}>
      
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-900 tracking-tight">
              {label || (sessionTitle ? `${sessionTitle} Health` : 'Session Attendance Health')}
            </span>
            {sessionDate && (
              <span className="text-[10px] font-mono text-slate-400 font-medium">
                ({sessionDate})
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {health.description}
          </p>
        </div>

        {showHealthBadge && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-2xs ${health.badgeBg}`}>
            <IconComponent className="w-3.5 h-3.5" />
            <span>{health.level}</span>
            <span className="font-mono text-[11px] font-extrabold bg-white/70 px-1.5 py-0.2 rounded-md shadow-2xs">
              {health.rate}%
            </span>
          </div>
        )}
      </div>

      {/* Visual Multi-Segment Progress Bar */}
      <div className="space-y-1.5">
        <div className={`w-full bg-slate-200/80 overflow-hidden flex ${barHeight} ${radiusClass} shadow-inner p-0.5`}>
          {totalCount === 0 ? (
            <div className="w-full bg-slate-300 rounded-md" />
          ) : (
            <>
              {presentPercent > 0 && (
                <div 
                  style={{ width: `${presentPercent}%` }} 
                  className="bg-emerald-500 rounded-l-md transition-all duration-500 ease-out relative group"
                  title={`Present: ${presentCount} (${Math.round(presentPercent)}%)`}
                />
              )}
              {absentPercent > 0 && (
                <div 
                  style={{ width: `${absentPercent}%` }} 
                  className="bg-rose-500 transition-all duration-500 ease-out relative group"
                  title={`Absent: ${absentCount} (${Math.round(absentPercent)}%)`}
                />
              )}
              {unmarkedPercent > 0 && (
                <div 
                  style={{ width: `${unmarkedPercent}%` }} 
                  className={`bg-slate-300 transition-all duration-500 ease-out ${presentPercent === 0 && absentPercent === 0 ? 'rounded-md' : 'rounded-r-md'}`}
                  title={`Unmarked: ${calcUnmarked} (${Math.round(unmarkedPercent)}%)`}
                />
              )}
            </>
          )}
        </div>

        {/* Progress Bar Markers */}
        <div className="flex justify-between text-[9px] font-mono text-slate-400 px-0.5">
          <span>0%</span>
          <span>50%</span>
          <span>100% Target</span>
        </div>
      </div>

      {/* Breakdown Badges */}
      {showBreakdown && (
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-[10px]">
          <div className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-emerald-100 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <div className="truncate">
              <span className="font-bold text-slate-800">{presentCount}</span>
              <span className="text-slate-400 ml-1">Present ({Math.round(presentPercent)}%)</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-rose-100 shadow-2xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <div className="truncate">
              <span className="font-bold text-slate-800">{absentCount}</span>
              <span className="text-slate-400 ml-1">Absent ({Math.round(absentPercent)}%)</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <div className="truncate">
              <span className="font-bold text-slate-800">{calcUnmarked}</span>
              <span className="text-slate-400 ml-1">Pending</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
