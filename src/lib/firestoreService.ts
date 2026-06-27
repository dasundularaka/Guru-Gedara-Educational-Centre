import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  arrayUnion,
  increment
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { ClassItem, UserProfile, Booking, Payment, NotificationItem, DirectMessage, Review } from '../types';
import { 
  INITIAL_CLASSES, 
  INITIAL_TUTORS, 
  INITIAL_BOOKINGS, 
  INITIAL_PAYMENTS, 
  INITIAL_NOTIFICATIONS,
  INITIAL_MESSAGES,
  INITIAL_REVIEWS
} from '../data/mockData';

// Track connection model
let isUsingCloud = true;
let isOriginalCloud = true;

// Helper to stringify objects with circular reference protection and custom type exclusions
export function safeStringify(obj: any): string {
  try {
    const cache = new Set();
    const result = JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return undefined; // Duplicate reference found, prune it
        }
        // Exclude known internal Firebase/Firestore classes with circular/complex internals
        if (value.constructor && (
          value.constructor.name === 'Firestore' || 
          value.constructor.name === 'Auth' || 
          value.constructor.name === 'Y2' || 
          value.constructor.name === 'Ka' ||
          value.constructor.name === 'FirebaseAppImpl'
        )) {
          return undefined;
        }
        cache.add(value);
      }
      return value;
    });
    cache.clear();
    return result;
  } catch (err) {
    console.warn("[safeStringify] Error stringifying object, returning fallback empty object structure", err);
    return '{}';
  }
}

// Helper to check and fallback
function handleFallback<T>(localKey: string, initialData: T[]): T[] {
  const local = localStorage.getItem(localKey);
  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {
      // ignore
    }
  }
  try {
    localStorage.setItem(localKey, safeStringify(initialData));
  } catch (err) {
    console.warn(`[safeStringify] Failed to save initial local storage for key ${localKey}`, err);
  }
  return initialData;
}

function saveFallback<T>(localKey: string, data: T[]): void {
  try {
    localStorage.setItem(localKey, safeStringify(data));
  } catch (err) {
    console.warn(`[safeStringify] Failed to save fallback local storage for key ${localKey}`, err);
  }
}

// Dynamically synchronize cloud flag based on whether there's a live Firebase Auth session
// vs. a simulated sandbox local session. This prevents unauthenticated cloud queries from failing
// and overwriting locally saved additions, edits, or deletions in sandbox mode.
function syncCloudFlag() {
  if (!isOriginalCloud) {
    isUsingCloud = false;
    return;
  }
  const hasLocalSession = !!localStorage.getItem('local_running_session');
  if (hasLocalSession && !auth.currentUser) {
    isUsingCloud = false;
  } else {
    isUsingCloud = true;
  }
}

