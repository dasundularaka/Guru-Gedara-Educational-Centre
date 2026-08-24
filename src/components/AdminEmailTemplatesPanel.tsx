import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Mail, 
  Send, 
  Eye, 
  Code, 
  Smartphone, 
  Monitor, 
  Download, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles, 
  RefreshCw, 
  Filter, 
  Bell, 
  Calendar, 
  CreditCard, 
  BookOpen, 
  UserCheck, 
  GraduationCap, 
  AlertCircle, 
  FileText, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  ChevronRight, 
  Sliders, 
  Play, 
  Settings,
  Layers,
  Search,
  Zap,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useEmailNotifications } from '../hooks/useEmailNotifications';
import { 
  wrapInMasterHtmlTemplate, 
  generateGoogleCalendarUrl, 
  buildGmailComposeUrl, 
  buildMailtoUrl, 
  downloadEmlFile,
  emailNotificationService
} from '../lib/emailNotificationService';
import { EmailTriggerEventType, EmailNotificationLog } from '../types';

export type TemplateCategory = 'all' | 'reminders' | 'bookings' | 'billing' | 'attendance' | 'academic';

export interface EmailTemplateDefinition {
  id: string;
  name: string;
  category: TemplateCategory;
  eventType: EmailTriggerEventType;
  description: string;
  triggerEvent: string;
  defaultData: Record<string, any>;
  generate: (data: Record<string, any>) => {
    subject: string;
    preheader: string;
    badgeText: string;
    badgeColor: string;
    headline: string;
    subheadline?: string;
    bodyContentHtml: string;
    actionUrl?: string;
    actionText?: string;
    metadataList?: { label: string; value: string; isHighlight?: boolean }[];
    footerNote?: string;
  };
}

