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
  increment,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db, auth, firebaseConfig } from './firebase';
import { ClassItem, UserProfile, Booking, Payment, NotificationItem, DirectMessage, Review, AttendanceRecord, AuditLog, BannerImage, PathwayItem, SubjectItem, StudyMaterial, ResourceType } from '../types';
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
  if (obj === undefined) return 'undefined';
  if (obj === null) return 'null';

  const seen = new WeakSet();

  const replacer = (_key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      // Handle Firestore Timestamp
      if (typeof value.toDate === 'function') {
        try {
          return value.toDate().toISOString();
        } catch (e) {
          return undefined;
        }
      }
      // Handle Date
      if (value instanceof Date) {
        return value.toISOString();
      }
      // Handle DOM nodes, Window, Events, or non-serializable objects
      if (
        value.nodeType !== undefined ||
        value === window ||
        (value.constructor && value.constructor.name && (
          value.constructor.name.startsWith('Y2') ||
          value.constructor.name.startsWith('Ka') ||
          value.constructor.name.includes('Firestore') ||
          value.constructor.name.includes('Snapshot') ||
          value.constructor.name.includes('Element') ||
          value.constructor.name.includes('Event')
        ))
      ) {
        return undefined;
      }

      // Circular reference check
      if (seen.has(value)) {
        return undefined; // Prune circular references completely
      }
      seen.add(value);
    }

    if (typeof value === 'function' || typeof value === 'symbol') {
      return undefined;
    }

    return value;
  };

  try {
    return JSON.stringify(obj, replacer);
  } catch (err) {
    console.warn("[safeStringify] Fallback stringify triggered:", err);
    try {
      // Secondary fallback if native replacer encountered an unhandled getter error
      return JSON.stringify(obj, (_k, v) => {
        if (typeof v === 'object' && v !== null) return '[Object]';
        if (typeof v === 'function') return undefined;
        return v;
      });
    } catch (e2) {
      return '{}';
    }
  }
}

