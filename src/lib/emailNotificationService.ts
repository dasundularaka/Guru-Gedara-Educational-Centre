import { 
  Booking, 
  Payment, 
  ClassItem, 
  UserProfile, 
  StudyMaterial, 
  AttendanceRecord, 
  EmailNotificationLog, 
  EmailTriggerEventType,
  MailDocument
} from '../types';
import { db } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy, limit } from 'firebase/firestore';

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
   * Internal dispatcher that logs to Firestore mail queue and email_notifications collection
   */
  async dispatchEmail(params: {
    to: string | string[];
    cc?: string | string[];
    subject: string;
    htmlContent: string;
    textContent: string;
    eventType: EmailTriggerEventType;
    recipientName?: string;
    metadata?: Record<string, any>;
  }): Promise<EmailNotificationLog> {
    const id = generateId('emlog');
    const toRecipients = Array.isArray(params.to) ? params.to : [params.to];
    const ccRecipients = params.cc ? (Array.isArray(params.cc) ? params.cc : [params.cc]) : [];

    // Filter out invalid/empty email addresses
    const validTo = toRecipients.filter(email => email && email.includes('@'));
    const validCc = ccRecipients.filter(email => email && email.includes('@'));

    const logEntry: EmailNotificationLog = {
      id,
      to: validTo.length === 1 ? validTo[0] : validTo,
      cc: validCc.length > 0 ? (validCc.length === 1 ? validCc[0] : validCc) : undefined,
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
        dispatchMechanism: isUsingCloud ? 'firestore_mail_collection' : 'client_simulated',
        cloudFunctionTriggered: isUsingCloud
      }
    };

    // 1. Write to Firestore 'mail' collection (Standard Firebase Trigger Email Extension & Cloud Functions target)
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

    // 3. Fallback to localStorage
    const localLogs = handleFallback<EmailNotificationLog>('local_email_notifications', []);
    localLogs.unshift(logEntry);
    // Keep last 100 email logs in local cache
    saveFallback('local_email_notifications', localLogs.slice(0, 100));

    console.info(`[emailService] Automated email dispatched: [${params.eventType}] to: ${validTo.join(', ')} subject: "${params.subject}"`);
    return logEntry;
  },

  // -------------------------------------------------------------
  // 1. CLASS BOOKING & ENROLLMENT NOTIFICATIONS
  // -------------------------------------------------------------
  async notifyClassBookingSuccess(params: {
    booking: Booking;
    classItem: ClassItem;
    studentUser?: UserProfile | null;
    tutorUser?: UserProfile | null;
    appUrl?: string;
  }): Promise<{ studentLog: EmailNotificationLog; tutorLog?: EmailNotificationLog }> {
    const { booking, classItem, studentUser, tutorUser, appUrl = window.location.origin } = params;
    const studentEmail = studentUser?.email || booking.studentEmail || `${booking.studentId}@gurugedara.edu`;
    const studentName = studentUser?.name || booking.studentName || 'Student';
    const tutorEmail = tutorUser?.email || `${classItem.tutorId}@gurugedara.edu`;

    // Parent CC calculation
    const hasParentLinked = !!(studentUser?.parentEmail && (studentUser.isParentEmailLinked || studentUser.ccParentOnNotifications));
    const parentEmail = hasParentLinked ? studentUser?.parentEmail : undefined;

    // Student Confirmation Email
    const { html, text } = wrapInMasterHtmlTemplate({
      title: `Enrollment Confirmed: ${classItem.title}`,
      preheader: `Your seat in ${classItem.title} with ${classItem.tutorName} is confirmed.`,
      badgeText: 'Enrollment Confirmed',
      badgeColor: '#16a34a',
      headline: `Class Booking Confirmed!`,
      subheadline: `Hello ${studentName}, your registration for ${classItem.title} was successful.`,
      bodyContentHtml: `
        <p>Congratulations! Your seat for <strong>${classItem.title}</strong> has been secured in the Guru Gedara Learning Platform.</p>
        <p>Please review your class schedule below. Make sure to arrive or log in 5 minutes prior to the scheduled start time to ensure smooth attendance marking.</p>
      `,
      metadataList: [
        { label: 'Course Title', value: classItem.title, isHighlight: true },
        { label: 'Subject', value: classItem.subject },
        { label: 'Instructor', value: classItem.tutorName },
        { label: 'Class Schedule', value: classItem.schedule || `${classItem.dayOfWeek} at ${classItem.timeSlot}` },
        { label: 'Tuition Fee', value: `LKR ${classItem.price.toLocaleString()} / month` },
        { label: 'Booking Ref', value: booking.id }
      ],
      actionUrl: `${appUrl}/classes`,
      actionText: 'View Class Details & Materials',
      footerNote: parentEmail ? `Parent copy CC'd to ${parentEmail}` : undefined
    });

    const studentLog = await this.dispatchEmail({
      to: studentEmail,
      cc: parentEmail,
      subject: `✅ Enrollment Confirmed: ${classItem.title} (${classItem.tutorName})`,
      htmlContent: html,
      textContent: text,
      eventType: 'booking_confirmation',
      recipientName: studentName,
      metadata: {
        studentId: booking.studentId,
        studentName,
        studentEmail,
        parentEmail,
        classId: classItem.id,
        classTitle: classItem.title,
        tutorId: classItem.tutorId,
        tutorName: classItem.tutorName
      }
    });

    // Tutor Enrollment Alert Email
    let tutorLog: EmailNotificationLog | undefined;
    if (tutorEmail) {
      const tutorTemplate = wrapInMasterHtmlTemplate({
        title: `New Student Enrolled: ${classItem.title}`,
        preheader: `${studentName} has enrolled in your class ${classItem.title}.`,
        badgeText: 'New Enrollment Alert',
        badgeColor: '#4338ca',
        headline: `New Student in ${classItem.title}`,
        subheadline: `A new student has enrolled into your course roster.`,
        bodyContentHtml: `
          <p>Hello <strong>${classItem.tutorName}</strong>,</p>
          <p><strong>${studentName}</strong> has just enrolled in your course <strong>${classItem.title}</strong>.</p>
          <p>You can view their student profile, attendance history, and study progress from your Tutor Dashboard.</p>
        `,
        metadataList: [
          { label: 'Student Name', value: studentName, isHighlight: true },
          { label: 'Student ID', value: studentUser?.username || booking.studentId },
          { label: 'Class Enrolled', value: classItem.title },
          { label: 'Schedule', value: classItem.schedule || `${classItem.dayOfWeek} ${classItem.timeSlot}` },
          { label: 'Enrolled Date', value: new Date().toLocaleDateString() }
        ],
        actionUrl: `${appUrl}/tutor`,
        actionText: 'View Course Roster in Dashboard'
      });

      tutorLog = await this.dispatchEmail({
        to: tutorEmail,
        subject: `🎓 New Enrollment: ${studentName} joined ${classItem.title}`,
        htmlContent: tutorTemplate.html,
        textContent: tutorTemplate.text,
        eventType: 'booking_tutor_alert',
        recipientName: classItem.tutorName,
        metadata: {
          tutorId: classItem.tutorId,
          tutorName: classItem.tutorName,
          studentId: booking.studentId,
          studentName,
          classId: classItem.id,
          classTitle: classItem.title
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
    const { payment, classItem, studentUser, appUrl = window.location.origin } = params;
    const studentEmail = studentUser?.email || `${payment.studentId}@gurugedara.edu`;
    const studentName = studentUser?.name || payment.studentName || 'Student';

    // Check parent email CC
    const isParentPaymentCcActive = !!(studentUser?.parentEmail && (studentUser.isParentEmailLinked || studentUser.ccParentOnNotifications) && studentUser.parentEmailCcPreferences?.payments !== false);
    const parentEmail = isParentPaymentCcActive ? studentUser?.parentEmail : undefined;

    const formattedDate = new Date(payment.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const isPaid = payment.status === 'paid';
    const badgeText = isPaid ? 'Payment Confirmed' : 'Payment Processing';
    const badgeColor = isPaid ? '#16a34a' : '#d97706';

    const { html, text } = wrapInMasterHtmlTemplate({
      title: `Tuition Fee Receipt: ${payment.classTitle}`,
      preheader: `Official payment receipt for ${payment.classTitle} - LKR ${payment.amount.toLocaleString()}`,
      badgeText,
      badgeColor,
      headline: `Official Tuition Receipt`,
      subheadline: `Payment confirmation for ${studentName}`,
      bodyContentHtml: `
        <p>Thank you! Your tuition fee payment for <strong>${payment.classTitle}</strong> has been received and verified by Guru Gedara Institute.</p>
        <p>Keep this e-receipt for your records. Your class access and study resources are active.</p>
      `,
      metadataList: [
        { label: 'Receipt #', value: payment.id.toUpperCase(), isHighlight: true },
        { label: 'Student Name', value: studentName },
        { label: 'Class / Subject', value: payment.classTitle },
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
      to: studentEmail,
      cc: parentEmail,
      subject: `🧾 Official Tuition Receipt: ${payment.classTitle} (LKR ${payment.amount.toLocaleString()})`,
      htmlContent: html,
      textContent: text,
      eventType: 'payment_receipt',
      recipientName: studentName,
      metadata: {
        paymentId: payment.id,
        amount: payment.amount,
        classId: payment.classId,
        classTitle: payment.classTitle,
        studentId: payment.studentId,
        studentName,
        parentEmail
      }
    });
  },

  // -------------------------------------------------------------
  // 3. STUDY MATERIAL / CLASS RESOURCE ADDED NOTIFICATIONS
  // -------------------------------------------------------------
  async notifyClassResourceAdded(params: {
    material: StudyMaterial;
    classItem?: ClassItem | null;
    tutorUser?: UserProfile | null;
    enrolledStudents?: UserProfile[];
    appUrl?: string;
  }): Promise<EmailNotificationLog[]> {
    const { material, classItem, tutorUser, enrolledStudents = [], appUrl = window.location.origin } = params;
    const classTitle = material.classTitle || classItem?.title || 'Your Class';
    const tutorName = material.tutorName || tutorUser?.name || 'Your Instructor';

    const logs: EmailNotificationLog[] = [];

    // Collect distinct student emails
    const targetStudents = enrolledStudents.filter(s => s.email && s.email.includes('@'));

    const resourceTypeLabel = (material.type || 'Document').toUpperCase();
    const actionUrl = material.referenceUrl.startsWith('http') 
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

    if (targetStudents.length > 0) {
      for (const student of targetStudents) {
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
      // Single broadcast dispatch
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
    const { classItem, updateDetails, enrolledStudents = [], appUrl = window.location.origin } = params;
    const logs: EmailNotificationLog[] = [];

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

    const students = enrolledStudents.filter(s => s.email && s.email.includes('@'));
    if (students.length > 0) {
      for (const student of students) {
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
    classItem: ClassItem;
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
      classItem, 
      studentUser, 
      punctualityStatusText, 
      isLate, 
      delayMinutes, 
      markedTimeFormatted, 
      classTimesFormatted,
      appUrl = window.location.origin
    } = params;

    const studentEmail = studentUser?.email || `${record.studentId}@gurugedara.edu`;
    const studentName = studentUser?.name || record.studentName || 'Student';

    // Check parent email link and preferences
    const hasParentEmailLinked = !!(studentUser?.parentEmail && (studentUser.isParentEmailLinked || studentUser.ccParentOnNotifications));
    const isParentAttendanceCcEnabled = hasParentEmailLinked && (studentUser.parentEmailCcPreferences?.attendance !== false);
    const parentEmail = isParentAttendanceCcEnabled ? studentUser.parentEmail : undefined;

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
      title: `${headline}: ${classItem.title}`,
      preheader: `Attendance for ${studentName} in ${classItem.title}: ${punctualityStatusText}`,
      badgeText,
      badgeColor,
      headline,
      subheadline: `${classItem.title} • ${record.date}`,
      bodyContentHtml: `
        <p>Dear ${studentName}${parentEmail ? ' & Parents' : ''},</p>
        <p>Attendance registry for <strong>${classItem.title}</strong> has been logged by the instructor.</p>
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
        { label: 'Student', value: `${studentName} (${studentUser?.username || record.studentId})` },
        { label: 'Class', value: classItem.title, isHighlight: true },
        { label: 'Date', value: record.date },
        { label: 'Status', value: punctualityStatusText, isHighlight: isLate || isAbsent },
        { label: 'Check-in Time', value: markedTimeFormatted },
        { label: 'Class Time', value: classTimesFormatted },
        { label: 'Instructor', value: classItem.tutorName }
      ],
      actionUrl: `${appUrl}/classes`,
      actionText: 'View Class Summary in Portal',
      footerNote: parentEmail ? `Automated Parent CC sent to ${parentEmail}` : undefined
    });

    return await this.dispatchEmail({
      to: studentEmail,
      cc: parentEmail,
      subject: `${isAbsent ? '⚠️ Absence Alert' : (isLate ? '⏱️ Late Notice' : '✅ Attendance Marked')}: ${classItem.title} - ${studentName}`,
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
        classId: classItem.id,
        classTitle: classItem.title,
        tutorId: classItem.tutorId,
        tutorName: classItem.tutorName
      }
    });
  },

  // -------------------------------------------------------------
  // 6. FETCH & MANAGE EMAIL LOGS
  // -------------------------------------------------------------
  async getEmailLogs(limitCount: number = 50): Promise<EmailNotificationLog[]> {
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
          // Merge local and cloud, deduplicating by ID
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
  }
};
