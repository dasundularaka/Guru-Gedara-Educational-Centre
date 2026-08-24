import { ClassItem, Booking, UserProfile, AttendanceRecord } from '../types';
import { firestoreService, safeStringify } from './firestoreService';
import { sendAttendanceNotifications } from './attendanceNotification';

export interface ExtraClassSession {
  classId: string;
  classTitle: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "02:00 PM"
  endTime: string;   // e.g. "04:00 PM"
  timeSlotStr: string; // e.g. "02:00 PM - 04:00 PM"
  expiresAt: number; // Unix timestamp in ms
  createdAt: string;
}

const EXTRA_CLASS_STORAGE_KEY = 'gurugedara_extra_class_sessions';

// Parse start time & end time from timeSlot or schedule string
export function parseScheduleTimes(timeSlot?: string, schedule?: string): { startTimeStr: string; endTimeStr: string } {
  let startTimeStr = "09:00 AM";
  let endTimeStr = "11:00 AM";

  const targetStr = schedule || timeSlot || "";
  const matchRange = targetStr.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
  if (matchRange) {
    startTimeStr = matchRange[1].trim();
    endTimeStr = matchRange[2].trim();
  } else {
    const matchSingle = targetStr.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    if (matchSingle) {
      startTimeStr = matchSingle[1].trim();
      const d = parseTimeToTodayDate(startTimeStr);
      d.setHours(d.getHours() + 2);
      endTimeStr = formatTimeFromDate(d);
    }
  }

  return { startTimeStr, endTimeStr };
}

// Convert time string like "10:00 AM" or "14:30" to Date on given base date
export function parseTimeToTodayDate(timeStr: string, baseDate: Date = new Date()): Date {
  const result = new Date(baseDate);
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3] ? match[3].toUpperCase() : null;

    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    result.setHours(hours, minutes, 0, 0);
  }
  return result;
}

