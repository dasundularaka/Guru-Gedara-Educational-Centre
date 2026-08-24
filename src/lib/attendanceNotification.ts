import { ClassItem, UserProfile, AttendanceRecord } from '../types';
import { firestoreService } from './firestoreService';
import { emailNotificationService } from './emailNotificationService';

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
  classItem?: ClassItem | null,
  studentUser?: UserProfile | undefined | null,
  senderUser?: UserProfile
): Promise<AttendanceNotificationResult & { isLate: boolean; delayMinutes: number }> {
  // 1. Resolve studentUser and classItem if missing or incomplete
  let activeStudent = studentUser;
  if (!activeStudent || !activeStudent.email) {
    try {
      activeStudent = await firestoreService.getUserProfile(record.studentId);
    } catch (e) {
      console.warn("Could not fetch student profile for attendance notification:", e);
    }
  }

  let activeClass = classItem;
  if (!activeClass) {
    try {
      activeClass = await firestoreService.getClass(record.classId);
    } catch (e) {
      console.warn("Could not fetch class item for attendance notification:", e);
    }
  }

  const courseTitle = activeClass?.title || record.classTitle || 'Class Session';
  const rawName = activeStudent?.name || record.studentName || 'Student';
  const firstName = rawName.trim().split(' ')[0] || 'Student';
  const username = activeStudent?.username || activeStudent?.uid || record.studentId || 'N/A';
  const studentFullIdentifier = `${firstName} (${username})`;

  const effectiveGrace = activeClass?.gracePeriod !== undefined ? activeClass.gracePeriod : 5;

  const { statusText, isLate, delayMinutes, markedTimeFormatted, classTimesFormatted } = calculatePunctualityStatus(
    activeClass?.schedule,
    record.markedAt || new Date().toISOString(),
    record.status,
    effectiveGrace
  );

  const isAbsent = record.status === 'Absent';

  const notificationTitle = isAbsent
    ? `⚠️ Absence Notice & Catch-Up Reminder: ${courseTitle}`
    : (isLate 
        ? `⚠️ Late Attendance Notice: ${courseTitle}`
        : `✅ Class Attendance Marked: ${courseTitle}`);
  
  // Check parent email link & CC configuration
  const hasParentEmailLinked = !!(activeStudent?.parentEmail && (activeStudent?.isParentEmailLinked || activeStudent?.ccParentOnNotifications));
  const isParentAttendanceCcEnabled = hasParentEmailLinked && (activeStudent?.parentEmailCcPreferences?.attendance !== false);

  const parentCcNote = isParentAttendanceCcEnabled 
    ? `\n📧 Parent CC: Auto-dispatched to ${activeStudent?.parentEmail}` 
    : '';

  const notificationMessage = isAbsent
    ? `📌 Class Absence & Catch-Up Advisory
Class: ${courseTitle}
Student: ${studentFullIdentifier}
Status: Absent (Session missed on ${record.date})
Scheduled Time: ${classTimesFormatted}
Instructor: ${activeClass?.tutorName || senderUser?.name || 'Faculty Tutor'}

⚠️ Action Required: Please log in to your student portal to access the uploaded study notes, lecture recordings, and complete any missed homework assignments before the next class.${parentCcNote}`
    : `📌 Class Attendance Notification
Class: ${courseTitle}
Student: ${studentFullIdentifier}
Status: ${statusText}
Check-in Time: ${markedTimeFormatted}
Class Schedule: ${classTimesFormatted}
Configured Grace Period: ${effectiveGrace} minutes${parentCcNote}`;

  const studentUid = activeStudent?.uid || record.studentId;

  // Send notifications if student identifier is available
  if (studentUid) {
    try {
      // 1. Send System Notification to Student
      await firestoreService.triggerNotification(
        studentUid,
        notificationTitle,
        notificationMessage,
        isAbsent || isLate ? 'reminder' : 'announcement'
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

      // 3. Automated Parent Email CC Notification Dispatch
      if (isParentAttendanceCcEnabled && activeStudent?.parentEmail) {
        try {
          await firestoreService.triggerNotification(
            activeStudent.parentEmail,
            `[Parent CC] ${notificationTitle}`,
            `Advisory for ${studentFullIdentifier}:\n${notificationMessage}`,
            isAbsent || isLate ? 'reminder' : 'announcement'
          );
        } catch (parentNotifErr) {
          console.warn("Parent CC notification dispatch warning:", parentNotifErr);
        }
      }

      // 4. Trigger Automated Rich HTML Email Service (Firebase Cloud Function / Mail queue)
      try {
        await emailNotificationService.notifyAttendanceMarked({
          record,
          classItem: activeClass,
          studentUser: activeStudent,
          punctualityStatusText: statusText,
          isLate,
          delayMinutes,
          markedTimeFormatted,
          classTimesFormatted
        });
      } catch (emailErr) {
        console.warn("Automated email service dispatch warning:", emailErr);
      }

      // 5. Log Automated Email Delivery in Audit Logs
      const studentEmail = activeStudent?.email || 'N/A';
      await firestoreService.addAuditLog({
        username: senderName,
        action: isAbsent ? 'ABSENT_ATTENDANCE_REMINDER_SENT' : (isLate ? 'LATE_ATTENDANCE_NOTIFICATION_SENT' : 'ATTENDANCE_EMAIL_SENT'),
        details: `Automated ${isAbsent ? 'Absence Catch-Up Reminder' : (isLate ? 'Late' : 'On-Time')} Notification dispatched to ${studentFullIdentifier} (${studentEmail})${isParentAttendanceCcEnabled ? ` [CC'd Parent: ${activeStudent?.parentEmail}]` : ''}: ${statusText} for ${courseTitle} at ${markedTimeFormatted}`
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
