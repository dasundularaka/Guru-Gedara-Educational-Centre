import { ClassItem, UserProfile, Booking, Payment, NotificationItem, DirectMessage, Review, Announcement, StudentSuccessStory } from '../types';

export const INITIAL_TUTORS: UserProfile[] = [];
export const INITIAL_CLASSES: ClassItem[] = [];
export const INITIAL_BOOKINGS: Booking[] = [];
export const INITIAL_PAYMENTS: Payment[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
export const INITIAL_MESSAGES: DirectMessage[] = [];
export const INITIAL_REVIEWS: Review[] = [];
export const INITIAL_ANNOUNCEMENTS: Announcement[] = [];

export const INITIAL_STUDENT_STORIES: StudentSuccessStory[] = [
  {
    id: 'story-1',
    studentId: 'student_alumni_1',
    name: 'Dilhara Jayawardena',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
    achievement: 'Island 1st Rank - Physical Sciences',
    currentRole: 'Computer Science & Engineering, University of Moratuwa',
    batch: 'Batch of 2023',
    subject: 'Combined Mathematics & Advanced Physics',
    tutorName: 'Prof. Kalinga Bandara & Dr. Aruna Shantha',
    score: '3 A*s (Z-Score 2.91)',
    badge: 'Island 1st Topper',
    verified: true,
    status: 'approved',
    createdAt: '2024-01-15T08:00:00.000Z',
    approvedAt: '2024-01-16T10:00:00.000Z',
    approvedBy: 'Admin Board',
    quote: 'The rigorous problem-solving sessions and step-by-step doubt clearing transformed my approach to Mathematics. The structured revision roadmap was the key to achieving the top rank in the country.'
  },
  {
    id: 'story-2',
    studentId: 'student_alumni_2',
    name: 'Kavindu Senanayake',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop',
    achievement: 'Direct Entry to Faculty of Medicine, Colombo',
    currentRole: 'Medical Student (MBBS), University of Colombo',
    batch: 'Batch of 2024',
    subject: 'Biology & Chemistry',
    tutorName: 'Dr. Nilmini Weerasinghe',
    score: 'Distinction 3 As (Z-Score 2.68)',
    badge: 'Faculty of Medicine',
    verified: true,
    status: 'approved',
    createdAt: '2024-02-10T08:00:00.000Z',
    approvedAt: '2024-02-11T12:00:00.000Z',
    approvedBy: 'Admin Board',
    quote: 'Gurugedara faculty broke down complex biological pathways into memorable visual logic. The mock examinations mirrored the real exam difficulty with 100% precision.'
  },
  {
    id: 'story-3',
    studentId: 'student_alumni_3',
    name: 'Shenali Perera',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop',
    achievement: 'Top in South Asia - Cambridge A/L Economics',
    currentRole: 'Economics & Finance Scholar, London School of Economics',
    batch: 'Class of 2023',
    subject: 'Economics & Business Studies',
    tutorName: 'Mr. Rohan Gunaratne',
    score: 'A* A* A with Cambridge Outstanding Learner Award',
    badge: 'Cambridge High Achiever',
    verified: true,
    status: 'approved',
    createdAt: '2024-03-05T08:00:00.000Z',
    approvedAt: '2024-03-06T09:00:00.000Z',
    approvedBy: 'Admin Board',
    quote: 'The personalized tutor feedback on essay structure and real-world microeconomic case studies gave me the critical edge to earn the Cambridge Outstanding Learner Award.'
  },
  {
    id: 'story-4',
    studentId: 'student_alumni_4',
    name: 'Anushka Wickramasinghe',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    achievement: 'Top 10 Island Rank - Biological Sciences',
    currentRole: 'Biomedical Engineering Researcher',
    batch: 'Batch of 2022',
    subject: 'Advanced Chemistry & Organic Synthesis',
    tutorName: 'Dr. Sarath Gamage',
    score: '3 As (Z-Score 2.74)',
    badge: 'Island Top 10',
    verified: true,
    status: 'approved',
    createdAt: '2024-04-12T08:00:00.000Z',
    approvedAt: '2024-04-13T11:00:00.000Z',
    approvedBy: 'Admin Board',
    quote: 'I used to struggle with Organic Chemistry mechanisms until I enrolled here. The live interactive problem labs and detailed syllabus roadmaps made all the difference in my university entrance.'
  },
  {
    id: 'story-5',
    studentId: 'student_alumni_5',
    name: 'Rashmi Fernando',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    achievement: 'Full Scholarship - Software Engineering',
    currentRole: 'Associate Software Engineer & Tech Fellow',
    batch: 'Class of 2024',
    subject: 'Information & Communication Technology (ICT)',
    tutorName: 'Eng. Dimuthu Kumara',
    score: 'A* in ICT & Mathematics',
    badge: 'Tech Scholar',
    verified: true,
    status: 'approved',
    createdAt: '2024-05-18T08:00:00.000Z',
    approvedAt: '2024-05-19T14:00:00.000Z',
    approvedBy: 'Admin Board',
    quote: 'Practical coding assignments and continuous mentorship helped me build real-world software applications during my studies, leading straight to a prestigious tech scholarship.'
  },
  {
    id: 'story-6',
    studentId: 'student_alumni_6',
    name: 'Tharindu Rathnayake',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    achievement: 'District 1st Rank - Commerce Stream',
    currentRole: 'Accounting & Finance Analyst',
    batch: 'Batch of 2023',
    subject: 'Accounting & Business Statistics',
    tutorName: 'Mrs. Priyanthi Silva',
    score: '3 As (Z-Score 2.52)',
    badge: 'District 1st Topper',
    verified: true,
    status: 'approved',
    createdAt: '2024-06-20T08:00:00.000Z',
    approvedAt: '2024-06-21T10:00:00.000Z',
    approvedBy: 'Admin Board',
    quote: 'The speed-solving techniques and past-paper analytical sessions gave me unmatched confidence. I finished my final accounting paper 30 minutes early with full accuracy.'
  }
];



