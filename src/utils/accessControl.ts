import { StudyMaterial, UserProfile, ClassItem, Booking, Quiz } from '../types';

/**
 * Access Control Utility for Guru Gedara LMS
 * Enforces role-based and enrollment-based permissions for study resources, quizzes, and class assets.
 * 
 * Rules:
 * 1. Administrators: Full unrestricted access to view, upload, edit, and delete all materials and quizzes.
 * 2. Tutors: Can view/manage materials and quizzes ONLY if they are the author OR the assigned faculty tutor for that class.
 * 3. Students: Can view materials and quizzes ONLY if they are actively enrolled in the specific class and their account/class status is not suspended or pending approval.
 * 4. Guests / Unauthenticated / Non-enrolled: Strictly no access to quizzes or private class resources.
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

  // Check enrollment via active/approved booking
  const userUid = user.uid?.toLowerCase();
  const userUsername = user.username?.toLowerCase();
  const userEmail = user.email?.toLowerCase();

  const isEnrolledInBookings = bookings.some((b) => {
    if (b.classId !== classId) return false;
    if (b.status !== 'active' && b.status !== 'approved') return false;

    const bStudentId = (b.studentId || '')?.toLowerCase();
    const bStudentEmail = ((b as any).studentEmail || '')?.toLowerCase();

    return (
      (userUid && bStudentId === userUid) ||
      (userUsername && bStudentId === userUsername) ||
      (userEmail && bStudentEmail === userEmail)
    );
  });

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

  const userUid = user.uid?.toLowerCase();
  const userUsername = user.username?.toLowerCase();
  const userEmail = user.email?.toLowerCase();

  bookings.forEach((b) => {
    if (b.status === 'active' || b.status === 'approved') {
      const bStudentId = (b.studentId || '')?.toLowerCase();
      const bStudentEmail = ((b as any).studentEmail || '')?.toLowerCase();

      const isMatch =
        (userUid && bStudentId === userUid) ||
        (userUsername && bStudentId === userUsername) ||
        (userEmail && bStudentEmail === userEmail);

      if (isMatch && user.classEnrollmentStatus?.[b.classId] !== 'suspended') {
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

  const userUid = (user.uid || '')?.toLowerCase();
  const userName = (user.name || '')?.toLowerCase();
  const userUsername = (user.username || '')?.toLowerCase();
  const userDisplayName = (user.displayName || '')?.toLowerCase();
  const userEmail = (user.email || '')?.toLowerCase();

  const classTutorId = (classItem.tutorId || '')?.toLowerCase();
  const classTutorName = (classItem.tutorName || '')?.toLowerCase();
  const classTutorEmail = ((classItem as any).tutorEmail || '')?.toLowerCase();

  if (classTutorId && (classTutorId === userUid || classTutorId === userUsername)) return true;
  if (classTutorName && (classTutorName === userName || (userDisplayName && classTutorName === userDisplayName))) return true;
  if (classTutorEmail && userEmail && classTutorEmail === userEmail) return true;

  return false;
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

/**
 * Core permission check: Can the given user view this Quiz?
 * 
 * Strict Enforcement:
 * 1. Administrators: Full unrestricted access to view and take all quizzes across the academy.
 * 2. Tutors: Can view quizzes ONLY for classes they teach / are assigned to, or quizzes they created. Other classes' quizzes are forbidden.
 * 3. Students: Can view quizzes ONLY if they are actively enrolled in that quiz's class and the quiz is published. Unenrolled students are forbidden.
 * 4. Guests / Unauthenticated: Strictly no access (quizzes hidden completely).
 */
export function canUserViewQuiz(
  quiz: Quiz,
  user: UserProfile | null,
  classes: ClassItem[] = [],
  bookings: Booking[] = []
): boolean {
  if (!user) return false;

  // 1. Administrators can view everything
  if (user.role === 'admin') {
    return true;
  }

  // 2. Tutors can view quizzes ONLY for classes they teach or created
  if (user.role === 'tutor') {
    const userUid = (user.uid || '')?.toLowerCase();
    const userUsername = (user.username || '')?.toLowerCase();
    const quizTutorId = (quiz.tutorId || '')?.toLowerCase();

    // Check if tutor authored this quiz
    if (quizTutorId && (quizTutorId === userUid || quizTutorId === userUsername)) {
      return true;
    }
    if (user.email && (quiz as any).tutorEmail && user.email.toLowerCase() === (quiz as any).tutorEmail.toLowerCase()) {
      return true;
    }

    // Check if tutor is assigned to the class this quiz belongs to
    if (quiz.classId) {
      const cls = classes.find((c) => c.id === quiz.classId);
      if (cls && isAssignedTutorForClass(cls, user)) {
        return true;
      }
    }

    return false;
  }

  // 3. Students can view quizzes ONLY if actively enrolled in that quiz's class
  if (user.role === 'student') {
    // Block suspended or pending intake scholars
    if (user.status === 'suspended' || user.status === 'pending') {
      return false;
    }

    // Only published quizzes are viewable by students
    if (quiz.status !== 'published') {
      return false;
    }

    // Must be actively enrolled in the quiz's class
    if (quiz.classId) {
      return isStudentEnrolledInClass(quiz.classId, user, bookings);
    }

    return false;
  }

  return false;
}

/**
 * Core permission check: Can the given user manage (edit/delete/publish) this Quiz?
 */
export function canUserManageQuiz(
  quiz: Quiz,
  user: UserProfile | null,
  classes: ClassItem[] = []
): boolean {
  if (!user) return false;

  // 1. Admin can manage all quizzes
  if (user.role === 'admin') return true;

  // 2. Tutor can manage if author or assigned faculty
  if (user.role === 'tutor') {
    const userUid = (user.uid || '')?.toLowerCase();
    const userUsername = (user.username || '')?.toLowerCase();
    const quizTutorId = (quiz.tutorId || '')?.toLowerCase();

    if (quizTutorId && (quizTutorId === userUid || quizTutorId === userUsername)) {
      return true;
    }
    if (user.email && (quiz as any).tutorEmail && user.email.toLowerCase() === (quiz as any).tutorEmail.toLowerCase()) {
      return true;
    }

    if (quiz.classId) {
      const cls = classes.find((c) => c.id === quiz.classId);
      if (cls && isAssignedTutorForClass(cls, user)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Filter an array of quizzes to only those authorized for the current user
 */
export function filterAuthorizedQuizzes(
  quizzes: Quiz[],
  user: UserProfile | null,
  classes: ClassItem[] = [],
  bookings: Booking[] = []
): Quiz[] {
  if (!user) return [];
  return quizzes.filter((quiz) => canUserViewQuiz(quiz, user, classes, bookings));
}

