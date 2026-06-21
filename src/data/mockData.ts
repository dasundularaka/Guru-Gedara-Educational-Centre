import { ClassItem, UserProfile, Booking, Payment, NotificationItem, DirectMessage } from '../types';

export const INITIAL_TUTORS: UserProfile[] = [
  {
    uid: "tutor_sarah",
    email: "sarah.edu@example.com",
    name: "Dr. Sarah Jenkins",
    role: "tutor",
    photoURL: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    phone: "+1 (555) 123-4567",
    createdAt: new Date().toISOString(),
    tutorDetails: {
      bio: "Ph.D. in Mathematics with over 12 years of teaching high school and college advanced calculus. Dynamic teaching style adapting to student needs.",
      subjects: ["Mathematics", "Calculus", "Algebra"],
      experience: 12,
      qualification: "Ph.D. in Mathematics from Stanford University",
      hourlyRate: 45,
      rating: 4.9,
      availability: [
        { day: "Monday", slots: ["03:00 PM", "05:00 PM"] },
        { day: "Wednesday", slots: ["03:00 PM", "05:00 PM", "07:00 PM"] },
        { day: "Saturday", slots: ["09:00 AM", "11:00 AM", "01:00 PM"] }
      ]
    }
  },
  {
    uid: "tutor_marcus",
    email: "marcus.physics@example.com",
    name: "Prof. Marcus Chen",
    role: "tutor",
    photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    phone: "+1 (555) 987-6543",
    createdAt: new Date().toISOString(),
    tutorDetails: {
      bio: "Former systems hardware engineer. Specializes in making physics tangible and engaging through interactive animations and virtual laboratory models.",
      subjects: ["Physics", "General Science", "Coding"],
      experience: 8,
      qualification: "M.Sc. in Physics & Applied Robotics",
      hourlyRate: 40,
      rating: 4.8,
      availability: [
        { day: "Tuesday", slots: ["04:00 PM", "06:00 PM"] },
        { day: "Thursday", slots: ["04:00 PM", "06:00 PM"] },
        { day: "Saturday", slots: ["10:00 AM", "02:00 PM", "04:00 PM"] }
      ]
    }
  },
  {
    uid: "tutor_elena",
    email: "elena.write@example.com",
    name: "Elena Rostova",
    role: "tutor",
    photoURL: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
    phone: "+1 (555) 456-7890",
    createdAt: new Date().toISOString(),
    tutorDetails: {
      bio: "Bilingual English instructor and published author. PASSIONATE about helping students unlock their essay writing, literature analysis, and speaking confidence.",
      subjects: ["English", "Creative Writing", "Literature"],
      experience: 6,
      qualification: "B.A. in English & Creative Writing, Columbia University",
      hourlyRate: 35,
      rating: 4.7,
      availability: [
        { day: "Monday", slots: ["04:00 PM", "06:00 PM"] },
        { day: "Friday", slots: ["03:00 PM", "05:00 PM", "07:00 PM"] },
        { day: "Sunday", slots: ["10:00 AM", "12:00 PM"] }
      ]
    }
  },
  {
    uid: "tutor_david",
    email: "david.coding@example.com",
    name: "David Kross",
    role: "tutor",
    photoURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    phone: "+1 (555) 321-7654",
    createdAt: new Date().toISOString(),
    tutorDetails: {
      bio: "Full stack developer of 10 years, teaching computing syntax, algorithms, and logical structures to students aged 10-18. Focuses on cool projects.",
      subjects: ["Coding", "Computer Science", "Algebra"],
      experience: 10,
      qualification: "B.Sc. in Computer Science from MIT",
      hourlyRate: 50,
      rating: 4.9,
      availability: [
        { day: "Tuesday", slots: ["03:00 PM", "05:00 PM", "07:00 PM"] },
        { day: "Wednesday", slots: ["04:00 PM"] },
        { day: "Saturday", slots: ["02:00 PM", "04:00 PM", "06:00 PM"] }
      ]
    }
  }
];