export const EMAIL_TEMPLATES: EmailTemplateDefinition[] = [
  {
    id: 'reminder_24h',
    name: '24-Hour Automated Class Reminder',
    category: 'reminders',
    eventType: 'class_reminder_24h',
    description: 'Dispatched to enrolled students 24 hours prior to their upcoming class session with Google Calendar sync.',
    triggerEvent: 'Hourly Firebase Cloud Function / Client Cron Scan (23–25h window)',
    defaultData: {
      studentName: 'Kasun Bandara',
      studentEmail: 'kasun.bandara@example.com',
      classTitle: 'Advanced Level Combined Mathematics 2026',
      subject: 'Combined Mathematics',
      tutorName: 'Prof. Samantha Perera',
      dayOfWeek: 'Saturday',
      timeSlot: '08:30 AM - 11:30 AM',
      location: 'Main Academic Hall A (Level 2) & Online Livestream',
      sessionDateText: 'Tomorrow, Saturday morning',
      sessionNote: 'Please arrive 10 minutes early with your Unit 04 problem set booklet and scientific calculator.'
    },
    generate: (data) => {
      const gcalUrl = generateGoogleCalendarUrl({
        title: `${data.classTitle} - Guru Gedara`,
        description: `Class session for ${data.classTitle} conducted by ${data.tutorName}. Location: ${data.location}`,
        location: data.location,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        durationMinutes: 180
      });

      return {
        subject: `⏰ Reminder: Tomorrow's Class - ${data.classTitle} with ${data.tutorName}`,
        preheader: `Your class session is scheduled for tomorrow at ${data.timeSlot}. View details and add to your calendar.`,
        badgeText: '24-Hour Session Reminder',
        badgeColor: '#4f46e5',
        headline: `Tomorrow's Class Reminder`,
        subheadline: `Get prepared for ${data.classTitle}`,
        bodyContentHtml: `
          <p style="margin: 0 0 16px;">Dear <strong>${data.studentName}</strong>,</p>
          <p style="margin: 0 0 16px; color: #475569; line-height: 1.6;">
            This is an automated reminder that your scheduled academic session for <strong>${data.classTitle}</strong> with <strong>${data.tutorName}</strong> is taking place <strong>${data.sessionDateText}</strong>.
          </p>
          <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 14px 18px; margin: 18px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0 0 6px; font-weight: 700; color: #1e293b; font-size: 13px;">💡 Session Preparation Note:</p>
            <p style="margin: 0; color: #64748b; font-size: 13px;">${data.sessionNote}</p>
          </div>
          <p style="margin: 16px 0 0; color: #475569; font-size: 13px;">
            You can sync this lecture directly to your Google Calendar or access classroom streaming links via the button below.
          </p>
        `,
        actionUrl: gcalUrl,
        actionText: '📅 Add to Google Calendar & View Room',
        metadataList: [
          { label: 'Course Subject', value: data.subject },
          { label: 'Academic Faculty', value: data.tutorName },
          { label: 'Scheduled Time', value: `${data.dayOfWeek}, ${data.timeSlot}`, isHighlight: true },
          { label: 'Classroom / Hall', value: data.location },
          { label: 'Registered Student', value: data.studentName }
        ],
        footerNote: 'You received this notification because 24-Hour Session Reminders are active on your Guru Gedara account.'
      };
    }
  },
  {
    id: 'reminder_15m',
    name: '15-Minute Class Starting Imminent Alert',
    category: 'reminders',
    eventType: 'class_reminder_15m',
    description: 'High-priority countdown notification dispatched 15 minutes before the session starts.',
    triggerEvent: 'Real-time countdown scheduler (10–20m before session)',
    defaultData: {
      studentName: 'Anushka Jayawardena',
      studentEmail: 'anushka.j@example.com',
      classTitle: 'Physics Revision & Mechanics Masterclass',
      tutorName: 'Dr. Nirmal Jayasuriya',
      timeSlot: '03:30 PM - 06:30 PM',
      classroomHall: 'Hall B (Physics Lab) & Livestream Room 102'
    },
    generate: (data) => ({
      subject: `🚨 Starting in 15 Minutes: ${data.classTitle}`,
      preheader: `Your session begins at ${data.timeSlot}. Check in now.`,
      badgeText: 'Class Starting Soon (15 min)',
      badgeColor: '#dc2626',
      headline: `Class Starting in 15 Minutes!`,
      subheadline: `${data.classTitle} is commencing shortly`,
      bodyContentHtml: `
        <p style="margin: 0 0 16px;">Dear <strong>${data.studentName}</strong>,</p>
        <p style="margin: 0 0 16px; color: #475569; line-height: 1.6;">
          Your lecture session for <strong>${data.classTitle}</strong> with <strong>${data.tutorName}</strong> is scheduled to begin in <strong>15 minutes</strong> at <strong>${data.timeSlot}</strong>.
        </p>
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 14px 18px; margin: 18px 0; border-radius: 12px;">
          <p style="margin: 0 0 4px; font-weight: 700; color: #991b1b; font-size: 13px;">📍 Venue & Check-in:</p>
          <p style="margin: 0; color: #b91c1c; font-size: 13px;">Please be seated in ${data.classroomHall} or launch your student streaming link now.</p>
        </div>
      `,
      actionUrl: 'https://gurugedara.edu/classes',
      actionText: '🚀 Enter Classroom / Check-in QR',
      metadataList: [
        { label: 'Class', value: data.classTitle },
        { label: 'Tutor', value: data.tutorName },
        { label: 'Time Slot', value: data.timeSlot, isHighlight: true },
        { label: 'Location', value: data.classroomHall }
      ],
      footerNote: 'Immediate session countdown reminder.'
    })
  },
  {
    id: 'booking_confirmation',
    name: 'Course Booking Confirmation & Voucher',
    category: 'bookings',
    eventType: 'booking_confirmation',
    description: 'Sent immediately when a student reserves an active class seat slot.',
    triggerEvent: 'Student or Admin booking confirmation action',
    defaultData: {
      studentName: 'Dilshan Silva',
      studentEmail: 'dilshan.s@example.com',
      bookingId: 'BK-2026-8941',
      classTitle: 'Grade 12 Chemistry Theory & Organic Syntheses',
      subject: 'Chemistry',
      tutorName: 'Dr. Nirmal Jayasuriya',
      dayOfWeek: 'Monday',
      timeSlot: '03:30 PM - 06:30 PM',
      tuitionFee: 'LKR 3,500.00 / month',
      seatAllocation: 'Reserved & Confirmed'
    },
    generate: (data) => ({
      subject: `✅ Booking Confirmed: ${data.classTitle} (Ref: ${data.bookingId})`,
      preheader: `Your seat has been reserved for ${data.classTitle}. See your booking voucher.`,
      badgeText: 'Seat Reservation Confirmed',
      badgeColor: '#059669',
      headline: `Class Booking Confirmed!`,
      subheadline: `Welcome to ${data.classTitle}`,
      bodyContentHtml: `
        <p style="margin: 0 0 16px;">Dear <strong>${data.studentName}</strong>,</p>
        <p style="margin: 0 0 16px; color: #475569; line-height: 1.6;">
          Congratulations! Your seat reservation for <strong>${data.classTitle}</strong> has been officially confirmed by Guru Gedara Higher Educational Institute.
        </p>
        <p style="margin: 0 0 16px; color: #475569; line-height: 1.6;">
          You can access all lesson plans, attendance QR check-in badges, and digital handouts in your student dashboard anytime.
        </p>
      `,
      actionUrl: 'https://gurugedara.edu/dashboard',
      actionText: '🎓 View Student Dashboard & Schedule',
      metadataList: [
        { label: 'Booking Voucher ID', value: data.bookingId, isHighlight: true },
        { label: 'Course Title', value: data.classTitle },
        { label: 'Faculty Tutor', value: data.tutorName },
        { label: 'Weekly Schedule', value: `${data.dayOfWeek} (${data.timeSlot})` },
        { label: 'Tuition Fee Rate', value: data.tuitionFee },
        { label: 'Seat Status', value: data.seatAllocation }
      ],
      footerNote: 'Keep this confirmation voucher for your academic intake records.'
    })
  },
  {
    id: 'booking_cancellation',
    name: 'Class Booking Cancellation Notice',
    category: 'bookings',
    eventType: 'booking_cancellation',
    description: 'Sent when a student or administrator cancels an existing class booking seat.',
    triggerEvent: 'Slot cancellation trigger in student/admin dashboard',
    defaultData: {
      studentName: 'Dilshan Silva',
      studentEmail: 'dilshan.s@example.com',
      bookingId: 'BK-2026-8941',
      classTitle: 'Grade 12 Chemistry Theory & Organic Syntheses',
      tutorName: 'Dr. Nirmal Jayasuriya',
      cancellationReason: 'Student schedule change request',
      refundStatus: 'Tuition balance credited to student account'
    },
    generate: (data) => ({
      subject: `Class Booking Cancelled: ${data.classTitle}`,
      preheader: `Your booking ${data.bookingId} has been cancelled.`,
      badgeText: 'Booking Cancelled',
      badgeColor: '#dc2626',
      headline: `Booking Cancellation Notice`,
      subheadline: `Course seat release confirmed`,
      bodyContentHtml: `
        <p style="margin: 0 0 16px;">Dear <strong>${data.studentName}</strong>,</p>
        <p style="margin: 0 0 16px; color: #475569; line-height: 1.6;">
          This notice confirms that your booking for <strong>${data.classTitle}</strong> with <strong>${data.tutorName}</strong> has been cancelled.
        </p>
        <p style="margin: 0 0 16px; color: #475569; line-height: 1.6;">
          Your seat slot has been released back to the class roster. If you wish to re-enroll or switch to an alternate timetable, browse available curriculums in the course directory.
        </p>
      `,
      actionUrl: 'https://gurugedara.edu/classes',
      actionText: '🔍 Browse Alternative Class Schedules',
      metadataList: [
        { label: 'Cancelled Ref', value: data.bookingId },
        { label: 'Course', value: data.classTitle },
        { label: 'Tutor', value: data.tutorName },
        { label: 'Cancellation Reason', value: data.cancellationReason },
        { label: 'Billing Status', value: data.refundStatus, isHighlight: true }
      ],
      footerNote: 'If this cancellation was in error, please contact the academy administration desk.'
    })
  },
  {
    id: 'payment_receipt',
    name: 'Tuition Fee Payment Receipt & Invoice',
    category: 'billing',
    eventType: 'payment_receipt',
    description: 'Official payment receipt sent to student and auto-CCed to parent upon tuition settlement.',
    triggerEvent: 'Online card payment or admin manual ledger settlement',
    defaultData: {
      studentName: 'Chathura Wickramasinghe',
      studentEmail: 'chathura.w@example.com',
      parentEmail: 'wickrama.parent@example.com',
      receiptId: 'REC-2026-004812',
      classTitle: 'Advanced Level Combined Mathematics Revision',
      amountPaid: 'LKR 4,000.00',
      paymentMethod: 'Online Visa / MasterCard (Stripe Secured)',
      paidAt: '2026-08-21 10:30 AM',
      billingPeriod: 'August 2026 Tuition',
      status: 'PAID & SETTLED'
    },
    generate: (data) => ({
      subject: `🧾 Official Payment Receipt: ${data.receiptId} (LKR ${data.amountPaid})`,
      preheader: `Thank you for your tuition payment of ${data.amountPaid} for ${data.classTitle}.`,
      badgeText: 'Payment Settled (PAID)',
      badgeColor: '#059669',
      headline: `Official Tuition Fee Receipt`,
      subheadline: `Payment confirmation & billing record`,
      bodyContentHtml: `
        <p style="margin: 0 0 16px;">Dear <strong>${data.studentName}</strong>,</p>
        <p style="margin: 0 0 16px; color: #475569; line-height: 1.6;">
          Thank you for your tuition settlement. Guru Gedara Higher Educational Institute has received and processed your payment of <strong>${data.amountPaid}</strong> for <strong>${data.classTitle}</strong>.
        </p>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px 18px; margin: 18px 0; border-radius: 12px;">
          <p style="margin: 0 0 4px; font-weight: 700; color: #166534; font-size: 13px;">🛡️ Verified Financial Transaction</p>
          <p style="margin: 0; color: #15803d; font-size: 12px;">This electronic voucher serves as your official institutional tax receipt for ${data.billingPeriod}.</p>
        </div>
      `,
      actionUrl: 'https://gurugedara.edu/dashboard',
      actionText: '📥 View Ledger & Download Full PDF',
      metadataList: [
        { label: 'Receipt Voucher No', value: data.receiptId, isHighlight: true },
        { label: 'Tuition Amount Paid', value: data.amountPaid, isHighlight: true },
        { label: 'Enrolled Course', value: data.classTitle },
        { label: 'Payment Gateway', value: data.paymentMethod },
        { label: 'Billing Period', value: data.billingPeriod },
        { label: 'Timestamp', value: data.paidAt }
      ],
      footerNote: 'Guru Gedara Higher Educational Institute • Accounts & Finance Division'
    })
  },
  {
    id: 'payment_due_reminder',
    name: 'Monthly Tuition Payment Due Notice',
    category: 'billing',
    eventType: 'payment_due_reminder',
    description: 'Dispatched to remind scholars and parents of upcoming or pending monthly tuition invoices.',
    triggerEvent: 'Monthly invoice cycle reminder or admin ledger alert',
    defaultData: {
      studentName: 'Chathura Wickramasinghe',
      studentEmail: 'chathura.w@example.com',
      invoiceId: 'INV-2026-0819',
      classTitle: 'Advanced Level Combined Mathematics Revision',
      amountDue: 'LKR 4,000.00',
      dueDate: '2026-08-30',
      gracePeriod: '5 Days Grace Period'
    },
    generate: (data) => ({
      subject: `🔔 Tuition Due Notice: ${data.classTitle} (${data.amountDue})`,
      preheader: `Your tuition fee for ${data.classTitle} is due on ${data.dueDate}.`,
      badgeText: 'Invoice Due Notice',
      badgeColor: '#d97706',
      headline: `Tuition Fee Due Notice`,
      subheadline: `Monthly settlement for ${data.classTitle}`,
      bodyContentHtml: `
        <p style="margin: 0 0 16px;">Dear <strong>${data.studentName}</strong>,</p>
        <p style="margin: 0 0 16px; color: #475569; line-height: 1.6;">
          This is a friendly reminder that the tuition fee of <strong>${data.amountDue}</strong> for <strong>${data.classTitle}</strong> is scheduled for payment by <strong>${data.dueDate}</strong>.
        </p>
        <p style="margin: 0 0 16px; color: #475569; line-height: 1.6;">
          Prompt fee settlement ensures uninterrupted access to live lectures, study materials, and recording archives.
        </p>
      `,
      actionUrl: 'https://gurugedara.edu/dashboard',
      actionText: '💳 Pay Online Securely Now',
      metadataList: [
        { label: 'Invoice No', value: data.invoiceId },
        { label: 'Amount Payable', value: data.amountDue, isHighlight: true },
        { label: 'Course', value: data.classTitle },
        { label: 'Due Date', value: data.dueDate },
        { label: 'Grace Policy', value: data.gracePeriod }
      ],
      footerNote: 'You can settle fees securely using Credit/Debit Card or via institutional bank transfer.'
    })
  },
  {
    id: 'attendance_marked',
    name: 'Student Attendance Check-In Confirmation',
    category: 'attendance',
    eventType: 'attendance_marked',
    description: 'Instant notification dispatched when student checks in via QR Scanner or classroom terminal.',
    triggerEvent: 'QR Scanner attendance check-in scan',
    defaultData: {
      studentName: 'Sahan Senaratne',
      studentEmail: 'sahan.s@example.com',
      studentId: 'GB10293847',
      classTitle: 'Combined Mathematics Morning Session',
      checkInTime: '08:24 AM (Punctual Check-in)',
      checkInType: 'Physical QR Code Terminal Scan',
      tutorName: 'Prof. Samantha Perera',
      date: '2026-08-21'
    },
    generate: (data) => ({
      subject: `🎯 Attendance Verified: ${data.studentName} checked in to ${data.classTitle}`,
      preheader: `Check-in recorded at ${data.checkInTime} on ${data.date}.`,
      badgeText: 'Attendance Verified (Present)',
      badgeColor: '#059669',
      headline: `Class Check-in Recorded!`,
      subheadline: `Punctual attendance logged at Guru Gedara`,
      bodyContentHtml: `
        <p style="margin: 0 0 16px;">Dear <strong>${data.studentName}</strong> (and Parent/Guardian),</p>
        <p style="margin: 0 0 16px; color: #475569; line-height: 1.6;">
          This email confirms that your classroom attendance for <strong>${data.classTitle}</strong> with <strong>${data.tutorName}</strong> was successfully verified on <strong>${data.date}</strong> at <strong>${data.checkInTime}</strong>.
        </p>
        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 14px 18px; margin: 18px 0; border-radius: 12px;">
          <p style="margin: 0 0 4px; font-weight: 700; color: #065f46; font-size: 13px;">✅ Punctual Entry Recorded</p>
          <p style="margin: 0; color: #047857; font-size: 12px;">The student entered before class commencement. Daily attendance score updated to 100%.</p>
        </div>
      `,
      actionUrl: 'https://gurugedara.edu/dashboard',
      actionText: '📊 View Attendance Tracker & History',
      metadataList: [
        { label: 'Student ID', value: data.studentId },
        { label: 'Course Session', value: data.classTitle },
        { label: 'Check-in Time', value: data.checkInTime, isHighlight: true },
        { label: 'Terminal Method', value: data.checkInType },
        { label: 'Faculty Tutor', value: data.tutorName }
      ],
      footerNote: 'Automated attendance dispatch from Guru Gedara Smart Classroom Gateway.'
    })
  },
  {
    id: 'attendance_late_alert',
    name: 'Tardiness / Late Arrival Notice',
    category: 'attendance',
    eventType: 'attendance_late_alert',
    description: 'Dispatched when student checks in after the session grace period has elapsed.',
    triggerEvent: 'Late check-in recorded past grace window',
    defaultData: {
      studentName: 'Sahan Senaratne',
      studentEmail: 'sahan.s@example.com',
      studentId: 'GB10293847',
      classTitle: 'Combined Mathematics Morning Session',
      checkInTime: '08:48 AM',
      delayMinutes: '18 Minutes Delay',
      tutorName: 'Prof. Samantha Perera'
    },
    generate: (data) => ({
      subject: `⚠️ Late Attendance Notice: ${data.studentName} (${data.delayMinutes})`,
      preheader: `Late arrival recorded for ${data.classTitle} at ${data.checkInTime}.`,
      badgeText: 'Tardy / Late Arrival Alert',
      badgeColor: '#ea580c',
      headline: `Late Arrival Notice`,
      subheadline: `Tardiness alert for ${data.classTitle}`,
      bodyContentHtml: `
        <p style="margin: 0 0 16px;">Dear <strong>${data.studentName}</strong> (and Parent/Guardian),</p>
        <p style="margin: 0 0 16px; color: #475569; line-height: 1.6;">
          This notice is to record that attendance for <strong>${data.classTitle}</strong> was checked in at <strong>${data.checkInTime}</strong> with an elapsed delay of <strong>${data.delayMinutes}</strong> past the scheduled start time.
        </p>
        <p style="margin: 0 0 16px; color: #475569; line-height: 1.6;">
          Consistent punctuality ensures complete syllabus coverage. Please ensure on-time arrival for future lectures.
        </p>
      `,
      actionUrl: 'https://gurugedara.edu/dashboard',
      actionText: '📊 View Attendance Record',
      metadataList: [
        { label: 'Student ID', value: data.studentId },
        { label: 'Course', value: data.classTitle },
        { label: 'Check-in Time', value: data.checkInTime },
        { label: 'Delay Duration', value: data.delayMinutes, isHighlight: true },
        { label: 'Faculty Tutor', value: data.tutorName }
      ],
      footerNote: 'Auto-CC notification dispatched to linked parent guardian contact.'
    })
  },
  {
    id: 'attendance_absent_reminder',
    name: 'Absent Scholar Catch-Up & Study Reminder',
    category: 'attendance',
    eventType: 'attendance_absent_reminder',
    description: 'Automated email triggered by tutors to students marked Absent, providing catch-up notes, recording links, and syllabus advice.',
    triggerEvent: 'Tutor marks student Absent or automated attendance scanning concludes',
    defaultData: {
      studentName: 'Nethmi Fernando',
      studentEmail: 'nethmi.f@example.com',
      studentId: 'GG10283749',
      classTitle: 'Advanced Level Combined Mathematics 2026',
      sessionDate: '2026-08-23',
      sessionTime: '08:30 AM - 11:30 AM',
      tutorName: 'Prof. Samantha Perera',
      customMessage: 'We covered Unit 04 Differential Calculus integration techniques today. Please review the uploaded summary sheet and complete homework set 3 before next Tuesday.',
      recordingUrl: 'https://gurugedara.edu/recordings/calculus-unit-04',
      materialsUrl: 'https://gurugedara.edu/classes'
    },
    generate: (data) => ({
      subject: `⚠️ [Guru Gedara] Absence Follow-Up & Study Reminder: ${data.classTitle} (${data.sessionDate})`,
      preheader: `We missed you in ${data.classTitle} on ${data.sessionDate}. Access class resources to stay on track!`,
      badgeText: 'Absence Catch-Up Reminder',
      badgeColor: '#dc2626',
      headline: 'We Missed You in Class Today!',
      subheadline: `${data.classTitle} • Session Date: ${data.sessionDate}`,
      bodyContentHtml: `
        <p style="margin: 0 0 16px;">Dear <strong>${data.studentName}</strong> (and Parents/Guardians),</p>
        <p style="margin: 0 0 16px; color: #475569; line-height: 1.6;">
          Our attendance records indicate that you were marked as <strong>Absent</strong> for the <strong>${data.classTitle}</strong> session held on <strong>${data.sessionDate}</strong>.
        </p>
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px 18px; margin: 18px 0; color: #991b1b;">
          <div style="font-weight: 800; font-size: 14px; margin-bottom: 6px;">
            ⚠️ Academic Continuity & Catch-Up Advisory
          </div>
          <div style="font-size: 13px; line-height: 1.5; color: #7f1d1d;">
            Regular classroom participation is critical to your examination readiness. Please ensure you catch up on the topics, homework exercises, and examples covered during this lesson.
          </div>
        </div>
        ${data.customMessage ? `
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #4f46e5; border-radius: 10px; padding: 14px 18px; margin: 18px 0;">
            <div style="font-weight: 700; color: #1e1b4b; font-size: 13px; margin-bottom: 4px;">
              📝 Direct Message from ${data.tutorName}:
            </div>
            <div style="font-size: 13px; color: #334155; line-height: 1.6;">
              ${data.customMessage}
            </div>
          </div>
        ` : ''}
        <div style="margin: 20px 0; background-color: #f1f5f9; padding: 16px; border-radius: 10px;">
          <div style="font-weight: 700; color: #0f172a; font-size: 13px; margin-bottom: 8px;">
            📋 Recommended Next Steps to Stay on Track:
          </div>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
            <li><strong>Download Class Study Materials:</strong> Review lecture notes and worksheets in the student portal.</li>
            <li><strong>Complete Missed Assignments:</strong> Submit homework exercises before the next scheduled class.</li>
            ${data.recordingUrl ? `<li><strong>Watch Lecture Recording:</strong> <a href="${data.recordingUrl}" style="color: #4f46e5; font-weight: 600;">Access video replay here</a>.</li>` : ''}
            <li><strong>Contact Your Tutor:</strong> Use student chat if you need clarification on missed concepts.</li>
          </ul>
        </div>
      `,
      actionUrl: data.materialsUrl || 'https://gurugedara.edu/classes',
      actionText: 'Access Missed Class Resources & Portal',
      metadataList: [
        { label: 'Student', value: data.studentName, isHighlight: true },
        { label: 'Course', value: data.classTitle },
        { label: 'Session Date', value: data.sessionDate },
        { label: 'Scheduled Time', value: data.sessionTime },
        { label: 'Attendance Status', value: 'ABSENT', isHighlight: true },
        { label: 'Faculty Tutor', value: data.tutorName }
      ],
      footerNote: 'Automated tutor reminder system • Guru Gedara Higher Educational Institute'
    })
  },
  {
    id: 'student_approved',
    name: 'Scholar Intake Account Approved',
    category: 'academic',
    eventType: 'student_approved',
    description: 'Sent when an administrator approves a student account registration and provisions credentials.',
    triggerEvent: 'Admin student approval action',
    defaultData: {
      studentName: 'Nethmi Fernando',
      studentEmail: 'nethmi.f@example.com',
      studentId: 'GG10283749',
      grade: 'Grade 12 (2026 Batch)',
      tempPassword: 'GG-8X91PZ!',
      portalUrl: 'https://gurugedara.edu/login'
    },
    generate: (data) => ({
      subject: `🎉 Account Approved: Welcome to Guru Gedara Education (ID: ${data.studentId})`,
      preheader: `Your student profile is active. Log in with your institutional Student ID: ${data.studentId}.`,
      badgeText: 'Intake Registration Approved',
      badgeColor: '#4f46e5',
      headline: `Welcome to Guru Gedara!`,
      subheadline: `Your official academic account is now live`,
      bodyContentHtml: `
        <p style="margin: 0 0 16px;">Dear <strong>${data.studentName}</strong>,</p>
        <p style="margin: 0 0 16px; color: #475569; line-height: 1.6;">
          We are pleased to inform you that your student admission profile has been reviewed and officially approved by the Guru Gedara Higher Educational Institute Administration Office.
        </p>
        <div style="background-color: #eef2ff; border: 1px solid #c7d2fe; padding: 16px 20px; margin: 18px 0; border-radius: 12px;">
          <p style="margin: 0 0 8px; font-weight: 700; color: #312e81; font-size: 13px;">🔑 Your Official Login Credentials:</p>
          <p style="margin: 0 0 4px; font-family: monospace; font-size: 13px; color: #1e1b4b;"><strong>Student ID:</strong> ${data.studentId}</p>
          <p style="margin: 0; font-family: monospace; font-size: 13px; color: #1e1b4b;"><strong>Temporary Password:</strong> ${data.tempPassword}</p>
        </div>
      `,
      actionUrl: data.portalUrl,
      actionText: '🚀 Log In to Student Portal Now',
      metadataList: [
        { label: 'Assigned Student ID', value: data.studentId, isHighlight: true },
        { label: 'Enrolled Academic Batch', value: data.grade },
        { label: 'Status', value: 'Active / Approved Scholar' }
      ],
      footerNote: 'Please change your temporary password upon your initial login.'
    })
  },
  {
    id: 'class_resource_added',
    name: 'New Study Material / Handout Distributed',
    category: 'academic',
    eventType: 'class_resource_added',
    description: 'Dispatched to all enrolled students whenever a tutor uploads new lecture notes or past papers.',
    triggerEvent: 'Tutor uploads file/PDF/document in class profile',
    defaultData: {
      studentName: 'Enrolled Scholar',
      studentEmail: 'student@example.com',
      resourceTitle: 'Unit 04: Calculus & Differentiation Practice Workbook (2026)',
      resourceType: 'PDF Problem Set (32 Pages)',
      classTitle: 'Advanced Level Combined Mathematics',
      tutorName: 'Prof. Samantha Perera',
      downloadUrl: 'https://gurugedara.edu/classes'
    },
    generate: (data) => ({
      subject: `📚 New Study Material: "${data.resourceTitle}" uploaded for ${data.classTitle}`,
      preheader: `Prof. Samantha Perera uploaded a new handout for your course.`,
      badgeText: 'New Course Material Released',
      badgeColor: '#0284c7',
      headline: `New Study Handout Released`,
      subheadline: `Course materials uploaded for ${data.classTitle}`,
      bodyContentHtml: `
        <p style="margin: 0 0 16px;">Dear <strong>${data.studentName}</strong>,</p>
        <p style="margin: 0 0 16px; color: #475569; line-height: 1.6;">
          Your faculty tutor <strong>${data.tutorName}</strong> has just published a new academic resource for <strong>${data.classTitle}</strong>.
        </p>
        <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 14px 18px; margin: 18px 0; border-radius: 12px;">
          <p style="margin: 0 0 4px; font-weight: 700; color: #0369a1; font-size: 13px;">📄 Handout Title:</p>
          <p style="margin: 0; color: #0284c7; font-size: 13px; font-weight: 600;">${data.resourceTitle}</p>
        </div>
      `,
      actionUrl: data.downloadUrl,
      actionText: '📥 Access & Download Handout PDF',
      metadataList: [
        { label: 'Resource Document', value: data.resourceTitle, isHighlight: true },
        { label: 'Format Type', value: data.resourceType },
        { label: 'Course Curricula', value: data.classTitle },
        { label: 'Faculty Tutor', value: data.tutorName }
      ],
      footerNote: 'All study materials remain accessible throughout the academic term.'
    })
  },
  {
    id: 'class_schedule_updated',
    name: 'Class Schedule & Hall Reschedule Update',
    category: 'reminders',
    eventType: 'class_schedule_updated',
    description: 'Dispatched to all enrolled students when a class timetable, day, or venue hall is modified.',
    triggerEvent: 'Admin or Tutor updates class schedule/timeSlot',
    defaultData: {
      studentName: 'Enrolled Scholar',
      studentEmail: 'student@example.com',
      classTitle: 'Advanced Level Combined Mathematics',
      tutorName: 'Prof. Samantha Perera',
      newSchedule: 'Saturdays 08:30 AM - 11:30 AM',
      rescheduleNote: 'Special seminar session rescheduled: Class will commence at 08:30 AM in Main Hall A & Online Livestream.',
      venue: 'Main Hall A (Level 2)'
    },
    generate: (data) => ({
      subject: `📢 Timetable Update: ${data.classTitle} (New Time: ${data.newSchedule})`,
      preheader: `Important schedule change notice for ${data.classTitle}.`,
      badgeText: 'Class Timetable Rescheduled',
      badgeColor: '#7c3aed',
      headline: `Class Schedule Update Notice`,
      subheadline: `Important timetable adjustment for ${data.classTitle}`,
      bodyContentHtml: `
        <p style="margin: 0 0 16px;">Dear <strong>${data.studentName}</strong>,</p>
        <p style="margin: 0 0 16px; color: #475569; line-height: 1.6;">
          Please be advised that the class timetable for <strong>${data.classTitle}</strong> with <strong>${data.tutorName}</strong> has been updated as follows:
        </p>
        <div style="background-color: #faf5ff; border: 1px solid #e9d5ff; padding: 14px 18px; margin: 18px 0; border-radius: 12px;">
          <p style="margin: 0 0 4px; font-weight: 700; color: #6b21a8; font-size: 13px;">🗓️ Reschedule Reason & Notes:</p>
          <p style="margin: 0; color: #7e22ce; font-size: 13px;">${data.rescheduleNote}</p>
        </div>
      `,
      actionUrl: 'https://gurugedara.edu/dashboard',
      actionText: '📅 View Updated Timetable in Dashboard',
      metadataList: [
        { label: 'Course', value: data.classTitle },
        { label: 'Faculty Tutor', value: data.tutorName },
        { label: 'Updated Timetable', value: data.newSchedule, isHighlight: true },
        { label: 'Classroom Hall', value: data.venue }
      ],
      footerNote: 'Please check your student calendar to avoid schedule conflicts.'
    })
  }
];

