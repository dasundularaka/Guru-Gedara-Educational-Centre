import { ClassItem, UserProfile, Booking, Payment, NotificationItem, DirectMessage, Review, Announcement, Quiz, QuizSubmission } from '../types';

export const INITIAL_TUTORS: UserProfile[] = [];
export const INITIAL_CLASSES: ClassItem[] = [];
export const INITIAL_BOOKINGS: Booking[] = [];
export const INITIAL_PAYMENTS: Payment[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
export const INITIAL_MESSAGES: DirectMessage[] = [];
export const INITIAL_REVIEWS: Review[] = [];
export const INITIAL_ANNOUNCEMENTS: Announcement[] = [];

export const INITIAL_QUIZZES: Quiz[] = [
  {
    id: "quiz_math_calc_1",
    classId: "class_1",
    classTitle: "A/L Combined Mathematics (Pure & Applied)",
    tutorId: "dasun_dularaka",
    tutorName: "Dasun Dularaka",
    title: "Calculus & Derivatives Mastery Test",
    description: "Assessment on differential calculus principles, continuity, limits, and derivative applications for G.C.E. A/L students.",
    durationMinutes: 15,
    passingScorePercentage: 60,
    status: "published",
    totalPoints: 4,
    createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    questions: [
      {
        id: "q_calc_1",
        question: "What is the first derivative of f(x) = x³ + 5x² - 4x + 12 with respect to x?",
        type: "multiple_choice",
        options: ["3x² + 10x - 4", "3x² + 5x - 4", "x² + 10x - 4", "3x² + 10x + 12"],
        correctAnswer: "3x² + 10x - 4",
        points: 1,
        explanation: "Using the power rule: d/dx(x³) = 3x², d/dx(5x²) = 10x, d/dx(-4x) = -4, and constant derivative is 0."
      },
      {
        id: "q_calc_2",
        question: "A function is guaranteed to be differentiable at a point if it is continuous at that point.",
        type: "true_false",
        options: ["True", "False"],
        correctAnswer: "False",
        points: 1,
        explanation: "Continuity is a necessary condition for differentiability, but not sufficient. Example: f(x) = |x| is continuous at x = 0 but has a sharp corner and is not differentiable."
      },
      {
        id: "q_calc_3",
        question: "Evaluate the standard trigonometric limit: lim (x → 0) [sin(3x) / x].",
        type: "multiple_choice",
        options: ["0", "1", "3", "Undefined"],
        correctAnswer: "3",
        points: 1,
        explanation: "lim (x → 0) [sin(kx)/x] = k. Here k = 3, so lim = 3 * 1 = 3."
      },
      {
        id: "q_calc_4",
        question: "If f'(c) = 0 and f''(c) < 0, then f(x) attains a local maximum at the stationary point x = c.",
        type: "true_false",
        options: ["True", "False"],
        correctAnswer: "True",
        points: 1,
        explanation: "By the second derivative test, a negative second derivative indicates concave down curvature, corresponding to a local maximum."
      }
    ]
  },
  {
    id: "quiz_phys_mech_1",
    classId: "class_2",
    classTitle: "A/L Physics Core & Advanced Mechanics",
    tutorId: "dasun_dularaka",
    tutorName: "Dasun Dularaka",
    title: "Newton's Laws & Dynamics Checkpoint",
    description: "Diagnostic test evaluating Newton's laws of motion, momentum conservation, and energy transformations.",
    durationMinutes: 20,
    passingScorePercentage: 50,
    status: "published",
    totalPoints: 4,
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    questions: [
      {
        id: "q_phys_1",
        question: "A 4.0 kg crate accelerates across a smooth horizontal floor at 3.5 m/s². What is the net external force exerted on the crate?",
        type: "multiple_choice",
        options: ["14.0 N", "7.5 N", "1.14 N", "39.2 N"],
        correctAnswer: "14.0 N",
        points: 1,
        explanation: "Newton's Second Law states F_net = m * a = 4.0 kg * 3.5 m/s² = 14.0 N."
      },
      {
        id: "q_phys_2",
        question: "Action-reaction force pairs described by Newton's Third Law act upon different interacting bodies and therefore never cancel each other out.",
        type: "true_false",
        options: ["True", "False"],
        correctAnswer: "True",
        points: 1,
        explanation: "Because action and reaction act on separate bodies, they cannot cancel each other in a free-body equilibrium of one body."
      },
      {
        id: "q_phys_3",
        question: "Which of the following physical quantities is conserved in ALL isolated system collisions, whether elastic or completely inelastic?",
        type: "multiple_choice",
        options: ["Linear Momentum", "Total Kinetic Energy", "Mechanical Energy", "Total Velocity"],
        correctAnswer: "Linear Momentum",
        points: 1,
        explanation: "In the absence of external forces, total linear momentum is always conserved regardless of elasticity."
      },
      {
        id: "q_phys_4",
        question: "Work done by a conservative force on a particle around any closed circular path is always non-zero.",
        type: "true_false",
        options: ["True", "False"],
        correctAnswer: "False",
        points: 1,
        explanation: "For any conservative field (like gravity or electrostatics), the closed-path work integral ∮ F · dr = 0."
      }
    ]
  }
];

export const INITIAL_QUIZ_SUBMISSIONS: QuizSubmission[] = [];





