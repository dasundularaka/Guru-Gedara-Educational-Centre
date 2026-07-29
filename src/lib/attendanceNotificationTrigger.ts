import { firestoreService } from './firestoreService';
import { AttendanceRecord, Booking, NotificationItem } from '../types';

export interface AttendanceThresholdStatus {
  classId: string;
  classTitle: string;
  totalSessions: number;
  presentCount: number;
  attendanceRate: number; // e.g. 75.0%
  isBelowThreshold: boolean;
  threshold: number; // e.g. 80%
}

/**
  * Evaluates attendance records for a specific student across all their enrolled classes.
  * If attendance rate for a class drops below the threshold (default 80%), it automatically 
  * triggers a high-priority warning notification if one has not been dispatched recently.
  */
export async function checkAndTriggerAttendanceAlerts(
  studentId: string,
  studentName: string,
  bookings: Booking[],
  attendanceRecords: AttendanceRecord[],
  threshold: number = 80
): Promise<AttendanceThresholdStatus[]> {
  const studentBookings = bookings.filter(b => (b.studentId === studentId || b.id === studentId) && b.status === 'active');
  const studentRecords = attendanceRecords.filter(r => r.studentId === studentId);

  const statuses: AttendanceThresholdStatus[] = [];

  for (const booking of studentBookings) {
    const classRecords = studentRecords.filter(r => r.classId === booking.classId);
    const totalSessions = classRecords.length;
    const presentCount = classRecords.filter(r => r.status === 'Present').length;

    // Only evaluate threshold if at least 2 sessions have been logged
    if (totalSessions >= 2) {
      const attendanceRate = Math.round((presentCount / totalSessions) * 100);
      const isBelowThreshold = attendanceRate < threshold;

      statuses.push({
        classId: booking.classId,
        classTitle: booking.classTitle,
        totalSessions,
        presentCount,
        attendanceRate,
        isBelowThreshold,
        threshold
      });

      if (isBelowThreshold) {
        // Check if notification was already triggered today
        try {
          const existingNotifications = await firestoreService.getNotifications(studentId);
          const recentAlert = existingNotifications.find(n => 
            n.title.includes('Attendance Alert') && 
            n.message.includes(booking.classTitle) &&
            new Date(n.createdAt).toDateString() === new Date().toDateString()
          );

          if (!recentAlert) {
            await firestoreService.triggerNotification(
              studentId,
              `⚠️ Attendance Alert: ${booking.classTitle}`,
              `Your attendance rate for ${booking.classTitle} is currently ${attendanceRate}% (below the ${threshold}% requirement). Please attend upcoming sessions to maintain your academic standing.`,
              'reminder'
            );
          }
        } catch (err) {
          console.warn("Failed checking existing notifications:", err);
        }
      }
    }
  }

  return statuses;
}

/**
 * Allows Tutors to explicitly send a low-attendance notification trigger to a specific student.
 */
export async function triggerManualAttendanceWarning(
  studentId: string,
  studentName: string,
  classTitle: string,
  currentRate: number,
  customNote?: string
): Promise<NotificationItem> {
  const message = `Official Academic Warning: Your attendance in ${classTitle} is currently ${currentRate}%. ${
    customNote || 'Please contact your instructor or attend scheduled tutoring sessions to stay on track.'
  }`;

  return await firestoreService.triggerNotification(
    studentId,
    `⚠️ Official Attendance Notice: ${classTitle}`,
    message,
    'reminder'
  );
}
