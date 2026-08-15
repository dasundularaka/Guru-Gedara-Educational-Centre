import { AttendanceRecord, ClassItem } from '../types';
import { calculatePunctualityStatus } from './attendanceNotification';

export interface StudentPunctualitySummary {
  studentId: string;
  totalSessions: number;
  totalPresent: number;
  totalAbsent: number;
  lateCount: number;
  onTimeCount: number;
  lateRate: number; // 0 to 100
  onTimeRate: number; // 0 to 100
  isConsistentlyLate: boolean;
  averageDelayMinutes: number;
  badgeLabel: string;
  badgeDescription: string;
  detailedRecords: Array<{
    record: AttendanceRecord;
    classItem?: ClassItem;
    isLate: boolean;
    delayMinutes: number;
    gracePeriodApplied: number;
    statusText: string;
    formattedTime: string;
  }>;
}

/**
 * Calculates historical punctuality statistics for a student across all classes or a specific class.
 * A student is flagged as 'Consistently Late' if they frequently log in/check in after the class start
 * time beyond the tutor-configured grace period.
 */
export function calculateStudentPunctuality(
  studentId: string,
  allAttendanceRecords: AttendanceRecord[],
  allClasses: ClassItem[],
  specificClassId?: string
): StudentPunctualitySummary {
  if (!studentId) {
    return {
      studentId: '',
      totalSessions: 0,
      totalPresent: 0,
      totalAbsent: 0,
      lateCount: 0,
      onTimeCount: 0,
      lateRate: 0,
      onTimeRate: 100,
      isConsistentlyLate: false,
      averageDelayMinutes: 0,
      badgeLabel: '',
      badgeDescription: '',
      detailedRecords: []
    };
  }

  // Filter records belonging to this student (match by studentId or username)
  const studentRecords = allAttendanceRecords.filter(r => {
    const matchStudent = r.studentId === studentId || (r as any).studentUid === studentId;
    const matchClass = specificClassId ? r.classId === specificClassId : true;
    return matchStudent && matchClass;
  });

  const detailedRecords: StudentPunctualitySummary['detailedRecords'] = [];
  let totalPresent = 0;
  let totalAbsent = 0;
  let lateCount = 0;
  let onTimeCount = 0;
  let totalDelay = 0;

  studentRecords.forEach(rec => {
    const classItem = allClasses.find(c => c.id === rec.classId);
    const gracePeriod = classItem?.gracePeriod !== undefined ? classItem.gracePeriod : 5;

    if (rec.status === 'Absent') {
      totalAbsent++;
      detailedRecords.push({
        record: rec,
        classItem,
        isLate: false,
        delayMinutes: 0,
        gracePeriodApplied: gracePeriod,
        statusText: 'Absent',
        formattedTime: rec.markedAt ? new Date(rec.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'
      });
      return;
    }

    totalPresent++;
    const punctuality = calculatePunctualityStatus(
      classItem?.schedule,
      rec.markedAt || new Date().toISOString(),
      rec.status,
      gracePeriod
    );

    const isLate = rec.isLate !== undefined ? rec.isLate : punctuality.isLate;
    const delayMinutes = rec.delayMinutes !== undefined ? rec.delayMinutes : punctuality.delayMinutes;

    if (isLate) {
      lateCount++;
      totalDelay += delayMinutes;
    } else {
      onTimeCount++;
    }

    detailedRecords.push({
      record: rec,
      classItem,
      isLate,
      delayMinutes,
      gracePeriodApplied: gracePeriod,
      statusText: punctuality.statusText,
      formattedTime: punctuality.markedTimeFormatted
    });
  });

  // Sort descending by date
  detailedRecords.sort((a, b) => {
    const timeA = new Date(a.record.markedAt || a.record.date).getTime();
    const timeB = new Date(b.record.markedAt || b.record.date).getTime();
    return timeB - timeA;
  });

  const totalSessions = totalPresent + totalAbsent;
  const lateRate = totalPresent > 0 ? Math.round((lateCount / totalPresent) * 100) : 0;
  const onTimeRate = totalPresent > 0 ? Math.round((onTimeCount / totalPresent) * 100) : 100;
  const averageDelayMinutes = lateCount > 0 ? Math.round(totalDelay / lateCount) : 0;

  // Consistent Late Arrival condition:
  // Flagged if student has >= 2 attended sessions and late on >= 35% of attended sessions,
  // or if they have accumulated 3 or more late sessions.
  const isConsistentlyLate = (totalPresent >= 2 && lateCount >= 2 && lateRate >= 35) || (lateCount >= 3);

  const badgeLabel = isConsistentlyLate ? 'Late Arrival' : '';
  const badgeDescription = isConsistentlyLate 
    ? `Frequent Late Check-ins: ${lateCount} of ${totalPresent} sessions logged in after class start time + grace period (Avg delay: ${averageDelayMinutes} mins).`
    : 'Punctuality is healthy.';

  return {
    studentId,
    totalSessions,
    totalPresent,
    totalAbsent,
    lateCount,
    onTimeCount,
    lateRate,
    onTimeRate,
    isConsistentlyLate,
    averageDelayMinutes,
    badgeLabel,
    badgeDescription,
    detailedRecords
  };
}
