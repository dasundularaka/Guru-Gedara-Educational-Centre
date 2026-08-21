import { firestoreService, safeStringify } from './firestoreService';
import { Booking, ClassItem, NotificationItem, UserProfile } from '../types';
import { parseScheduleTimes, parseTimeToTodayDate } from './classScheduleUtils';
import { emailNotificationService, shouldUserReceiveEmail } from './emailNotificationService';

export interface ClassReminderAlertLog {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  classId: string;
  classTitle: string;
  tutorName: string;
  scheduledTime: string;
  scheduledDate: string;
  dispatchedAt: string;
  inAppAlertSent: boolean;
  emailAlertSent: boolean;
  emailSubject: string;
  emailBodyPreview: string;
  emailNotificationLogId?: string;
}

export interface CronRunResult {
  timestamp: string;
  totalBookingsEvaluated: number;
  triggeredAlertsCount: number;
  alerts: ClassReminderAlertLog[];
}

const CRON_DEDUPE_STORAGE_KEY = 'gurugedara_24h_cron_sent_log';
const SENT_EMAILS_STORAGE_KEY = 'gurugedara_sent_email_outbox';

// Retrieve sent deduplication keys map: key -> timestamp
export function getSentCronDedupeKeys(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CRON_DEDUPE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveSentCronDedupeKey(key: string): void {
  try {
    const map = getSentCronDedupeKeys();
    map[key] = new Date().toISOString();
    localStorage.setItem(CRON_DEDUPE_STORAGE_KEY, safeStringify(map));
  } catch (e) {
    console.warn("Failed saving cron dedupe key", e);
  }
}

// Get email outbox log
export function getSentEmailLogs(): ClassReminderAlertLog[] {
  try {
    const raw = localStorage.getItem(SENT_EMAILS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveSentEmailLog(log: ClassReminderAlertLog): void {
  try {
    const list = getSentEmailLogs();
    list.unshift(log); // newest first
    // keep max 100 logs
    if (list.length > 100) list.length = 100;
    localStorage.setItem(SENT_EMAILS_STORAGE_KEY, safeStringify(list));
  } catch (e) {
    console.warn("Failed saving sent email log", e);
  }
}

// Calculate next session date for a class or booking
export function getNextSessionDate(
  dayOfWeekStr?: string,
  timeSlotStr?: string,
  scheduleStr?: string,
  specificBookingDate?: string
): Date | null {
  const now = new Date();

  // If specific booking date provided (e.g. YYYY-MM-DD)
  if (specificBookingDate && /^\d{4}-\d{2}-\d{2}$/.test(specificBookingDate)) {
    const { startTimeStr } = parseScheduleTimes(timeSlotStr, scheduleStr);
    const d = parseTimeToTodayDate(startTimeStr, new Date(`${specificBookingDate}T00:00:00`));
    return d;
  }

  // Derive from dayOfWeek (e.g., "Monday", "Tuesday", etc.)
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const targetDayStr = (dayOfWeekStr || scheduleStr || "").toLowerCase();

  let targetDayIndex = -1;
  for (let i = 0; i < dayNames.length; i++) {
    if (targetDayStr.includes(dayNames[i])) {
      targetDayIndex = i;
      break;
    }
  }

  if (targetDayIndex === -1) {
    // If no day of week matched, return null or assume tomorrow if schedule is generic
    return null;
  }

  const currentDayIndex = now.getDay();
  let daysUntil = targetDayIndex - currentDayIndex;

  if (daysUntil < 0) {
    daysUntil += 7; // next week
  } else if (daysUntil === 0) {
    // Check if time has already passed today; if passed, next session is next week
    const { startTimeStr } = parseScheduleTimes(timeSlotStr, scheduleStr);
    const todaySessionD = parseTimeToTodayDate(startTimeStr, now);
    if (todaySessionD.getTime() <= now.getTime()) {
      daysUntil = 7;
    }
  }

  const sessionDate = new Date(now);
  sessionDate.setDate(now.getDate() + daysUntil);
  const { startTimeStr } = parseScheduleTimes(timeSlotStr, scheduleStr);
  return parseTimeToTodayDate(startTimeStr, sessionDate);
}

// Check if a session Date is within 24 hours window (e.g., between 18 hours and 30 hours from now, or tomorrow)
export function isWithin24HourWindow(sessionDate: Date, now: Date = new Date()): boolean {
  const diffMs = sessionDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  // 24-hour reminder trigger window: 18 to 30 hours away (or approximately tomorrow within ~24h)
  return diffHours >= 18 && diffHours <= 30;
}

/**
 * Executes the 24-hour Class Reminder Cron Job.
 * Evaluates all active student bookings and class schedules.
 * Dispatches in-app notifications and email alerts 24 hours prior to scheduled start.
 */
export async function run24HourClassReminderCron(forceTriggerAll: boolean = false): Promise<CronRunResult> {
  const now = new Date();
  const timestamp = now.toISOString();
  const triggeredAlerts: ClassReminderAlertLog[] = [];

  try {
    // 1. Load active bookings, classes, and user profiles
    const [allBookings, allClasses, allUsers] = await Promise.all([
      firestoreService.getBookings(),
      firestoreService.getClasses(),
      firestoreService.getAllUsers()
    ]);

    const dedupeMap = getSentCronDedupeKeys();

    // Map classes for quick lookup
    const classMap = new Map<string, ClassItem>();
    allClasses.forEach(c => classMap.set(c.id, c));

    // Map users for quick lookup
    const userMap = new Map<string, UserProfile>();
    allUsers.forEach(u => userMap.set(u.uid, u));

    // Filter active student bookings
    const activeBookings = allBookings.filter(b => b.status === 'active');

    for (const booking of activeBookings) {
      const cls = classMap.get(booking.classId);
      const student = userMap.get(booking.studentId);

      const dayOfWeek = booking.dayOfWeek || cls?.dayOfWeek;
      const timeSlot = booking.timeSlot || cls?.timeSlot;
      const schedule = cls?.schedule;
      const classTitle = booking.classTitle || cls?.title || 'Scheduled Class';
      const tutorName = booking.tutorName || cls?.tutorName || 'Faculty Instructor';
      const studentName = student?.name || booking.studentName || 'Scholar';
      const studentEmail = student?.email || booking.studentEmail || `${studentName.toLowerCase().replace(/\s+/g, '')}@student.edu`;

      // Calculate next session date
      const sessionDate = getNextSessionDate(dayOfWeek, timeSlot, schedule, booking.bookingDate);

      if (!sessionDate) continue;

      const isTarget24h = forceTriggerAll || isWithin24HourWindow(sessionDate, now);

      if (isTarget24h) {
        const dateStr = sessionDate.toISOString().split('T')[0];
        const dedupeKey = `cron_24h_${booking.studentId}_${booking.classId}_${dateStr}`;

        // Prevent duplicate alerts unless forceTriggerAll is explicitly requested
        if (!dedupeMap[dedupeKey] || forceTriggerAll) {
          const formattedDate = sessionDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
          const formattedTime = timeSlot || parseScheduleTimes(timeSlot, schedule).startTimeStr;

          // 2. Formulate In-App Alert
          const inAppTitle = `⏰ 24h Class Reminder: ${classTitle}`;
          const inAppMessage = `Dear ${studentName}, your class "${classTitle}" with ${tutorName} is scheduled for tomorrow (${formattedDate}) at ${formattedTime}. Please review your materials and arrive on time.`;

          let inAppSent = false;
          try {
            await firestoreService.triggerNotification(
              booking.studentId,
              inAppTitle,
              inAppMessage,
              'reminder'
            );
            inAppSent = true;
          } catch (e) {
            console.warn(`Failed sending in-app 24h alert to ${studentName}:`, e);
          }

          // 3. Formulate & Dispatch Professional HTML Email via emailNotificationService
          let emailNotificationLogId: string | undefined;
          let emailAlertSent = false;
          const emailSubject = `⏰ [Guru Gedara] Reminder: ${classTitle} starts tomorrow at ${formattedTime}!`;
          const emailBodyPreview = `Hi ${studentName}, your class "${classTitle}" with ${tutorName} is scheduled for tomorrow (${formattedDate}) at ${formattedTime}.`;

          const shouldSendEmail = shouldUserReceiveEmail(student, 'class_reminder_24h');

          if (shouldSendEmail) {
            try {
              const emailLog = await emailNotificationService.notify24HourClassReminder({
                booking,
                classItem: cls,
                studentUser: student,
                sessionDate,
                formattedDate,
                formattedTime
              });
              emailNotificationLogId = emailLog.id;
              emailAlertSent = true;
            } catch (err) {
              console.warn(`[cron24h] Failed sending rich reminder email to ${studentEmail}:`, err);
            }
          }

          const alertLog: ClassReminderAlertLog = {
            id: `email_log_${Math.random().toString(36).substring(2, 9)}`,
            studentId: booking.studentId,
            studentName,
            studentEmail,
            classId: booking.classId,
            classTitle,
            tutorName,
            scheduledTime: formattedTime,
            scheduledDate: formattedDate,
            dispatchedAt: new Date().toISOString(),
            inAppAlertSent: inAppSent,
            emailAlertSent,
            emailSubject,
            emailBodyPreview,
            emailNotificationLogId
          };

          // Save email log to outbox
          saveSentEmailLog(alertLog);
          saveSentCronDedupeKey(dedupeKey);

          // Dispatch native browser notification if allowed
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new window.Notification(`24h Class Reminder: ${classTitle}`, {
                body: `Scheduled for tomorrow at ${formattedTime}.`,
                icon: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100'
              });
            } catch (e) {
              // ignore
            }
          }

          triggeredAlerts.push(alertLog);
        }
      }
    }

    return {
      timestamp,
      totalBookingsEvaluated: activeBookings.length,
      triggeredAlertsCount: triggeredAlerts.length,
      alerts: triggeredAlerts
    };
  } catch (error) {
    console.error("Error executing 24-hour class reminder cron:", error);
    return {
      timestamp,
      totalBookingsEvaluated: 0,
      triggeredAlertsCount: 0,
      alerts: []
    };
  }
}

// Background scheduler singleton
let intervalId: any = null;

export function start24HourClassReminderCronInterval(intervalMs: number = 60000): void {
  if (intervalId) clearInterval(intervalId);

  // Initial immediate run
  run24HourClassReminderCron().catch(err => console.warn("Initial cron run error:", err));

  // Periodic recurring run
  intervalId = setInterval(() => {
    run24HourClassReminderCron().catch(err => console.warn("Interval cron run error:", err));
  }, intervalMs);
}

export function stop24HourClassReminderCronInterval(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
