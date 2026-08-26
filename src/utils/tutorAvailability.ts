import { UserProfile, ClassItem, RecurringAvailabilitySlot, SpecificDateAvailability } from '../types';

/**
 * Parses time string like "09:00 AM" or "9:00 AM" or "14:30" or "02:00 PM" into minutes from midnight.
 */
export function timeStringToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toUpperCase();

  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const numericPart = clean.replace(/[^\d:]/g, '');
  const [hoursStr, minutesStr] = numericPart.split(':');
  let hours = parseInt(hoursStr || '0', 10);
  const minutes = parseInt(minutesStr || '0', 10);

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

export interface AvailabilityCheckResult {
  isAvailable: boolean;
  reason?: string;
}

/**
 * Evaluates whether a tutor is available to teach for a given class or day/time.
 */
export function checkTutorAvailability(
  tutor: UserProfile | null | undefined,
  dayOfWeek?: string,
  timeSlot?: string,
  specificDate?: string // YYYY-MM-DD
): AvailabilityCheckResult {
  if (!tutor) {
    return { isAvailable: true };
  }

  const details = tutor.tutorDetails;

  // 1. Global Away Status
  if (tutor.availabilityStatus === 'away') {
    return {
      isAvailable: false,
      reason: `${tutor.name || 'Tutor'} is currently marked as Away and not accepting bookings.`
    };
  }

  if (!details) {
    return { isAvailable: true };
  }

  // 2. Specific Date Availability Check (Blackout date / Off-day)
  if (specificDate && details.specificDateAvailability && details.specificDateAvailability.length > 0) {
    const specificEntry = details.specificDateAvailability.find(s => s.date === specificDate);
    if (specificEntry) {
      if (!specificEntry.isAvailable) {
        return {
          isAvailable: false,
          reason: specificEntry.reason || `${tutor.name || 'Tutor'} is unavailable on ${specificDate}${specificEntry.startTime ? ` (${specificEntry.startTime} - ${specificEntry.endTime})` : ''}.`
        };
      }
    }
  }

  // 3. Recurring Slots Check (if defined)
  if (dayOfWeek && details.recurringAvailability && details.recurringAvailability.length > 0) {
    const daySlots = details.recurringAvailability.filter(
      r => r.dayOfWeek.toLowerCase() === dayOfWeek.toLowerCase()
    );

    if (daySlots.length > 0) {
      const anyActive = daySlots.some(s => s.isActive);
      if (!anyActive) {
        return {
          isAvailable: false,
          reason: `${tutor.name || 'Tutor'} has no active recurring teaching slots on ${dayOfWeek}s.`
        };
      }

      if (timeSlot) {
        const slotMins = timeStringToMinutes(timeSlot);
        const matchesActiveSlot = daySlots.some(s => {
          if (!s.isActive) return false;
          const startMins = timeStringToMinutes(s.startTime);
          const endMins = timeStringToMinutes(s.endTime);
          return slotMins >= startMins && slotMins <= endMins;
        });

        if (!matchesActiveSlot) {
          const activeTimes = daySlots
            .filter(s => s.isActive)
            .map(s => `${s.startTime} - ${s.endTime}`)
            .join(', ');
          return {
            isAvailable: false,
            reason: `Class time (${timeSlot}) is outside ${tutor.name || 'tutor'}'s availability on ${dayOfWeek}s (${activeTimes}).`
          };
        }
      }
    }
  }

  // 4. Declared Days Off Check
  if (details.daysOff && details.daysOff.length > 0) {
    const cleanDay = (dayOfWeek || '').trim().toLowerCase();
    const isOffDay = details.daysOff.some(off => {
      const cleanOff = off.trim().toLowerCase();
      return cleanOff === cleanDay || (cleanDay && cleanOff.includes(cleanDay)) || (specificDate && cleanOff.includes(specificDate));
    });

    if (isOffDay) {
      return {
        isAvailable: false,
        reason: `${tutor.name || 'Tutor'} has declared ${dayOfWeek || 'this date'} as a scheduled Day Off.`
      };
    }
  }

  // 5. Working Hours Schedule Check
  if (dayOfWeek && details.workingHours && details.workingHours.length > 0) {
    const dayConfig = details.workingHours.find(w => w.day.toLowerCase() === dayOfWeek.toLowerCase());
    if (dayConfig) {
      if (!dayConfig.enabled) {
        return {
          isAvailable: false,
          reason: `${tutor.name || 'Tutor'} does not teach on ${dayOfWeek}s.`
        };
      }

      if (timeSlot && dayConfig.startTime && dayConfig.endTime) {
        const slotMins = timeStringToMinutes(timeSlot);
        const startMins = timeStringToMinutes(dayConfig.startTime);
        const endMins = timeStringToMinutes(dayConfig.endTime);

        if (slotMins < startMins || slotMins > endMins) {
          return {
            isAvailable: false,
            reason: `Class time (${timeSlot}) is outside ${tutor.name}'s active teaching hours (${dayConfig.startTime} - ${dayConfig.endTime}) on ${dayOfWeek}s.`
          };
        }
      }
    }
  }

  return { isAvailable: true };
}

