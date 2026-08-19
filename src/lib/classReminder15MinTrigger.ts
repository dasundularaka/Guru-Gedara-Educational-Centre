import { firestoreService, safeStringify } from './firestoreService';
import { Booking, ClassItem, UserProfile } from '../types';
import { 
  parseScheduleTimes, 
  parseTimeToTodayDate, 
  isTodayClassDay, 
  getActiveExtraClassSession 
} from './classScheduleUtils';

export interface Class15MinAlertLog {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  recipientRole: 'student' | 'tutor' | 'admin' | 'guest';
  classId: string;
  classTitle: string;
  tutorName: string;
  scheduledTime: string;
  minutesRemaining: number;
  dispatchedAt: string;
  browserNotificationSent: boolean;
  inAppAlertSent: boolean;
  audioPlayed: boolean;
  sessionType: 'regular' | 'extra_class' | 'manual_test';
}

export interface Class15MinEvaluationResult {
  timestamp: string;
  totalClassesEvaluated: number;
  alertsTriggered: Class15MinAlertLog[];
}

const DEDUPE_15MIN_STORAGE_KEY = 'gurugedara_15m_sent_log';
const RECENT_15MIN_ALERTS_KEY = 'gurugedara_15m_alerts_history';

/**
 * Web Audio API synthesizer for playing a clean, high-clarity notification chime
 */
export function playClassNotificationChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const playTone = (freq: number, start: number, duration: number, gainVal: number = 0.15) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(gainVal, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    };

    const now = ctx.currentTime;
    // Harmonious alert chime: C5 (523.25 Hz) -> E5 (659.25 Hz) -> G5 (783.99 Hz)
    playTone(523.25, now, 0.25, 0.2);
    playTone(659.25, now + 0.12, 0.25, 0.22);
    playTone(783.99, now + 0.24, 0.45, 0.25);
  } catch (err) {
    console.warn("[classReminder15MinTrigger] Audio chime play skipped:", err);
  }
}

/**
 * Requests browser notification permission safely.
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const perm = await window.Notification.requestPermission();
    return perm;
  } catch (err) {
    console.warn("Failed to request Notification permission:", err);
    return 'denied';
  }
}

/**
 * Checks current browser notification permission status.
 */
export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return window.Notification.permission;
}

/**
 * Returns stored deduplication map: key -> timestamp
 */
