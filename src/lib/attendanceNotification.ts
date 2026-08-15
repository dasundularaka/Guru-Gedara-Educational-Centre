import { ClassItem, UserProfile, AttendanceRecord } from '../types';
import { firestoreService } from './firestoreService';

export interface AttendanceNotificationResult {
  studentFirstName: string;
  studentUsername: string;
  studentFullIdentifier: string;
  punctualityStatus: string;
  markedTimeFormatted: string;
  classStartEndTimeFormatted: string;
  notificationMessage: string;
}

export interface PunctualityCalculationResult {
  statusText: string;
  isLate: boolean;
  delayMinutes: number;
  gracePeriodApplied: number;
  markedTimeFormatted: string;
  classTimesFormatted: string;
}

export function parseClassScheduleTimes(scheduleStr?: string): { startTimeStr: string; endTimeStr: string } {
  let startTimeStr = "09:00 AM";
  let endTimeStr = "11:00 AM";

  if (scheduleStr) {
    // Match patterns like "09:00 AM - 11:00 AM" or "9:00 - 11:00" or "10:30 AM - 12:30 PM"
    const match = scheduleStr.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    if (match) {
      startTimeStr = match[1].trim();
      endTimeStr = match[2].trim();
    }
  }

  return { startTimeStr, endTimeStr };
}

export function calculatePunctualityStatus(
  scheduleStr: string | undefined,
  markedAtIso: string,
  recordStatus: 'Present' | 'Absent' | string,
  gracePeriodMinutes?: number
): PunctualityCalculationResult {
  const markedDate = new Date(markedAtIso);
  const markedTimeFormatted = markedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  const { startTimeStr, endTimeStr } = parseClassScheduleTimes(scheduleStr);
  const classTimesFormatted = `${startTimeStr} - ${endTimeStr}`;
  const effectiveGrace = typeof gracePeriodMinutes === 'number' ? gracePeriodMinutes : 5;

  if (recordStatus === 'Absent') {
    return {
      statusText: 'Absent',
      isLate: false,
      delayMinutes: 0,
      gracePeriodApplied: effectiveGrace,
      markedTimeFormatted,
      classTimesFormatted
    };
  }

  let statusText = 'On Time';
  let isLate = false;
  let delayMinutes = 0;

  try {
    const timeMatch = startTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;

      const classStart = new Date(markedDate);
      classStart.setHours(hours, minutes, 0, 0);

      const diffMs = markedDate.getTime() - classStart.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      delayMinutes = Math.max(0, diffMinutes);

      if (diffMinutes > effectiveGrace) {
        isLate = true;
        statusText = `Late (by ${diffMinutes} min • Grace ${effectiveGrace}m exceeded)`;
      } else {
        isLate = false;
        statusText = 'On Time';
      }
    }
  } catch (e) {
    statusText = 'On Time';
    isLate = false;
  }

  return {
    statusText,
    isLate,
    delayMinutes,
    gracePeriodApplied: effectiveGrace,
    markedTimeFormatted,
    classTimesFormatted
  };
}

export async function sendAttendanceNotifications(
  record: AttendanceRecord,
  classItem: ClassItem,
  studentUser: UserProfile | undefined | null,
  senderUser?: UserProfile
): Promise<AttendanceNotificationResult & { isLate: boolean; delayMinutes: number }> {
  const rawName = studentUser?.name || record.studentName || 'Student';
  const firstName = rawName.trim().split(' ')[0] || 'Student';
  const username = studentUser?.username || studentUser?.uid || record.studentId || 'N/A';
  const studentFullIdentifier = `${firstName} (${username})`;

  const effectiveGrace = classItem.gracePeriod !== undefined ? classItem.gracePeriod : 5;

  const { statusText, isLate, delayMinutes, markedTimeFormatted, classTimesFormatted } = calculatePunctualityStatus(
    classItem.schedule,
    record.markedAt || new Date().toISOString(),
    record.status,
    effectiveGrace
  );

  const notificationTitle = isLate 
    ? `⚠️ Late Attendance Notice: ${classItem.title}`
    : `✅ Class Attendance Marked: ${classItem.title}`;
  
  const notificationMessage = `📌 Class Attendance Notification
Class: ${classItem.title}
Student: ${studentFullIdentifier}
Status: ${statusText}
Check-in Time: ${markedTimeFormatted}
Class Schedule: ${classTimesFormatted}
Configured Grace Period: ${effectiveGrace} minutes`;

  const studentUid = studentUser?.uid || record.studentId;

  // Verify that the student is an active student for this class
  const isStudentActiveInClass = 
    studentUser?.role === 'student' && 
    studentUser?.classEnrollmentStatus?.[classItem.id] !== 'suspended' &&
    studentUser?.status !== 'suspended';

  if (isStudentActiveInClass && studentUid) {
    try {
      // 1. Send System Notification
      await firestoreService.triggerNotification(
        studentUid,
        notificationTitle,
        notificationMessage,
        isLate ? 'reminder' : 'announcement'
      );

      // 2. Send Direct Messaging System Message
      const senderId = senderUser?.uid || record.tutorId || 'system';
      const senderName = senderUser?.name || record.scannedByName || 'Guru Gedara Attendance System';
      await firestoreService.sendDirectMessage(
        senderId,
        senderName,
        studentUid,
        notificationMessage
      );

      // 3. Log Automated Email / SMS Delivery in Audit Logs & System
      const studentEmail = studentUser?.email || 'N/A';
      await firestoreService.addAuditLog({
        username: senderName,
        action: isLate ? 'LATE_ATTENDANCE_NOTIFICATION_SENT' : 'ATTENDANCE_EMAIL_SENT',
        details: `Automated ${isLate ? 'Late' : 'On-Time'} Notification dispatched to ${studentFullIdentifier} (${studentEmail}): ${statusText} for ${classItem.title} at ${markedTimeFormatted}`
      });
    } catch (err) {
      console.warn("Failed sending attendance notification / message", err);
    }
  }

  return {
    studentFirstName: firstName,
    studentUsername: username,
    studentFullIdentifier,
    punctualityStatus: statusText,
    isLate,
    delayMinutes,
    markedTimeFormatted,
    classStartEndTimeFormatted: classTimesFormatted,
    notificationMessage
  };
}
