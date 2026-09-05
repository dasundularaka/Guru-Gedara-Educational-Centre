import { Announcement, UserProfile, Booking, ClassItem } from '../types';

/**
 * Filters announcements strictly based on recipient audience:
 * - Admin: sees all announcements
 * - Student: sees targetType === 'all' OR 'all_students' OR ('classes' if student enrolled in target class)
 * - Tutor: sees targetType === 'all' OR 'tutors_only' OR ('classes' if tutor teaches target class)
 * - Guests: see no announcements
 */
export function getAudienceFilteredAnnouncements(
  announcements: Announcement[] = [],
  currentUser: UserProfile | null,
  bookings: Booking[] = [],
  classes: ClassItem[] = []
): Announcement[] {
  if (!currentUser) return [];
  if (currentUser.role === 'admin') return announcements;

  const isStudent = currentUser.role === 'student';
  const isTutor = currentUser.role === 'tutor';

  // Extract enrolled class IDs for student
  const studentEnrolledClassIds = [
    ...(currentUser.selectedClasses || []),
    ...bookings
      .filter(b => b.studentId === currentUser.uid && b.status !== 'cancelled')
      .map(b => b.classId)
  ];

  // Extract taught class IDs for tutor
  const tutorTaughtClassIds = classes
    .filter(c => 
      c.tutorId === currentUser.uid || 
      c.tutorName === currentUser.name || 
      ((c as any).tutorEmail && currentUser.email && (c as any).tutorEmail.toLowerCase() === currentUser.email.toLowerCase())
    )
    .map(c => c.id);

  return announcements.filter(ann => {
    if (ann.targetType === 'all') return true;

    if (isStudent) {
      if (ann.targetType === 'all_students') return true;
      if (ann.targetType === 'classes' && Array.isArray(ann.targetClassIds)) {
        return ann.targetClassIds.some(cid => studentEnrolledClassIds.includes(cid));
      }
      return false;
    }

    if (isTutor) {
      if (ann.targetType === 'tutors_only') return true;
      if (ann.targetType === 'classes' && Array.isArray(ann.targetClassIds)) {
        return ann.targetClassIds.some(cid => tutorTaughtClassIds.includes(cid));
      }
      return false;
    }

    return false;
  });
}
