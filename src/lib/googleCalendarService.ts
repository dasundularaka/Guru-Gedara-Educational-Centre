// Google Calendar Service for REST API interaction

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string; displayName?: string }>;
  htmlLink?: string;
  status?: string;
}

/**
 * Fetch upcoming events from Google Calendar primary calendar
 */
export const fetchGoogleCalendarEvents = async (
  accessToken: string,
  timeMin?: string,
  timeMax?: string
): Promise<GoogleCalendarEvent[]> => {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin: timeMin || new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    timeMax: timeMax || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    maxResults: '100'
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Google Calendar fetch failed (${response.status})`);
  }

  const data = await response.json();
  return data.items || [];
};

/**
 * Create a new event in primary Google Calendar
 */
export const createGoogleCalendarEvent = async (
  accessToken: string,
  event: GoogleCalendarEvent
): Promise<GoogleCalendarEvent> => {
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to create Google Calendar event (${response.status})`);
  }

  return await response.json();
};

/**
 * Delete an event from primary Google Calendar
 */
export const deleteGoogleCalendarEvent = async (
  accessToken: string,
  eventId: string
): Promise<void> => {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok && response.status !== 404) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to delete calendar event (${response.status})`);
  }
};

/**
 * Utility: Convert a class item or booking into a Google Calendar event payload
 */
export const buildGoogleCalendarEventFromClass = (classItem: {
  id: string;
  title: string;
  subject?: string;
  tutorName?: string;
  schedule?: string;
  venue?: string;
  timeSlot?: string;
  dayOfWeek?: string;
}, userEmail?: string): GoogleCalendarEvent => {
  // Parse next occurrence date
  const now = new Date();
  const dayMap: Record<string, number> = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6,
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  };

  let targetDay = 1; // Default Monday
  if (classItem.dayOfWeek && dayMap[classItem.dayOfWeek] !== undefined) {
    targetDay = dayMap[classItem.dayOfWeek];
  } else if (classItem.schedule) {
    for (const [dayName, dayIdx] of Object.entries(dayMap)) {
      if (classItem.schedule.includes(dayName)) {
        targetDay = dayIdx;
        break;
      }
    }
  }

  const daysAhead = (targetDay - now.getDay() + 7) % 7 || 7;
  const eventDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  // Default times: 09:00 to 11:00 AM
  let startHour = 9;
  let endHour = 11;

  if (classItem.timeSlot || classItem.schedule) {
    const text = classItem.timeSlot || classItem.schedule || '';
    const match = text.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3] ? match[3].toUpperCase() : '';
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      startHour = h;
      endHour = h + 2;
    }
  }

  const startTime = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), startHour, 0, 0);
  const endTime = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), endHour, 0, 0);

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Colombo';

  return {
    summary: `Guru Gedara: ${classItem.title}`,
    description: `Tuition session for ${classItem.subject || classItem.title}. Instructor: ${classItem.tutorName || 'Guru Gedara Faculty'}. Scheduled via Guru Gedara Educational Portal.`,
    location: classItem.venue || 'Guru Gedara Educational Centre Main Campus / Online Portal',
    start: {
      dateTime: startTime.toISOString(),
      timeZone
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone
    },
    attendees: userEmail ? [{ email: userEmail }] : undefined
  };
};