export function formatTimeFromDate(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Check if today matches class dayOfWeek
export function isTodayClassDay(dayOfWeekStr?: string, scheduleStr?: string): boolean {
  if (!dayOfWeekStr && !scheduleStr) return true;

  const todayIndex = new Date().getDay();
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const todayName = dayNames[todayIndex];

  const target = `${dayOfWeekStr || ''} ${scheduleStr || ''}`.toLowerCase();
  
  if (target.includes(todayName) || target.includes(`${todayName}s`)) {
    return true;
  }
  return false;
}

// Check if current time is within class scheduled time slot
export function isCurrentTimeInClassWindow(
  timeSlot?: string, 
  schedule?: string, 
  graceBeforeMins: number = 30, 
  graceAfterMins: number = 30
): { isInWindow: boolean; isPastEndTime: boolean; startTimeStr: string; endTimeStr: string } {
  const now = new Date();
  const { startTimeStr, endTimeStr } = parseScheduleTimes(timeSlot, schedule);

  const startD = parseTimeToTodayDate(startTimeStr, now);
  const endD = parseTimeToTodayDate(endTimeStr, now);

  if (endD.getTime() <= startD.getTime()) {
    endD.setHours(startD.getHours() + 2);
  }

  const startWithGrace = new Date(startD.getTime() - graceBeforeMins * 60 * 1000);
  const endWithGrace = new Date(endD.getTime() + graceAfterMins * 60 * 1000);

  const isInWindow = now.getTime() >= startWithGrace.getTime() && now.getTime() <= endWithGrace.getTime();
  const isPastEndTime = now.getTime() > endWithGrace.getTime();

  return { isInWindow, isPastEndTime, startTimeStr, endTimeStr };
}

// Manage stored Extra Class Sessions
export function getStoredExtraClassSessions(): Record<string, ExtraClassSession> {
  try {
    const raw = localStorage.getItem(EXTRA_CLASS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: Record<string, ExtraClassSession> = JSON.parse(raw);
    const now = Date.now();
    const active: Record<string, ExtraClassSession> = {};

    Object.keys(parsed).forEach(classId => {
      if (parsed[classId] && parsed[classId].expiresAt > now) {
        active[classId] = parsed[classId];
      }
    });

    if (Object.keys(active).length !== Object.keys(parsed).length) {
      localStorage.setItem(EXTRA_CLASS_STORAGE_KEY, safeStringify(active));
    }

    return active;
  } catch (e) {
    return {};
  }
}

export function getActiveExtraClassSession(classId: string): ExtraClassSession | null {
  const sessions = getStoredExtraClassSessions();
  const session = sessions[classId];
  if (session && session.expiresAt > Date.now()) {
    return session;
  }
  return null;
}

export function saveExtraClassSession(session: ExtraClassSession): void {
  const sessions = getStoredExtraClassSessions();
  sessions[session.classId] = session;
  localStorage.setItem(EXTRA_CLASS_STORAGE_KEY, safeStringify(sessions));
}

export function removeExtraClassSession(classId: string): void {
  const sessions = getStoredExtraClassSessions();
  delete sessions[classId];
  localStorage.setItem(EXTRA_CLASS_STORAGE_KEY, safeStringify(sessions));
}

// Validate if QR attendance can be marked for a class
export function validateQRAttendanceWindow(classItem: ClassItem): {
  allowed: boolean;
  reason?: string;
  isExtraClass: boolean;
  extraClassSession?: ExtraClassSession | null;
} {
  const activeExtra = getActiveExtraClassSession(classItem.id);
  if (activeExtra) {
    return {
      allowed: true,
      isExtraClass: true,
      extraClassSession: activeExtra
    };
  }

  const isToday = isTodayClassDay(classItem.dayOfWeek, classItem.schedule);
  const { isInWindow, isPastEndTime, startTimeStr, endTimeStr } = isCurrentTimeInClassWindow(classItem.timeSlot, classItem.schedule);

  if (!isToday) {
    return {
      allowed: false,
      reason: `Today is not a scheduled class day for ${classItem.title} (${classItem.dayOfWeek || 'Scheduled Days'} @ ${classItem.timeSlot || 'Scheduled Time'}).`,
      isExtraClass: false
    };
  }

  if (!isInWindow) {
    if (isPastEndTime) {
      return {
        allowed: false,
        reason: `Scheduled class time for ${classItem.title} (${startTimeStr} - ${endTimeStr}) has ended for today.`,
        isExtraClass: false
      };
    } else {
      return {
        allowed: false,
        reason: `Class session for ${classItem.title} is scheduled for ${startTimeStr}. QR Attendance scanner opens 30 minutes prior.`,
        isExtraClass: false
      };
    }
  }

  return {
    allowed: true,
    isExtraClass: false
  };
}

// Auto-Absent Student Checker Routine
export async function checkAndMarkAutoAbsentStudents(
  classes: ClassItem[],
  bookings: Booking[],
  allUsers: UserProfile[],
  existingAttendance: AttendanceRecord[]
): Promise<AttendanceRecord[]> {
  const todayStr = new Date().toISOString().split('T')[0];
  const newAbsentRecords: AttendanceRecord[] = [];

  for (const cls of classes) {
    const isToday = isTodayClassDay(cls.dayOfWeek, cls.schedule);
    const { isPastEndTime } = isCurrentTimeInClassWindow(cls.timeSlot, cls.schedule);

    // If today is scheduled class day AND regular class time is over
    if (isToday && isPastEndTime) {
      const enrolledStudentIds = new Set<string>();

      // From active bookings
      bookings.forEach(b => {
        if (b.classId === cls.id && b.status === 'active') {
          enrolledStudentIds.add(b.studentId);
        }
      });

      // From selectedClasses in user profile
      allUsers.forEach(u => {
        if ((u.role === 'student' || (!u.role && u.username?.startsWith('GB'))) && u.selectedClasses?.includes(cls.id)) {
          enrolledStudentIds.add(u.uid);
        }
      });

      for (const studentId of Array.from(enrolledStudentIds)) {
        const alreadyMarked = existingAttendance.some(a => 
          a.classId === cls.id && 
          a.date === todayStr && 
          (a.studentId === studentId || a.studentId === studentId)
        ) || newAbsentRecords.some(a => a.classId === cls.id && a.date === todayStr && a.studentId === studentId);

        if (!alreadyMarked) {
          const studentObj = allUsers.find(u => u.uid === studentId || u.username === studentId);
          const studentName = studentObj?.name || studentObj?.username || 'Student';

          const absentRecord: AttendanceRecord = {
            id: `auto_absent_${cls.id}_${studentId}_${todayStr}`,
            classId: cls.id,
            classTitle: cls.title,
            studentId: studentId,
            studentName: studentName,
            date: todayStr,
            status: 'Absent',
            markedAt: new Date().toISOString(),
            tutorId: cls.tutorId,
            type: 'manual',
            scannedByName: 'System Auto-Absent',
            notes: 'Automatically marked absent as class session concluded without QR check-in.'
          };

          try {
            await firestoreService.markAttendance(absentRecord);
            newAbsentRecords.push(absentRecord);

            // Automatically dispatch absence reminder email & notification
            try {
              await sendAttendanceNotifications(absentRecord, cls, studentObj);
            } catch (notifErr) {
              console.warn("Failed dispatching auto absent notification:", notifErr);
            }
          } catch (e) {
            console.warn("Failed creating auto absent record", e);
          }
        }
      }
    }
  }

  return newAbsentRecords;
}
