import { ClassItem, Booking, AttendanceRecord, UserProfile } from '../types';
import { parseScheduleTimes, parseTimeToTodayDate, isTodayClassDay } from './classScheduleUtils';
import { GoogleCalendarEvent } from './googleCalendarService';
import { firestoreService } from './firestoreService';
import { sendAttendanceNotifications } from './attendanceNotification';

export interface StudentSessionRosterItem {
  studentId: string;
  studentName: string;
  bookingId: string;
  photoURL?: string;
  email?: string;
  grade?: string;
  currentStatus?: 'Present' | 'Absent';
}

export interface ConcludedCalendarSession {
  classId: string;
  classTitle: string;
  subject?: string;
  tutorId: string;
  date: string; // YYYY-MM-DD
  startTimeStr: string; // e.g. "09:00 AM"
  finishTimeStr: string; // e.g. "11:00 AM"
  finishDateTimeIso: string;
  isPastFinishTime: boolean;
  totalBooked: number;
  markedCount: number;
  unmarkedCount: number;
  bookedStudents: StudentSessionRosterItem[];
  googleCalendarEventId?: string;
  isGoogleCalendarSynced: boolean;
}

/**
 * Returns all class sessions that have concluded based on Google Calendar finish times
 * or scheduled class finish times for which attendance marking is pending or incomplete.
 */
export function getConcludedSessionsNeedingAttendance(
  tutorClasses: ClassItem[],
  bookings: Booking[],
  attendanceRecords: AttendanceRecord[],
  allUsers: UserProfile[],
  googleEvents: GoogleCalendarEvent[] = [],
  targetDateStr?: string
): ConcludedCalendarSession[] {
  const now = new Date();
  const dateStr = targetDateStr || now.toISOString().split('T')[0];
  const concluded: ConcludedCalendarSession[] = [];

  for (const cls of tutorClasses) {
    const isToday = isTodayClassDay(cls.dayOfWeek, cls.schedule);
    if (!isToday && !targetDateStr) continue;

    // Parse schedule start & end time
    const { startTimeStr, endTimeStr } = parseScheduleTimes(cls.timeSlot, cls.schedule);
    let finishTimeStr = endTimeStr;
    let finishDate = parseTimeToTodayDate(endTimeStr, new Date());
    let googleEventId: string | undefined = undefined;
    let isGCalSynced = false;

    // Check if there's a matching Google Calendar Event with specific finish time
    if (googleEvents.length > 0) {
      const matchGCal = googleEvents.find(e => 
        e.summary && 
        e.summary.toLowerCase().includes(cls.title.toLowerCase())
      );
      if (matchGCal) {
        googleEventId = matchGCal.id;
        isGCalSynced = true;
        if (matchGCal.end?.dateTime) {
          const gcalFinishDate = new Date(matchGCal.end.dateTime);
          if (!isNaN(gcalFinishDate.getTime())) {
            finishDate = gcalFinishDate;
            finishTimeStr = gcalFinishDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
          }
        }
      }
    }

    // Is current time past the Google Calendar / schedule finish time?
    const isPastFinishTime = now.getTime() >= finishDate.getTime();

    // Get active bookings for this class
    const activeBookings = bookings.filter(b => b.classId === cls.id && b.status === 'active');
    if (activeBookings.length === 0) continue;

    // Build student roster & check existing attendance for dateStr
    const bookedStudents: StudentSessionRosterItem[] = [];
    let markedCount = 0;
    let unmarkedCount = 0;

    for (const b of activeBookings) {
      const studentObj = allUsers.find(u => u.uid === b.studentId || u.username === b.studentId);
      const sId = b.studentId || b.id;

      // Find existing record
      const record = attendanceRecords.find(r => 
        r.classId === cls.id && 
        r.date === dateStr && 
        (r.studentId === sId || r.studentId === b.studentId)
      );

      let currentStatus: 'Present' | 'Absent' | undefined = undefined;
      if (record) {
        currentStatus = record.status;
        markedCount++;
      } else {
        unmarkedCount++;
      }

      bookedStudents.push({
        studentId: sId,
        studentName: b.studentName || studentObj?.name || 'Student',
        bookingId: b.id,
        photoURL: studentObj?.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${sId}`,
        email: b.studentEmail || studentObj?.email || '',
        grade: studentObj?.studentDetails?.grade,
        currentStatus
      });
    }

    // Prompt condition: Session finish time has been reached/passed AND at least 1 student is unmarked (or tutor wants to review)
    if (isPastFinishTime && (unmarkedCount > 0 || bookedStudents.length > 0)) {
      concluded.push({
        classId: cls.id,
        classTitle: cls.title,
        subject: cls.subject,
        tutorId: cls.tutorId,
        date: dateStr,
        startTimeStr,
        finishTimeStr,
        finishDateTimeIso: finishDate.toISOString(),
        isPastFinishTime,
        totalBooked: activeBookings.length,
        markedCount,
        unmarkedCount,
        bookedStudents,
        googleCalendarEventId: googleEventId,
        isGoogleCalendarSynced: isGCalSynced
      });
    }
  }

  return concluded;
}

/**
 * Bulk save attendance for a concluded Google Calendar session
 */
export async function saveConcludedSessionAttendance(
  session: ConcludedCalendarSession,
  statusMap: Record<string, 'Present' | 'Absent'>,
  notesMap: Record<string, string> = {},
  sessionTopic: string = '',
  currentUser?: UserProfile,
  tutorClasses: ClassItem[] = [],
  executeWriteWithRetry?: any
): Promise<number> {
  let savedCount = 0;
  const targetClass = tutorClasses.find(c => c.id === session.classId);

  for (const student of session.bookedStudents) {
    const status = statusMap[student.studentId] || 'Present';
    const recordId = `${session.classId}_${student.studentId}_${session.date}`;

    const record: AttendanceRecord = {
      id: recordId,
      classId: session.classId,
      classTitle: session.classTitle,
      studentId: student.studentId,
      studentName: student.studentName,
      date: session.date,
      status: status,
      markedAt: new Date().toISOString(),
      tutorId: session.tutorId,
      type: 'manual',
      scannedByName: currentUser?.name || 'Tutor (Google Calendar Auto-Prompt)',
      notes: notesMap[student.studentId] || (sessionTopic ? `Topic: ${sessionTopic}` : 'Marked via Google Calendar finish prompt.')
    };

    try {
      if (executeWriteWithRetry) {
        await executeWriteWithRetry(
          `Save Session Attendance (${status}) for ${student.studentName}`,
          async () => {
            await firestoreService.markAttendance(record);
          }
        );
      } else {
        await firestoreService.markAttendance(record);
      }

      // Trigger notification for student
      if (targetClass) {
        await sendAttendanceNotifications(record, targetClass, null, currentUser);
      }

      savedCount++;
    } catch (e) {
      console.warn(`Failed saving attendance for ${student.studentName}:`, e);
    }
  }

  // Record Audit Log
  try {
    await firestoreService.addAuditLog({
      username: currentUser?.username || currentUser?.name || 'Tutor',
      action: 'GOOGLE_CALENDAR_ATTENDANCE_PROMPT_FINALIZED',
      details: `Finalized attendance for session "${session.classTitle}" (${session.date}, ended at ${session.finishTimeStr}). Marked ${savedCount} student(s).`
    });
  } catch (err) {
    console.warn("Failed recording audit log:", err);
  }

  return savedCount;
}
