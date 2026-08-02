import { ClassItem } from '../types';

/**
 * Generates a Google Calendar web URL to add a class session to the user's Google Calendar.
 */
export function generateGoogleCalendarUrl(cls: ClassItem): string {
  const title = encodeURIComponent(`[Guru Gedara] ${cls.title}`);
  
  const details = encodeURIComponent(
    `Class: ${cls.title}\n` +
    `Subject: ${cls.subject}\n` +
    `Tutor: ${cls.tutorName}\n` +
    `Schedule: ${cls.schedule || cls.dayOfWeek + ' ' + cls.timeSlot}\n` +
    (cls.meetLink ? `Online Class Link: ${cls.meetLink}\n` : '') +
    (cls.materialsUrl ? `Study Materials: ${cls.materialsUrl}\n` : '') +
    (cls.description ? `\nDescription: ${cls.description}` : '')
  );

  const location = encodeURIComponent(cls.meetLink || 'Guru Gedara Educational Centre / Online');

  // Parse or default date/time for the next upcoming day of week
  const now = new Date();
  const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow default
  const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // +2 hours

  const formatGCalTime = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  const dates = `${formatGCalTime(startTime)}/${formatGCalTime(endTime)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}&recur=RRULE:FREQ=WEEKLY`;
}

/**
 * Syncs a class to Google Calendar via Google Calendar API or web fallback.
 */
export async function syncClassToGoogleCalendar(cls: ClassItem): Promise<{ success: boolean; url: string; message: string }> {
  const gcalUrl = generateGoogleCalendarUrl(cls);

  try {
    // Check if OAuth token or gapi is available in session
    const oAuthToken = (window as any).gapi?.auth2?.getAuthInstance()?.currentUser?.get()?.getAuthResponse()?.access_token;

    if (oAuthToken) {
      const event = {
        summary: `[Guru Gedara] ${cls.title}`,
        location: cls.meetLink || 'Guru Gedara Educational Centre',
        description: `Subject: ${cls.subject}\nTutor: ${cls.tutorName}\n${cls.description || ''}`,
        start: {
          dateTime: new Date(Date.now() + 86400000).toISOString(),
          timeZone: 'Asia/Colombo',
        },
        end: {
          dateTime: new Date(Date.now() + 86400000 + 7200000).toISOString(),
          timeZone: 'Asia/Colombo',
        },
        recurrence: ['RRULE:FREQ=WEEKLY'],
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${oAuthToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (response.ok) {
        return {
          success: true,
          url: gcalUrl,
          message: `Class "${cls.title}" successfully added to your Google Calendar!`
        };
      }
    }
  } catch (e) {
    console.warn("Google Calendar API call fallback to web URL", e);
  }

  // Fallback: open Google Calendar event creation URL
  window.open(gcalUrl, '_blank', 'noopener,noreferrer');
  return {
    success: true,
    url: gcalUrl,
    message: `Opened Google Calendar to schedule "${cls.title}".`
  };
}
