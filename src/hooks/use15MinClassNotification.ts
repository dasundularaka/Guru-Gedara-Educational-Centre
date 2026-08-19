import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ClassItem, Booking } from '../types';
import { 
  getBrowserNotificationPermission, 
  requestBrowserNotificationPermission, 
  playClassNotificationChime, 
  run15MinuteClassReminderCheck, 
  triggerManual15MinTestNotification,
  get15MinAlertsHistory,
  Class15MinAlertLog,
  isClassStartingIn15Minutes
} from '../lib/classReminder15MinTrigger';

export interface NextUpcomingClassInfo {
  classItem: ClassItem;
  minutesRemaining: number;
  startTimeFormatted: string;
  isStartingSoon: boolean; // <= 15 mins
  countdownText: string;
}

export function use15MinClassNotification() {
  const { currentUser, classes, bookings } = useApp();
  
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => 
    getBrowserNotificationPermission()
  );
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('gurugedara_15m_sound_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [nextUpcomingClass, setNextUpcomingClass] = useState<NextUpcomingClassInfo | null>(null);
  const [alertHistory, setAlertHistory] = useState<Class15MinAlertLog[]>([]);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isTriggeringTest, setIsTriggeringTest] = useState<boolean>(false);

  // Update permission state
  const checkPermission = useCallback(() => {
    setPermission(getBrowserNotificationPermission());
  }, []);

  // Request browser permission
  const requestPermission = useCallback(async () => {
    const result = await requestBrowserNotificationPermission();
    setPermission(result);
    return result;
  }, []);

  // Toggle sound setting
  const toggleSound = useCallback((enabled?: boolean) => {
    setSoundEnabled(prev => {
      const next = enabled !== undefined ? enabled : !prev;
      localStorage.setItem('gurugedara_15m_sound_enabled', JSON.stringify(next));
      return next;
    });
  }, []);

  // Refresh alert history
  const refreshHistory = useCallback(() => {
    setAlertHistory(get15MinAlertsHistory());
  }, []);

  // Evaluate user's next upcoming class today
  const evaluateNextClass = useCallback(() => {
    if (!classes || classes.length === 0) {
      setNextUpcomingClass(null);
      return;
    }

    const now = new Date();
    let relevantClasses: ClassItem[] = classes;

    if (currentUser) {
      if (currentUser.role === 'student') {
        const enrolledClassIds = new Set<string>(currentUser.selectedClasses || []);
        bookings
          ?.filter(b => b.studentId === currentUser.uid && b.status === 'active')
          .forEach(b => enrolledClassIds.add(b.classId));
        relevantClasses = classes.filter(c => enrolledClassIds.has(c.id));
      } else if (currentUser.role === 'tutor') {
        relevantClasses = classes.filter(c => c.tutorId === currentUser.uid);
      }
    }

    let closestClass: NextUpcomingClassInfo | null = null;
    let minMinutes = Infinity;

    for (const cls of relevantClasses) {
      const evalResult = isClassStartingIn15Minutes(cls, now);
      if (evalResult.minutesRemaining >= 0 && evalResult.minutesRemaining < minMinutes) {
        minMinutes = evalResult.minutesRemaining;
        
        let countdown = `${evalResult.minutesRemaining}m`;
        if (evalResult.minutesRemaining === 0) {
          countdown = 'Starting Now';
        } else if (evalResult.minutesRemaining <= 15) {
          countdown = `${evalResult.minutesRemaining} mins left`;
        }

        closestClass = {
          classItem: cls,
          minutesRemaining: evalResult.minutesRemaining,
          startTimeFormatted: evalResult.startTimeFormatted,
          isStartingSoon: evalResult.isStartingSoon,
          countdownText: countdown
        };
      }
    }

    setNextUpcomingClass(closestClass);
  }, [classes, bookings, currentUser]);

  // Run manual check
  const checkNow = useCallback(async () => {
    setIsChecking(true);
    try {
      await run15MinuteClassReminderCheck(currentUser, { playSound: soundEnabled });
      refreshHistory();
      evaluateNextClass();
    } finally {
      setIsChecking(false);
    }
  }, [currentUser, soundEnabled, refreshHistory, evaluateNextClass]);

  // Test trigger
  const triggerTestAlert = useCallback(async (customClass?: ClassItem) => {
    setIsTriggeringTest(true);
    try {
      const log = await triggerManual15MinTestNotification(currentUser, customClass);
      refreshHistory();
      checkPermission();
      return log;
    } finally {
      setIsTriggeringTest(false);
    }
  }, [currentUser, refreshHistory, checkPermission]);

  // Initial load and periodic interval
  useEffect(() => {
    checkPermission();
    refreshHistory();
    evaluateNextClass();

    const interval = setInterval(() => {
      evaluateNextClass();
      refreshHistory();
    }, 15000); // refresh every 15s

    return () => clearInterval(interval);
  }, [checkPermission, refreshHistory, evaluateNextClass]);

  return {
    permission,
    isPermissionGranted: permission === 'granted',
    isPermissionDenied: permission === 'denied',
    soundEnabled,
    nextUpcomingClass,
    alertHistory,
    isChecking,
    isTriggeringTest,
    requestPermission,
    toggleSound,
    checkNow,
    triggerTestAlert,
    playChime: playClassNotificationChime,
    refreshHistory
  };
}
