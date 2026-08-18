import { useState, useEffect, useCallback } from 'react';
import { 
  Booking, 
  Payment, 
  ClassItem, 
  UserProfile, 
  StudyMaterial, 
  AttendanceRecord, 
  EmailNotificationLog,
  EmailTriggerEventType
} from '../types';
import { emailNotificationService } from '../lib/emailNotificationService';
import { firestoreService } from '../lib/firestoreService';

export interface UseEmailNotificationsResult {
  emailLogs: EmailNotificationLog[];
  isLoading: boolean;
  isDispatching: boolean;
  refreshLogs: () => Promise<void>;
  
  // High-level automated trigger hooks
  triggerBookingEmail: (
    booking: Booking, 
    classItem: ClassItem, 
    studentUser?: UserProfile | null, 
    tutorUser?: UserProfile | null
  ) => Promise<{ studentLog: EmailNotificationLog; tutorLog?: EmailNotificationLog }>;
  
  triggerPaymentEmail: (
    payment: Payment, 
    classItem?: ClassItem | null, 
    studentUser?: UserProfile | null
  ) => Promise<EmailNotificationLog>;
  
  triggerResourceAddedEmail: (
    material: StudyMaterial, 
    classItem?: ClassItem | null, 
    tutorUser?: UserProfile | null, 
    enrolledStudents?: UserProfile[]
  ) => Promise<EmailNotificationLog[]>;
  
  triggerClassUpdatedEmail: (
    classItem: ClassItem, 
    updateDetails: string, 
    enrolledStudents?: UserProfile[]
  ) => Promise<EmailNotificationLog[]>;
  
  triggerAttendanceEmail: (
    record: AttendanceRecord, 
    classItem: ClassItem, 
    studentUser?: UserProfile | null,
    punctualityInfo?: {
      punctualityStatusText: string;
      isLate: boolean;
      delayMinutes: number;
      markedTimeFormatted: string;
      classTimesFormatted: string;
    }
  ) => Promise<EmailNotificationLog>;
  
  triggerCustomEmail: (params: {
    to: string | string[];
    cc?: string | string[];
    subject: string;
    htmlContent: string;
    textContent: string;
    eventType?: EmailTriggerEventType;
    recipientName?: string;
    metadata?: Record<string, any>;
  }) => Promise<EmailNotificationLog>;

  triggerTestEmail: (type: 'booking' | 'payment' | 'resource' | 'attendance', targetEmail?: string) => Promise<EmailNotificationLog>;
  clearLogs: () => Promise<void>;
}