/**
 * Formats tutor availability slots into human readable badges.
 */
export function getTutorAvailabilitySummary(tutor: UserProfile): {
  activeDays: string[];
  totalSlots: number;
  isAway: boolean;
} {
  const isAway = tutor.availabilityStatus === 'away';
  const details = tutor.tutorDetails;
  
  if (!details) {
    return { activeDays: [], totalSlots: 0, isAway };
  }

  const activeDays: string[] = [];
  if (details.workingHours) {
    details.workingHours.forEach(w => {
      if (w.enabled) activeDays.push(w.day);
    });
  }

  let totalSlots = 0;
  if (details.recurringAvailability) {
    totalSlots += details.recurringAvailability.filter(r => r.isActive).length;
  }
  if (details.availability) {
    details.availability.forEach(a => {
      totalSlots += (a.slots || []).length;
    });
  }

  return {
    activeDays,
    totalSlots,
    isAway
  };
}

/**
 * Extracts days and time from a schedule string like "Every Monday 4:00 PM - 6:00 PM"
 */
export function parseScheduleString(scheduleStr?: string): { days: string[]; timeSlot?: string } {
  if (!scheduleStr) return { days: [] };

  const daysMap: { [key: string]: string } = {
    'monday': 'Monday', 'mon': 'Monday',
    'tuesday': 'Tuesday', 'tue': 'Tuesday', 'tues': 'Tuesday',
    'wednesday': 'Wednesday', 'wed': 'Wednesday',
    'thursday': 'Thursday', 'thu': 'Thursday', 'thur': 'Thursday', 'thurs': 'Thursday',
    'friday': 'Friday', 'fri': 'Friday',
    'saturday': 'Saturday', 'sat': 'Saturday',
    'sunday': 'Sunday', 'sun': 'Sunday'
  };

  const lower = scheduleStr.toLowerCase();
  const foundDays: string[] = [];

  Object.keys(daysMap).forEach(key => {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(lower)) {
      const canonical = daysMap[key];
      if (!foundDays.includes(canonical)) {
        foundDays.push(canonical);
      }
    }
  });

  // Try to match start time pattern (e.g. 4:00 PM or 04:00 PM or 16:00)
  const timeMatch = scheduleStr.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/i);
  const timeSlot = timeMatch ? timeMatch[0] : undefined;

  return {
    days: foundDays.length > 0 ? foundDays : ['Monday'],
    timeSlot
  };
}

/**
 * Checks a class item against its tutor's availability profile
 */
export function checkClassAvailability(
  classItem: ClassItem,
  tutor: UserProfile | null | undefined
): AvailabilityCheckResult {
  if (!tutor) return { isAvailable: true };

  const { days, timeSlot } = parseScheduleString(classItem.schedule);

  for (const day of days) {
    const res = checkTutorAvailability(tutor, day, timeSlot);
    if (!res.isAvailable) {
      return res;
    }
  }

  return { isAvailable: true };
}
