import { ClassItem, UserProfile, Booking, Payment, NotificationItem, DirectMessage, Review } from '../types';

export const INITIAL_TUTORS: UserProfile[] = [
  {
    uid: 'kamal_gunaratne',
    username: 'GT00000001',
    name: 'Dr. Kamal Gunaratne',
    displayName: 'Dr. Kamal Gunaratne',
    email: 'kamal.gunaratne@gurugedara.lk',
    phone: '+94 77 123 4567',
    gender: 'male',
    role: 'tutor',
    status: 'approved',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    tutorDetails: {
      bio: 'Senior Lecturer and National Olympiad Physics Trainer with over 12 years of teaching experience. Specializing in A/L Physics, Mechanics, and Waves.',
      subjects: ['Physics', 'Advanced Level Mechanics', 'Electromagnetism'],
      experience: 12,
      qualification: 'Ph.D. in Applied Physics (University of Peradeniya)',
      hourlyRate: 45,
      rating: 4.9,
      availability: [
        { day: 'Monday', slots: ['04:00 PM', '06:00 PM'] },
        { day: 'Wednesday', slots: ['04:00 PM', '06:00 PM'] },
        { day: 'Saturday', slots: ['08:00 AM', '10:00 AM', '02:00 PM'] }
      ]
    },
    createdAt: '2025-01-10T08:00:00.000Z'
  },
  {
    uid: 'nimal_perera',
    username: 'GT00000002',
    name: 'Mr. Nimal Perera',
    displayName: 'Mr. Nimal Perera',
    email: 'nimal.perera@gurugedara.lk',
    phone: '+94 71 234 5678',
    gender: 'male',
    role: 'tutor',
    status: 'approved',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    tutorDetails: {
      bio: 'Specialist in A/L Combined Mathematics, Pure Math, and Applied Calculus with structured step-by-step past paper discussions and theorem breakdown.',
      subjects: ['Combined Mathematics', 'Calculus', 'Pure Mathematics', 'Trigonometry'],
      experience: 9,
      qualification: 'B.Sc. (Hons) in Mathematics (University of Colombo)',
      hourlyRate: 40,
      rating: 5.0,
      availability: [
        { day: 'Tuesday', slots: ['04:00 PM', '06:00 PM'] },
        { day: 'Thursday', slots: ['04:00 PM', '06:00 PM'] },
        { day: 'Sunday', slots: ['08:00 AM', '10:00 AM', '02:00 PM'] }
      ]
    },
    createdAt: '2025-01-12T08:00:00.000Z'
  },
  {
    uid: 'anoma_jayasinghe',
    username: 'GT00000003',
    name: 'Mrs. Anoma Jayasinghe',
    displayName: 'Mrs. Anoma Jayasinghe',
    email: 'anoma.jayasinghe@gurugedara.lk',
    phone: '+94 76 345 6789',
    gender: 'female',
    role: 'tutor',
    status: 'approved',
    photoURL: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
    tutorDetails: {
      bio: 'Dedicated Chemistry instructor helping secondary and high-school students master organic mechanisms, physical chemistry calculations, and inorganic trends.',
      subjects: ['Chemistry', 'Organic Chemistry', 'Physical Chemistry'],
      experience: 10,
      qualification: 'M.Sc. in Analytical Chemistry (University of Kelaniya)',
      hourlyRate: 40,
      rating: 4.8,
      availability: [
        { day: 'Wednesday', slots: ['03:00 PM', '05:00 PM'] },
        { day: 'Friday', slots: ['04:00 PM', '06:00 PM'] },
        { day: 'Saturday', slots: ['01:00 PM', '03:00 PM'] }
      ]
    },
    createdAt: '2025-01-15T08:00:00.000Z'
  },
  {
    uid: 'sarath_gamage',
    username: 'GT00000004',
    name: 'Prof. Sarath Gamage',
    displayName: 'Prof. Sarath Gamage',
    email: 'sarath.gamage@gurugedara.lk',
    phone: '+94 70 456 7890',
    gender: 'male',
    role: 'tutor',
    status: 'approved',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    tutorDetails: {
      bio: 'Experienced university professor and curriculum author conducting engaging biology and genetics masterclasses with practical visual simulations.',
      subjects: ['Biology', 'Genetics & Molecular Biology', 'Plant Biology'],
      experience: 18,
      qualification: 'Professor of Zoology & Environmental Biology',
      hourlyRate: 50,
      rating: 5.0,
      availability: [
        { day: 'Monday', slots: ['05:00 PM', '07:00 PM'] },
        { day: 'Wednesday', slots: ['05:00 PM', '07:00 PM'] },
        { day: 'Sunday', slots: ['09:00 AM', '11:00 AM'] }
      ]
    },
    createdAt: '2025-01-18T08:00:00.000Z'
  },
  {
    uid: 'chathura_senanayake',
    username: 'GT00000005',
    name: 'Mr. Chathura Senanayake',
    displayName: 'Mr. Chathura Senanayake',
    email: 'chathura.senanayake@gurugedara.lk',
    phone: '+94 78 567 8901',
    gender: 'male',
    role: 'tutor',
    status: 'approved',
    photoURL: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400',
    tutorDetails: {
      bio: 'Full-stack software engineer and ICT educator preparing students for A/L ICT, Python programming, database systems, and modern web applications.',
      subjects: ['Information Technology', 'Python Programming', 'Database Systems', 'A/L ICT'],
      experience: 7,
      qualification: 'B.Sc. (Hons) in Computer Science & Engineering',
      hourlyRate: 35,
      rating: 4.9,
      availability: [
        { day: 'Tuesday', slots: ['06:00 PM', '08:00 PM'] },
        { day: 'Thursday', slots: ['06:00 PM', '08:00 PM'] },
        { day: 'Saturday', slots: ['04:00 PM', '06:00 PM'] }
      ]
    },
    createdAt: '2025-01-20T08:00:00.000Z'
  },
  {
    uid: 'malini_fonseka',
    username: 'GT00000006',
    name: 'Dr. Malini Fonseka',
    displayName: 'Dr. Malini Fonseka',
    email: 'malini.fonseka@gurugedara.lk',
    phone: '+94 72 678 9012',
    gender: 'female',
    role: 'tutor',
    status: 'approved',
    photoURL: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
    tutorDetails: {
      bio: 'Distinguished English linguist and author specializing in A/L English Literature, IELTS preparation, and advanced academic essay composition.',
      subjects: ['English Literature', 'General English', 'IELTS Prep', 'Creative Writing'],
      experience: 14,
      qualification: 'Ph.D. in English Linguistics',
      hourlyRate: 35,
      rating: 4.9,
      availability: [
        { day: 'Monday', slots: ['03:00 PM', '05:00 PM'] },
        { day: 'Friday', slots: ['03:00 PM', '05:00 PM'] },
        { day: 'Sunday', slots: ['02:00 PM', '04:00 PM'] }
      ]
    },
    createdAt: '2025-01-22T08:00:00.000Z'
  }
];