export function useEmailNotifications(): UseEmailNotificationsResult {
  const [emailLogs, setEmailLogs] = useState<EmailNotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);

  const refreshLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const logs = await emailNotificationService.getEmailLogs(60);
      setEmailLogs(logs);
    } catch (err) {
      console.warn('[useEmailNotifications] Error loading email logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshLogs();
  }, [refreshLogs]);

  // 1. Booking Email Hook
  const triggerBookingEmail = useCallback(async (
    booking: Booking, 
    classItem: ClassItem, 
    studentUser?: UserProfile | null, 
    tutorUser?: UserProfile | null
  ) => {
    setIsDispatching(true);
    try {
      const result = await emailNotificationService.notifyClassBookingSuccess({
        booking,
        classItem,
        studentUser,
        tutorUser
      });
      await refreshLogs();
      return result;
    } finally {
      setIsDispatching(false);
    }
  }, [refreshLogs]);

  // 2. Payment Email Hook
  const triggerPaymentEmail = useCallback(async (
    payment: Payment, 
    classItem?: ClassItem | null, 
    studentUser?: UserProfile | null
  ) => {
    setIsDispatching(true);
    try {
      const result = await emailNotificationService.notifyPaymentSuccess({
        payment,
        classItem,
        studentUser
      });
      await refreshLogs();
      return result;
    } finally {
      setIsDispatching(false);
    }
  }, [refreshLogs]);

  // 3. Resource Added Email Hook
  const triggerResourceAddedEmail = useCallback(async (
    material: StudyMaterial, 
    classItem?: ClassItem | null, 
    tutorUser?: UserProfile | null, 
    enrolledStudents?: UserProfile[]
  ) => {
    setIsDispatching(true);
    try {
      // If enrolledStudents not passed, attempt to fetch active students for this class
      let targetStudents = enrolledStudents;
      if (!targetStudents || targetStudents.length === 0) {
        try {
          const allUsers = await firestoreService.getAllUsers();
          targetStudents = allUsers.filter(u => 
            u.role === 'student' && 
            (u.selectedClasses?.includes(material.classId || '') || 
             u.classEnrollmentStatus?.[material.classId || ''] === 'active')
          );
        } catch (_) {}
      }

      const results = await emailNotificationService.notifyClassResourceAdded({
        material,
        classItem,
        tutorUser,
        enrolledStudents: targetStudents
      });
      await refreshLogs();
      return results;
    } finally {
      setIsDispatching(false);
    }
  }, [refreshLogs]);

  // 4. Class Updated Email Hook
  const triggerClassUpdatedEmail = useCallback(async (
    classItem: ClassItem, 
    updateDetails: string, 
    enrolledStudents?: UserProfile[]
  ) => {
    setIsDispatching(true);
    try {
      let targetStudents = enrolledStudents;
      if (!targetStudents || targetStudents.length === 0) {
        try {
          const allUsers = await firestoreService.getAllUsers();
          targetStudents = allUsers.filter(u => 
            u.role === 'student' && 
            (u.selectedClasses?.includes(classItem.id) || 
             u.classEnrollmentStatus?.[classItem.id] === 'active')
          );
        } catch (_) {}
      }

      const results = await emailNotificationService.notifyClassUpdated({
        classItem,
        updateDetails,
        enrolledStudents: targetStudents
      });
      await refreshLogs();
      return results;
    } finally {
      setIsDispatching(false);
    }
  }, [refreshLogs]);

  // 5. Attendance Email Hook
  const triggerAttendanceEmail = useCallback(async (
    record: AttendanceRecord, 
    classItem: ClassItem, 
    studentUser?: UserProfile | null,
    punctualityInfo?: {
      punctualityStatusText: string;
      isLate: boolean;
      delayMinutes: number;
      markedTimeFormatted: string;
      classTimesFormatted: string;
    }
  ) => {
    setIsDispatching(true);
    try {
      const markedDate = new Date(record.markedAt || new Date().toISOString());
      const defaultTimeFormatted = markedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      
      const result = await emailNotificationService.notifyAttendanceMarked({
        record,
        classItem,
        studentUser,
        punctualityStatusText: punctualityInfo?.punctualityStatusText || (record.isLate ? `Late (${record.delayMinutes || 0}m)` : record.status),
        isLate: punctualityInfo?.isLate ?? (record.isLate || false),
        delayMinutes: punctualityInfo?.delayMinutes ?? (record.delayMinutes || 0),
        markedTimeFormatted: punctualityInfo?.markedTimeFormatted || defaultTimeFormatted,
        classTimesFormatted: punctualityInfo?.classTimesFormatted || classItem.schedule || 'Scheduled Time'
      });
      await refreshLogs();
      return result;
    } finally {
      setIsDispatching(false);
    }
  }, [refreshLogs]);

  // 6. Custom Dispatch Hook
  const triggerCustomEmail = useCallback(async (params: {
    to: string | string[];
    cc?: string | string[];
    subject: string;
    htmlContent: string;
    textContent: string;
    eventType?: EmailTriggerEventType;
    recipientName?: string;
    metadata?: Record<string, any>;
  }) => {
    setIsDispatching(true);
    try {
      const result = await emailNotificationService.dispatchEmail({
        ...params,
        eventType: params.eventType || 'custom_broadcast'
      });
      await refreshLogs();
      return result;
    } finally {
      setIsDispatching(false);
    }
  }, [refreshLogs]);

  // 7. On-demand Test Dispatch Hook
  const triggerTestEmail = useCallback(async (type: 'booking' | 'payment' | 'resource' | 'attendance', targetEmail?: string): Promise<EmailNotificationLog> => {
    setIsDispatching(true);
    const destination = targetEmail || 'student.sample@gurugedara.edu';
    
    const mockStudent: UserProfile = {
      uid: 'sample_student_01',
      name: 'Kasun Bandara',
      email: destination,
      role: 'student',
      username: 'kasun.b',
      createdAt: new Date().toISOString(),
      parentEmail: 'parent.bandara@gmail.com',
      isParentEmailLinked: true,
      ccParentOnNotifications: true
    };

    const mockClass: ClassItem = {
      id: 'cls_advanced_physics',
      title: 'Advanced Level Physics 2026',
      subject: 'Physics',
      tutorId: 'tutor_sam',
      tutorName: 'Prof. Samantha Perera',
      schedule: 'Saturdays 08:30 AM - 12:30 PM',
      dayOfWeek: 'Saturday',
      timeSlot: '08:30 AM',
      price: 4500,
      description: 'Comprehensive mechanics, electrodynamics, and mock paper revisions.',
      maxSlots: 100,
      bookedSlots: 45,
      gracePeriod: 10
    };

    try {
      let log: EmailNotificationLog;
      if (type === 'booking') {
        const res = await emailNotificationService.notifyClassBookingSuccess({
          booking: {
            id: 'bk_test_' + Date.now(),
            studentId: mockStudent.uid,
            studentName: mockStudent.name,
            classId: mockClass.id,
            classTitle: mockClass.title,
            tutorId: mockClass.tutorId,
            tutorName: mockClass.tutorName,
            dayOfWeek: mockClass.dayOfWeek,
            timeSlot: mockClass.timeSlot,
            bookingDate: new Date().toISOString(),
            status: 'active'
          },
          classItem: mockClass,
          studentUser: mockStudent
        });
        log = res.studentLog;
      } else if (type === 'payment') {
        log = await emailNotificationService.notifyPaymentSuccess({
          payment: {
            id: 'pay_test_' + Date.now(),
            studentId: mockStudent.uid,
            studentName: mockStudent.name,
            classId: mockClass.id,
            classTitle: mockClass.title,
            amount: 4500,
            date: new Date().toISOString(),
            status: 'paid',
            paymentMethod: 'Online Bank Visa/Mastercard'
          },
          classItem: mockClass,
          studentUser: mockStudent
        });
      } else if (type === 'resource') {
        const logs = await emailNotificationService.notifyClassResourceAdded({
          material: {
            id: 'mat_test_' + Date.now(),
            title: 'Mechanics Unit 04 Revision Worksheet & Solutions.pdf',
            description: 'Contains past 10 years structured exam questions and step-by-step solutions.',
            subject: 'Physics',
            referenceUrl: 'https://gurugedara.edu/materials/mechanics_04.pdf',
            type: 'file',
            tutorId: mockClass.tutorId,
            tutorName: mockClass.tutorName,
            classId: mockClass.id,
            classTitle: mockClass.title,
            createdAt: new Date().toISOString(),
            fileName: 'Mechanics_Unit04_Worksheet.pdf',
            fileSize: 2450000
          },
          classItem: mockClass,
          enrolledStudents: [mockStudent]
        });
        log = logs[0];
      } else {
        log = await emailNotificationService.notifyAttendanceMarked({
          record: {
            id: 'att_test_' + Date.now(),
            classId: mockClass.id,
            classTitle: mockClass.title,
            studentId: mockStudent.uid,
            studentName: mockStudent.name,
            date: new Date().toISOString().split('T')[0],
            status: 'Present',
            markedAt: new Date().toISOString(),
            tutorId: mockClass.tutorId,
            type: 'qrcode',
            isLate: false,
            delayMinutes: 2,
            gracePeriodApplied: 10
          },
          classItem: mockClass,
          studentUser: mockStudent,
          punctualityStatusText: 'On Time (Check-in 08:32 AM)',
          isLate: false,
          delayMinutes: 2,
          markedTimeFormatted: '08:32 AM',
          classTimesFormatted: '08:30 AM - 12:30 PM'
        });
      }

      await refreshLogs();
      return log;
    } finally {
      setIsDispatching(false);
    }
  }, [refreshLogs]);

  const clearLogs = useCallback(async () => {
    await emailNotificationService.clearEmailLogs();
    setEmailLogs([]);
  }, []);

  return {
    emailLogs,
    isLoading,
    isDispatching,
    refreshLogs,
    triggerBookingEmail,
    triggerPaymentEmail,
    triggerResourceAddedEmail,
    triggerClassUpdatedEmail,
    triggerAttendanceEmail,
    triggerCustomEmail,
    triggerTestEmail,
    clearLogs
  };
}
