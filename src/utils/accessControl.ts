import { StudyMaterial, UserProfile, ClassItem, Booking } from '../types';

/**
 * Access Control Utility for Guru Gedara LMS
 * Enforces role-based and enrollment-based permissions for study resources and class assets.
 * 
 * Rules:
 * 1. Administrators: Full unrestricted access to view, upload, edit, and delete all materials.
 * 2. Tutors: Can view/manage materials if they are the resource author OR the assigned faculty tutor for that class.
 * 3. Students: Can view materials ONLY if they are actively enrolled in the specific class and their account/class status is not suspended or pending approval.
 * 4. Guests / Unauthenticated / Others: Strictly no access.
 */

export interface ResourceAccessResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if a student is actively enrolled in a class
 */
export function isStudentEnrolledInClass(
  classId: string,
  user: UserProfile | null,
  bookings: Booking[] = []
): boolean {
  if (!user || user.role !== 'student') return false;

  // Account level active check
  if (user.status === 'suspended' || user.status === 'pending') {
    return false;
  }

  // Class-specific suspension check
  if (user.classEnrollmentStatus?.[classId] === 'suspended') {
    return false;
  }

  // Check enrollment via selectedClasses
  const isEnrolledInProfile = Array.isArray(user.selectedClasses) && user.selectedClasses.includes(classId);

  // Check enrollment via active booking
  const isEnrolledInBookings = bookings.some(
    (b) =>
      b.classId === classId &&
      (b.studentId === user.uid || (b as any).studentEmail?.toLowerCase() === user.email?.toLowerCase()) &&
      b.status === 'active'
  );

  return isEnrolledInProfile || isEnrolledInBookings;
}

/**
 * Get all class IDs the student is actively enrolled in
 */
export function getStudentEnrolledClassIds(
  user: UserProfile | null,
  bookings: Booking[] = []
): string[] {
  if (!user || user.role !== 'student') return [];

  const enrolledIds = new Set<string>();

  if (Array.isArray(user.selectedClasses)) {
    user.selectedClasses.forEach((cid) => {
      if (user.classEnrollmentStatus?.[cid] !== 'suspended') {
        enrolledIds.add(cid);
      }
    });
  }

  bookings.forEach((b) => {
    if (
      b.status === 'active' &&
      (b.studentId === user.uid || (b as any).studentEmail?.toLowerCase() === user.email?.toLowerCase())
    ) {
      if (user.classEnrollmentStatus?.[b.classId] !== 'suspended') {
        enrolledIds.add(b.classId);
      }
    }
  });

  return Array.from(enrolledIds);
}

/**
 * Checks if a user is the assigned faculty tutor for a class
 */
export function isAssignedTutorForClass(
  classItem: ClassItem | null | undefined,
  user: UserProfile | null
): boolean {
  if (!classItem || !user || user.role !== 'tutor') return false;

  return (
    classItem.tutorId === user.uid ||
    classItem.tutorId === user.username ||
    classItem.tutorName === user.name ||
    Boolean(
      user.email &&
      (classItem as any).tutorEmail &&
      user.email.toLowerCase() === (classItem as any).tutorEmail.toLowerCase()
    )
  );
}

/**
 * Core permission check: Can the given user view this study resource?
 */
export function canUserViewStudyResource(
  resource: StudyMaterial,
  user: UserProfile | null,
  classes: ClassItem[] = [],
  bookings: Booking[] = []
): boolean {
  if (!user) return false;

  // 1. Administrators can view everything
  if (user.role === 'admin') {
    return true;
  }

  // 2. Tutors can view if they are the author OR assigned faculty tutor
  if (user.role === 'tutor') {
    if (resource.tutorId === user.uid || resource.tutorId === user.username) {
      return true;
    }
    if (resource.classId) {
      const cls = classes.find((c) => c.id === resource.classId);
      if (cls && isAssignedTutorForClass(cls, user)) {
        return true;
      }
    }
    return false;
  }

  // 3. Students can view ONLY if actively enrolled and not hidden
  if (user.role === 'student') {
    // Block suspended or pending intake scholars
    if (user.status === 'suspended' || user.status === 'pending') {
      return false;
    }

    // If resource is explicitly marked hidden by tutor, students cannot view
    if (resource.isVisible === false) {
      return false;
    }

    // If resource is tied to a specific class, student MUST be enrolled
    if (resource.classId) {
      return isStudentEnrolledInClass(resource.classId, user, bookings);
    }

    // General resource without classId: active students with subject matching or general access
    return true;
  }

  return false;
}

/**
 * Core permission check: Can the given user manage (edit/delete/toggle visibility) this study resource?
 */
export function canUserManageStudyResource(
  resource: StudyMaterial,
  user: UserProfile | null,
  classes: ClassItem[] = []
): boolean {
  if (!user) return false;

  // 1. Admin can manage all materials
  if (user.role === 'admin') return true;

  // 2. Tutor can manage if author or assigned faculty
  if (user.role === 'tutor') {
    if (resource.tutorId === user.uid || resource.tutorId === user.username) {
      return true;
    }
    if (resource.classId) {
      const cls = classes.find((c) => c.id === resource.classId);
      if (cls && isAssignedTutorForClass(cls, user)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Filter an array of materials to only those authorized for the current user
 */
export function filterAuthorizedStudyResources(
  resources: StudyMaterial[],
  user: UserProfile | null,
  classes: ClassItem[] = [],
  bookings: Booking[] = []
): StudyMaterial[] {
  if (!user) return [];
  return resources.filter((res) => canUserViewStudyResource(res, user, classes, bookings));
}
