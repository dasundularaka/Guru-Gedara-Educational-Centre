import { 
  Booking, 
  Payment, 
  ClassItem, 
  UserProfile, 
  StudyMaterial, 
  AttendanceRecord, 
  EmailNotificationLog, 
  EmailTriggerEventType,
  EmailSettings,
  MailDocument
} from '../types';
import { db } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, orderBy, limit } from 'firebase/firestore';

const isUsingCloud = typeof db !== 'undefined' && db !== null;

function generateId(prefix: string = 'email'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function handleFallback<T>(key: string, defaultVal: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultVal;
    return JSON.parse(raw);
  } catch (e) {
    return defaultVal;
  }
}

function saveFallback<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`[emailService] Failed to save fallback for ${key}`, e);
  }
}

// -------------------------------------------------------------
// DEFAULT EMAIL SETTINGS
// -------------------------------------------------------------
export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  senderName: 'Guru Gedara Higher Educational Institute',
  senderEmail: 'notifications@gurugedara.edu',
  replyToEmail: 'support@gurugedara.edu',
  notifyOnBooking: true,
  notifyOnPayment: true,
  notifyOnResource: true,
  notifyOnAttendance: true,
  notifyOnClassUpdate: true,
  notifyOnApproval: true,
  notifyOnAccountCreate: true,
  ccParentByDefault: true
};

// -------------------------------------------------------------
// INTERNAL USER & CLASS RESOLVERS
// -------------------------------------------------------------
async function resolveUserProfile(uidOrEmailOrUsername?: string): Promise<UserProfile | null> {
  if (!uidOrEmailOrUsername) return null;
  const cleanKey = uidOrEmailOrUsername.trim();
  const cleanKeyLower = cleanKey.toLowerCase();

  if (isUsingCloud) {
    try {
      // 1. Check doc ID
      const userRef = doc(db, 'users', cleanKey);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
      }

      // 2. Query by email
      const usersRef = collection(db, 'users');
      const qEmail = query(usersRef, where('email', '==', cleanKeyLower));
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        return snapEmail.docs[0].data() as UserProfile;
      }

      // 3. Query by username
      const qUsername = query(usersRef, where('username', '==', cleanKey));
      const snapUsername = await getDocs(qUsername);
      if (!snapUsername.empty) {
        return snapUsername.docs[0].data() as UserProfile;
      }

      // 4. Query by authUid
      const qAuth = query(usersRef, where('authUid', '==', cleanKey));
      const snapAuth = await getDocs(qAuth);
      if (!snapAuth.empty) {
        return snapAuth.docs[0].data() as UserProfile;
      }
    } catch (e) {
      console.warn('[emailService] Firestore user resolution error:', e);
    }
  }

  // Local fallback lookup
  const registered = handleFallback<UserProfile>('local_registered_users', []);
  const tutors = handleFallback<UserProfile>('local_users_tutors', []);
  const all = [...registered, ...tutors];

  return all.find(u => 
    u.uid === cleanKey || 
    u.authUid === cleanKey || 
    (u.email && u.email.toLowerCase() === cleanKeyLower) || 
    (u.username && u.username.toLowerCase() === cleanKeyLower)
  ) || null;
}

async function resolveClassItem(classId?: string): Promise<ClassItem | null> {
  if (!classId) return null;
  const cleanId = classId.trim();

  if (isUsingCloud) {
    try {
      const classRef = doc(db, 'classes', cleanId);
      const snap = await getDoc(classRef);
      if (snap.exists()) {
        return snap.data() as ClassItem;
      }
    } catch (e) {
      console.warn('[emailService] Firestore class resolution error:', e);
    }
  }

  const localClasses = handleFallback<ClassItem>('local_classes', []);
  return localClasses.find(c => c.id === cleanId) || null;
}

