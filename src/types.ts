export type UserRole = 'student' | 'tutor' | 'admin';

export interface UserEmailPreferences {
  bookingConfirmation: boolean;
  classReminder24h: boolean;
  classCancellation: boolean;
  paymentReceipts: boolean;
  attendanceAlerts: boolean;
  studyMaterials: boolean;
  classScheduleUpdates: boolean;
  monthlyReports: boolean;
}

export interface UserProfile {
  uid: string;
  authUid?: string;
  email: string;
  name: string;
  displayName?: string;
  role: UserRole;
  username?: string;
  status?: 'pending' | 'approved' | 'active' | 'suspended';
  gender?: 'male' | 'female';
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  dob?: string;
  notes?: string;
  selectedClasses?: string[];
  classEnrollmentStatus?: { [classId: string]: 'active' | 'suspended' | 'late_payment' | 'free_card' };
  photoURL?: string;
  pendingPhotoURL?: string;
  phone?: string;
  password?: string;
  isPasswordResetRequired?: boolean;
  createdAt: string;
  availabilityStatus?: 'active' | 'away';
  
  // Registration and Fee Details
  admissionFeeCollected?: boolean;
  admissionAmount?: number;
  isFreeCard?: boolean;

  // Parent / Guardian Email Linking & Notification CC
  parentEmail?: string;
  isParentEmailLinked?: boolean;
  ccParentOnNotifications?: boolean;
  parentEmailCcPreferences?: {
    attendance?: boolean;
    payments?: boolean;
    general?: boolean;
  };

  // Granular User Notification & Email Preferences
  emailPreferences?: Partial<UserEmailPreferences>;

  // Specific properties
  studentDetails?: {
    grade: string;
    school?: string;
    parentContact?: string;
    interests?: string[];
  };
  tutorDetails?: {
    bio: string;
    subjects: string[];
    expertiseAreas?: string[];
    experience: number; // in years
    qualification: string;
    hourlyRate: number;
    rating: number;
    workingHours?: {
      day: string;
      enabled: boolean;
      startTime: string;
      endTime: string;
    }[];
    daysOff?: string[];
    availability: {
      day: string; // e.g. "Monday", "Tuesday"
      slots: string[]; // e.g. ["10:00 AM", "02:00 PM"]
    }[];
  };
  isFeatured?: boolean;
}

export interface ClassItem {
  id: string;
  title: string;
  subject: string;
  tutorId: string;
  tutorName: string;
  tutorPhoto?: string;
  schedule: string; // e.g. "Saturdays 10:00 AM - 12:00 PM"
  dayOfWeek: string; // e.g. "Saturday"
  timeSlot: string; // e.g. "10:00 AM"
  price: number;
  description: string;
  maxSlots: number;
  bookedSlots: number;
  tags?: string[];
  imageUrl?: string;
  isFeatured?: boolean;
  gracePeriod?: number; // Grace period in minutes before attendance is flagged as Late (e.g. 5, 10, 15)
  createdAt?: string;
}

export interface Booking {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  classId: string;
  classTitle: string;
  tutorId: string;
  tutorName: string;
  dayOfWeek: string;
  timeSlot: string;
  bookingDate: string;
  status: 'active' | 'cancelled' | 'pending_approval';
  approvalType?: 'payment_collected' | 'late_payment' | 'free_card';
  collectedAmount?: number;
  createdAt?: string;
}

export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  classTitle: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'failed';
  paymentMethod?: string;
  dueDate?: string;
  paymentType?: 'admission' | 'monthly' | 'late_payment' | 'free_card';
  createdAt?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'reminder' | 'payment' | 'announcement' | 'message';
  isRead: boolean;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  message: string;
  createdAt: string;
}

export interface NotificationSettings {
  reminders: boolean;
  payments: boolean;
  announcements: boolean;
  messages: boolean;
  emailSync: boolean;
  emailClassRevisions?: boolean;
  emailBookingStatus?: boolean;
  emailStudyMaterials?: boolean;
  emailPerformanceLogs?: boolean;
}