export const INITIAL_CLASSES: ClassItem[] = [
  {
    id: 'class_physics_mechanics',
    title: 'A/L Physics: Mechanics & Rotational Dynamics',
    subject: 'Physics',
    description: 'Comprehensive theoretical foundation with intensive numerical problem solving and past paper analysis.',
    schedule: 'Saturdays 08:00 AM - 10:00 AM',
    dayOfWeek: 'Saturday',
    timeSlot: '08:00 AM',
    price: 45,
    maxSlots: 35,
    bookedSlots: 18,
    tutorId: 'kamal_gunaratne',
    tutorName: 'Dr. Kamal Gunaratne',
    imageUrl: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=600'
  },
  {
    id: 'class_calc_abc',
    title: 'Combined Mathematics: Differential Calculus Mastery',
    subject: 'Combined Mathematics',
    description: 'Master calculus limits, derivatives, curves, and integration techniques through structured problem solving.',
    schedule: 'Sundays 08:00 AM - 10:00 AM',
    dayOfWeek: 'Sunday',
    timeSlot: '08:00 AM',
    price: 40,
    maxSlots: 40,
    bookedSlots: 24,
    tutorId: 'nimal_perera',
    tutorName: 'Mr. Nimal Perera',
    imageUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600'
  },
  {
    id: 'class_chemistry_organic',
    title: 'A/L Chemistry: Organic Reaction Mechanisms',
    subject: 'Chemistry',
    description: 'Step-by-step exploration of nucleophilic substitution, elimination, aromatic synthesis, and spectroscopy.',
    schedule: 'Saturdays 01:00 PM - 03:00 PM',
    dayOfWeek: 'Saturday',
    timeSlot: '01:00 PM',
    price: 40,
    maxSlots: 30,
    bookedSlots: 15,
    tutorId: 'anoma_jayasinghe',
    tutorName: 'Mrs. Anoma Jayasinghe',
    imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600'
  },
  {
    id: 'class_biology_genetics',
    title: 'Advanced Biology: Molecular Genetics & Recombinant DNA',
    subject: 'Biology',
    description: 'In-depth molecular biology curriculum covering gene expression, Mendelian genetics, and biotechnology.',
    schedule: 'Sundays 09:00 AM - 11:00 AM',
    dayOfWeek: 'Sunday',
    timeSlot: '09:00 AM',
    price: 50,
    maxSlots: 30,
    bookedSlots: 20,
    tutorId: 'sarath_gamage',
    tutorName: 'Prof. Sarath Gamage',
    imageUrl: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=600'
  },
  {
    id: 'class_ict_python',
    title: 'A/L ICT & Python Programming Bootcamp',
    subject: 'Information Technology',
    description: 'Hands-on coding in Python, relational SQL database design, algorithms, logic gates, and networking fundamentals.',
    schedule: 'Saturdays 04:00 PM - 06:00 PM',
    dayOfWeek: 'Saturday',
    timeSlot: '04:00 PM',
    price: 35,
    maxSlots: 25,
    bookedSlots: 14,
    tutorId: 'chathura_senanayake',
    tutorName: 'Mr. Chathura Senanayake',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600'
  },
  {
    id: 'class_english_lit',
    title: 'A/L English Literature: Critical Poetry & Drama Analysis',
    subject: 'English Literature',
    description: 'Detailed analysis of prescribed poems, classic novels, Shakespearean drama, and high-scoring essay writing.',
    schedule: 'Sundays 02:00 PM - 04:00 PM',
    dayOfWeek: 'Sunday',
    timeSlot: '02:00 PM',
    price: 35,
    maxSlots: 25,
    bookedSlots: 12,
    tutorId: 'malini_fonseka',
    tutorName: 'Dr. Malini Fonseka',
    imageUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600'
  }
];

export const INITIAL_BOOKINGS: Booking[] = [];
export const INITIAL_PAYMENTS: Payment[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
export const INITIAL_MESSAGES: DirectMessage[] = [];
export const INITIAL_REVIEWS: Review[] = [];