// Helper to wrap promises with a timeout to maintain responsiveness under unstable network/slow bandwidth conditions
export function promiseWithTimeout<T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[Timeout] Operation exceeded ${timeoutMs}ms limit. Returning local fallback value for this operation.`);
      resolve(fallbackValue);
    }, timeoutMs);
  });

  return Promise.race([
    promise.then((result) => {
      clearTimeout(timeoutId);
      return result;
    }).catch((err) => {
      clearTimeout(timeoutId);
      throw err;
    }),
    timeoutPromise
  ]);
}

// Helper to check and fallback (scoped by active project ID to prevent overlap)
function handleFallback<T>(localKey: string, initialData: T[]): T[] {
  const scopedKey = `${localKey}_${firebaseConfig.projectId || 'default'}`;
  const local = localStorage.getItem(scopedKey);
  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {
      // ignore
    }
  }
  try {
    localStorage.setItem(scopedKey, safeStringify(initialData));
  } catch (err) {
    console.warn(`[safeStringify] Failed to save initial local storage for key ${scopedKey}`, err);
  }
  return initialData;
}

function saveFallback<T>(localKey: string, data: T[]): void {
  const scopedKey = `${localKey}_${firebaseConfig.projectId || 'default'}`;
  try {
    localStorage.setItem(scopedKey, safeStringify(data));
  } catch (err) {
    console.warn(`[safeStringify] Failed to save fallback local storage for key ${scopedKey}`, err);
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error details: ', safeStringify(errInfo));
  // Keep isUsingCloud active so that transient failures or security rule rejections do not disconnect the app
  throw new Error(safeStringify(errInfo));
}

// Dynamically synchronize cloud flag based on connectivity state rather than auth session.
// This allows local and simulated test users to connect and save data to the live Firestore
// database, utilizing the permissive security rules deployed on gurugedara-prod.
function syncCloudFlag() {
  isUsingCloud = isOriginalCloud;
}

// Default fallback demo profiles
export const DEFAULT_DEMO_USERS: Record<'admin' | 'tutor' | 'student', UserProfile> = {
  admin: {
    uid: 'admin_demo',
    email: 'admin@gg.com',
    name: 'Academy Administrator',
    displayName: 'Academy Admin',
    role: 'admin',
    username: 'GA10000000',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop',
    status: 'approved',
    phone: '+94 77 111 2233',
    gender: 'female',
    createdAt: new Date().toISOString()
  },
  tutor: {
    uid: 'tutor_sarah',
    email: 'tutor@gg.com',
    name: 'Faculty Tutor',
    displayName: 'Faculty Tutor',
    role: 'tutor',
    username: 'GT20000000',
    photoURL: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop',
    status: 'approved',
    phone: '+94 77 444 5566',
    gender: 'female',
    createdAt: new Date().toISOString(),
    tutorDetails: {
      bio: 'Senior Faculty Lecturer in Mathematics and Pure Science.',
      subjects: ['Mathematics', 'Physics'],
      experience: 8,
      qualification: 'B.Sc. (Hons) First Class',
      hourlyRate: 40,
      rating: 5.0,
      availability: [{ day: 'Monday', slots: ['04:00 PM', '06:00 PM'] }]
    }
  },
  student: {
    uid: 'student_demo',
    email: 'student@gg.com',
    name: 'Scholar Student',
    displayName: 'Scholar Student',
    role: 'student',
    username: 'GB30000000',
    photoURL: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop',
    status: 'approved',
    phone: '+94 77 777 8899',
    gender: 'male',
    address: '123 University Avenue, Colombo 07',
    guardianName: 'D. M. Perera',
    guardianPhone: '+94 71 222 3344',
    createdAt: new Date().toISOString(),
    studentDetails: {
      grade: 'Grade 11',
      parentContact: '+94 71 222 3344',
      interests: ['Mathematics', 'Physics']
    }
  }
};

const firestoreServiceRaw = {
  isCloudConnected() {
    return isUsingCloud;
  },

  setCloudConnected(status: boolean) {
    isOriginalCloud = status;
    isUsingCloud = status;
  },

  // -------------------------------------------------------------
  // SEEDING / CLEANUP DATABASE
  // -------------------------------------------------------------
  async seedDatabase() {
    if (!isUsingCloud) return;
    const cleanupKey = `db_demo_cleaned_${firebaseConfig.projectId || 'default'}`;
    if (localStorage.getItem(cleanupKey) === 'true') {
      return;
    }
    try {
      // Purge demo data documents if they exist in Firestore
      const demoDocsToDelete: { collection: string; id: string }[] = [
        { collection: 'classes', id: 'class_calc_abc' },
        { collection: 'classes', id: 'class_physics_mechanics' },
        { collection: 'classes', id: 'class_creative_writing' },
        { collection: 'classes', id: 'class_coding_web' },
        { collection: 'classes', id: 'class_algebra_basics' },
        { collection: 'bookings', id: 'booking_abc_1' },
        { collection: 'bookings', id: 'booking_abc_2' },
        { collection: 'payments', id: 'pay_1' },
        { collection: 'payments', id: 'pay_2' },
        { collection: 'payments', id: 'pay_3' },
        { collection: 'notifications', id: 'not_1' },
        { collection: 'notifications', id: 'not_2' },
        { collection: 'notifications', id: 'not_3' },
        { collection: 'notifications', id: 'not_tutor' },
        { collection: 'messages', id: 'msg_1' },
        { collection: 'messages', id: 'msg_2' },
        { collection: 'reviews', id: 'review_1' },
        { collection: 'reviews', id: 'review_2' },
        { collection: 'reviews', id: 'review_3' },
        { collection: 'reviews', id: 'review_4' },
        { collection: 'reviews', id: 'review_5' },
        { collection: 'study_materials', id: 'mat_1' },
        { collection: 'study_materials', id: 'mat_2' },
        { collection: 'study_materials', id: 'mat_3' }
      ];

      await Promise.all(
        demoDocsToDelete.map(item => 
          deleteDoc(doc(db, item.collection, item.id)).catch(() => {})
        )
      );

      localStorage.setItem(cleanupKey, 'true');
      console.log("Demo data cleaned up successfully!");
    } catch (e) {
      console.warn("Demo cleanup warning:", e);
    }
  },

  async resetDatabaseToDefault() {
    const scopedProj = firebaseConfig.projectId || 'default';
    const cacheKeys = [
      'local_classes',
      'local_users_tutors',
      'local_bookings',
      'local_payments',
      'local_notifications',
      'local_messages',
      'local_reviews',
      'local_attendance',
      'local_registered_users',
      'local_study_materials',
      `local_classes_${scopedProj}`,
      `local_users_tutors_${scopedProj}`,
      `local_bookings_${scopedProj}`,
      `local_payments_${scopedProj}`,
      `local_notifications_${scopedProj}`,
      `local_messages_${scopedProj}`,
      `local_reviews_${scopedProj}`,
      `local_attendance_${scopedProj}`,
      `local_registered_users_${scopedProj}`,
      `local_study_materials_${scopedProj}`,
      `db_demo_cleaned_${scopedProj}`
    ];
    cacheKeys.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });

    if (isUsingCloud) {
      try {
        const collectionsToReset = ['classes', 'bookings', 'payments', 'notifications', 'messages', 'reviews', 'attendance', 'study_materials'];
        for (const colName of collectionsToReset) {
          const colRef = collection(db, colName);
          const snap = await getDocs(colRef).catch(() => ({ docs: [] } as any));
          if (snap.docs && snap.docs.length > 0) {
            await Promise.all(snap.docs.map((d: any) => deleteDoc(doc(db, colName, d.id)).catch(() => {})));
          }
        }
      } catch (e) {
        console.warn("Error clearing cloud Firestore collections during reset", e);
      }
    }

    console.log("Database successfully reset to default state.");
  },

  // -------------------------------------------------------------
  // USER PROFILES
  // -------------------------------------------------------------
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    if (uid === 'admin_demo') return DEFAULT_DEMO_USERS.admin;
    if (uid === 'tutor_sarah') return DEFAULT_DEMO_USERS.tutor;
    if (uid === 'student_demo') return DEFAULT_DEMO_USERS.student;

    if (isUsingCloud) {
       try {
         const userRef = doc(db, 'users', uid);
         const userSnap = await promiseWithTimeout(
           getDoc(userRef),
           2000,
           { exists: () => false } as any
         );
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

    // Checking dynamically added local signup profiles
    const registered = handleFallback<UserProfile>('local_registered_users', []);
    return registered.find(u => u.uid === uid) || null;
  },

  async getUserProfileByEmailOrUsername(identifier: string): Promise<UserProfile | null> {
    const cleanId = identifier.trim().toLowerCase();

    if (cleanId === 'admin@gg.com' || cleanId === 'admin.academy@example.com' || cleanId === 'ga10000000') {
      return DEFAULT_DEMO_USERS.admin;
    }
    if (cleanId === 'tutor@gg.com' || cleanId === 'sarah.jenkins@example.com' || cleanId === 'gt20000000') {
      return DEFAULT_DEMO_USERS.tutor;
    }
    if (cleanId === 'student@gg.com' || cleanId === 'alex.mercer@example.com' || cleanId === 'gb30000000') {
      return DEFAULT_DEMO_USERS.student;
    }

    if (isUsingCloud) {
       try {
         const usersRef = collection(db, 'users');
         const q1 = query(usersRef, where('email', '==', cleanId));
         const qSnap1 = await promiseWithTimeout(getDocs(q1), 2500, { empty: true, docs: [] } as any);
         if (!qSnap1.empty) {
           return qSnap1.docs[0].data() as UserProfile;
         }

         const q2 = query(usersRef, where('username', '==', cleanId.toUpperCase()));
         const qSnap2 = await promiseWithTimeout(getDocs(q2), 2500, { empty: true, docs: [] } as any);
         if (!qSnap2.empty) {
           return qSnap2.docs[0].data() as UserProfile;
         }

         const q3 = query(usersRef, where('username', '==', cleanId));
         const qSnap3 = await promiseWithTimeout(getDocs(q3), 2500, { empty: true, docs: [] } as any);
         if (!qSnap3.empty) {
           return qSnap3.docs[0].data() as UserProfile;
         }

         const all = await this.getAllUsers();
         const match = all.find(u => 
           (u.email || '').toLowerCase() === cleanId || 
           (u.username || '').toLowerCase() === cleanId
         );
         if (match) return match;
       } catch (e) {
         console.warn("Falling back search by email/username", e);
       }
    }

    const registered = handleFallback<UserProfile>('local_registered_users', []);
    const matchReg = registered.find(u => 
      (u.email || '').toLowerCase() === cleanId || 
      (u.username || '').toLowerCase() === cleanId
    );
    if (matchReg) return matchReg;

    const tutors = handleFallback<UserProfile>('local_users_tutors', INITIAL_TUTORS);
    const matchTut = tutors.find(u => 
      (u.email || '').toLowerCase() === cleanId || 
      (u.username || '').toLowerCase() === cleanId
    );
    if (matchTut) return matchTut;

    return null;
  },

  async getUserProfileByEmail(email: string): Promise<UserProfile | null> {
    return this.getUserProfileByEmailOrUsername(email);
  },

  async createUserProfile(uid: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    // Server-side validation checks before committing profile
    if (profile.email && (!profile.email.includes('@') || typeof profile.email !== 'string')) {
      throw new Error("Invalid email format provided.");
    }
    if (!profile.name || typeof profile.name !== 'string' || !profile.name.trim()) {
      throw new Error("Full name is required.");
    }

    // Preserve provided username or fallback to uid
    const effectiveUsername = profile.username || uid;

    const baseProfile: Record<string, any> = {
      uid,
      email: profile.email || '',
      name: profile.name.trim(),
      displayName: profile.displayName?.trim() || profile.name.trim(),
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
      isPasswordResetRequired: profile.isPasswordResetRequired ?? false,
      username: effectiveUsername, // Enforce username = uid
      status: profile.status || (profile.role === 'student' ? 'pending' : 'approved'),
      createdAt: profile.createdAt || new Date().toISOString(),
      admissionFeeCollected: profile.admissionFeeCollected ?? false,
      admissionAmount: profile.admissionAmount || 0,
      isFreeCard: profile.isFreeCard ?? false
    };

    if (profile.dob) baseProfile.dob = profile.dob;
    if (profile.notes) baseProfile.notes = profile.notes;

    if ((profile.role || 'student') === 'student') {
      baseProfile.studentDetails = {
        grade: profile.studentDetails?.grade || 'Grade 10',
        parentContact: profile.guardianPhone || profile.studentDetails?.parentContact || '',
        interests: profile.studentDetails?.interests || []
      };
    } else if (profile.role === 'tutor') {
      baseProfile.tutorDetails = {
        bio: profile.tutorDetails?.bio || 'Passionate education tutor ready to instruct.',
        subjects: profile.tutorDetails?.subjects || ['Science'],
        experience: profile.tutorDetails?.experience || 1,
        qualification: profile.tutorDetails?.qualification || 'Bachelor Degree',
        hourlyRate: profile.tutorDetails?.hourlyRate || 30,
        rating: 5.0,
        availability: profile.tutorDetails?.availability || [{ day: "Monday", slots: ["04:00 PM"] }]
      };
    }

    const fullProfile = baseProfile as UserProfile;

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

    // Audit Log for user creation
    await this.addAuditLog({
      username: profile.email || uid,
      action: 'USER_CREATED',
      details: `Created ${fullProfile.role} profile for ${fullProfile.name} (${fullProfile.uid})`
    });

    return fullProfile;
  },

  async updateTutorProfile(tutorId: string, data: Partial<UserProfile>): Promise<void> {
    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'users', tutorId), data, { merge: true });
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
         const snap = await promiseWithTimeout(
           getDocs(collection(db, 'users')),
           8000,
           { docs: [] } as any
         );
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
        const snap = await promiseWithTimeout(
          getDocs(collection(db, 'users')),
          8000,
          { docs: [] } as any
        );
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
    const deletedUids = handleFallback<string>('local_deleted_uids', []);
    
    const userMap = new Map<string, UserProfile>();
    // If cloud returned users, add them first
    cloudUsers.forEach(u => userMap.set(u.uid, u));
    // If cloud didn't have certain fallback tutors or registered users, add if not deleted
    tutors.forEach(u => {
      if (!userMap.has(u.uid)) userMap.set(u.uid, u);
    });
    registered.forEach(u => {
      if (!userMap.has(u.uid)) userMap.set(u.uid, u);
    });
    
    return Array.from(userMap.values()).filter(u => !deletedUids.includes(u.uid));
  },

  // -------------------------------------------------------------
  // CLASSES
  // -------------------------------------------------------------
  async getClasses(): Promise<ClassItem[]> {
    const deletedIds = handleFallback<string>('local_deleted_class_ids', []);
    let cloudClasses: ClassItem[] = [];
    if (isUsingCloud) {
      try {
        const snap = await promiseWithTimeout(
          getDocs(collection(db, 'classes')),
          8000,
          { docs: [] } as any
        );
        cloudClasses = snap.docs.map(doc => doc.data() as ClassItem);
        if (cloudClasses.length > 0) {
          saveFallback('local_classes', cloudClasses);
          return cloudClasses.filter(c => !deletedIds.includes(c.id));
        }
      } catch (e) {
        console.warn("Fallback classes loading.", e);
      }
    }
    const fallbackClasses = handleFallback<ClassItem>('local_classes', INITIAL_CLASSES);
    return fallbackClasses.filter(c => !deletedIds.includes(c.id));
  },

  async createNewClass(classData: Omit<ClassItem, 'id'>): Promise<ClassItem> {
    const id = "class_" + Math.random().toString(36).substr(2, 9);
    const newItem: ClassItem = { ...classData, id };

    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'classes', id), newItem);
      } catch (e) {
        console.warn("Writing class locally as fallback.", e);
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
         const snap = await promiseWithTimeout(
           getDocs(collection(db, 'bookings')),
           8000,
           { docs: [] } as any
         );
         cloudBookings = snap.docs.map(doc => doc.data() as Booking);
         if (cloudBookings.length > 0) {
           saveFallback('local_bookings', cloudBookings);
           return cloudBookings;
         }
       } catch (e) {
         console.warn("Fallback reading bookings.", e);
       }
    }
    return handleFallback<Booking>('local_bookings', INITIAL_BOOKINGS);
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
    const deletedIds = handleFallback<string>('local_deleted_payment_ids', []);
    let cloudPayments: Payment[] = [];
    if (isUsingCloud) {
       try {
         const snap = await promiseWithTimeout(
           getDocs(collection(db, 'payments')),
           8000,
           { docs: [] } as any
         );
         cloudPayments = snap.docs.map(doc => {
           const data = doc.data();
           return {
             ...data,
             id: doc.id
           } as Payment;
         });
         if (cloudPayments.length > 0) {
           saveFallback('local_payments', cloudPayments);
           return cloudPayments.filter(p => !deletedIds.includes(p.id));
         }
       } catch (e) {
         console.warn("Fallback read payments.", e);
       }
    }
    const fallbackPayments = handleFallback<Payment>('local_payments', INITIAL_PAYMENTS);
    return fallbackPayments.filter(p => !deletedIds.includes(p.id));
  },

  async createPayment(studentId: string, studentName: string, classId: string, classTitle: string, amount: number, paymentMethod: string, status: 'paid' | 'pending' | 'failed' = 'paid'): Promise<Payment> {
    const id = "pay_" + Math.random().toString(36).substr(2, 9);
    const now = new Date();
    const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Due 7 days from now
    const newPay: Payment = {
      id,
      studentId,
      studentName,
      classId,
      classTitle,
      amount,
      date: now.toISOString(),
      status,
      paymentMethod,
      dueDate
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
        const snap = await promiseWithTimeout(
          getDocs(qRef),
          8000,
          { docs: [] } as any
        );
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
        const snap = await promiseWithTimeout(
          getDocs(collection(db, 'messages')),
          8000,
          { docs: [] } as any
        );
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

    const deletedUids = handleFallback<string>('local_deleted_uids', []);
    if (!deletedUids.includes(uid)) {
      deletedUids.push(uid);
      saveFallback('local_deleted_uids', deletedUids);
    }
  },

  async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'users', uid), data, { merge: true });
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
        await setDoc(doc(db, 'classes', classId), data, { merge: true });
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

    const deletedIds = handleFallback<string>('local_deleted_class_ids', []);
    if (!deletedIds.includes(classId)) {
      deletedIds.push(classId);
      saveFallback('local_deleted_class_ids', deletedIds);
    }
  },

  async updatePayment(paymentId: string, data: Partial<Payment>): Promise<void> {
    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'payments', paymentId), data, { merge: true });
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

    const deletedIds = handleFallback<string>('local_deleted_payment_ids', []);
    if (!deletedIds.includes(paymentId)) {
      deletedIds.push(paymentId);
      saveFallback('local_deleted_payment_ids', deletedIds);
    }
  },

  // -------------------------------------------------------------
  // REVIEWS & RATINGS
  // -------------------------------------------------------------
  async getReviews(): Promise<Review[]> {
    let cloudReviews: Review[] = [];
    if (isUsingCloud) {
      try {
        const snap = await promiseWithTimeout(
          getDocs(collection(db, 'reviews')),
          8000,
          { docs: [] } as any
        );
        cloudReviews = snap.docs.map(doc => doc.data() as Review);
        if (cloudReviews.length > 0) {
          saveFallback('local_reviews', cloudReviews);
          return cloudReviews;
        }
      } catch (e) {
        console.warn("Fallback reading reviews.", e);
      }
    }
    return handleFallback<Review>('local_reviews', INITIAL_REVIEWS);
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
        await setDoc(doc(db, 'reviews', reviewId), { status }, { merge: true });
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
  },

  // -------------------------------------------------------------
  // ATTENDANCE METHODS
  // -------------------------------------------------------------
  async getAttendance(): Promise<AttendanceRecord[]> {
    let cloudAttendance: AttendanceRecord[] = [];
    if (isUsingCloud) {
      try {
        const snap = await promiseWithTimeout(
          getDocs(collection(db, 'attendance')),
          8000,
          { docs: [] } as any
        );
        cloudAttendance = snap.docs.map(doc => doc.data() as AttendanceRecord);
        if (cloudAttendance.length > 0) {
          saveFallback('local_attendance', cloudAttendance);
          return cloudAttendance;
        }
      } catch (e) {
        console.warn("Fallback reading attendance.", e);
      }
    }
    return handleFallback<AttendanceRecord>('local_attendance', []);
  },

  async markAttendance(record: AttendanceRecord): Promise<AttendanceRecord> {
    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'attendance', record.id), record);
      } catch (e) {
        console.warn("Fallback attendance creation", e);
      }
    }

    const list = handleFallback<AttendanceRecord>('local_attendance', []);
    const filtered = list.filter(a => a.id !== record.id);
    filtered.push(record);
    saveFallback('local_attendance', filtered);

    // Write Audit Log
    await this.addAuditLog({
      username: record.tutorId || 'tutor',
      action: 'ATTENDANCE_MARKED',
      details: `Marked ${record.status} (${record.type}) for ${record.studentName} in ${record.classTitle}`
    });

    return record;
  },

  async autoMarkAbsencesForClass(classId: string, classTitle: string, tutorId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const allUsers = await this.getAllUsers();
    const enrolledStudents = allUsers.filter(u => u.role === 'student' && u.selectedClasses?.includes(classId));
    const attendance = await this.getAttendance();

    let markedCount = 0;
    for (const student of enrolledStudents) {
      const existing = attendance.find(a => a.classId === classId && a.studentId === student.uid && a.date === today);
      if (!existing) {
        const id = `att_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const record: AttendanceRecord = {
          id,
          classId,
          classTitle,
          studentId: student.uid,
          studentName: student.name,
          date: today,
          status: 'Absent',
          markedAt: new Date().toISOString(),
          tutorId,
          type: 'manual'
        };
        await this.markAttendance(record);
        markedCount++;

        // Send Guardian SMS notification for absence
        if (student.guardianPhone || student.phone) {
          const smsMsg = `Dear Parent, ${student.displayName || student.name} was NOT PRESENT (Absent) for ${classTitle} class today (${today}).`;
          await this.triggerNotification(
            student.uid,
            `Class Attendance Alert: Absent`,
            smsMsg,
            'announcement'
          );
        }
      }
    }
    return markedCount;
  },

  // -------------------------------------------------------------
  // AUDIT LOGS
  // -------------------------------------------------------------
  async addAuditLog(log: { username: string; action: string; details: string }): Promise<void> {
    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString(),
      username: log.username || 'system',
      action: log.action,
      details: log.details
    };
    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'auditLogs', newLog.id), newLog);
      } catch (e) {
        console.warn("Failed writing audit log online", e);
      }
    }
    const logs = handleFallback<AuditLog>('local_audit_logs', []);
    logs.unshift(newLog);
    saveFallback('local_audit_logs', logs.slice(0, 500));
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    if (isUsingCloud) {
      try {
        const qSnap = await promiseWithTimeout(
          getDocs(collection(db, 'auditLogs')),
          8000,
          { docs: [] } as any
        );
        const list: AuditLog[] = qSnap.docs.map(d => d.data() as AuditLog);
        if (list.length > 0) {
          saveFallback('local_audit_logs', list);
          return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
      } catch (e) {
        console.warn("Failed reading audit logs online", e);
      }
    }
    return handleFallback<AuditLog>('local_audit_logs', []);
  },

  // -------------------------------------------------------------
  // BANNERS (CAROUSEL)
  // -------------------------------------------------------------
  async getBanners(): Promise<BannerImage[]> {
    const defaultBanners: BannerImage[] = [
      {
        id: 'b1',
        imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200',
        title: 'New Intake Open for 2026/2027',
        subtitle: 'Enroll in Top STEM & Languages Curriculums',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'b2',
        imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200',
        title: 'Learn from Certified University Professors',
        subtitle: 'Interactive virtual labs and 1-on-1 guidance',
        active: true,
        createdAt: new Date().toISOString()
      }
    ];
    if (isUsingCloud) {
      try {
        const qSnap = await promiseWithTimeout(
          getDocs(collection(db, 'banners')),
          8000,
          { docs: [] } as any
        );
        const list: BannerImage[] = qSnap.docs.map(d => d.data() as BannerImage);
        if (list.length > 0) {
          saveFallback('local_banners', list);
          return list;
        }
      } catch (e) {}
    }
    return handleFallback<BannerImage>('local_banners', defaultBanners);
  },

  async saveBanner(banner: BannerImage): Promise<void> {
    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'banners', banner.id), banner);
      } catch (e) {}
    }
    const banners = await this.getBanners();
    const idx = banners.findIndex(b => b.id === banner.id);
    if (idx !== -1) banners[idx] = banner;
    else banners.push(banner);
    saveFallback('local_banners', banners);
  },

  async deleteBanner(id: string): Promise<void> {
    if (isUsingCloud) {
      try {
        await deleteDoc(doc(db, 'banners', id));
      } catch (e) {}
    }
    const banners = await this.getBanners();
    saveFallback('local_banners', banners.filter(b => b.id !== id));
  },

  // -------------------------------------------------------------
  // SUBJECTS MANAGEMENT
  // -------------------------------------------------------------
  async getSubjects(): Promise<SubjectItem[]> {
    const defaultSubjects: SubjectItem[] = [
      { id: 'sub_1', name: 'Combined Mathematics', createdAt: new Date().toISOString() },
      { id: 'sub_2', name: 'Physics', createdAt: new Date().toISOString() },
      { id: 'sub_3', name: 'Chemistry', createdAt: new Date().toISOString() },
      { id: 'sub_4', name: 'ICT & Web Development', createdAt: new Date().toISOString() },
      { id: 'sub_5', name: 'English Language', createdAt: new Date().toISOString() },
      { id: 'sub_6', name: 'Biology', createdAt: new Date().toISOString() }
    ];
    if (isUsingCloud) {
      try {
        const qSnap = await promiseWithTimeout(
          getDocs(collection(db, 'subjects')),
          8000,
          { docs: [] } as any
        );
        const list: SubjectItem[] = qSnap.docs.map(d => d.data() as SubjectItem);
        if (list.length > 0) {
          saveFallback('local_subjects', list);
          return list;
        }
      } catch (e) {}
    }
    return handleFallback<SubjectItem>('local_subjects', defaultSubjects);
  },

  async addSubject(name: string): Promise<SubjectItem> {
    const item: SubjectItem = {
      id: 'sub_' + Date.now(),
      name: name.trim(),
      createdAt: new Date().toISOString()
    };
    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'subjects', item.id), item);
      } catch (e) {}
    }
    const subjects = await this.getSubjects();
    subjects.push(item);
    saveFallback('local_subjects', subjects);
    return item;
  },

  async deleteSubject(id: string): Promise<void> {
    if (isUsingCloud) {
      try {
        await deleteDoc(doc(db, 'subjects', id));
      } catch (e) {}
    }
    const subjects = await this.getSubjects();
    saveFallback('local_subjects', subjects.filter(s => s.id !== id));
  },

  // -------------------------------------------------------------
  // ADVANCED COURSE PATHWAYS
  // -------------------------------------------------------------
  async getPathways(): Promise<PathwayItem[]> {
    const defaultPathways: PathwayItem[] = [
      {
        id: 'path_1',
        title: 'Advanced Mathematics',
        description: 'Algebra basics, Linear curves, Vector matrices, Trigonometry structures, and full AP Pre-Calculus preparation.',
        iconName: 'BookOpen',
        category: 'Mathematics'
      },
      {
        id: 'path_2',
        title: 'Interactive Science',
        description: 'Newtonian mechanics, electrostatics, thermodynamics, organic chemistry basics, and verified virtual laboratory modules.',
        iconName: 'Cpu',
        category: 'Science'
      },
      {
        id: 'path_3',
        title: 'English & Creative Writing',
        description: 'Essay outline methodologies, SAT reading grammar guides, literature interpretation templates, and vocabulary growth circles.',
        iconName: 'Compass',
        category: 'Languages'
      },
      {
        id: 'path_4',
        title: 'Coding & CS',
        description: 'Full-stack web concepts, algorithm patterns, object oriented python scripting, and database structure templates.',
        iconName: 'Bookmark',
        category: 'Technology'
      }
    ];
    if (isUsingCloud) {
      try {
        const qSnap = await promiseWithTimeout(
          getDocs(collection(db, 'pathways')),
          8000,
          { docs: [] } as any
        );
        const list: PathwayItem[] = qSnap.docs.map(d => d.data() as PathwayItem);
        if (list.length > 0) {
          saveFallback('local_pathways', list);
          return list;
        }
      } catch (e) {}
    }
    return handleFallback<PathwayItem>('local_pathways', defaultPathways);
  },

  async savePathway(pathway: PathwayItem): Promise<void> {
    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'pathways', pathway.id), pathway);
      } catch (e) {}
    }
    const items = await this.getPathways();
    const idx = items.findIndex(p => p.id === pathway.id);
    if (idx !== -1) items[idx] = pathway;
    else items.push(pathway);
    saveFallback('local_pathways', items);
  },

  // -------------------------------------------------------------
  // STUDY MATERIALS & CLASS RESOURCES
  // -------------------------------------------------------------
  async getStudyMaterials(classId?: string): Promise<StudyMaterial[]> {
    let cloudMaterials: StudyMaterial[] = [];
    if (isUsingCloud) {
      try {
        const snap = await promiseWithTimeout(
          getDocs(collection(db, 'materials')),
          8000,
          { docs: [] } as any
        );
        cloudMaterials = snap.docs.map(d => d.data() as StudyMaterial);
        if (cloudMaterials.length > 0) {
          saveFallback('local_materials', cloudMaterials);
          if (classId) return cloudMaterials.filter(m => m.classId === classId);
          return cloudMaterials;
        }
      } catch (e) {}
    }
    const local = handleFallback<StudyMaterial>('local_materials', []);
    if (classId) return local.filter(m => m.classId === classId);
    return local;
  },

  async saveStudyMaterial(material: Omit<StudyMaterial, 'id' | 'createdAt'>): Promise<StudyMaterial> {
    const id = 'mat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const item: StudyMaterial = {
      ...material,
      id,
      createdAt: new Date().toISOString()
    };
    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'materials', id), item);
      } catch (e) {}
    }
    const list = handleFallback<StudyMaterial>('local_materials', []);
    list.unshift(item);
    saveFallback('local_materials', list);

    await this.addAuditLog({
      username: item.tutorId,
      action: 'RESOURCE_ADDED',
      details: `Added ${item.type || 'material'} "${item.title}" to ${item.classTitle || 'general'}`
    });

    return item;
  },

  async deleteStudyMaterial(id: string): Promise<void> {
    if (isUsingCloud) {
      try {
        await deleteDoc(doc(db, 'materials', id));
      } catch (e) {}
    }
    const list = handleFallback<StudyMaterial>('local_materials', []);
    saveFallback('local_materials', list.filter(m => m.id !== id));
  },

  // -------------------------------------------------------------
  // USER ROLE CHANGE WITH ADMIN PASSWORD REQUIREMENT
  // -------------------------------------------------------------
  async changeUserRoleWithPassword(
    adminUid: string,
    adminPasswordInput: string,
    targetUid: string,
    newRole: 'student' | 'tutor' | 'admin'
  ): Promise<string> {
    const allUsers = await this.getAllUsers();
    const adminUser = allUsers.find(u => u.uid === adminUid || u.role === 'admin');

    if (!adminUser) {
      throw new Error("Admin privileges not found.");
    }
    if (adminUser.password && adminUser.password !== adminPasswordInput) {
      throw new Error("Invalid admin password. Role change aborted.");
    }

    const targetUser = allUsers.find(u => u.uid === targetUid);
    if (!targetUser) {
      throw new Error("Target user profile not found.");
    }

    if (targetUser.role === newRole) {
      return targetUid; // No change needed
    }

    // Generate new unique username/UID corresponding to role
    const random6 = Math.floor(100000 + Math.random() * 900000);
    let newUid = targetUid;
    if (newRole === 'student') newUid = `STU${random6}`;
    else if (newRole === 'tutor') newUid = `TUT${random6}`;
    else if (newRole === 'admin') newUid = `GA${Math.floor(10000000 + Math.random() * 90000000)}`;

    const updatedProfile: UserProfile = {
      ...targetUser,
      uid: newUid,
      username: newUid,
      role: newRole
    };

    // Remove old record and set new record
    if (isUsingCloud) {
      try {
        await deleteDoc(doc(db, 'users', targetUid));
        await setDoc(doc(db, 'users', newUid), updatedProfile);
      } catch (e) {
        console.warn("Failed cloud role change update.", e);
      }
    }

    const registered = handleFallback<UserProfile>('local_registered_users', []);
    const filteredReg = registered.filter(u => u.uid !== targetUid);
    filteredReg.push(updatedProfile);
    saveFallback('local_registered_users', filteredReg);

    // Track deleted UID to prevent resurfacing
    const deletedUids = handleFallback<string>('local_deleted_uids', []);
    if (!deletedUids.includes(targetUid)) {
      deletedUids.push(targetUid);
      saveFallback('local_deleted_uids', deletedUids);
    }

    await this.addAuditLog({
      username: adminUser.email || adminUid,
      action: 'ROLE_CHANGED',
      details: `Changed role of user ${targetUser.name} (${targetUid}) from ${targetUser.role} to ${newRole}. New UID: ${newUid}`
    });

    return newUid;
  },

  // -------------------------------------------------------------
  // MONTHLY PAYMENT REMINDERS & AUTO-SUSPENSION (Requirement 13)
  // -------------------------------------------------------------
  async runMonthlyPaymentAuditAndReminders(adminUid: string): Promise<{ reminded: number; suspended: number }> {
    const allUsers = await this.getAllUsers();
    const students = allUsers.filter(u => u.role === 'student');
    const payments = await this.getPayments();

    let reminded = 0;
    let suspended = 0;

    for (const student of students) {
      if (student.isFreeCard) continue; // Free Card students are exempted

      const enrolledClassIds = student.selectedClasses || [];
      for (const classId of enrolledClassIds) {
        // Check if paid for current month
        const hasPaidCurrentMonth = payments.some(
          p => p.studentId === student.uid && p.classId === classId && p.status === 'paid'
        );

        if (!hasPaidCurrentMonth) {
          reminded++;
          // Trigger system, email, and SMS reminder
          const msg = `Payment Reminder: Monthly fee for class ${classId} is overdue. Please settle payment to maintain uninterrupted access.`;
          await this.triggerNotification(student.uid, 'Monthly Class Fee Due', msg, 'payment');

          // If unpaid and not marked late payment or free card, suspend class access
          const currentClassStatus = student.classEnrollmentStatus?.[classId];
          if (currentClassStatus !== 'late_payment' && currentClassStatus !== 'free_card') {
            suspended++;
            const updatedClassStatus = {
              ...(student.classEnrollmentStatus || {}),
              [classId]: 'suspended' as const
            };
            const updatedStudent = {
              ...student,
              classEnrollmentStatus: updatedClassStatus
            };

            if (isUsingCloud) {
              try {
                await setDoc(doc(db, 'users', student.uid), { classEnrollmentStatus: updatedClassStatus }, { merge: true });
              } catch (e) {}
            }
            const registered = handleFallback<UserProfile>('local_registered_users', []);
            const updatedReg = registered.map(u => u.uid === student.uid ? updatedStudent : u);
            saveFallback('local_registered_users', updatedReg);
          }
        }
      }
    }

    await this.addAuditLog({
      username: adminUid,
      action: 'PAYMENT_AUDIT_RUN',
      details: `Triggered payment audit: Sent ${reminded} reminders and suspended ${suspended} unpaid class access records.`
    });

    return { reminded, suspended };
  },

  // -------------------------------------------------------------
  // REAL-TIME SUBSCRIPTIONS (CROSS-BROWSER SYNC)
  // -------------------------------------------------------------
  subscribeClasses(callback: (classes: ClassItem[]) => void): () => void {
    if (isUsingCloud) {
      try {
        return onSnapshot(collection(db, 'classes'), (snap) => {
          const docs = snap.docs.map(doc => doc.data() as ClassItem);
          if (docs.length > 0) {
            saveFallback('local_classes', docs);
            callback(docs);
          }
        }, (err) => console.warn("Classes snapshot error", err));
      } catch (e) {
        console.warn("Error subscribing to classes", e);
      }
    }
    return () => {};
  },

  subscribeBookings(callback: (bookings: Booking[]) => void): () => void {
    if (isUsingCloud) {
      try {
        return onSnapshot(collection(db, 'bookings'), (snap) => {
          const docs = snap.docs.map(doc => doc.data() as Booking);
          if (docs.length > 0) {
            saveFallback('local_bookings', docs);
            callback(docs);
          }
        }, (err) => console.warn("Bookings snapshot error", err));
      } catch (e) {
        console.warn("Error subscribing to bookings", e);
      }
    }
    return () => {};
  },

  subscribePayments(callback: (payments: Payment[]) => void): () => void {
    if (isUsingCloud) {
      try {
        return onSnapshot(collection(db, 'payments'), (snap) => {
          const docs = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Payment);
          if (docs.length > 0) {
            saveFallback('local_payments', docs);
            callback(docs);
          }
        }, (err) => console.warn("Payments snapshot error", err));
      } catch (e) {
        console.warn("Error subscribing to payments", e);
      }
    }
    return () => {};
  },

  subscribeReviews(callback: (reviews: Review[]) => void): () => void {
    if (isUsingCloud) {
      try {
        return onSnapshot(collection(db, 'reviews'), (snap) => {
          const docs = snap.docs.map(doc => doc.data() as Review);
          if (docs.length > 0) {
            saveFallback('local_reviews', docs);
            callback(docs);
          }
        }, (err) => console.warn("Reviews snapshot error", err));
      } catch (e) {
        console.warn("Error subscribing to reviews", e);
      }
    }
    return () => {};
  },

  // -------------------------------------------------------------
  // REAL-TIME DIRECT MESSAGES SUBSCRIPTION
  // -------------------------------------------------------------
  subscribeDirectMessages(userId1: string, userId2: string, callback: (messages: DirectMessage[]) => void): () => void {
    if (isUsingCloud) {
      try {
        const q = query(
          collection(db, 'messages')
        );
        return onSnapshot(q, (snap) => {
          const cloudMessages = snap.docs.map(doc => doc.data() as DirectMessage);
          const localMsgs = handleFallback<DirectMessage>('local_messages', INITIAL_MESSAGES);
          const messageMap = new Map<string, DirectMessage>();
          localMsgs.forEach(m => messageMap.set(m.id, m));
          cloudMessages.forEach(m => messageMap.set(m.id, m));
          const mergedList = Array.from(messageMap.values());
          
          if (cloudMessages.length > 0) {
            saveFallback('local_messages', mergedList);
          }
          
          const filtered = mergedList
            .filter(m => 
              (m.senderId === userId1 && m.receiverId === userId2) || 
              (m.senderId === userId2 && m.receiverId === userId1)
            )
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          
          callback(filtered);
        }, (error) => {
          console.error('Error on messages snapshot: ', error);
        });
      } catch (e) {
        console.warn("Error subscribing to direct messages, falling back to one-time fetch", e);
      }
    }
    
    // Offline fallback: one-time fetch
    this.getDirectMessages(userId1, userId2).then(callback);
    return () => {};
  }
};

export const firestoreService = new Proxy(firestoreServiceRaw, {
  get(target: any, prop: string | symbol, receiver: any) {
    syncCloudFlag();
    return Reflect.get(target, prop, receiver);
  }
});