export function get15MinDedupeKeys(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DEDUPE_15MIN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save15MinDedupeKey(key: string): void {
  try {
    const map = get15MinDedupeKeys();
    map[key] = new Date().toISOString();
    localStorage.setItem(DEDUPE_15MIN_STORAGE_KEY, safeStringify(map));
  } catch (e) {
    console.warn("Failed saving 15min dedupe key", e);
  }
}

/**
 * Returns recent 15-minute alerts history
 */
export function get15MinAlertsHistory(): Class15MinAlertLog[] {
  try {
    const raw = localStorage.getItem(RECENT_15MIN_ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save15MinAlertLog(log: Class15MinAlertLog): void {
  try {
    const history = get15MinAlertsHistory();
    history.unshift(log);
    if (history.length > 50) history.length = 50;
    localStorage.setItem(RECENT_15MIN_ALERTS_KEY, safeStringify(history));
  } catch (e) {
    console.warn("Failed saving 15min alert history", e);
  }
}

/**
 * Checks whether a class starts within the 15-minute window from `now`.
 * Window is defined as: [0 mins <= difference <= 15 mins]
 */
export function isClassStartingIn15Minutes(
  classItem: ClassItem,
  now: Date = new Date()
): { isStartingSoon: boolean; minutesRemaining: number; sessionDate: Date | null; startTimeFormatted: string; sessionType: 'regular' | 'extra_class' } {
  // 1. Check if there's an active extra class session today
  const extraSession = getActiveExtraClassSession(classItem.id);
  if (extraSession) {
    const todayStr = now.toISOString().split('T')[0];
    if (extraSession.date === todayStr) {
      const extraStart = parseTimeToTodayDate(extraSession.startTime, now);
      const diffMs = extraStart.getTime() - now.getTime();
      const diffMins = Math.round(diffMs / (60 * 1000));

      if (diffMins >= 0 && diffMins <= 15) {
        return {
          isStartingSoon: true,
          minutesRemaining: Math.max(1, diffMins),
          sessionDate: extraStart,
          startTimeFormatted: extraSession.startTime,
          sessionType: 'extra_class'
        };
      }
    }
  }

  // 2. Check regular weekly scheduled session
  const isToday = isTodayClassDay(classItem.dayOfWeek, classItem.schedule);
  if (!isToday) {
    return {
      isStartingSoon: false,
      minutesRemaining: -1,
      sessionDate: null,
      startTimeFormatted: '',
      sessionType: 'regular'
    };
  }

  const { startTimeStr } = parseScheduleTimes(classItem.timeSlot, classItem.schedule);
  const classStart = parseTimeToTodayDate(startTimeStr, now);
  const diffMs = classStart.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / (60 * 1000));

  // If class starts between 0 and 15 minutes from now
  if (diffMins >= 0 && diffMins <= 15) {
    return {
      isStartingSoon: true,
      minutesRemaining: Math.max(1, diffMins),
      sessionDate: classStart,
      startTimeFormatted: startTimeStr,
      sessionType: 'regular'
    };
  }

  return {
    isStartingSoon: false,
    minutesRemaining: diffMins,
    sessionDate: classStart,
    startTimeFormatted: startTimeStr,
    sessionType: 'regular'
  };
}

/**
 * Evaluates all classes for a specific active user (or all enrolled students)
 * and triggers browser notifications + audio chime + in-app notification when a class
 * is 15 minutes away from starting.
 */
export async function run15MinuteClassReminderCheck(
  currentUser?: UserProfile | null,
  options: { playSound?: boolean; forceTriggerForClassId?: string } = {}
): Promise<Class15MinEvaluationResult> {
  const now = new Date();
  const timestamp = now.toISOString();
  const todayStr = now.toISOString().split('T')[0];
  const alertsTriggered: Class15MinAlertLog[] = [];

  try {
    const [allClasses, allBookings, allUsers] = await Promise.all([
      firestoreService.getClasses(),
      firestoreService.getBookings(),
      firestoreService.getAllUsers()
    ]);

    const dedupeMap = get15MinDedupeKeys();

    // Classes map
    const classMap = new Map<string, ClassItem>();
    allClasses.forEach(c => classMap.set(c.id, c));

    // Users map
    const userMap = new Map<string, UserProfile>();
    allUsers.forEach(u => userMap.set(u.uid, u));

    // Determine target classes to check
    let targetClasses = allClasses;
    if (currentUser) {
      if (currentUser.role === 'student') {
        const enrolledClassIds = new Set<string>(currentUser.selectedClasses || []);
        allBookings
          .filter(b => b.studentId === currentUser.uid && b.status === 'active')
          .forEach(b => enrolledClassIds.add(b.classId));
        targetClasses = allClasses.filter(c => enrolledClassIds.has(c.id));
      } else if (currentUser.role === 'tutor') {
        targetClasses = allClasses.filter(c => c.tutorId === currentUser.uid);
      }
    }

    for (const cls of targetClasses) {
      const evaluation = isClassStartingIn15Minutes(cls, now);
      const isForce = options.forceTriggerForClassId === cls.id;

      if (evaluation.isStartingSoon || isForce) {
        const minutesLeft = isForce ? 15 : evaluation.minutesRemaining;
        const timeFormatted = evaluation.startTimeFormatted || cls.timeSlot || 'Scheduled Time';
        
        // Determine recipient(s)
        const recipients: { user: UserProfile | null; uid: string; name: string; email: string; role: 'student' | 'tutor' | 'admin' | 'guest' }[] = [];

        if (currentUser) {
          recipients.push({
            user: currentUser,
            uid: currentUser.uid,
            name: currentUser.name || 'Scholar',
            email: currentUser.email || 'user@gurugedara.edu',
            role: currentUser.role as any || 'student'
          });
        } else {
          // If no specific user logged in, find enrolled students and class tutor
          const studentBookings = allBookings.filter(b => b.classId === cls.id && b.status === 'active');
          studentBookings.forEach(b => {
            const stObj = userMap.get(b.studentId);
            recipients.push({
              user: stObj || null,
              uid: b.studentId,
              name: stObj?.name || b.studentName || 'Student',
              email: stObj?.email || b.studentEmail || 'student@gurugedara.edu',
              role: 'student'
            });
          });

          // Class tutor
          const tutorObj = userMap.get(cls.tutorId);
          if (tutorObj) {
            recipients.push({
              user: tutorObj,
              uid: tutorObj.uid,
              name: tutorObj.name || cls.tutorName,
              email: tutorObj.email || 'tutor@gurugedara.edu',
              role: 'tutor'
            });
          }
        }

        for (const recipient of recipients) {
          const dedupeKey = `15min_${recipient.uid}_${cls.id}_${todayStr}_${timeFormatted.replace(/\s+/g, '')}`;

          // Avoid duplicate alerts for this session unless forced
          if (dedupeMap[dedupeKey] && !isForce) {
            continue;
          }

          const notificationTitle = `⏰ Class Starts in ${minutesLeft} Minutes!`;
          const notificationBody = `"${cls.title}" with ${cls.tutorName} begins at ${timeFormatted}. Join the live hall or prepare your workstation.`;

          // 1. Dispatch Native Browser Notification
          let browserNotifSent = false;
          if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
            try {
              const notif = new window.Notification(notificationTitle, {
                body: notificationBody,
                icon: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=128&auto=format&fit=crop&q=80',
                badge: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=64&auto=format&fit=crop&q=80',
                tag: dedupeKey, // groups notifications for same session
                requireInteraction: true // keep visible until dismissed
              });

              notif.onclick = () => {
                window.focus();
                notif.close();
              };
              browserNotifSent = true;
            } catch (notifErr) {
              console.warn("[classReminder15MinTrigger] Browser notification error:", notifErr);
            }
          }

          // 2. Play subtle audio chime
          let audioPlayed = false;
          if (options.playSound !== false) {
            playClassNotificationChime();
            audioPlayed = true;
          }

          // 3. Trigger In-App Notification in Firestore
          let inAppSent = false;
          try {
            await firestoreService.triggerNotification(
              recipient.uid,
              `⏰ 15-Min Reminder: ${cls.title}`,
              notificationBody,
              'reminder'
            );
            inAppSent = true;
          } catch (inAppErr) {
            console.warn("[classReminder15MinTrigger] In-app notification error:", inAppErr);
          }

          // 4. Save deduplication key and log history
          save15MinDedupeKey(dedupeKey);

          const alertLog: Class15MinAlertLog = {
            id: `alert_15m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            recipientId: recipient.uid,
            recipientName: recipient.name,
            recipientEmail: recipient.email,
            recipientRole: recipient.role,
            classId: cls.id,
            classTitle: cls.title,
            tutorName: cls.tutorName,
            scheduledTime: timeFormatted,
            minutesRemaining: minutesLeft,
            dispatchedAt: new Date().toISOString(),
            browserNotificationSent: browserNotifSent,
            inAppAlertSent: inAppSent,
            audioPlayed,
            sessionType: evaluation.sessionType
          };

          save15MinAlertLog(alertLog);
          alertsTriggered.push(alertLog);
        }
      }
    }

    return {
      timestamp,
      totalClassesEvaluated: targetClasses.length,
      alertsTriggered
    };
  } catch (err) {
    console.error("[classReminder15MinTrigger] Check error:", err);
    return {
      timestamp,
      totalClassesEvaluated: 0,
      alertsTriggered: []
    };
  }
}

/**
 * Triggers a manual instantaneous 15-minute test notification for testing
 * sound, browser push, and in-app alert recording.
 */
export async function triggerManual15MinTestNotification(
  currentUser?: UserProfile | null,
  customClass?: ClassItem
): Promise<Class15MinAlertLog> {
  const classItem: ClassItem = customClass || {
    id: 'test_class_15m',
    title: 'Advanced Level Physics Masterclass',
    subject: 'Physics',
    tutorId: 'tutor_sam',
    tutorName: 'Prof. Samantha Perera',
    schedule: 'Today • 15 Minutes from now',
    dayOfWeek: 'Today',
    timeSlot: new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
    price: 4500,
    description: 'Upcoming scheduled tuition class session.',
    maxSlots: 100,
    bookedSlots: 45
  };

  const recipientName = currentUser?.name || 'Scholar';
  const recipientUid = currentUser?.uid || 'guest_user';
  const recipientEmail = currentUser?.email || 'student@gurugedara.edu';
  const recipientRole = (currentUser?.role as any) || 'student';
  const timeFormatted = classItem.timeSlot || 'in 15 minutes';

  const notificationTitle = `⏰ Class Starts in 15 Minutes!`;
  const notificationBody = `"${classItem.title}" with ${classItem.tutorName} begins at ${timeFormatted}. Join the live lecture room on time.`;

  // 1. Play Audio Chime
  playClassNotificationChime();

  // 2. Dispatch Browser Notification
  let browserSent = false;
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (window.Notification.permission === 'default') {
      await requestBrowserNotificationPermission();
    }

    if (window.Notification.permission === 'granted') {
      try {
        const n = new window.Notification(notificationTitle, {
          body: notificationBody,
          icon: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=128&auto=format&fit=crop&q=80',
          requireInteraction: true
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
        browserSent = true;
      } catch (e) {
        console.warn("Browser notification creation error:", e);
      }
    }
  }

  // 3. Trigger In-App Notification
  let inAppSent = false;
  if (recipientUid) {
    try {
      await firestoreService.triggerNotification(
        recipientUid,
        `⏰ 15-Min Reminder: ${classItem.title}`,
        notificationBody,
        'reminder'
      );
      inAppSent = true;
    } catch (_) {}
  }

  const log: Class15MinAlertLog = {
    id: `alert_15m_test_${Date.now()}`,
    recipientId: recipientUid,
    recipientName,
    recipientEmail,
    recipientRole,
    classId: classItem.id,
    classTitle: classItem.title,
    tutorName: classItem.tutorName,
    scheduledTime: timeFormatted,
    minutesRemaining: 15,
    dispatchedAt: new Date().toISOString(),
    browserNotificationSent: browserSent,
    inAppAlertSent: inAppSent,
    audioPlayed: true,
    sessionType: 'manual_test'
  };

  save15MinAlertLog(log);
  return log;
}

// Background timer singleton
let interval15MinId: any = null;

export function start15MinuteClassReminderLoop(
  getUserFn: () => UserProfile | null,
  intervalMs: number = 30000 // 30-second checking resolution
): void {
  if (interval15MinId) clearInterval(interval15MinId);

  const execute = () => {
    const user = getUserFn();
    run15MinuteClassReminderCheck(user).catch(err => {
      console.warn("[classReminder15MinTrigger] Interval run error:", err);
    });
  };

  // Run initial check
  execute();

  // Run periodic loop
  interval15MinId = setInterval(execute, intervalMs);
}

export function stop15MinuteClassReminderLoop(): void {
  if (interval15MinId) {
    clearInterval(interval15MinId);
    interval15MinId = null;
  }
}