export interface Review {
  id: string;
  studentId: string;
  studentName: string;
  studentPhotoURL?: string;
  tutorId?: string; // Optional: associated tutor
  tutorName?: string;
  classId?: string; // Optional: associated class
  classTitle?: string;
  rating: number; // 1-5
  comment: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  classId: string;
  classTitle: string;
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent';
  markedAt: string;
  tutorId: string;
  type: 'qrcode' | 'manual';
  scannedByName?: string;
  isExtraClass?: boolean;
  extraClassTimeSlot?: string;
  notes?: string;
  isLate?: boolean;
  delayMinutes?: number;
  gracePeriodApplied?: number;
}

export type ResourceType = 'announcement' | 'link' | 'image' | 'video' | 'file' | 'note' | 'quiz';

export interface StudyMaterial {
  id: string;
  title: string;
  description: string;
  subject: string;
  referenceUrl: string;
  type?: ResourceType;
  tutorId: string;
  tutorName: string;
  classId?: string;
  classTitle?: string;
  createdAt: string;
  isVisible?: boolean;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  storagePath?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  username: string; // actor username or uid
  action: string;
  details: string;
}

export interface BannerImage {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  linkUrl?: string;
  active: boolean;
  createdAt: string;
}

export interface PathwayItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
  category: string;
}

export interface SubjectItem {
  id: string;
  name: string;
  code?: string;
  createdAt: string;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  operation: string;
  status: 'pending' | 'success' | 'failed' | 'verify_success' | 'verify_failed';
  message: string;
  attempts: number;
}

export type EmailTriggerEventType = 
  | 'booking_confirmation'
  | 'booking_tutor_alert'
  | 'booking_cancellation'
  | 'class_cancelled'
  | 'payment_receipt'
  | 'payment_due_reminder'
  | 'class_resource_added'
  | 'class_schedule_updated'
  | 'class_created'
  | 'attendance_marked'
  | 'attendance_late_alert'
  | 'attendance_absent_alert'
  | 'student_status_changed'
  | 'student_approved'
  | 'account_created'
  | 'password_reset_notice'
  | 'class_reminder_24h'
  | 'class_reminder_15m'
  | 'custom_broadcast';

export interface EmailSettings {
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
  notifyOnBooking: boolean;
  notifyOnPayment: boolean;
  notifyOnResource: boolean;
  notifyOnAttendance: boolean;
  notifyOnClassUpdate: boolean;
  notifyOnApproval: boolean;
  notifyOnAccountCreate: boolean;
  ccParentByDefault: boolean;
  externalWebhookUrl?: string;
  resendApiKey?: string;
}

export interface EmailNotificationLog {
  id: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  from?: string;
  replyTo?: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  eventType: EmailTriggerEventType;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'simulated';
  createdAt: string;
  sentAt?: string;
  errorMessage?: string;
  recipientName?: string;
  webmailUrl?: string;
  mailtoUrl?: string;
  deliveryChannel?: string;
  metadata?: {
    studentId?: string;
    studentName?: string;
    studentEmail?: string;
    parentEmail?: string;
    tutorId?: string;
    tutorName?: string;
    classId?: string;
    classTitle?: string;
    paymentId?: string;
    amount?: number;
    resourceId?: string;
    resourceTitle?: string;
    attendanceId?: string;
    attendanceStatus?: string;
    senderName?: string;
    senderEmail?: string;
    replyTo?: string;
    originalLogId?: string;
    isResend?: boolean;
    cloudFunctionTriggered?: boolean;
    dispatchMechanism?: 'firestore_mail_collection' | 'cloud_function_http' | 'client_simulated';
    [key: string]: any;
  };
}

export interface MailDocument {
  to: string | string[];
  cc?: string | string[];
  message: {
    subject: string;
    text: string;
    html: string;
  };
  eventType?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'reminder';

export interface ToastAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  description?: string;
  action?: ToastAction;
  duration?: number;
  createdAt: number;
  tag?: string;
}