async function resolveEnrolledStudentsForClass(classId: string): Promise<UserProfile[]> {
  if (!classId) return [];
  const studentsMap = new Map<string, UserProfile>();

  if (isUsingCloud) {
    try {
      const bookingsRef = collection(db, 'bookings');
      const q = query(bookingsRef, where('classId', '==', classId));
      const snap = await getDocs(q);
      
      for (const d of snap.docs) {
        const b = d.data() as Booking;
        if (b.status !== 'cancelled' && b.studentId) {
          const profile = await resolveUserProfile(b.studentId);
          if (profile && profile.email) {
            studentsMap.set(profile.uid, profile);
          } else if (b.studentEmail) {
            studentsMap.set(b.studentId, {
              uid: b.studentId,
              name: b.studentName || 'Student',
              email: b.studentEmail,
              role: 'student',
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    } catch (e) {
      console.warn('[emailService] Error querying enrolled students:', e);
    }
  }

  // Local fallback merge
  const localBookings = handleFallback<Booking>('local_bookings', []);
  for (const b of localBookings) {
    if (b.classId === classId && b.status !== 'cancelled' && b.studentId) {
      if (!studentsMap.has(b.studentId)) {
        const profile = await resolveUserProfile(b.studentId);
        if (profile && profile.email) {
          studentsMap.set(profile.uid, profile);
        } else if (b.studentEmail) {
          studentsMap.set(b.studentId, {
            uid: b.studentId,
            name: b.studentName || 'Student',
            email: b.studentEmail,
            role: 'student',
            createdAt: new Date().toISOString()
          });
        }
      }
    }
  }

  return Array.from(studentsMap.values());
}

// -------------------------------------------------------------
// HTML EMAIL TEMPLATE GENERATOR
// -------------------------------------------------------------
function wrapInMasterHtmlTemplate(options: {
  title: string;
  preheader: string;
  badgeText: string;
  badgeColor?: string;
  headline: string;
  subheadline?: string;
  bodyContentHtml: string;
  actionUrl?: string;
  actionText?: string;
  metadataList?: { label: string; value: string; isHighlight?: boolean }[];
  footerNote?: string;
}): { html: string; text: string } {
  const {
    title,
    preheader,
    badgeText,
    badgeColor = '#4f46e5',
    headline,
    subheadline,
    bodyContentHtml,
    actionUrl,
    actionText,
    metadataList = [],
    footerNote
  } = options;

  const currentYear = new Date().getFullYear();

  const metadataHtml = metadataList.length > 0 ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <tbody>
        ${metadataList.map((item, idx) => `
          <tr style="border-bottom: ${idx === metadataList.length - 1 ? 'none' : '1px solid #e2e8f0'};">
            <td style="padding: 12px 16px; font-size: 12px; font-family: monospace; color: #64748b; text-transform: uppercase; font-weight: 700; width: 35%;">
              ${item.label}
            </td>
            <td style="padding: 12px 16px; font-size: 13px; font-family: sans-serif; color: ${item.isHighlight ? '#4338ca' : '#1e293b'}; font-weight: ${item.isHighlight ? '700' : '600'}; text-align: right;">
              ${item.value}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';

  const actionHtml = actionUrl && actionText ? `
    <div style="margin: 28px 0; text-align: center;">
      <a href="${actionUrl}" target="_blank" style="display: inline-block; background-color: #4338ca; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; font-family: sans-serif; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2); letter-spacing: 0.3px;">
        ${actionText} &rarr;
      </a>
    </div>
  ` : '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text for inbox preview -->
  <div style="display: none; font-size: 1px; color: #f1f5f9; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%); padding: 32px 28px; text-align: left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display: inline-block; font-family: sans-serif; font-size: 11px; font-weight: 800; color: #c7d2fe; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px;">
                      Guru Gedara Education System
                    </div>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                      ${headline}
                    </h1>
                    ${subheadline ? `<p style="margin: 6px 0 0; font-size: 13px; color: #e0e7ff; line-height: 1.4;">${subheadline}</p>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 28px 28px 20px 28px;">
              <!-- Status Badge -->
              <div style="margin-bottom: 18px;">
                <span style="display: inline-block; background-color: #ede9fe; color: ${badgeColor}; font-size: 11px; font-weight: 700; font-family: monospace; text-transform: uppercase; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.5px;">
                  ${badgeText}
                </span>
              </div>

              <!-- Main message content -->
              <div style="font-size: 14px; line-height: 1.6; color: #334155;">
                ${bodyContentHtml}
              </div>

              <!-- Metadata Table -->
              ${metadataHtml}

              <!-- Action Call to Action -->
              ${actionHtml}

              <div style="margin-top: 24px; padding-top: 18px; border-top: 1px dashed #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5;">
                Need help or have questions regarding this notice? Contact our academic support desk or message your tutor via the Guru Gedara student portal.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 11px; color: #94a3b8;">
                &copy; ${currentYear} Guru Gedara Higher Educational Institute. All rights reserved.
              </p>
              ${footerNote ? `<p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">${footerNote}</p>` : ''}
              <p style="margin: 6px 0 0; font-size: 10px; color: #cbd5e1;">
                This is an automated system email generated via Firebase Cloud Services.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  // Plain text version
  const text = `
========================================
GURU GEDARA EDUCATION NOTIFICATION
${headline}
========================================
Status: ${badgeText}

${subheadline ? `${subheadline}\n\n` : ''}
${bodyContentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}

${metadataList.map(m => `* ${m.label}: ${m.value}`).join('\n')}

${actionUrl ? `\nAccess Link: ${actionUrl}\n` : ''}

${footerNote ? `\nNote: ${footerNote}\n` : ''}
© ${currentYear} Guru Gedara Higher Educational Institute
  `.trim();

  return { html, text };
}

// -------------------------------------------------------------
// SERVICE IMPLEMENTATION
// -------------------------------------------------------------
export const emailNotificationService = {

  /**
   * Fetch current system email configuration
   */
  async getEmailSettings(): Promise<EmailSettings> {
    if (isUsingCloud) {
      try {
        const snap = await getDoc(doc(db, 'system_settings', 'email_config'));
        if (snap.exists()) {
          return { ...DEFAULT_EMAIL_SETTINGS, ...snap.data() } as EmailSettings;
        }
      } catch (e) {
        console.warn('[emailService] Settings fetch fallback to local storage:', e);
      }
    }
    const local = handleFallback<EmailSettings>('local_email_settings', [DEFAULT_EMAIL_SETTINGS]);
    return local[0] || DEFAULT_EMAIL_SETTINGS;
  },

  /**
   * Save system email configuration
   */
  async updateEmailSettings(settings: Partial<EmailSettings>): Promise<EmailSettings> {
    const current = await this.getEmailSettings();
    const updated = { ...current, ...settings };

    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'system_settings', 'email_config'), updated);
      } catch (e) {
        console.warn('[emailService] Error persisting email settings to cloud:', e);
      }
    }
    saveFallback('local_email_settings', [updated]);
    return updated;
  },

  /**
   * Internal dispatcher that logs to Firestore mail queue and email_notifications collection
   */
  async dispatchEmail(params: {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    htmlContent: string;
    textContent: string;
    eventType: EmailTriggerEventType;
    recipientName?: string;
    metadata?: Record<string, any>;
  }): Promise<EmailNotificationLog> {
    const settings = await this.getEmailSettings();
    const id = generateId('emlog');
    
    const toRecipients = Array.isArray(params.to) ? params.to : [params.to];
    const ccRecipients = params.cc ? (Array.isArray(params.cc) ? params.cc : [params.cc]) : [];
    const bccRecipients = params.bcc ? (Array.isArray(params.bcc) ? params.bcc : [params.bcc]) : [];

    // Filter out invalid/empty email addresses
    const validTo = toRecipients.map(e => (e || '').trim()).filter(email => email.includes('@'));
    const validCc = ccRecipients.map(e => (e || '').trim()).filter(email => email.includes('@'));
    const validBcc = bccRecipients.map(e => (e || '').trim()).filter(email => email.includes('@'));

    const logEntry: EmailNotificationLog = {
      id,
      to: validTo.length === 1 ? validTo[0] : validTo,
      cc: validCc.length > 0 ? (validCc.length === 1 ? validCc[0] : validCc) : undefined,
      bcc: validBcc.length > 0 ? (validBcc.length === 1 ? validBcc[0] : validBcc) : undefined,
      subject: params.subject,
      htmlContent: params.htmlContent,
      textContent: params.textContent,
      eventType: params.eventType,
      status: 'sent',
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      recipientName: params.recipientName,
      metadata: {
        ...params.metadata,
        senderName: settings.senderName,
        senderEmail: settings.senderEmail,
        replyTo: settings.replyToEmail,
        dispatchMechanism: isUsingCloud ? 'firestore_mail_collection' : 'client_simulated',
        cloudFunctionTriggered: isUsingCloud
      }
    };

    // 1. Write to Firestore 'mail' collection (Firebase Trigger Email Extension & Cloud Functions target)
    if (isUsingCloud && validTo.length > 0) {
      try {
        const mailDoc: MailDocument = {
          to: validTo,
          cc: validCc.length > 0 ? validCc : undefined,
          message: {
            subject: params.subject,
            text: params.textContent,
            html: params.htmlContent
          },
          eventType: params.eventType,
          metadata: {
            ...params.metadata,
            from: `"${settings.senderName}" <${settings.senderEmail}>`,
            replyTo: settings.replyToEmail,
            logId: id,
            dispatchedFrom: 'GuruGedaraWeb'
          },
          createdAt: new Date().toISOString()
        };

        const mailDocId = generateId('mail');
        await setDoc(doc(db, 'mail', mailDocId), mailDoc);
      } catch (mailErr) {
        console.warn('[emailService] Warning writing to mail queue collection:', mailErr);
      }

      // 2. Write to 'email_notifications' for system auditing and UI status tracking
      try {
        await setDoc(doc(db, 'email_notifications', id), logEntry);
      } catch (logErr) {
        console.warn('[emailService] Warning writing to email_notifications collection:', logErr);
      }
    }

    // 3. Optional external webhook dispatch if configured
    if (settings.externalWebhookUrl && validTo.length > 0) {
      try {
        fetch(settings.externalWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            to: validTo,
            cc: validCc,
            subject: params.subject,
            html: params.htmlContent,
            text: params.textContent,
            eventType: params.eventType,
            sender: settings.senderEmail,
            senderName: settings.senderName
          })
        }).catch(err => console.warn('[emailService] External webhook dispatch error:', err));
      } catch (webhookErr) {
        console.warn('[emailService] Webhook call failed:', webhookErr);
      }
    }

    // 4. Save to localStorage fallback
    const localLogs = handleFallback<EmailNotificationLog>('local_email_notifications', []);
    localLogs.unshift(logEntry);
    saveFallback('local_email_notifications', localLogs.slice(0, 100));

    console.info(`[emailService] Automated email dispatched: [${params.eventType}] to: ${validTo.join(', ')} subject: "${params.subject}"`);
    return logEntry;
  },

  /**
   * Resend an existing email log
   */
  async resendEmail(logId: string, overrideRecipient?: string): Promise<EmailNotificationLog> {
    const logs = await this.getEmailLogs(100);
    const targetLog = logs.find(l => l.id === logId);
    if (!targetLog) {
      throw new Error(`Email log with ID ${logId} not found.`);
    }

    const recipient = overrideRecipient || targetLog.to;
    return await this.dispatchEmail({
      to: recipient,
      cc: targetLog.cc,
      subject: targetLog.subject.startsWith('[Resent]') ? targetLog.subject : `[Resent] ${targetLog.subject}`,
      htmlContent: targetLog.htmlContent,
      textContent: targetLog.textContent,
      eventType: targetLog.eventType,
      recipientName: targetLog.recipientName,
      metadata: {
        ...targetLog.metadata,
        originalLogId: targetLog.id,
        isResend: true
      }
    });
  },

  // -------------------------------------------------------------
  // 1. CLASS BOOKING & ENROLLMENT NOTIFICATIONS
  // -------------------------------------------------------------
  async notifyClassBookingSuccess(params: {
    booking: Booking;
    classItem?: ClassItem | null;
    studentUser?: UserProfile | null;
    tutorUser?: UserProfile | null;
    appUrl?: string;
  }): Promise<{ studentLog: EmailNotificationLog; tutorLog?: EmailNotificationLog }> {
    const { booking, appUrl = window.location.origin } = params;

    // Guaranteed resolution
    const resolvedStudent = params.studentUser || await resolveUserProfile(booking.studentId);
    const resolvedClass = params.classItem || await resolveClassItem(booking.classId);
    const resolvedTutor = params.tutorUser || (resolvedClass?.tutorId ? await resolveUserProfile(resolvedClass.tutorId) : null);

    const classTitle = resolvedClass?.title || booking.classTitle || 'Enrolled Course';
    const tutorName = resolvedClass?.tutorName || resolvedTutor?.name || 'Faculty Tutor';

    const studentEmail = resolvedStudent?.email || booking.studentEmail || '';
    const studentName = resolvedStudent?.name || booking.studentName || 'Student';
    const tutorEmail = resolvedTutor?.email || '';

    // Parent CC calculation
    const hasParentLinked = !!(resolvedStudent?.parentEmail && (resolvedStudent.isParentEmailLinked || resolvedStudent.ccParentOnNotifications));
    const parentEmail = hasParentLinked ? resolvedStudent?.parentEmail : undefined;

    // Student Confirmation Email
    const { html, text } = wrapInMasterHtmlTemplate({
      title: `Enrollment Confirmed: ${classTitle}`,
      preheader: `Your seat in ${classTitle} with ${tutorName} is confirmed.`,
      badgeText: 'Enrollment Confirmed',
      badgeColor: '#16a34a',
      headline: `Class Booking Confirmed!`,
      subheadline: `Hello ${studentName}, your registration for ${classTitle} was successful.`,
      bodyContentHtml: `
        <p>Congratulations! Your seat for <strong>${classTitle}</strong> has been secured in the Guru Gedara Learning Platform.</p>
        <p>Please review your class schedule below. Make sure to arrive or log in 5 minutes prior to the scheduled start time to ensure smooth attendance marking.</p>
      `,
      metadataList: [
        { label: 'Course Title', value: classTitle, isHighlight: true },
        { label: 'Subject', value: resolvedClass?.subject || 'Academic Module' },
        { label: 'Instructor', value: tutorName },
        { label: 'Class Schedule', value: resolvedClass?.schedule || (resolvedClass ? `${resolvedClass.dayOfWeek} at ${resolvedClass.timeSlot}` : 'As scheduled') },
        { label: 'Tuition Fee', value: resolvedClass ? `LKR ${resolvedClass.price.toLocaleString()} / month` : 'Standard Rate' },
        { label: 'Booking Ref', value: booking.id }
      ],
      actionUrl: `${appUrl}/classes`,
      actionText: 'View Class Details & Materials',
      footerNote: parentEmail ? `Parent copy CC'd to ${parentEmail}` : undefined
    });

    const studentLog = await this.dispatchEmail({
      to: studentEmail || `${booking.studentId}@gurugedara.edu`,
      cc: parentEmail,
      subject: `✅ Enrollment Confirmed: ${classTitle} (${tutorName})`,
      htmlContent: html,
      textContent: text,
      eventType: 'booking_confirmation',
      recipientName: studentName,
      metadata: {
        studentId: booking.studentId,
        studentName,
        studentEmail,
        parentEmail,
        classId: booking.classId,
        classTitle,
        tutorId: resolvedClass?.tutorId,
        tutorName
      }
    });

    // Tutor Enrollment Alert Email
    let tutorLog: EmailNotificationLog | undefined;
    if (tutorEmail) {
      const tutorTemplate = wrapInMasterHtmlTemplate({
        title: `New Student Enrolled: ${classTitle}`,
        preheader: `${studentName} has enrolled in your class ${classTitle}.`,
        badgeText: 'New Enrollment Alert',
        badgeColor: '#4338ca',
        headline: `New Student in ${classTitle}`,
        subheadline: `A new student has enrolled into your course roster.`,
        bodyContentHtml: `
          <p>Hello <strong>${tutorName}</strong>,</p>
          <p><strong>${studentName}</strong> has just enrolled in your course <strong>${classTitle}</strong>.</p>
          <p>You can view their student profile, attendance history, and study progress from your Tutor Dashboard.</p>
        `,
        metadataList: [
          { label: 'Student Name', value: studentName, isHighlight: true },
          { label: 'Student ID', value: resolvedStudent?.username || booking.studentId },
          { label: 'Class Enrolled', value: classTitle },
          { label: 'Schedule', value: resolvedClass?.schedule || (resolvedClass ? `${resolvedClass.dayOfWeek} ${resolvedClass.timeSlot}` : 'As scheduled') },
          { label: 'Enrolled Date', value: new Date().toLocaleDateString() }
        ],
        actionUrl: `${appUrl}/tutor`,
        actionText: 'View Course Roster in Dashboard'
      });

      tutorLog = await this.dispatchEmail({
        to: tutorEmail,
        subject: `🎓 New Enrollment: ${studentName} joined ${classTitle}`,
        htmlContent: tutorTemplate.html,
        textContent: tutorTemplate.text,
        eventType: 'booking_tutor_alert',
        recipientName: tutorName,
        metadata: {
          tutorId: resolvedClass?.tutorId,
          tutorName,
          studentId: booking.studentId,
          studentName,
          classId: booking.classId,
          classTitle
        }
      });
    }

    return { studentLog, tutorLog };
  },

  // -------------------------------------------------------------
  // 2. PAYMENT RECEIPT & DUE NOTIFICATIONS
  // -------------------------------------------------------------
  async notifyPaymentSuccess(params: {
    payment: Payment;
    classItem?: ClassItem | null;
    studentUser?: UserProfile | null;
    appUrl?: string;
  }): Promise<EmailNotificationLog> {
    const { payment, appUrl = window.location.origin } = params;

    // Guaranteed resolution
    const resolvedStudent = params.studentUser || await resolveUserProfile(payment.studentId);
    const resolvedClass = params.classItem || (payment.classId ? await resolveClassItem(payment.classId) : null);

    const studentEmail = resolvedStudent?.email || '';
    const studentName = resolvedStudent?.name || payment.studentName || 'Student';
    const classTitle = payment.classTitle || resolvedClass?.title || 'Academic Tuition';

    // Check parent email CC
    const isParentPaymentCcActive = !!(resolvedStudent?.parentEmail && (resolvedStudent.isParentEmailLinked || resolvedStudent.ccParentOnNotifications) && resolvedStudent.parentEmailCcPreferences?.payments !== false);
    const parentEmail = isParentPaymentCcActive ? resolvedStudent?.parentEmail : undefined;

    const formattedDate = new Date(payment.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const isPaid = payment.status === 'paid';
    const badgeText = isPaid ? 'Payment Confirmed' : 'Payment Processing';
    const badgeColor = isPaid ? '#16a34a' : '#d97706';

    const { html, text } = wrapInMasterHtmlTemplate({
      title: `Tuition Fee Receipt: ${classTitle}`,
      preheader: `Official payment receipt for ${classTitle} - LKR ${payment.amount.toLocaleString()}`,
      badgeText,
      badgeColor,
      headline: `Official Tuition Receipt`,
      subheadline: `Payment confirmation for ${studentName}`,
      bodyContentHtml: `
        <p>Thank you! Your tuition fee payment for <strong>${classTitle}</strong> has been received and verified by Guru Gedara Institute.</p>
        <p>Keep this e-receipt for your records. Your class access and study resources are active.</p>
      `,
      metadataList: [
        { label: 'Receipt #', value: payment.id.toUpperCase(), isHighlight: true },
        { label: 'Student Name', value: studentName },
        { label: 'Class / Subject', value: classTitle },
        { label: 'Amount Paid', value: `LKR ${payment.amount.toLocaleString()}`, isHighlight: true },
        { label: 'Payment Method', value: payment.paymentMethod || 'Online Bank Card / Gateway' },
        { label: 'Payment Date', value: formattedDate },
        { label: 'Status', value: payment.status.toUpperCase() }
      ],
      actionUrl: `${appUrl}/payments`,
      actionText: 'View Payment History in Portal',
      footerNote: parentEmail ? `Parent e-receipt copy dispatched to ${parentEmail}` : undefined
    });

    return await this.dispatchEmail({
      to: studentEmail || `${payment.studentId}@gurugedara.edu`,
      cc: parentEmail,
      subject: `🧾 Official Tuition Receipt: ${classTitle} (LKR ${payment.amount.toLocaleString()})`,
      htmlContent: html,
      textContent: text,
      eventType: 'payment_receipt',
      recipientName: studentName,
      metadata: {
        paymentId: payment.id,
        amount: payment.amount,
        classId: payment.classId,
        classTitle,
        studentId: payment.studentId,
        studentName,
        parentEmail
      }
    });
  },

  // -------------------------------------------------------------
  // 3. STUDY MATERIAL / CLASS RESOURCE NOTIFICATIONS
  // -------------------------------------------------------------
  async notifyClassResourceAdded(params: {
    material: StudyMaterial;
    classItem?: ClassItem | null;
    tutorUser?: UserProfile | null;
    enrolledStudents?: UserProfile[];
    appUrl?: string;
  }): Promise<EmailNotificationLog[]> {
    const { material, appUrl = window.location.origin } = params;

    const resolvedClass = params.classItem || (material.classId ? await resolveClassItem(material.classId) : null);
    const resolvedTutor = params.tutorUser || (material.tutorId ? await resolveUserProfile(material.tutorId) : null);

    const classTitle = material.classTitle || resolvedClass?.title || 'Your Class';
    const tutorName = material.tutorName || resolvedTutor?.name || 'Your Instructor';

    const logs: EmailNotificationLog[] = [];

    // Automatically resolve enrolled students if not provided
    let targetStudents = params.enrolledStudents;
    if (!targetStudents || targetStudents.length === 0) {
      if (material.classId) {
        targetStudents = await resolveEnrolledStudentsForClass(material.classId);
      }
    }

    const validStudents = (targetStudents || []).filter(s => s.email && s.email.includes('@'));
    const resourceTypeLabel = (material.type || 'Document').toUpperCase();
    const actionUrl = material.referenceUrl && material.referenceUrl.startsWith('http') 
      ? material.referenceUrl 
      : `${appUrl}/classes`;

    const { html, text } = wrapInMasterHtmlTemplate({
      title: `New Study Material: ${material.title}`,
      preheader: `${tutorName} uploaded new ${resourceTypeLabel} for ${classTitle}`,
      badgeText: `New ${resourceTypeLabel}`,
      badgeColor: '#4338ca',
      headline: `New Learning Material Available`,
      subheadline: `${classTitle} • By ${tutorName}`,
      bodyContentHtml: `
        <p>Hello scholars,</p>
        <p>Your tutor <strong>${tutorName}</strong> has just published a new learning resource for <strong>${classTitle}</strong>.</p>
        <div style="background-color: #f1f5f9; padding: 14px 18px; border-radius: 10px; border-left: 4px solid #4f46e5; margin: 16px 0;">
          <div style="font-weight: 700; font-size: 15px; color: #1e1b4b;">${material.title}</div>
          <div style="font-size: 13px; color: #475569; margin-top: 4px;">${material.description || 'Access notes, practice problems, and study guides.'}</div>
        </div>
      `,
      metadataList: [
        { label: 'Course', value: classTitle, isHighlight: true },
        { label: 'Material Title', value: material.title },
        { label: 'Type', value: resourceTypeLabel },
        { label: 'Instructor', value: tutorName },
        { label: 'Date Added', value: new Date().toLocaleDateString() }
      ],
      actionUrl,
      actionText: 'Access / Download Resource Now'
    });

    if (validStudents.length > 0) {
      for (const student of validStudents) {
        const studentEmail = student.email;
        const studentParentEmail = student.parentEmail && student.isParentEmailLinked ? student.parentEmail : undefined;

        try {
          const log = await this.dispatchEmail({
            to: studentEmail,
            cc: studentParentEmail,
            subject: `📚 New Resource: ${material.title} - ${classTitle}`,
            htmlContent: html,
            textContent: text,
            eventType: 'class_resource_added',
            recipientName: student.name,
            metadata: {
              resourceId: material.id,
              resourceTitle: material.title,
              classId: material.classId,
              classTitle,
              tutorId: material.tutorId,
              tutorName,
              studentId: student.uid
            }
          });
          logs.push(log);
        } catch (e) {
          console.warn(`[emailService] Failed sending resource alert to ${studentEmail}:`, e);
        }
      }
    } else {
      // Single log fallback
      const log = await this.dispatchEmail({
        to: `enrolled-students-${material.classId || 'class'}@gurugedara.edu`,
        subject: `📚 New Resource: ${material.title} - ${classTitle}`,
        htmlContent: html,
        textContent: text,
        eventType: 'class_resource_added',
        metadata: {
          resourceId: material.id,
          resourceTitle: material.title,
          classId: material.classId,
          classTitle,
          tutorId: material.tutorId,
          tutorName
        }
      });
      logs.push(log);
    }

    return logs;
  },

  // -------------------------------------------------------------
  // 4. CLASS UPDATED / SCHEDULE REVISED NOTIFICATIONS
  // -------------------------------------------------------------
  async notifyClassUpdated(params: {
    classItem: ClassItem;
    updateDetails: string;
    enrolledStudents?: UserProfile[];
    appUrl?: string;
  }): Promise<EmailNotificationLog[]> {
    const { classItem, updateDetails, appUrl = window.location.origin } = params;
    const logs: EmailNotificationLog[] = [];

    // Automatically resolve enrolled students if not provided
    let students = params.enrolledStudents;
    if (!students || students.length === 0) {
      students = await resolveEnrolledStudentsForClass(classItem.id);
    }

    const { html, text } = wrapInMasterHtmlTemplate({
      title: `Class Update: ${classItem.title}`,
      preheader: `Important schedule or curriculum update for ${classItem.title}`,
      badgeText: 'Class Notice',
      badgeColor: '#0284c7',
      headline: `Important Course Update`,
      subheadline: `${classItem.title} • ${classItem.tutorName}`,
      bodyContentHtml: `
        <p>Please be advised of an update regarding <strong>${classItem.title}</strong>:</p>
        <div style="background-color: #e0f2fe; padding: 14px 18px; border-radius: 10px; border-left: 4px solid #0284c7; margin: 16px 0; font-size: 14px; color: #0369a1; font-weight: 600;">
          ${updateDetails}
        </div>
        <p>Please update your timetable and review your class schedule in the student portal.</p>
      `,
      metadataList: [
        { label: 'Course', value: classItem.title, isHighlight: true },
        { label: 'Instructor', value: classItem.tutorName },
        { label: 'Schedule', value: classItem.schedule || `${classItem.dayOfWeek} ${classItem.timeSlot}` },
        { label: 'Grace Period', value: `${classItem.gracePeriod ?? 5} minutes` }
      ],
      actionUrl: `${appUrl}/classes`,
      actionText: 'View Updated Class Details'
    });

    const validStudents = (students || []).filter(s => s.email && s.email.includes('@'));
    if (validStudents.length > 0) {
      for (const student of validStudents) {
        try {
          const log = await this.dispatchEmail({
            to: student.email,
            cc: student.parentEmail && student.isParentEmailLinked ? student.parentEmail : undefined,
            subject: `📢 Class Update: ${classItem.title}`,
            htmlContent: html,
            textContent: text,
            eventType: 'class_schedule_updated',
            recipientName: student.name,
            metadata: {
              classId: classItem.id,
              classTitle: classItem.title,
              tutorId: classItem.tutorId,
              tutorName: classItem.tutorName
            }
          });
          logs.push(log);
        } catch (e) {}
      }
    } else {
      const log = await this.dispatchEmail({
        to: `students-${classItem.id}@gurugedara.edu`,
        subject: `📢 Class Update: ${classItem.title}`,
        htmlContent: html,
        textContent: text,
        eventType: 'class_schedule_updated',
        metadata: {
          classId: classItem.id,
          classTitle: classItem.title
        }
      });
      logs.push(log);
    }

    return logs;
  },

  // -------------------------------------------------------------
  // 5. ATTENDANCE NOTIFICATIONS (PRESENT, LATE, ABSENT)
  // -------------------------------------------------------------
  async notifyAttendanceMarked(params: {
    record: AttendanceRecord;
    classItem?: ClassItem | null;
    studentUser?: UserProfile | null;
    punctualityStatusText: string;
    isLate: boolean;
    delayMinutes: number;
    markedTimeFormatted: string;
    classTimesFormatted: string;
    appUrl?: string;
  }): Promise<EmailNotificationLog> {
    const { 
      record, 
      punctualityStatusText, 
      isLate, 
      delayMinutes, 
      markedTimeFormatted, 
      classTimesFormatted,
      appUrl = window.location.origin
    } = params;

    // Guaranteed resolution
    const resolvedStudent = params.studentUser || await resolveUserProfile(record.studentId);
    const resolvedClass = params.classItem || await resolveClassItem(record.classId);

    const studentEmail = resolvedStudent?.email || '';
    const studentName = resolvedStudent?.name || record.studentName || 'Student';
    const classTitle = resolvedClass?.title || record.classTitle || 'Class Session';
    const tutorName = resolvedClass?.tutorName || 'Instructor';

    // Check parent email link and preferences
    const hasParentEmailLinked = !!(resolvedStudent?.parentEmail && (resolvedStudent.isParentEmailLinked || resolvedStudent.ccParentOnNotifications));
    const isParentAttendanceCcEnabled = hasParentEmailLinked && (resolvedStudent.parentEmailCcPreferences?.attendance !== false);
    const parentEmail = isParentAttendanceCcEnabled ? resolvedStudent.parentEmail : undefined;

    const isAbsent = record.status === 'Absent';
    const eventType: EmailTriggerEventType = isAbsent 
      ? 'attendance_absent_alert' 
      : (isLate ? 'attendance_late_alert' : 'attendance_marked');

    let badgeText = 'Attendance Recorded';
    let badgeColor = '#16a34a';
    let headline = 'Class Check-in Recorded';

    if (isAbsent) {
      badgeText = 'Absent Marked';
      badgeColor = '#dc2626';
      headline = 'Class Absence Notice';
    } else if (isLate) {
      badgeText = `Late (${delayMinutes}m Exceeded)`;
      badgeColor = '#ea580c';
      headline = 'Late Attendance Notice';
    }

    const { html, text } = wrapInMasterHtmlTemplate({
      title: `${headline}: ${classTitle}`,
      preheader: `Attendance for ${studentName} in ${classTitle}: ${punctualityStatusText}`,
      badgeText,
      badgeColor,
      headline,
      subheadline: `${classTitle} • ${record.date}`,
      bodyContentHtml: `
        <p>Dear ${studentName}${parentEmail ? ' & Parents' : ''},</p>
        <p>Attendance registry for <strong>${classTitle}</strong> has been logged by the instructor.</p>
        ${isLate ? `
          <div style="background-color: #fff7ed; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #ea580c; margin: 14px 0; font-size: 13px; color: #9a3412;">
            <strong>Punctuality Note:</strong> Check-in occurred ${delayMinutes} minutes past the scheduled start time (exceeding the standard ${record.gracePeriodApplied ?? 5}-minute grace window).
          </div>
        ` : ''}
        ${isAbsent ? `
          <div style="background-color: #fef2f2; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 14px 0; font-size: 13px; color: #991b1b;">
            <strong>Absence Notice:</strong> The student was marked Absent for today's session. Please access the portal to review uploaded notes and session materials.
          </div>
        ` : ''}
      `,
      metadataList: [
        { label: 'Student', value: `${studentName} (${resolvedStudent?.username || record.studentId})` },
        { label: 'Class', value: classTitle, isHighlight: true },
        { label: 'Date', value: record.date },
        { label: 'Status', value: punctualityStatusText, isHighlight: isLate || isAbsent },
        { label: 'Check-in Time', value: markedTimeFormatted },
        { label: 'Class Time', value: classTimesFormatted },
        { label: 'Instructor', value: tutorName }
      ],
      actionUrl: `${appUrl}/classes`,
      actionText: 'View Class Summary in Portal',
      footerNote: parentEmail ? `Automated Parent CC sent to ${parentEmail}` : undefined
    });

    return await this.dispatchEmail({
      to: studentEmail || `${record.studentId}@gurugedara.edu`,
      cc: parentEmail,
      subject: `${isAbsent ? '⚠️ Absence Alert' : (isLate ? '⏱️ Late Notice' : '✅ Attendance Marked')}: ${classTitle} - ${studentName}`,
      htmlContent: html,
      textContent: text,
      eventType,
      recipientName: studentName,
      metadata: {
        attendanceId: record.id,
        attendanceStatus: record.status,
        studentId: record.studentId,
        studentName,
        parentEmail,
        classId: record.classId,
        classTitle,
        tutorId: record.tutorId,
        tutorName
      }
    });
  },

  // -------------------------------------------------------------
  // 6. STUDENT REGISTRATION APPROVAL NOTIFICATIONS
  // -------------------------------------------------------------
  async notifyStudentApproved(params: {
    studentUser: UserProfile;
    appUrl?: string;
  }): Promise<EmailNotificationLog> {
    const { studentUser, appUrl = window.location.origin } = params;
    const studentName = studentUser.name || 'Scholar Student';
    const studentEmail = studentUser.email;
    const parentEmail = studentUser.parentEmail && studentUser.isParentEmailLinked ? studentUser.parentEmail : undefined;

    const { html, text } = wrapInMasterHtmlTemplate({
      title: `Registration Approved - Welcome to Guru Gedara`,
      preheader: `Your student enrollment application has been reviewed and officially approved!`,
      badgeText: 'Registration Approved',
      badgeColor: '#16a34a',
      headline: `Welcome to Guru Gedara Institute!`,
      subheadline: `Your student account is now active and ready for class enrollment.`,
      bodyContentHtml: `
        <p>Dear <strong>${studentName}</strong>,</p>
        <p>We are delighted to inform you that your registration application for <strong>Guru Gedara Higher Educational Institute</strong> has been reviewed and officially approved by administration!</p>
        <p>You may now log in to the student portal to browse available courses, reserve your seat with top faculty tutors, access study guides, and track your attendance records.</p>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 18px; margin: 16px 0;">
          <div style="font-weight: 700; color: #166534; font-size: 13px;">Your Account Credentials:</div>
          <div style="font-size: 13px; color: #15803d; margin-top: 4px;">
            Username / Student ID: <strong>${studentUser.username || studentUser.uid}</strong><br/>
            Registered Email: <strong>${studentEmail}</strong>
          </div>
        </div>
      `,
      metadataList: [
        { label: 'Student Name', value: studentName, isHighlight: true },
        { label: 'Student ID', value: studentUser.username || studentUser.uid },
        { label: 'Account Status', value: 'APPROVED & ACTIVE', isHighlight: true },
        { label: 'Grade / Level', value: studentUser.studentDetails?.grade || 'Advanced Level' },
        { label: 'Approval Date', value: new Date().toLocaleDateString() }
      ],
      actionUrl: `${appUrl}/login`,
      actionText: 'Log In to Student Portal Now',
      footerNote: parentEmail ? `Parent advisory CC dispatched to ${parentEmail}` : undefined
    });

    return await this.dispatchEmail({
      to: studentEmail,
      cc: parentEmail,
      subject: `🎉 Registration Approved: Welcome to Guru Gedara Education!`,
      htmlContent: html,
      textContent: text,
      eventType: 'student_approved',
      recipientName: studentName,
      metadata: {
        studentId: studentUser.uid,
        studentName,
        studentEmail,
        parentEmail
      }
    });
  },

  // -------------------------------------------------------------
  // 7. ACCOUNT CREATED / CREDENTIALS WELCOME NOTIFICATION
  // -------------------------------------------------------------
  async notifyAccountCreated(params: {
    user: UserProfile;
    temporaryPassword?: string;
    appUrl?: string;
  }): Promise<EmailNotificationLog> {
    const { user, temporaryPassword, appUrl = window.location.origin } = params;
    const roleLabel = user.role === 'tutor' ? 'Faculty Tutor' : (user.role === 'admin' ? 'Administrator' : 'Scholar Student');

    const { html, text } = wrapInMasterHtmlTemplate({
      title: `Account Created - Guru Gedara Education`,
      preheader: `Your ${roleLabel} account has been created on the Guru Gedara platform.`,
      badgeText: `${roleLabel} Account Created`,
      badgeColor: '#4338ca',
      headline: `Your Guru Gedara Account is Ready`,
      subheadline: `Welcome ${user.name}, your portal access has been provisioned.`,
      bodyContentHtml: `
        <p>Dear <strong>${user.name}</strong>,</p>
        <p>An official account has been set up for you at <strong>Guru Gedara Higher Educational Institute</strong> as a <strong>${roleLabel}</strong>.</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin: 16px 0;">
          <div style="font-weight: 700; color: #1e293b; font-size: 13px;">Login Details:</div>
          <div style="font-size: 13px; color: #475569; margin-top: 4px; line-height: 1.6;">
            Portal Login: <strong>${user.email}</strong> or <strong>${user.username || user.uid}</strong><br/>
            ${temporaryPassword ? `Temporary Password: <strong style="font-family: monospace; color: #4338ca;">${temporaryPassword}</strong><br/>` : ''}
            Role: <strong>${roleLabel}</strong>
          </div>
        </div>
        <p>Please log in and update your security credentials and profile information.</p>
      `,
      metadataList: [
        { label: 'Name', value: user.name, isHighlight: true },
        { label: 'System ID', value: user.username || user.uid },
        { label: 'Role', value: roleLabel.toUpperCase() },
        { label: 'Created At', value: new Date().toLocaleDateString() }
      ],
      actionUrl: `${appUrl}/login`,
      actionText: 'Log In to Guru Gedara Portal'
    });

    return await this.dispatchEmail({
      to: user.email,
      cc: user.parentEmail && user.isParentEmailLinked ? user.parentEmail : undefined,
      subject: `✨ Welcome to Guru Gedara: Your ${roleLabel} Account is Active`,
      htmlContent: html,
      textContent: text,
      eventType: 'account_created',
      recipientName: user.name,
      metadata: {
        userId: user.uid,
        userName: user.name,
        role: user.role
      }
    });
  },

  // -------------------------------------------------------------
  // 8. FETCH & MANAGE EMAIL LOGS
  // -------------------------------------------------------------
  async getEmailLogs(limitCount: number = 60): Promise<EmailNotificationLog[]> {
    const localLogs = handleFallback<EmailNotificationLog>('local_email_notifications', []);

    if (isUsingCloud) {
      try {
        const q = query(
          collection(db, 'email_notifications'),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const cloudLogs = snap.docs.map(d => d.data() as EmailNotificationLog);
          const map = new Map<string, EmailNotificationLog>();
          cloudLogs.forEach(l => map.set(l.id, l));
          localLogs.forEach(l => { if (!map.has(l.id)) map.set(l.id, l); });
          return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
      } catch (e) {
        console.warn('[emailService] Cloud log fetch fallback to local storage:', e);
      }
    }

    return localLogs;
  },

  async clearEmailLogs(): Promise<void> {
    saveFallback('local_email_notifications', []);
    if (isUsingCloud) {
      try {
        const q = query(collection(db, 'email_notifications'), limit(50));
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      } catch (e) {
        console.warn('[emailService] Error purging cloud logs:', e);
      }
    }
  }
};