export const INITIAL_CLASSES: ClassItem[] = [
  {
    id: "class_calc_abc",
    title: "AP Calculus AB: Mastering the Core",
    subject: "Mathematics",
    tutorId: "tutor_sarah",
    tutorName: "Dr. Sarah Jenkins",
    tutorPhoto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    schedule: "Saturdays 09:00 AM - 11:00 AM",
    dayOfWeek: "Saturday",
    timeSlot: "09:00 AM",
    price: 90,
    description: "A comprehensive preparation class for AP Calculus exam covering limits, derivatives, integrals, and theorems with intensive practical workbooks.",
    maxSlots: 15,
    bookedSlots: 12,
    tags: ["AP Prep", "Calculus", "Advanced"]
  },
  {
    id: "class_physics_mechanics",
    title: "Newtonian Physics & Classical Mechanics",
    subject: "Physics",
    tutorId: "tutor_marcus",
    tutorName: "Prof. Marcus Chen",
    tutorPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    schedule: "Thursdays 04:00 PM - 06:00 PM",
    dayOfWeek: "Thursday",
    timeSlot: "04:00 PM",
    price: 80,
    description: "An interactive, visually-rich approach to motion, forces, vectors, momentum, and energy. Suitable for junior high and high schoolers.",
    maxSlots: 12,
    bookedSlots: 6,
    tags: ["Physics", "Interactive", "High School"]
  },
  {
    id: "class_creative_writing",
    title: "Creative Writing Workshop & Narrative Voice",
    subject: "English",
    tutorId: "tutor_elena",
    tutorName: "Elena Rostova",
    tutorPhoto: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
    schedule: "Mondays 04:00 PM - 06:00 PM",
    dayOfWeek: "Monday",
    timeSlot: "04:00 PM",
    price: 70,
    description: "Unlock your visual vocabulary, structure intricate suspense paths, and compose stories. Features guided exercises and peer peer-review circles.",
    maxSlots: 10,
    bookedSlots: 4,
    tags: ["Writing", "Literature", "Creative"]
  },
  {
    id: "class_coding_web",
    title: "Web Development Essentials: HTML, CSS, JS",
    subject: "Coding",
    tutorId: "tutor_david",
    tutorName: "David Kross",
    tutorPhoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    schedule: "Saturdays 02:00 PM - 04:00 PM",
    dayOfWeek: "Saturday",
    timeSlot: "02:00 PM",
    price: 100,
    description: "Build actual dynamic websites from line zero. Learn DOM manipulation, stylish layout controls, responsive media, and publish live on the web.",
    maxSlots: 20,
    bookedSlots: 8,
    tags: ["Coding", "Web Dev", "Beginner"]
  },
  {
    id: "class_algebra_basics",
    title: "Algebra Foundations & Linear Functions",
    subject: "Mathematics",
    tutorId: "tutor_sarah",
    tutorName: "Dr. Sarah Jenkins",
    tutorPhoto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    schedule: "Wednesdays 03:00 PM - 05:00 PM",
    dayOfWeek: "Wednesday",
    timeSlot: "03:00 PM",
    price: 75,
    description: "Demystifying linear variables, quadratic systems, graph equations, and coordinates. Builds strong roots for higher high school physics/calcs.",
    maxSlots: 18,
    bookedSlots: 14,
    tags: ["Algebra", "Foundations", "Middle School"]
  }
];

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: "booking_abc_1",
    studentId: "student_demo",
    studentName: "Alex Mercer",
    classId: "class_calc_abc",
    classTitle: "AP Calculus AB: Mastering the Core",
    tutorId: "tutor_sarah",
    tutorName: "Dr. Sarah Jenkins",
    dayOfWeek: "Saturday",
    timeSlot: "09:00 AM",
    bookingDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active"
  },
  {
    id: "booking_abc_2",
    studentId: "student_demo",
    studentName: "Alex Mercer",
    classId: "class_coding_web",
    classTitle: "Web Development Essentials: HTML, CSS, JS",
    tutorId: "tutor_david",
    tutorName: "David Kross",
    dayOfWeek: "Saturday",
    timeSlot: "02:00 PM",
    bookingDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active"
  }
];

export const INITIAL_PAYMENTS: Payment[] = [
  {
    id: "pay_1",
    studentId: "student_demo",
    studentName: "Alex Mercer",
    classId: "class_calc_abc",
    classTitle: "AP Calculus AB: Mastering the Core",
    amount: 90,
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "paid",
    paymentMethod: "Visa ending in 4242"
  },
  {
    id: "pay_2",
    studentId: "student_demo",
    studentName: "Alex Mercer",
    classId: "class_coding_web",
    classTitle: "Web Development Essentials: HTML, CSS, JS",
    amount: 100,
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: "paid",
    paymentMethod: "Apple Pay"
  },
  {
    id: "pay_3",
    studentId: "student_demo",
    studentName: "Alex Mercer",
    classId: "class_algebra_basics",
    classTitle: "Algebra Foundations & Linear Functions",
    amount: 75,
    date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    status: "failed",
    paymentMethod: "Mastercard ending in 1188"
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "not_1",
    userId: "student_demo",
    title: "Class Reminder: AP Calculus",
    message: "Your upcoming 'AP Calculus AB' class starts tomorrow at 09:00 AM. Get your notebooks ready!",
    type: "reminder",
    isRead: false,
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
  },
  {
    id: "not_2",
    userId: "student_demo",
    title: "Payment Recieved Successfully",
    message: "Your payment of $100 for Web Development Essentials has been confirmed. Welcome aboard!",
    type: "payment",
    isRead: true,
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  },
  {
    id: "not_3",
    userId: "student_demo",
    title: "Fresh Class Announced!",
    message: "Elena Rostova launched 'Critical Essay Structures and IELTS Prep' - check it out now!",
    type: "announcement",
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "not_tutor",
    userId: "tutor_sarah",
    title: "New Student Enrolled",
    message: "Alex Mercer booked a slot for your AP Calculus AB class.",
    type: "reminder",
    isRead: false,
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
  }
];

export const INITIAL_MESSAGES: DirectMessage[] = [
  {
    id: "msg_1",
    senderId: "tutor_sarah",
    senderName: "Dr. Sarah Jenkins",
    receiverId: "student_demo",
    message: "Hi Alex! Ready for tomorrow's calculus lesson? Please review Chapter 3 limits material.",
    createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString()
  },
  {
    id: "msg_2",
    senderId: "student_demo",
    senderName: "Alex Mercer",
    receiverId: "tutor_sarah",
    message: "Hi Dr. Sarah, yes! I've annotated chapter 3. Should we complete the questions on page 40?",
    createdAt: new Date(Date.now() - 9 * 3600 * 1000).toISOString()
  }
];
