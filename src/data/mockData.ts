import { ClassItem, UserProfile, Booking, Payment, NotificationItem, DirectMessage, Review } from '../types';

export const INITIAL_TUTORS: UserProfile[] = [];
export const INITIAL_CLASSES: ClassItem[] = [];
export const INITIAL_BOOKINGS: Booking[] = [];
export const INITIAL_PAYMENTS: Payment[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'not_platform_1',
    userId: 'all',
    title: '🎓 Welcome to Gurugedara Education Hub',
    message: 'Explore interactive online & physical tuition classes, request custom 1-on-1 tutoring sessions, and track course schedules easily.',
    type: 'announcement',
    isRead: false,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'not_platform_2',
    userId: 'all',
    title: '📚 New Term Revision Classes Released',
    message: 'O/L & A/L Science, Mathematics, and English revision bootcamps are now open for enrollment. Check out top-rated tutors.',
    type: 'reminder',
    isRead: false,
    createdAt: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'not_platform_3',
    userId: 'all',
    title: '💳 Direct Tuition Payment Slip Uploads',
    message: 'Bank transfer slips and online card payments for class subscriptions can now be uploaded directly via your student portal.',
    type: 'payment',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];
export const INITIAL_MESSAGES: DirectMessage[] = [];
export const INITIAL_REVIEWS: Review[] = [];
