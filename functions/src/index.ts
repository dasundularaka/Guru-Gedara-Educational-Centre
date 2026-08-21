import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Generate Google Calendar "Add to Calendar" URL
 */
function generateGoogleCalendarUrl(options: {
  title: string;
  description: string;
  location?: string;
  startTime: Date;
  durationMinutes?: number;
}): string {
  const { title, description, location = 'Guru Gedara Higher Educational Institute', startTime, durationMinutes = 120 } = options;
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  const pad = (n: number) => n < 10 ? `0${n}` : `${n}`;
  const formatGCalDate = (d: Date) => {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  };

  const startStr = formatGCalDate(startTime);
  const endStr = formatGCalDate(endTime);

  const params = new URLSearchParams();
  params.set('action', 'TEMPLATE');
  params.set('text', title);
  params.set('details', description);
  params.set('location', location);
  params.set('dates', `${startStr}/${endStr}`);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Build branded HTML email template for 24-hour reminder
 */
function build24HourReminderHtml(params: {
  studentName: string;
  classTitle: string;
  tutorName: string;
  formattedDate: string;
  formattedTime: string;
  gracePeriodMinutes: number;
  portalUrl: string;
  gcalUrl: string;
  parentEmail?: string;
}): { html: string; text: string } {
  const {
    studentName,
    classTitle,
    tutorName,
    formattedDate,
    formattedTime,
    gracePeriodMinutes,
    portalUrl,
    gcalUrl,
    parentEmail
  } = params;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Class Reminder: ${classTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Top Header Banner -->
    <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
      <div style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Guru Gedara Institute</div>
      <div style="font-size: 13px; color: #c7d2fe; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase;">Higher Educational Portal</div>
    </div>

    <!-- Main Content Area -->
    <div style="padding: 32px 28px;">
      <div style="display: inline-block; background-color: #e0e7ff; color: #4338ca; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 9999px; margin-bottom: 12px;">
        ⏰ Starts Tomorrow (24h Reminder)
      </div>
      
      <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">Class Starts in 24 Hours!</h1>
      <p style="font-size: 14px; color: #64748b; margin: 0 0 20px 0;">Get ready for <strong>${classTitle}</strong> with <strong>${tutorName}</strong>.</p>
      
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        Dear <strong>${studentName}</strong>,<br/>
        This is an automated 24-hour reminder that your class <strong>${classTitle}</strong> is scheduled for tomorrow, <strong>${formattedDate}</strong> at <strong>${formattedTime}</strong>.
      </p>

      <!-- Checklist Box -->
      <div style="background-color: #f0f4ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
        <div style="font-weight: 800; font-size: 14px; color: #312e81; margin-bottom: 8px;">
          🎓 Session Preparation Checklist:
        </div>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #3730a3; line-height: 1.7;">
          <li>Review previous lecture recordings and study sheets on your dashboard.</li>
          <li>Bring required textbooks and notebooks.</li>
          <li>Arrive at least <strong>5 minutes early</strong> (grace period: ${gracePeriodMinutes} minutes).</li>
          <li>Present your student QR badge at the entrance or virtual room check-in.</li>
        </ul>
      </div>

      <!-- Schedule Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 13px;">
        <tbody>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Course</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 700; text-align: right;">${classTitle}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Instructor</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 600; text-align: right;">${tutorName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Session Date</td>
            <td style="padding: 10px 0; color: #4338ca; font-weight: 700; text-align: right;">${formattedDate}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Start Time</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 700; text-align: right;">${formattedTime}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Grace Period</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 600; text-align: right;">${gracePeriodMinutes} mins</td>
          </tr>
        </tbody>
      </table>

      <!-- Actions -->
      <div style="text-align: center; margin: 28px 0 16px 0;">
        <a href="${portalUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);">
          Access Student Portal &amp; Materials &rarr;
        </a>
      </div>

      <div style="text-align: center; margin-bottom: 16px;">
        <a href="${gcalUrl}" target="_blank" style="display: inline-block; background-color: #f1f5f9; color: #334155; text-decoration: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 12px; border: 1px solid #e2e8f0;">
          📅 Add to Google Calendar
        </a>
      </div>

      ${parentEmail ? `<div style="font-size: 11px; color: #64748b; text-align: center; margin-top: 14px;">Parent / Guardian advisory dispatched to: ${parentEmail}</div>` : ''}
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
      <div>Guru Gedara Higher Educational Institute • Official Automated Notification Engine</div>
      <div style="margin-top: 4px;">To manage notification preferences, visit your Student Dashboard &gt; Notification Settings.</div>
    </div>
  </div>
</body>
</html>`;

  const text = `Class Starts Tomorrow: ${classTitle}\n\nDear ${studentName},\nThis is a 24-hour reminder that your class "${classTitle}" with ${tutorName} is scheduled for tomorrow (${formattedDate}) at ${formattedTime}.\n\nAccess portal: ${portalUrl}\nAdd to Calendar: ${gcalUrl}`;

  return { html, text };
}

/**
 * Execute 24-Hour Class Reminder logic across active bookings
 */
export async function execute24HourClassReminderCheck(): Promise<{
  totalEvaluated: number;
  remindersSent: number;
  details: any[];
}> {
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Calculate tomorrow's day of week
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDayName = dayNames[tomorrow.getDay()];
  const tomorrowDateStr = tomorrow.toISOString().split('T')[0];

  const formattedTomorrow = tomorrow.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const bookingsSnap = await db.collection('bookings').where('status', '==', 'active').get();
  const classesSnap = await db.collection('classes').get();
  const usersSnap = await db.collection('users').get();

  const classMap = new Map<string, any>();
  classesSnap.docs.forEach(d => classMap.set(d.id, { id: d.id, ...d.data() }));

  const userMap = new Map<string, any>();
  usersSnap.docs.forEach(d => userMap.set(d.id, { id: d.id, ...d.data() }));

  let totalEvaluated = 0;
  let remindersSent = 0;
  const details: any[] = [];

  for (const doc of bookingsSnap.docs) {
    totalEvaluated++;
    const booking = doc.data();
    const classItem = classMap.get(booking.classId);
    const studentUser = userMap.get(booking.studentId);
    const tutorUser = classItem?.tutorId ? userMap.get(classItem.tutorId) : null;

    if (!classItem) continue;

    // Check if class occurs tomorrow
    const classDay = classItem.dayOfWeek || '';
    const isTomorrowClass = classDay.toLowerCase() === tomorrowDayName.toLowerCase();

    if (!isTomorrowClass) continue;

    // Check deduplication key: cron_24h_{bookingId}_{tomorrowDateStr}
    const dedupeDocRef = db.collection('cron_reminders_log').doc(`cron_24h_${doc.id}_${tomorrowDateStr}`);
    const dedupeSnap = await dedupeDocRef.get();

    if (dedupeSnap.exists) {
      continue; // Already sent for this session
    }

    // Check student email preferences
    if (studentUser?.emailPreferences?.classReminder24h === false) {
      continue; // User opted out of 24h reminder emails
    }

    const studentEmail = studentUser?.email || booking.studentEmail;
    if (!studentEmail || !studentEmail.includes('@')) continue;

    const studentName = studentUser?.name || booking.studentName || 'Scholar Student';
    const classTitle = classItem.title || booking.classTitle || 'Class Session';
    const tutorName = classItem.tutorName || tutorUser?.name || 'Faculty Tutor';
    const formattedTime = booking.timeSlot || classItem.timeSlot || 'Scheduled Time';
    const gracePeriod = classItem.gracePeriod ?? 5;

    const parentEmail = (studentUser?.parentEmail && (studentUser.isParentEmailLinked || studentUser.ccParentOnNotifications)) 
      ? studentUser.parentEmail 
      : undefined;

    const portalUrl = 'https://gurugedara.edu/classes';
    const gcalUrl = generateGoogleCalendarUrl({
      title: `${classTitle} - Guru Gedara Institute`,
      description: `Class session for ${classTitle} with tutor ${tutorName}.\nPortal: ${portalUrl}\nGrace period: ${gracePeriod} mins.`,
      startTime: tomorrow,
      durationMinutes: 120
    });

    const { html, text } = build24HourReminderHtml({
      studentName,
      classTitle,
      tutorName,
      formattedDate: formattedTomorrow,
      formattedTime,
      gracePeriodMinutes: gracePeriod,
      portalUrl,
      gcalUrl,
      parentEmail
    });

    const emailSubject = `⏰ [Guru Gedara] Reminder: ${classTitle} starts tomorrow at ${formattedTime}!`;

    // 1. Write to mail collection for Firebase Trigger Email extension / SMTP
    const mailDocRef = await db.collection('mail').add({
      to: [studentEmail],
      cc: parentEmail ? [parentEmail] : [],
      message: {
        subject: emailSubject,
        html,
        text
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Write to email_notifications audit collection
    await db.collection('email_notifications').add({
      id: `cloud_cron_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      to: studentEmail,
      cc: parentEmail,
      subject: emailSubject,
      htmlContent: html,
      textContent: text,
      status: 'sent',
      channel: 'firebase_mail_collection',
      eventType: 'class_reminder_24h',
      recipientName: studentName,
      createdAt: new Date().toISOString(),
      metadata: {
        bookingId: doc.id,
        classId: classItem.id,
        classTitle,
        studentId: booking.studentId,
        tutorName,
        mailDocId: mailDocRef.id,
        scheduledDate: formattedTomorrow,
        scheduledTime: formattedTime
      }
    });

    // 3. Write in-app notification
    await db.collection('notifications').add({
      userId: booking.studentId,
      title: `⏰ 24h Class Reminder: ${classTitle}`,
      message: `Dear ${studentName}, your class "${classTitle}" with ${tutorName} is scheduled for tomorrow (${formattedTomorrow}) at ${formattedTime}. Please review materials and arrive on time.`,
      type: 'reminder',
      isRead: false,
      createdAt: new Date().toISOString()
    });

    // 4. Record deduplication to prevent double delivery
    await dedupeDocRef.set({
      bookingId: doc.id,
      studentId: booking.studentId,
      classId: classItem.id,
      date: tomorrowDateStr,
      dispatchedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    remindersSent++;
    details.push({
      bookingId: doc.id,
      studentEmail,
      classTitle,
      formattedTime
    });
  }

  return { totalEvaluated, remindersSent, details };
}

/**
 * Scheduled Cloud Function (runs every hour to check upcoming 24h classes)
 */
export const scheduled24HourClassReminder = functions.pubsub
  .schedule('every 1 hours')
  .timeZone('Asia/Colombo')
  .onRun(async (context) => {
    console.log('Running scheduled 24-hour class reminder cron...');
    const result = await execute24HourClassReminderCheck();
    console.log(`24-hour reminder cron completed. Evaluated: ${result.totalEvaluated}, Sent: ${result.remindersSent}`);
    return null;
  });

/**
 * HTTPS Callable / HTTP Webhook trigger for manual triggers and external cron jobs
 */
export const trigger24HourClassReminderHttp = functions.https.onRequest(async (req, res) => {
  try {
    const result = await execute24HourClassReminderCheck();
    res.status(200).json({
      success: true,
      message: `Successfully evaluated ${result.totalEvaluated} bookings. Sent ${result.remindersSent} 24-hour reminders.`,
      result
    });
  } catch (error: any) {
    console.error('Error executing 24-hour reminder trigger:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Unknown error'
    });
  }
});