const firestoreServiceRaw = {
  isCloudConnected() {
    return isUsingCloud;
  },

  setCloudConnected(status: boolean) {
    isOriginalCloud = status;
    syncCloudFlag();
  },

  // -------------------------------------------------------------
  // SEEDING DATABASE (RUNS AUTO-ONCE IF EMPTY)
  // -------------------------------------------------------------
  async seedDatabase() {
    if (!isUsingCloud) return;
    // Optimize: Check if database verification/seeding has already completed in a previous session
    if (localStorage.getItem('db_seeding_verified') === 'true') {
      return;
    }
    try {
      const classSnap = await getDocs(collection(db, 'classes'));
      if (classSnap.empty) {
        console.log("Seeding classes to Firestore...");
        for (const c of INITIAL_CLASSES) {
          await setDoc(doc(db, 'classes', c.id), c);
        }
      }

      const tutorSnap = await getDocs(collection(db, 'users'));
      if (tutorSnap.empty) {
        console.log("Seeding tutor users to Firestore...");
        for (const t of INITIAL_TUTORS) {
          await setDoc(doc(db, 'users', t.uid), t);
        }

        // Add dummy student Alex Mercer profile
        await setDoc(doc(db, 'users', 'student_demo'), {
          uid: "student_demo",
          email: "alex.mercer@example.com",
          name: "Alex Mercer",
          role: "student",
          photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
          phone: "+1 (555) 777-8899",
          createdAt: new Date().toISOString(),
          studentDetails: {
            grade: "Grade 11",
            parentContact: "+1 (555) 777-0011",
            interests: ["Advanced Physics", "Calc"]
          }
        });

        // Add dummy admin profile
        await setDoc(doc(db, 'users', 'admin_demo'), {
          uid: "admin_demo",
          email: "admin.academy@example.com",
          name: "Academy Principal",
          role: "admin",
          createdAt: new Date().toISOString()
        });

        // Seed initial actions
        for (const b of INITIAL_BOOKINGS) {
          await setDoc(doc(db, 'bookings', b.id), b);
        }
        for (const p of INITIAL_PAYMENTS) {
          await setDoc(doc(db, 'payments', p.id), p);
        }
        for (const n of INITIAL_NOTIFICATIONS) {
          await setDoc(doc(db, 'notifications', n.id), n);
        }
        for (const m of INITIAL_MESSAGES) {
          await setDoc(doc(db, 'messages', m.id), m);
        }
        for (const r of INITIAL_REVIEWS) {
          await setDoc(doc(db, 'reviews', r.id), r);
        }
        console.log("Database seeded successfully!");
      }
      // Seeding or check completed successfully - save verification flag
      localStorage.setItem('db_seeding_verified', 'true');
    } catch (e) {
      console.warn("Cloud connection not fully resolved or configured: switching to reliable local state simulation.", e);
      isUsingCloud = false;
    }
  },

  // -------------------------------------------------------------
  // USER PROFILES
  // -------------------------------------------------------------
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    if (isUsingCloud) {
       try {
         const userRef = doc(db, 'users', uid);
         const userSnap = await getDoc(userRef);
         if (userSnap.exists()) {
           const userData = userSnap.data() as UserProfile;
           if (userData.role === 'tutor') {
             const tutors = handleFallback<UserProfile>('local_users_tutors', INITIAL_TUTORS);
             const filtered = tutors.filter(t => t.uid !== uid);
             filtered.push(userData);
             saveFallback('local_users_tutors', filtered);
           } else {
             const registered = handleFallback<UserProfile>('local_registered_users', []);
             const filtered = registered.filter(r => r.uid !== uid);
             filtered.push(userData);
             saveFallback('local_registered_users', filtered);
           }
           return userData;
         }
       } catch (e) {
         console.warn("Falling back to local user retrieval", e);
       }
    }
    
    // Local fallback
    const tutors = handleFallback<UserProfile>('local_users_tutors', INITIAL_TUTORS);
    const tutorMatch = tutors.find(t => t.uid === uid);
    if (tutorMatch) return tutorMatch;

    if (uid === 'student_demo') {
      return {
        uid: "student_demo",
        email: "alex.mercer@example.com",
        name: "Alex Mercer",
        role: "student",
        photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
        phone: "+1 (555) 777-8899",
        createdAt: new Date().toISOString(),
        studentDetails: {
          grade: "Grade 11",
          parentContact: "+1 (555) 777-0011",
          interests: ["Advanced Physics", "Calc"]
        }
      };
    }
    
    if (uid === 'admin_demo') {
      return {
        uid: "admin_demo",
        email: "admin.academy@example.com",
        name: "Academy Principal",
        role: "admin",
        createdAt: new Date().toISOString()
      };
    }

    // Checking dynamically added local signup profiles
    const registered = handleFallback<UserProfile>('local_registered_users', []);
    return registered.find(u => u.uid === uid) || null;
  },

  async getUserProfileByEmail(email: string): Promise<UserProfile | null> {
    const cleanEmail = email.trim().toLowerCase();
    
    if (isUsingCloud) {
       try {
         const usersRef = collection(db, 'users');
         const q = query(usersRef, where('email', '==', cleanEmail));
         const qSnap = await getDocs(q);
         if (!qSnap.empty) {
           const userData = qSnap.docs[0].data() as UserProfile;
           return userData;
         }
       } catch (e) {
         console.warn("Falling back search by email", e);
       }
    }
    
    // Check tutors
    const tutors = handleFallback<UserProfile>('local_users_tutors', INITIAL_TUTORS);
    const tutorMatch = tutors.find(t => t.email.toLowerCase() === cleanEmail);
    if (tutorMatch) return tutorMatch;
    
    // Demo student
    if (cleanEmail === "alex.mercer@example.com") {
      return this.getUserProfile('student_demo');
    }
    
    // Demo admin
    if (cleanEmail === "admin.academy@example.com") {
      return this.getUserProfile('admin_demo');
    }
    
    // Dynamically registered users
    const registered = handleFallback<UserProfile>('local_registered_users', []);
    return registered.find(u => u.email.toLowerCase() === cleanEmail) || null;
  },

  async createUserProfile(uid: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    const fullProfile: UserProfile = {
      uid,
      email: profile.email || '',
      name: profile.name || 'Anonymous Student',
      displayName: profile.displayName || profile.name || '',
      role: profile.role || 'student',
      photoURL: profile.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${uid}`,
      pendingPhotoURL: profile.pendingPhotoURL || '',
      phone: profile.phone || '',
      address: profile.address || '',
      gender: profile.gender || 'male',
      guardianName: profile.guardianName || '',
      guardianPhone: profile.guardianPhone || '',
      selectedClasses: profile.selectedClasses || [],
      password: profile.password || '',
      username: profile.username || '',
      status: profile.status || (profile.role === 'student' ? 'pending' : 'approved'),
      createdAt: new Date().toISOString(),
      studentDetails: profile.role === 'student' ? {
        grade: profile.studentDetails?.grade || 'Grade 10',
        parentContact: profile.guardianPhone || profile.studentDetails?.parentContact || '',
        interests: profile.studentDetails?.interests || []
      } : undefined,
      tutorDetails: profile.role === 'tutor' ? {
        bio: profile.tutorDetails?.bio || 'Passionate education tutor ready to instruct.',
        subjects: profile.tutorDetails?.subjects || ['Science'],
        experience: profile.tutorDetails?.experience || 1,
        qualification: profile.tutorDetails?.qualification || 'Bachelor Degree',
        hourlyRate: profile.tutorDetails?.hourlyRate || 30,
        rating: 5.0,
        availability: profile.tutorDetails?.availability || [{ day: "Monday", slots: ["04:00 PM"] }]
      } : undefined
    };

    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'users', uid), fullProfile);
      } catch (e) {
        console.warn("Failed saving user online. Writing locally.", e);
      }
    }

    // Save locally
    const registered = handleFallback<UserProfile>('local_registered_users', []);
    const filteredReg = registered.filter(u => u.uid !== uid);
    filteredReg.push(fullProfile);
    saveFallback('local_registered_users', filteredReg);
    return fullProfile;
  },

  async updateTutorProfile(tutorId: string, data: Partial<UserProfile>): Promise<void> {
    if (isUsingCloud) {
      try {
        await updateDoc(doc(db, 'users', tutorId), data);
        return;
      } catch (e) {
        console.warn("Failed to update profile online. Saving local fallback.", e);
      }
    }
    
    // Fallback for demo tutors or registered tutors
    const tutors = handleFallback<UserProfile>('local_users_tutors', INITIAL_TUTORS);
    const updatedTutors = tutors.map(t => t.uid === tutorId ? { ...t, ...data } : t);
    saveFallback('local_users_tutors', updatedTutors);

    const registered = handleFallback<UserProfile>('local_registered_users', []);
    const updatedReg = registered.map(u => u.uid === tutorId ? { ...u, ...data } : u);
    saveFallback('local_registered_users', updatedReg);
  },

  async changeUserPassword(email: string, newPass: string): Promise<boolean> {
    if (isUsingCloud) {
       try {
         const snap = await getDocs(collection(db, 'users'));
         const foundDoc = snap.docs.find(d => (d.data().email || '').toLowerCase() === email.toLowerCase());
         if (foundDoc) {
           await updateDoc(doc(db, 'users', foundDoc.id), { 
             password: newPass,
             isPasswordResetRequired: false 
           });
           return true;
         }
       } catch (e) {
         console.warn("Failed updating password online.", e);
       }
    }
    const registered = handleFallback<UserProfile>('local_registered_users', []);
    const matchIdx = registered.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (matchIdx !== -1) {
      registered[matchIdx].password = newPass;
      registered[matchIdx].isPasswordResetRequired = false;
      saveFallback('local_registered_users', registered);
      return true;
    }
    const overridesJSON = localStorage.getItem('local_password_overrides');
    const overrides = overridesJSON ? JSON.parse(overridesJSON) : {};
    overrides[email.toLowerCase()] = newPass;
    try {
      localStorage.setItem('local_password_overrides', safeStringify(overrides));
    } catch (err) {
      console.warn("[safeStringify] Failed to save local_password_overrides", err);
    }
    return true;
  },

  async getAllUsers(): Promise<UserProfile[]> {
    let cloudUsers: UserProfile[] = [];
    if (isUsingCloud) {
      try {
        const snap = await getDocs(collection(db, 'users'));
        cloudUsers = snap.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            uid: doc.id
          } as UserProfile;
        });
      } catch (e) {
        console.warn("Fallback to local users list in getAllUsers", e);
      }
    }

    const tutors = handleFallback<UserProfile>('local_users_tutors', INITIAL_TUTORS);
    const registered = handleFallback<UserProfile>('local_registered_users', []);
    
    // Add mock student and admin
    const demoStudent = await this.getUserProfile('student_demo');
    const demoAdmin = await this.getUserProfile('admin_demo');
    
    const userMap = new Map<string, UserProfile>();
    tutors.forEach(u => userMap.set(u.uid, u));
    registered.forEach(u => userMap.set(u.uid, u));
    if (demoStudent) userMap.set(demoStudent.uid, demoStudent);
    if (demoAdmin) userMap.set(demoAdmin.uid, demoAdmin);
    
    cloudUsers.forEach(u => userMap.set(u.uid, u));
    
    const mergedList = Array.from(userMap.values());
    
    if (cloudUsers.length > 0) {
      const updatedReg = mergedList.filter(u => u.uid !== 'student_demo' && u.uid !== 'admin_demo' && !INITIAL_TUTORS.some(t => t.uid === u.uid));
      saveFallback('local_registered_users', updatedReg);
    }
    
    return mergedList;
  },

  // -------------------------------------------------------------
  // CLASSES
  // -------------------------------------------------------------
  async getClasses(): Promise<ClassItem[]> {
    let cloudClasses: ClassItem[] = [];
    if (isUsingCloud) {
      try {
        const snap = await getDocs(collection(db, 'classes'));
        cloudClasses = snap.docs.map(doc => doc.data() as ClassItem);
      } catch (e) {
        console.warn("Fallback classes loading.", e);
      }
    }
    const localClasses = handleFallback<ClassItem>('local_classes', INITIAL_CLASSES);
    const classMap = new Map<string, ClassItem>();
    localClasses.forEach(c => classMap.set(c.id, c));
    cloudClasses.forEach(c => classMap.set(c.id, c));
    const mergedList = Array.from(classMap.values());

    if (cloudClasses.length > 0) {
      saveFallback('local_classes', mergedList);
    }
    return mergedList;
  },

  async createNewClass(classData: Omit<ClassItem, 'id'>): Promise<ClassItem> {
    const id = "class_" + Math.random().toString(36).substr(2, 9);
    const newItem: ClassItem = { ...classData, id };

    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'classes', id), newItem);
      } catch (e) {
        console.warn("Writing class locally instead.", e);
      }
    }

    const items = handleFallback<ClassItem>('local_classes', INITIAL_CLASSES);
    const existingIndex = items.findIndex(c => c.id === id);
    if (existingIndex === -1) {
      items.push(newItem);
      saveFallback('local_classes', items);
    }
    return newItem;
  },

  async updateClassBookingsCount(classId: string, incrementValue: number): Promise<void> {
    if (isUsingCloud) {
      try {
        await updateDoc(doc(db, 'classes', classId), {
          bookedSlots: increment(incrementValue)
        });
        return;
      } catch (e) {
        console.warn("Fallback booking count increment", e);
      }
    }

    const items = handleFallback<ClassItem>('local_classes', INITIAL_CLASSES);
    const updated = items.map(c => 
      c.id === classId 
        ? { ...c, bookedSlots: Math.max(0, Math.min(c.maxSlots, c.bookedSlots + incrementValue)) } 
        : c
    );
    saveFallback('local_classes', updated);
  },

  // -------------------------------------------------------------
  // BOOKINGS / ENROLLMENTS
  // -------------------------------------------------------------
  async getBookings(): Promise<Booking[]> {
    let cloudBookings: Booking[] = [];
    if (isUsingCloud) {
       try {
         const snap = await getDocs(collection(db, 'bookings'));
         cloudBookings = snap.docs.map(doc => doc.data() as Booking);
       } catch (e) {
         console.warn("Fallback reading bookings.", e);
       }
    }
    const localBookings = handleFallback<Booking>('local_bookings', INITIAL_BOOKINGS);
    const bookingMap = new Map<string, Booking>();
    localBookings.forEach(b => bookingMap.set(b.id, b));
    cloudBookings.forEach(b => bookingMap.set(b.id, b));
    const mergedList = Array.from(bookingMap.values());

    if (cloudBookings.length > 0) {
      saveFallback('local_bookings', mergedList);
    }
    return mergedList;
  },

  async bookClass(studentId: string, studentName: string, classItem: ClassItem): Promise<Booking> {
    const id = "booking_" + Math.random().toString(36).substr(2, 9);
    const newBooking: Booking = {
      id,
      studentId,
      studentName,
      classId: classItem.id,
      classTitle: classItem.title,
      tutorId: classItem.tutorId,
      tutorName: classItem.tutorName,
      dayOfWeek: classItem.dayOfWeek,
      timeSlot: classItem.timeSlot,
      bookingDate: new Date().toISOString(),
      status: 'active'
    };

    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'bookings', id), newBooking);
      } catch (e) {
        console.warn("Fallback booking creation", e);
      }
    }

    const bookings = handleFallback<Booking>('local_bookings', INITIAL_BOOKINGS);
    bookings.push(newBooking);
    saveFallback('local_bookings', bookings);
    await this.updateClassBookingsCount(classItem.id, 1);
    return newBooking;
  },

  async cancelBooking(bookingId: string, classId: string): Promise<void> {
    if (isUsingCloud) {
      try {
        await updateDoc(doc(db, 'bookings', bookingId), { status: 'cancelled' });
      } catch (e) {
        console.warn("Fallback cancel booking", e);
      }
    }

    const bookings = handleFallback<Booking>('local_bookings', INITIAL_BOOKINGS);
    const updated = bookings.map(b => b.id === bookingId ? { ...b, status: 'cancelled' as const } : b);
    saveFallback('local_bookings', updated);
    await this.updateClassBookingsCount(classId, -1);
  },

  // -------------------------------------------------------------
  // PAYMENTS
  // -------------------------------------------------------------
  async getPayments(): Promise<Payment[]> {
    let cloudPayments: Payment[] = [];
    if (isUsingCloud) {
       try {
         const snap = await getDocs(collection(db, 'payments'));
         cloudPayments = snap.docs.map(doc => {
           const data = doc.data();
           return {
             ...data,
             id: doc.id
           } as Payment;
         });
       } catch (e) {
         console.warn("Fallback read payments.", e);
       }
    }
    const localPayments = handleFallback<Payment>('local_payments', INITIAL_PAYMENTS);
    const payMap = new Map<string, Payment>();
    localPayments.forEach(p => payMap.set(p.id, p));
    cloudPayments.forEach(p => payMap.set(p.id, p));
    const mergedList = Array.from(payMap.values());

    if (cloudPayments.length > 0) {
      saveFallback('local_payments', mergedList);
    }
    return mergedList;
  },

  async createPayment(studentId: string, studentName: string, classId: string, classTitle: string, amount: number, paymentMethod: string, status: 'paid' | 'pending' | 'failed' = 'paid'): Promise<Payment> {
    const id = "pay_" + Math.random().toString(36).substr(2, 9);
    const newPay: Payment = {
      id,
      studentId,
      studentName,
      classId,
      classTitle,
      amount,
      date: new Date().toISOString(),
      status,
      paymentMethod
    };

    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'payments', id), newPay);
      } catch (e) {
        console.warn("Fallback creating payment locally", e);
      }
    }

    const payments = handleFallback<Payment>('local_payments', INITIAL_PAYMENTS);
    const existingIndex = payments.findIndex(p => p.id === id);
    if (existingIndex === -1) {
      payments.push(newPay);
      saveFallback('local_payments', payments);
    }
    return newPay;
  },

  async updatePaymentStatus(id: string, status: 'paid' | 'pending' | 'failed'): Promise<void> {
    if (isUsingCloud) {
      try {
        await updateDoc(doc(db, 'payments', id), { status });
      } catch (e) {
        console.warn("Failed online payment state change", e);
      }
    }

    const payments = handleFallback<Payment>('local_payments', INITIAL_PAYMENTS);
    const updated = payments.map(p => p.id === id ? { ...p, status } : p);
    saveFallback('local_payments', updated);
  },

  // -------------------------------------------------------------
  // NOTIFICATIONS
  // -------------------------------------------------------------
  async getNotifications(userId: string): Promise<NotificationItem[]> {
    let cloudNotifications: NotificationItem[] = [];
    if (isUsingCloud) {
      try {
        const qRef = query(collection(db, 'notifications'), where('userId', '==', userId));
        const snap = await getDocs(qRef);
        cloudNotifications = snap.docs.map(doc => doc.data() as NotificationItem);
      } catch (e) {
        console.warn("Fallback matching client notifications for " + userId, e);
      }
    }

    const localNots = handleFallback<NotificationItem>('local_notifications', INITIAL_NOTIFICATIONS);
    const notMap = new Map<string, NotificationItem>();
    localNots.forEach(n => notMap.set(n.id, n));
    cloudNotifications.forEach(n => notMap.set(n.id, n));
    const mergedList = Array.from(notMap.values());

    if (cloudNotifications.length > 0) {
      saveFallback('local_notifications', mergedList);
    }

    return mergedList.filter(n => n.userId === userId || n.userId === 'all');
  },

  async triggerNotification(userId: string, title: string, message: string, type: 'reminder' | 'payment' | 'announcement' | 'message'): Promise<NotificationItem> {
    const id = "not_" + Math.random().toString(36).substr(2, 9);
    const newNot: NotificationItem = {
      id,
      userId,
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'notifications', id), newNot);
      } catch (e) {
        console.warn("Fallback triggers local notification alert", e);
      }
    }

    const list = handleFallback<NotificationItem>('local_notifications', INITIAL_NOTIFICATIONS);
    const existingIndex = list.findIndex(n => n.id === id);
    if (existingIndex === -1) {
      list.unshift(newNot); // trigger to top
      saveFallback('local_notifications', list);
    }
    return newNot;
  },

  async markNotificationRead(id: string): Promise<void> {
    if (isUsingCloud) {
      try {
        await updateDoc(doc(db, 'notifications', id), { isRead: true });
        return;
      } catch (e) {
        console.warn("Offline fallback read status toggle", e);
      }
    }

    const list = handleFallback<NotificationItem>('local_notifications', INITIAL_NOTIFICATIONS);
    const updated = list.map(n => n.id === id ? { ...n, isRead: true } : n);
    saveFallback('local_notifications', updated);
  },

  // -------------------------------------------------------------
  // REAL MESSAGES (FEEDBACK/CHAT)
  // -------------------------------------------------------------
  async getDirectMessages(userId1: string, userId2: string): Promise<DirectMessage[]> {
    let cloudMessages: DirectMessage[] = [];
    if (isUsingCloud) {
      try {
        const snap = await getDocs(collection(db, 'messages'));
        cloudMessages = snap.docs.map(doc => doc.data() as DirectMessage);
      } catch (e) {
        console.warn("Fallback loader messages.", e);
      }
    }

    const localMsgs = handleFallback<DirectMessage>('local_messages', INITIAL_MESSAGES);
    const messageMap = new Map<string, DirectMessage>();
    localMsgs.forEach(m => messageMap.set(m.id, m));
    cloudMessages.forEach(m => messageMap.set(m.id, m));
    const mergedList = Array.from(messageMap.values());

    if (cloudMessages.length > 0) {
      saveFallback('local_messages', mergedList);
    }

    return mergedList
      .filter(m => 
        (m.senderId === userId1 && m.receiverId === userId2) || 
        (m.senderId === userId2 && m.receiverId === userId1)
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  async sendDirectMessage(senderId: string, senderName: string, receiverId: string, messageText: string): Promise<DirectMessage> {
    const id = "msg_" + Math.random().toString(36).substr(2, 9);
    const newMsg: DirectMessage = {
      id,
      senderId,
      senderName,
      receiverId,
      message: messageText,
      createdAt: new Date().toISOString()
    };

    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'messages', id), newMsg);
        await this.triggerNotification(
          receiverId, 
          `New message from ${senderName}`, 
          messageText.length > 50 ? `${messageText.substr(0, 50)}...` : messageText, 
          'message'
        );
      } catch (e) {
        console.warn("Fallback messaging client update failed in Firestore", e);
      }
    }

    const list = handleFallback<DirectMessage>('local_messages', INITIAL_MESSAGES);
    const existingIndex = list.findIndex(m => m.id === id);
    if (existingIndex === -1) {
      list.push(newMsg);
      saveFallback('local_messages', list);
    }

    await this.triggerNotification(
      receiverId, 
      `New message from ${senderName}`, 
      messageText.length > 50 ? `${messageText.substr(0, 50)}...` : messageText, 
      'message'
    );
    return newMsg;
  },

  async deleteUserProfile(uid: string): Promise<void> {
    if (isUsingCloud) {
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch (e) {
        console.warn("Failed to delete user profile from Firestore.", e);
      }
    }
    const tutors = handleFallback<UserProfile>('local_users_tutors', INITIAL_TUTORS);
    const filteredTutors = tutors.filter(t => t.uid !== uid);
    saveFallback('local_users_tutors', filteredTutors);

    const registered = handleFallback<UserProfile>('local_registered_users', []);
    const filteredReg = registered.filter(u => u.uid !== uid);
    saveFallback('local_registered_users', filteredReg);
  },

  async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    if (isUsingCloud) {
      try {
        await updateDoc(doc(db, 'users', uid), data);
      } catch (e) {
        console.warn("Failed to update user profile in Firestore.", e);
      }
    }
    const tutors = handleFallback<UserProfile>('local_users_tutors', INITIAL_TUTORS);
    const updatedTutors = tutors.map(t => t.uid === uid ? { ...t, ...data } : t);
    saveFallback('local_users_tutors', updatedTutors);

    const registered = handleFallback<UserProfile>('local_registered_users', []);
    const updatedReg = registered.map(u => u.uid === uid ? { ...u, ...data } : u);
    saveFallback('local_registered_users', updatedReg);
  },

  async updateClass(classId: string, data: Partial<ClassItem>): Promise<void> {
    if (isUsingCloud) {
      try {
        await updateDoc(doc(db, 'classes', classId), data);
      } catch (e) {
        console.warn("Failed to update class in Firestore.", e);
      }
    }
    const items = handleFallback<ClassItem>('local_classes', INITIAL_CLASSES);
    const updated = items.map(c => c.id === classId ? { ...c, ...data } : c);
    saveFallback('local_classes', updated);
  },

  async deleteClass(classId: string): Promise<void> {
    if (isUsingCloud) {
      try {
        await deleteDoc(doc(db, 'classes', classId));
      } catch (e) {
        console.warn("Failed to delete class from Firestore.", e);
      }
    }
    const items = handleFallback<ClassItem>('local_classes', INITIAL_CLASSES);
    const filtered = items.filter(c => c.id !== classId);
    saveFallback('local_classes', filtered);
  },

  async updatePayment(paymentId: string, data: Partial<Payment>): Promise<void> {
    if (isUsingCloud) {
      try {
        await updateDoc(doc(db, 'payments', paymentId), data);
      } catch (e) {
        console.warn("Failed to update payment in Firestore.", e);
      }
    }
    const payments = handleFallback<Payment>('local_payments', INITIAL_PAYMENTS);
    const updated = payments.map(p => p.id === paymentId ? { ...p, ...data } : p);
    saveFallback('local_payments', updated);
  },

  async deletePayment(paymentId: string): Promise<void> {
    if (isUsingCloud) {
      try {
        await deleteDoc(doc(db, 'payments', paymentId));
      } catch (e) {
        console.warn("Failed to delete payment from Firestore.", e);
      }
    }
    const payments = handleFallback<Payment>('local_payments', INITIAL_PAYMENTS);
    const filtered = payments.filter(p => p.id !== paymentId);
    saveFallback('local_payments', filtered);
  },

  // -------------------------------------------------------------
  // REVIEWS & RATINGS
  // -------------------------------------------------------------
  async getReviews(): Promise<Review[]> {
    let cloudReviews: Review[] = [];
    if (isUsingCloud) {
      try {
        const snap = await getDocs(collection(db, 'reviews'));
        cloudReviews = snap.docs.map(doc => doc.data() as Review);
      } catch (e) {
        console.warn("Fallback reading reviews.", e);
      }
    }
    const localReviews = handleFallback<Review>('local_reviews', INITIAL_REVIEWS);
    const reviewMap = new Map<string, Review>();
    localReviews.forEach(r => reviewMap.set(r.id, r));
    cloudReviews.forEach(r => reviewMap.set(r.id, r));
    const mergedList = Array.from(reviewMap.values());

    if (cloudReviews.length > 0) {
      saveFallback('local_reviews', mergedList);
    }
    return mergedList;
  },

  async createReview(reviewData: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
    const id = "review_" + Math.random().toString(36).substr(2, 9);
    const newReview: Review = {
      ...reviewData,
      id,
      createdAt: new Date().toISOString()
    };

    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'reviews', id), newReview);
        
        await this.triggerNotification(
          'admin_demo',
          'New Review Submitted',
          `${newReview.studentName} left a ${newReview.rating}-star review for ${newReview.classTitle || newReview.tutorName}. Needs approval.`,
          'announcement'
        );
      } catch (e) {
        console.warn("Fallback creating review", e);
      }
    }

    const reviews = handleFallback<Review>('local_reviews', INITIAL_REVIEWS);
    reviews.push(newReview);
    saveFallback('local_reviews', reviews);

    // Also trigger admin notification locally
    await this.triggerNotification(
      'admin_demo',
      'New Review Submitted',
      `${newReview.studentName} left a ${newReview.rating}-star review for ${newReview.classTitle || newReview.tutorName}. Needs approval.`,
      'announcement'
    );

    return newReview;
  },

  async updateReviewStatus(reviewId: string, status: 'approved' | 'rejected' | 'flagged'): Promise<void> {
    if (isUsingCloud) {
      try {
        await updateDoc(doc(db, 'reviews', reviewId), { status });
      } catch (e) {
        console.warn("Fallback updating review status", e);
      }
    }

    const reviews = handleFallback<Review>('local_reviews', INITIAL_REVIEWS);
    const updated = reviews.map(r => r.id === reviewId ? { ...r, status } : r);
    saveFallback('local_reviews', updated);
  },

  async deleteReview(reviewId: string): Promise<void> {
    if (isUsingCloud) {
      try {
        await deleteDoc(doc(db, 'reviews', reviewId));
      } catch (e) {
        console.warn("Failed to delete review from Firestore.", e);
      }
    }
    const reviews = handleFallback<Review>('local_reviews', INITIAL_REVIEWS);
    const filtered = reviews.filter(r => r.id !== reviewId);
    saveFallback('local_reviews', filtered);
  }
};

export const firestoreService = new Proxy(firestoreServiceRaw, {
  get(target: any, prop: string | symbol, receiver: any) {
    syncCloudFlag();
    return Reflect.get(target, prop, receiver);
  }
});