interface AdminEmailTemplatesPanelProps {
  onOpenEmailLogs?: () => void;
}

export const AdminEmailTemplatesPanel: React.FC<AdminEmailTemplatesPanelProps> = ({
  onOpenEmailLogs
}) => {
  const { currentUser, showToast } = useApp();
  const { 
    emailSettings, 
    emailLogs, 
    triggerCustomEmail, 
    triggerTestEmail, 
    refreshLogs 
  } = useEmailNotifications();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('reminder_24h');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile' | 'code' | 'text'>('desktop');
  const [testRecipientEmail, setTestRecipientEmail] = useState<string>(currentUser?.email || 'dasundularaka@gmail.com');
  const [testCcEmail, setTestCcEmail] = useState<string>('');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [copiedHtml, setCopiedHtml] = useState<boolean>(false);
  const [copiedSubject, setCopiedSubject] = useState<boolean>(false);

  // Custom data overrides for the selected template
  const [customDataOverrides, setCustomDataOverrides] = useState<Record<string, Record<string, any>>>({});

  const selectedTemplate = useMemo(() => {
    return EMAIL_TEMPLATES.find(t => t.id === selectedTemplateId) || EMAIL_TEMPLATES[0];
  }, [selectedTemplateId]);

  const currentTemplateData = useMemo(() => {
    return {
      ...selectedTemplate.defaultData,
      ...(customDataOverrides[selectedTemplate.id] || {})
    };
  }, [selectedTemplate, customDataOverrides]);

  const handleFieldChange = (key: string, val: any) => {
    setCustomDataOverrides(prev => ({
      ...prev,
      [selectedTemplate.id]: {
        ...(prev[selectedTemplate.id] || selectedTemplate.defaultData),
        [key]: val
      }
    }));
  };

  const handleResetData = () => {
    setCustomDataOverrides(prev => {
      const copy = { ...prev };
      delete copy[selectedTemplate.id];
      return copy;
    });
    showToast("Template parameters reset to defaults.", "info");
  };

  // Generate rendered HTML and text
  const renderedContent = useMemo(() => {
    const config = selectedTemplate.generate(currentTemplateData);
    const { html, text } = wrapInMasterHtmlTemplate({
      title: config.subject,
      preheader: config.preheader,
      badgeText: config.badgeText,
      badgeColor: config.badgeColor,
      headline: config.headline,
      subheadline: config.subheadline,
      bodyContentHtml: config.bodyContentHtml,
      actionUrl: config.actionUrl,
      actionText: config.actionText,
      metadataList: config.metadataList,
      footerNote: config.footerNote
    });

    return {
      subject: config.subject,
      html,
      text,
      config
    };
  }, [selectedTemplate, currentTemplateData]);

  const filteredTemplates = useMemo(() => {
    return EMAIL_TEMPLATES.filter(t => {
      const matchCat = selectedCategory === 'all' || t.category === selectedCategory;
      const matchSearch = !searchQuery.trim() || 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.eventType.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Actions
  const handleCopyHtml = () => {
    navigator.clipboard.writeText(renderedContent.html);
    setCopiedHtml(true);
    showToast("Full HTML Email code copied to clipboard!", "success");
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const handleCopySubject = () => {
    navigator.clipboard.writeText(renderedContent.subject);
    setCopiedSubject(true);
    showToast("Subject line copied to clipboard!", "success");
    setTimeout(() => setCopiedSubject(false), 2000);
  };

  const handleSendTestEmail = async () => {
    if (!testRecipientEmail.trim()) {
      showToast("Please enter a valid destination email address.", "error");
      return;
    }

    setIsSendingTest(true);
    try {
      const target = testRecipientEmail.trim();
      const log = await emailNotificationService.dispatchEmail({
        to: target,
        cc: testCcEmail.trim() ? testCcEmail.trim() : undefined,
        subject: `[TEST PREVIEW] ${renderedContent.subject}`,
        htmlContent: renderedContent.html,
        textContent: renderedContent.text,
        eventType: selectedTemplate.eventType,
        recipientName: currentTemplateData.studentName || 'Administrator Preview',
        metadata: {
          isTestDispatch: true,
          templateId: selectedTemplate.id,
          dispatchedBy: currentUser?.email || 'admin'
        }
      });

      await refreshLogs();
      showToast(`Test email successfully dispatched to ${target}!`, "success");
    } catch (e: any) {
      showToast(`Failed to dispatch test email: ${e.message || 'Unknown error'}`, "error");
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleDownloadEml = () => {
    const fakeLog: EmailNotificationLog = {
      id: `preview_${selectedTemplate.id}`,
      to: testRecipientEmail || 'student@gurugedara.edu',
      cc: testCcEmail ? [testCcEmail] : undefined,
      from: `${emailSettings.senderName} <${emailSettings.senderEmail}>`,
      replyTo: emailSettings.replyToEmail,
      subject: renderedContent.subject,
      htmlContent: renderedContent.html,
      textContent: renderedContent.text,
      eventType: selectedTemplate.eventType,
      recipientName: currentTemplateData.studentName || 'Student',
      status: 'delivered',
      deliveryChannel: 'Preview Exporter',
      createdAt: new Date().toISOString()
    };
    downloadEmlFile(fakeLog);
    showToast("Downloaded .EML email message file!", "success");
  };

  const gmailComposeUrl = buildGmailComposeUrl(
    testRecipientEmail || 'student@gurugedara.edu',
    renderedContent.subject,
    renderedContent.text,
    testCcEmail || undefined
  );

  const mailtoUrl = buildMailtoUrl(
    testRecipientEmail || 'student@gurugedara.edu',
    renderedContent.subject,
    renderedContent.text,
    testCcEmail || undefined
  );

  return (
    <div className="space-y-6" id="admin_email_templates_container">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/50">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl backdrop-blur-md">
                <Mail className="w-6 h-6" />
              </span>
              <div>
                <span className="text-[10px] font-mono uppercase font-black tracking-widest text-indigo-400">
                  Institutional Communications Office
                </span>
                <h2 className="text-2xl font-black tracking-tight text-white">
                  HTML Email Templates & Notification Suite
                </h2>
              </div>
            </div>
            <p className="text-xs text-indigo-200/80 max-w-2xl leading-relaxed">
              Explore, inspect, and test all automated transactional email templates configured across Guru Gedara. Live responsive previews, dynamic field overrides, and 1-click test delivery.
            </p>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-xs">
              <span className="text-[10px] text-indigo-300 block font-mono uppercase font-bold">Catalog Templates</span>
              <span className="text-lg font-black font-mono text-white">{EMAIL_TEMPLATES.length} Designs</span>
            </div>
            <div className="px-4 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-xs">
              <span className="text-[10px] text-emerald-300 block font-mono uppercase font-bold">Cloud Cron Engine</span>
              <span className="text-sm font-bold text-emerald-300 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Hourly Active
              </span>
            </div>
            {onOpenEmailLogs && (
              <button
                id="admin_open_email_logs_btn"
                onClick={onOpenEmailLogs}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Clock className="w-4 h-4" /> Live Dispatch Logs ({emailLogs.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Template Selector (Left) + Live Preview & Controls (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Template Catalog Selector (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search templates (e.g. 24h, payment, check-in)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-indigo-500 font-sans"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold scrollbar-none">
              {[
                { id: 'all', label: 'All' },
                { id: 'reminders', label: 'Reminders' },
                { id: 'bookings', label: 'Bookings' },
                { id: 'billing', label: 'Billing' },
                { id: 'attendance', label: 'Attendance' },
                { id: 'academic', label: 'Academic' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-2xs font-extrabold'
                      : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Template List Cards */}
          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {filteredTemplates.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                No email templates match your filter.
              </div>
            ) : (
              filteredTemplates.map(template => {
                const isSelected = template.id === selectedTemplate.id;
                return (
                  <button
                    key={template.id}
                    id={`template_item_${template.id}`}
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'bg-white border-slate-150 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase ${
                            template.category === 'reminders' ? 'bg-amber-100 text-amber-800' :
                            template.category === 'billing' ? 'bg-emerald-100 text-emerald-800' :
                            template.category === 'attendance' ? 'bg-blue-100 text-blue-800' :
                            template.category === 'bookings' ? 'bg-purple-100 text-purple-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {template.category}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {template.eventType}
                          </span>
                        </div>
                        <h4 className={`text-xs font-black leading-snug ${isSelected ? 'text-indigo-950' : 'text-slate-850'}`}>
                          {template.name}
                        </h4>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-300'}`} />
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {template.description}
                    </p>

                    <div className="pt-1.5 border-t border-slate-100/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span className="truncate max-w-[200px]" title={template.triggerEvent}>
                        ⚡ {template.triggerEvent}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Quick Info Box */}
          <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 text-xs text-indigo-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-indigo-950">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Full Dynamic Data Binding</span>
            </div>
            <p className="text-[11px] text-indigo-800/80 leading-relaxed">
              Templates automatically pull real data from Firestore records (Student names, parent emails, class titles, tutor names, and transaction IDs) when system events occur.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Preview, Device Switcher, Code & Test Dispatcher (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Top Control Bar for Selected Template */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Mail className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-black text-slate-900">
                    {selectedTemplate.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Trigger: <span className="font-mono text-slate-700 font-semibold">{selectedTemplate.triggerEvent}</span>
                </p>
              </div>

              {/* Viewport Mode Toggles */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                <button
                  id="preview_mode_desktop"
                  onClick={() => setViewportMode('desktop')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewportMode === 'desktop' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'hover:text-slate-900'
                  }`}
                  title="Desktop Preview"
                >
                  <Monitor className="w-3.5 h-3.5" /> Desktop
                </button>
                <button
                  id="preview_mode_mobile"
                  onClick={() => setViewportMode('mobile')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewportMode === 'mobile' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'hover:text-slate-900'
                  }`}
                  title="Mobile Viewport Preview"
                >
                  <Smartphone className="w-3.5 h-3.5" /> Mobile
                </button>
                <button
                  id="preview_mode_code"
                  onClick={() => setViewportMode('code')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewportMode === 'code' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'hover:text-slate-900'
                  }`}
                  title="HTML Source Code"
                >
                  <Code className="w-3.5 h-3.5" /> HTML Code
                </button>
                <button
                  id="preview_mode_text"
                  onClick={() => setViewportMode('text')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewportMode === 'text' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'hover:text-slate-900'
                  }`}
                  title="Plain Text Fallback"
                >
                  <FileText className="w-3.5 h-3.5" /> Plain Text
                </button>
              </div>
            </div>

            {/* Subject Line & Quick Copy */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5 flex-1 min-w-0">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Rendered Subject Line:</span>
                <p className="font-bold text-slate-800 font-sans truncate" title={renderedContent.subject}>
                  {renderedContent.subject}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCopySubject}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  {copiedSubject ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copiedSubject ? 'Copied' : 'Copy Subject'}
                </button>
                <button
                  onClick={handleCopyHtml}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  {copiedHtml ? <Check className="w-3 h-3 text-emerald-600" /> : <Code className="w-3 h-3" />}
                  {copiedHtml ? 'Copied HTML' : 'Copy HTML'}
                </button>
              </div>
            </div>

            {/* Collapsible Sample Data Override Parameters */}
            <details className="group bg-indigo-50/30 rounded-xl border border-indigo-100 p-3 text-xs transition-all">
              <summary className="font-bold text-indigo-900 flex items-center justify-between cursor-pointer select-none">
                <span className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                  Customize Preview Sample Parameters
                </span>
                <span className="text-[10px] text-indigo-600 font-mono underline group-open:no-underline">
                  Click to adjust fields
                </span>
              </summary>
              <div className="mt-3 pt-3 border-t border-indigo-100 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {Object.entries(currentTemplateData).map(([key, value]) => {
                    if (typeof value !== 'string' && typeof value !== 'number') return null;
                    return (
                      <div key={key}>
                        <label className="block text-[10px] font-bold uppercase font-mono text-slate-500 mb-0.5 truncate" title={key}>
                          {key}
                        </label>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => handleFieldChange(key, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500"
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleResetData}
                    className="px-3 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                  >
                    Reset to Default Data
                  </button>
                </div>
              </div>
            </details>

          </div>

          {/* PREVIEW CONTAINER */}
          <div className="bg-slate-100 rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-inner flex flex-col items-center justify-center min-h-[500px]">
            
            {viewportMode === 'desktop' && (
              <div className="w-full max-w-[650px] bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                <div className="bg-slate-800 px-4 py-2 flex items-center justify-between text-[11px] text-slate-300 font-mono border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <span className="ml-2 text-slate-400">Desktop Email Client (600px Box)</span>
                  </div>
                  <span>HTML View</span>
                </div>
                <iframe
                  title="Desktop Email Preview"
                  srcDoc={renderedContent.html}
                  className="w-full h-[620px] border-0 bg-slate-50"
                  sandbox="allow-same-origin"
                />
              </div>
            )}

            {viewportMode === 'mobile' && (
              <div className="w-[375px] max-w-full bg-slate-900 p-3 rounded-[40px] shadow-2xl border-4 border-slate-800">
                <div className="w-32 h-4 bg-slate-800 rounded-full mx-auto mb-2"></div>
                <div className="w-full h-[580px] bg-white rounded-[28px] overflow-hidden">
                  <iframe
                    title="Mobile Email Preview"
                    srcDoc={renderedContent.html}
                    className="w-full h-full border-0"
                    sandbox="allow-same-origin"
                  />
                </div>
                <div className="w-28 h-1 bg-slate-700 rounded-full mx-auto mt-3"></div>
              </div>
            )}

            {viewportMode === 'code' && (
              <div className="w-full bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-800">
                <div className="bg-slate-950 px-4 py-2.5 flex items-center justify-between border-b border-slate-800 text-xs">
                  <span className="font-mono text-indigo-400 font-bold">Standard RFC HTML Source</span>
                  <button
                    onClick={handleCopyHtml}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> Copy Markup
                  </button>
                </div>
                <pre className="p-4 text-[11px] font-mono text-indigo-200 overflow-x-auto h-[550px] leading-relaxed select-all">
                  {renderedContent.html}
                </pre>
              </div>
            )}

            {viewportMode === 'text' && (
              <div className="w-full bg-white rounded-2xl p-6 shadow-xl border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed h-[550px] overflow-y-auto">
                {renderedContent.text}
              </div>
            )}

          </div>

          {/* BOTTOM DISPATCH & ACTIONS CARD */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-indigo-600" />
                  Test Live Email Delivery
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dispatch a real sample of this template to any destination inbox using configured SMTP / Cloud channels.
                </p>
              </div>

              {/* External Client Launchers */}
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={gmailComposeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Open in Gmail Web"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Gmail Web
                </a>
                <a
                  href={mailtoUrl}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Open Default Mail App"
                >
                  <Mail className="w-3.5 h-3.5" /> Mail App
                </a>
                <button
                  onClick={handleDownloadEml}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Download as .EML File"
                >
                  <Download className="w-3.5 h-3.5" /> .EML File
                </button>
              </div>
            </div>

            {/* Test Email Dispatch Form */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
              <div className="sm:col-span-6">
                <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">
                  Destination Email (Recipient):
                </label>
                <input
                  type="email"
                  value={testRecipientEmail}
                  onChange={(e) => setTestRecipientEmail(e.target.value)}
                  placeholder="e.g. dasundularaka@gmail.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">
                  Auto-CC (Optional):
                </label>
                <input
                  type="email"
                  value={testCcEmail}
                  onChange={(e) => setTestCcEmail(e.target.value)}
                  placeholder="parent.guardian@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="sm:col-span-3 flex items-end">
                <button
                  id="admin_dispatch_test_email_btn"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSendingTest ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Dispatching...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Send Test Email
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
