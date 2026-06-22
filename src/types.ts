export type UserRole = 'student' | 'tutor' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  displayName?: string;
  role: UserRole;
  username?: string;
  status?: 'pending' | 'approved' | 'active';
  gender?: 'male' | 'female';
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  selectedClasses?: string[];
  photoURL?: string;
  pendingPhotoURL?: string;
  phone?: string;
  password?: string;
  isPasswordResetRequired?: boolean;
  createdAt: string;
  
  // Specific properties
  studentDetails?: {
    grade: string;
    parentContact?: string;
    interests?: string[];
  };
  tutorDetails?: {
    bio: string;
    subjects: string[];
    experience: number; // in years
    qualification: string;
    hourlyRate: number;
    rating: number;
    availability: {
      day: string; // e.g. "Monday", "Tuesday"
      slots: string[]; // e.g. ["10:00 AM", "02:00 PM"]
    }[];
  };
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
}

export interface Booking {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  classTitle: string;
  tutorId: string;
  tutorName: string;
  dayOfWeek: string;
  timeSlot: string;
  bookingDate: string;
  status: 'active' | 'cancelled';
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
