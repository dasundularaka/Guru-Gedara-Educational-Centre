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
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, auth, storage, firebaseConfig } from './firebase';
import { binaryStore } from './binaryStore';
import { optimizeImage } from './imageOptimizer';
import { emailNotificationService } from './emailNotificationService';
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

function getCircularReplacer() {
  const seen = new WeakSet();
  return (key: string, value: any) => {
    if (key === 'toJSON' || typeof value === 'function') {
      return undefined;
    }
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return undefined;
      }
      seen.add(value);
    }
    return value;
  };
}

// Helper to stringify objects with circular reference protection and custom type exclusions
function cleanObjectForSerialization(val: any, seen = new WeakSet(), depth = 0): any {
  if (val === null || val === undefined) return val;
  const type = typeof val;
  if (type === 'number' || type === 'string' || type === 'boolean') return val;
  if (type === 'function' || type === 'symbol') return undefined;

  if (depth > 6) return undefined;

  if (type === 'object') {
    if (seen.has(val)) return undefined;
    seen.add(val);

    // Window, DOM node, Event, or Element
    try {
      if (
        (typeof window !== 'undefined' && val === window) ||
        val.nodeType !== undefined ||
        val.nativeEvent !== undefined ||
        (typeof Element !== 'undefined' && val instanceof Element) ||
        (typeof Event !== 'undefined' && val instanceof Event) ||
        (typeof HTMLImageElement !== 'undefined' && val instanceof HTMLImageElement)
      ) {
        return undefined;
      }
    } catch (_) {
      return undefined;
    }

    if (val instanceof Date) return val.toISOString();
    if (typeof val.toDate === 'function') {
      try {
        return val.toDate().toISOString();
      } catch (_) {
        return undefined;
      }
    }

    // Check for Firebase/Firestore internal delegates or complex internal SDK properties
    try {
      if (val._delegate || val._firestore || val._databaseId || val._query || val._key || val.auth) {
        if (val.message && typeof val.message === 'string') return val.message;
        if (val.code && typeof val.code === 'string') return val.code;
        if (val.id && typeof val.id === 'string') return val.id;
        if (val.path && typeof val.path === 'string') return val.path;
        return undefined;
      }
    } catch (_) {
      return undefined;
    }

    // Check constructor name to exclude SDK internal instances (e.g. Y2, Ka, Firestore, Auth, etc.)
    try {
      const cName = val?.constructor?.name;
      if (cName && cName !== 'Object' && cName !== 'Array') {
        if (
          cName.length <= 4 ||
          cName.startsWith('Y2') ||
          cName.startsWith('Ka') ||
          cName.includes('Firestore') ||
          cName.includes('Snapshot') ||
          cName.includes('Element') ||
          cName.includes('Event') ||
          cName.includes('Auth') ||
          cName.includes('Error') ||
          cName.includes('Reference') ||
          cName.includes('Query') ||
          cName.includes('Document') ||
          cName.includes('Collection') ||
          cName.includes('User')
        ) {
          if (val.message && typeof val.message === 'string') return val.message;
          if (val.code && typeof val.code === 'string') return val.code;
          if (val.id && typeof val.id === 'string') return val.id;
          return undefined;
        }
      }
    } catch (_) {
      return undefined;
    }

    if (Array.isArray(val)) {
      const cleanArr: any[] = [];
      for (let i = 0; i < val.length; i++) {
        try {
          const item = cleanObjectForSerialization(val[i], seen, depth + 1);
          if (item !== undefined) cleanArr.push(item);
        } catch (_) {}
      }
      return cleanArr;
    }

    const cleanObj: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      if (key.startsWith('$$') || key.startsWith('_v') || key === 'toJSON') continue;
      try {
        const item = cleanObjectForSerialization(val[key], seen, depth + 1);
        if (item !== undefined) {
          cleanObj[key] = item;
        }
      } catch (_) {}
    }
    return cleanObj;
  }

  return undefined;
}

export function safeStringify(obj: any): string {
  if (obj === undefined) return 'undefined';
  if (obj === null) return 'null';
  if (typeof obj !== 'object' && typeof obj !== 'function') {
    return String(obj);
  }

  try {
    const cleaned = cleanObjectForSerialization(obj);
    return JSON.stringify(cleaned, getCircularReplacer());
  } catch (err) {
    console.warn("[safeStringify] Safe stringify error caught:", err);
    try {
      if (typeof obj === 'object') {
        if (Array.isArray(obj)) return '[]';
        if (obj.message && typeof obj.message === 'string') return obj.message;
        if (obj.name && typeof obj.name === 'string') return obj.name;
        if (obj.id && typeof obj.id === 'string') return obj.id;
        return '{}';
      }
      return String(obj);
    } catch (_) {
      return '{}';
    }
  }
}

// Helper to sanitize objects for Firestore to remove undefined properties
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const clean: Record<string, any> = {};
  Object.keys(obj).forEach(key => {
    const val = obj[key];
    if (val !== undefined) {
      if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        clean[key] = sanitizeForFirestore(val);
      } else {
        clean[key] = val;
      }
    }
  });
  return clean as T;
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
        { collection: 'users', id: 'tutor_sarah' },
        { collection: 'users', id: 'tutor_marcus' },
        { collection: 'users', id: 'tutor_elena' },
        { collection: 'users', id: 'tutor_david' },
        { collection: 'users', id: 'student_demo' },
        { collection: 'users', id: 'admin_demo' },
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

      // Wipe local storage keys if they contain demo data
      const scopedProj = firebaseConfig.projectId || 'default';
      const cacheKeys = [
        `local_classes_${scopedProj}`,
        `local_users_tutors_${scopedProj}`,
        `local_bookings_${scopedProj}`,
        `local_payments_${scopedProj}`,
        `local_notifications_${scopedProj}`,
        `local_messages_${scopedProj}`,
        `local_reviews_${scopedProj}`,
        `local_study_materials_${scopedProj}`
      ];
      cacheKeys.forEach(k => {
        try {
          const raw = localStorage.getItem(k);
          if (raw && (raw.includes('student_demo') || raw.includes('tutor_sarah') || raw.includes('class_calc_abc') || raw.includes('mat_1'))) {
            localStorage.removeItem(k);
          }
        } catch (e) {}
      });

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
    if (!uid) return null;
    const cleanId = uid.trim();

    if (isUsingCloud) {
       try {
         // 1. Direct doc lookup by doc ID
         const userRef = doc(db, 'users', cleanId);
         const userSnap = await promiseWithTimeout(
           getDoc(userRef),
           3000,
           { exists: () => false } as any
         );
         if (userSnap.exists()) {
           const userData = userSnap.data() as UserProfile;
           return userData;
         }

         // 2. Query where authUid == cleanId
         const usersRef = collection(db, 'users');
         const qAuth = query(usersRef, where('authUid', '==', cleanId));
         const snapAuth = await promiseWithTimeout(getDocs(qAuth), 3000, { empty: true, docs: [] } as any);
         if (!snapAuth.empty) {
           return snapAuth.docs[0].data() as UserProfile;
         }

         // 3. Query where username == cleanId
         const qUser = query(usersRef, where('username', '==', cleanId));
         const snapUser = await promiseWithTimeout(getDocs(qUser), 3000, { empty: true, docs: [] } as any);
         if (!snapUser.empty) {
           return snapUser.docs[0].data() as UserProfile;
         }
       } catch (e) {
         console.warn("Falling back to local user retrieval", e);
       }
    }
    
    // Comprehensive fallback across all local/cached users
    const allUsers = await this.getAllUsers();
    const match = allUsers.find(u => u.uid === cleanId || u.authUid === cleanId || u.username === cleanId);
    if (match) return match;

    const tutors = handleFallback<UserProfile>('local_users_tutors', INITIAL_TUTORS);
    const tutorMatch = tutors.find(t => t.uid === cleanId || t.authUid === cleanId || t.username === cleanId);
    if (tutorMatch) return tutorMatch;

    const registered = handleFallback<UserProfile>('local_registered_users', []);
    return registered.find(u => u.uid === cleanId || u.authUid === cleanId || u.username === cleanId) || null;
  },

  async getUserProfileByUsername(username: string): Promise<UserProfile | null> {
    if (!username) return null;
    const cleanUsername = username.trim();
    if (isUsingCloud) {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', cleanUsername));
        const qSnap = await promiseWithTimeout(getDocs(q), 3000, { empty: true, docs: [] } as any);
        if (!qSnap.empty) {
          return qSnap.docs[0].data() as UserProfile;
        }
      } catch (e) {
        console.warn("Error finding user by username", e);
      }
    }
    const allUsers = await this.getAllUsers();
    return allUsers.find(u => (u.username && u.username.toLowerCase() === cleanUsername.toLowerCase()) || (u.uid && u.uid.toLowerCase() === cleanUsername.toLowerCase())) || null;
  },

  async getUserProfileByEmail(email: string): Promise<UserProfile | null> {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    
    if (isUsingCloud) {
       try {
         const usersRef = collection(db, 'users');
         const q = query(usersRef, where('email', '==', cleanEmail));
         const qSnap = await promiseWithTimeout(
           getDocs(q),
           3000,
           { empty: true, docs: [] } as any
         );
         if (!qSnap.empty) {
           const userData = qSnap.docs[0].data() as UserProfile;
           return userData;
         }
       } catch (e) {
         console.warn("Falling back search by email", e);
       }
    }

    // Comprehensive fallback search across ALL users (cloud, local_users_tutors, local_registered_users)
    const allUsers = await this.getAllUsers();
    const emailMatch = allUsers.find(u => u.email && u.email.trim().toLowerCase() === cleanEmail);
    if (emailMatch) return emailMatch;
    
    // Check tutors explicitly
    const tutors = handleFallback<UserProfile>('local_users_tutors', INITIAL_TUTORS);
    const tutorMatch = tutors.find(t => t.email && t.email.trim().toLowerCase() === cleanEmail);
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
    return registered.find(u => u.email && u.email.trim().toLowerCase() === cleanEmail) || null;
  },

  async createUserProfile(uid: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    // Server-side validation checks before committing profile
    if (profile.email && (!profile.email.includes('@') || typeof profile.email !== 'string')) {
      throw new Error("Invalid email format provided.");
    }
    if (!profile.name || typeof profile.name !== 'string' || !profile.name.trim()) {
      throw new Error("Full name is required.");
    }

    const cleanEmail = profile.email ? profile.email.trim().toLowerCase() : '';

    // CRITICAL: Stop duplicate user creation! If an existing profile already exists with this email, merge/update instead of creating a second document
    if (cleanEmail) {
      const existingUser = await this.getUserProfileByEmail(cleanEmail);
      if (existingUser) {
        const mergedData: Partial<UserProfile> = {
          ...existingUser,
          ...profile,
          uid: existingUser.uid,
          username: existingUser.username || existingUser.uid
        };
        if (uid && uid !== existingUser.uid) {
          mergedData.authUid = uid;
        }
        await this.updateUserProfile(existingUser.uid, mergedData);
        return mergedData as UserProfile;
      }
    }

    // Requirement 1: In database, username and uid must be equal (username = uid)
    const effectiveUsername = profile.username || uid;

    const baseProfile: Record<string, any> = {
      uid,
      email: cleanEmail,
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
      isFreeCard: profile.isFreeCard ?? false,
      parentEmail: profile.parentEmail || '',
      isParentEmailLinked: profile.isParentEmailLinked ?? (!!profile.parentEmail),
      ccParentOnNotifications: profile.ccParentOnNotifications ?? (!!profile.parentEmail),
      parentEmailCcPreferences: profile.parentEmailCcPreferences || {
        attendance: true,
        payments: true,
        general: true
      }
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
    const filteredReg = registered.filter(u => u.uid !== uid && u.email?.toLowerCase() !== fullProfile.email?.toLowerCase());
    filteredReg.push(fullProfile);
    saveFallback('local_registered_users', filteredReg);

    if (fullProfile.role === 'tutor' || fullProfile.tutorDetails) {
      const tutors = handleFallback<UserProfile>('local_users_tutors', INITIAL_TUTORS);
      const filteredTutors = tutors.filter(u => u.uid !== uid && u.email?.toLowerCase() !== fullProfile.email?.toLowerCase());
      filteredTutors.push(fullProfile);
      saveFallback('local_users_tutors', filteredTutors);
    }

    // Audit Log for user creation
    await this.addAuditLog({
      username: profile.email || uid,
      action: 'USER_CREATED',
      details: `Created ${fullProfile.role} profile for ${fullProfile.name} (${fullProfile.uid})`
    });

    // Send automated account creation welcome email
    if (fullProfile.email && fullProfile.email.includes('@')) {
      try {
        await emailNotificationService.notifyAccountCreated({
          user: fullProfile,
          temporaryPassword: profile.password
        });
      } catch (emErr) {
        console.warn("Could not dispatch welcome account creation email:", emErr);
      }
    }

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

    // Build map starting with cloud users (highest priority), deduplicating by email
    const userMap = new Map<string, UserProfile>();
    const emailToUidMap = new Map<string, string>();

    cloudUsers.forEach(u => {
      if (!u || !u.uid || deletedUids.includes(u.uid)) return;
      const emailKey = u.email ? u.email.trim().toLowerCase() : '';

      if (emailKey && emailToUidMap.has(emailKey)) {
        const existingUid = emailToUidMap.get(emailKey)!;
        const existingUser = userMap.get(existingUid);
        if (existingUser) {
          // If current user doc has custom system identifier (GS/GT/GA) and existing doesn't, prefer current
          const isCurrentCustomId = u.uid.startsWith('GS') || u.uid.startsWith('GT') || u.uid.startsWith('GA') || (u.username && (u.username.startsWith('GS') || u.username.startsWith('GT') || u.username.startsWith('GA')));
          const isExistingCustomId = existingUid.startsWith('GS') || existingUid.startsWith('GT') || existingUid.startsWith('GA') || (existingUser.username && (existingUser.username.startsWith('GS') || existingUser.username.startsWith('GT') || existingUser.username.startsWith('GA')));
          if (isCurrentCustomId && !isExistingCustomId) {
            userMap.delete(existingUid);
            userMap.set(u.uid, { ...existingUser, ...u });
            emailToUidMap.set(emailKey, u.uid);
          } else {
            userMap.set(existingUid, { ...u, ...existingUser });
          }
        }
        return;
      }

      userMap.set(u.uid, u);
      if (emailKey) {
        emailToUidMap.set(emailKey, u.uid);
      }
    });

    // Merge registered & tutors fallback users if not already present
    [...registered, ...tutors].forEach(u => {
      if (!u || !u.uid || deletedUids.includes(u.uid)) return;
      const emailKey = u.email ? u.email.trim().toLowerCase() : '';

      // If user ID or email already exists in cloud users, cloud user wins
      if (userMap.has(u.uid)) return;
      if (emailKey && emailToUidMap.has(emailKey)) return;

      userMap.set(u.uid, u);
      if (emailKey) {
        emailToUidMap.set(emailKey, u.uid);
      }
    });

    return Array.from(userMap.values());
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
      } catch (e) {
        console.warn("Fallback classes loading.", e);
      }
    }
    const fallbackClasses = handleFallback<ClassItem>('local_classes', INITIAL_CLASSES);
    const classMap = new Map<string, ClassItem>();
    fallbackClasses.forEach(c => classMap.set(c.id, c));
    cloudClasses.forEach(c => classMap.set(c.id, c));

    const combined = Array.from(classMap.values()).filter(c => !deletedIds.includes(c.id));
    if (combined.length > 0) {
      saveFallback('local_classes', combined);
    }
    return combined;
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

    // Write system audit log
    await this.addAuditLog({
      username: newItem.tutorId,
      action: 'CLASS_CREATED',
      details: `Created new course "${newItem.title}" (${newItem.schedule}) by ${newItem.tutorName}`
    });

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
       } catch (e) {
         console.warn("Fallback reading bookings.", e);
       }
    }
    const fallbackBookings = handleFallback<Booking>('local_bookings', INITIAL_BOOKINGS);
    const bookingMap = new Map<string, Booking>();
    fallbackBookings.forEach(b => bookingMap.set(b.id, b));
    cloudBookings.forEach(b => bookingMap.set(b.id, b));

    const combined = Array.from(bookingMap.values());
    if (combined.length > 0) {
      saveFallback('local_bookings', combined);
    }
    return combined;
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

    // Trigger Automated Email Service & In-App Notification
    try {
      const studentUser = await this.getUserProfile(studentId);
      const tutorUser = await this.getUserProfile(classItem.tutorId);
      
      await emailNotificationService.notifyClassBookingSuccess({
        booking: newBooking,
        classItem,
        studentUser,
        tutorUser
      });

      // Also trigger in-app notification
      await this.triggerNotification(
        studentId,
        `✅ Booking Confirmed: ${classItem.title}`,
        `You have successfully enrolled in ${classItem.title} (${classItem.schedule}). An official confirmation email was dispatched.`,
        'announcement'
      );
    } catch (notifErr) {
      console.warn("[firestoreService] Automated booking email trigger warning:", notifErr);
    }

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
       } catch (e) {
         console.warn("Fallback read payments.", e);
       }
    }
    const fallbackPayments = handleFallback<Payment>('local_payments', INITIAL_PAYMENTS);
    const payMap = new Map<string, Payment>();
    fallbackPayments.forEach(p => payMap.set(p.id, p));
    cloudPayments.forEach(p => payMap.set(p.id, p));

    const combined = Array.from(payMap.values()).filter(p => !deletedIds.includes(p.id));
    if (combined.length > 0) {
      saveFallback('local_payments', combined);
    }
    return combined;
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

    // Trigger payment notification to student & automatic CC to linked parent
    try {
      const studentProfile = await this.getUserProfile(studentId);
      const isParentCcActive = !!(studentProfile?.parentEmail && (studentProfile?.isParentEmailLinked || studentProfile?.ccParentOnNotifications) && studentProfile?.parentEmailCcPreferences?.payments !== false);
      const ccNote = isParentCcActive ? `\n(CC: Parent ${studentProfile?.parentEmail})` : '';

      const notifTitle = status === 'paid' ? `💳 Tuition Payment Receipt: ${classTitle}` : `⚠️ Tuition Fee Pending: ${classTitle}`;
      const notifMsg = status === 'paid'
        ? `Payment of LKR ${amount.toLocaleString()} for '${classTitle}' was successfully recorded.${ccNote}`
        : `Tuition fee of LKR ${amount.toLocaleString()} for '${classTitle}' is due on ${new Date(dueDate).toLocaleDateString()}.${ccNote}`;

      await this.triggerNotification(studentId, notifTitle, notifMsg, 'payment');

      if (isParentCcActive && studentProfile?.parentEmail) {
        await this.triggerNotification(
          studentProfile.parentEmail,
          `[Parent CC] ${notifTitle}`,
          `Advisory for student ${studentName} (${studentProfile.username || studentId}):\n${notifMsg}`,
          'payment'
        );
      }

      // Automated Rich HTML Email Receipt Dispatch
      if (status === 'paid') {
        const classObj = await this.getClass(classId);
        await emailNotificationService.notifyPaymentSuccess({
          payment: newPay,
          classItem: classObj || null,
          studentUser: studentProfile
        });
      }
    } catch (payNotifErr) {
      console.warn("Payment notification auto-dispatch warning:", payNotifErr);
    }

    return newPay;
  },

  async updatePaymentStatus(id: string, status: 'paid' | 'pending' | 'failed', fullPaymentObj?: Payment): Promise<void> {
    const updatedPay = fullPaymentObj ? { ...fullPaymentObj, status } : undefined;
    if (isUsingCloud) {
      try {
        const payRef = doc(db, 'payments', id);
        const snap = await promiseWithTimeout(getDoc(payRef), 5000, null as any);
        if (snap && snap.exists()) {
          await updateDoc(payRef, { status });
        } else if (updatedPay) {
          await setDoc(payRef, updatedPay);
        }
      } catch (e) {
        console.warn("Failed online payment state change", e);
      }
    }

    const payments = handleFallback<Payment>('local_payments', INITIAL_PAYMENTS);
    const existingIdx = payments.findIndex(p => p.id === id);
    let effectivePay = updatedPay;
    if (existingIdx !== -1) {
      payments[existingIdx].status = status;
      effectivePay = payments[existingIdx];
    } else if (updatedPay) {
      payments.push(updatedPay);
    }
    saveFallback('local_payments', payments);

    // If marked as paid, send receipt email
    if (status === 'paid' && effectivePay) {
      try {
        const studentProfile = await this.getUserProfile(effectivePay.studentId);
        const classObj = await this.getClass(effectivePay.classId);
        await emailNotificationService.notifyPaymentSuccess({
          payment: effectivePay,
          classItem: classObj || null,
          studentUser: studentProfile
        });
      } catch (e) {
        console.warn("Error triggering receipt on updatePaymentStatus:", e);
      }
    }
  },

  // -------------------------------------------------------------
  // NOTIFICATIONS
  // -------------------------------------------------------------
  async getNotifications(userId: string): Promise<NotificationItem[]> {
    let cloudNotifications: NotificationItem[] = [];
    if (isUsingCloud) {
      try {
        const snap = await promiseWithTimeout(
          getDocs(collection(db, 'notifications')),
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
    
    // Seed initial notifications if notMap is empty
    INITIAL_NOTIFICATIONS.forEach(n => notMap.set(n.id, n));
    localNots.forEach(n => notMap.set(n.id, n));
    cloudNotifications.forEach(n => notMap.set(n.id, n));
    const mergedList = Array.from(notMap.values());

    if (cloudNotifications.length > 0) {
      saveFallback('local_notifications', mergedList);
    }

    if (!userId || userId === 'all') {
      return mergedList;
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
    let cloudMessages: DirectMessage[] | null = null;
    if (isUsingCloud) {
      try {
        const snap = await promiseWithTimeout(
          getDocs(collection(db, 'messages')),
          8000,
          { docs: [] } as any
        );
        cloudMessages = snap.docs.map(doc => doc.data() as DirectMessage);
        saveFallback('local_messages', cloudMessages);
      } catch (e) {
        console.warn("Fallback loader messages.", e);
      }
    }

    const messagesList = cloudMessages !== null ? cloudMessages : handleFallback<DirectMessage>('local_messages', INITIAL_MESSAGES);

    return messagesList
      .filter(m => 
        m && (
          (m.senderId === userId1 && m.receiverId === userId2) || 
          (m.senderId === userId2 && m.receiverId === userId1)
        )
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  async deleteDirectMessage(messageId: string): Promise<void> {
    if (isUsingCloud) {
      try {
        await deleteDoc(doc(db, 'messages', messageId));
      } catch (e) {
        console.warn("Failed to delete message from Firestore.", e);
      }
    }
    const list = handleFallback<DirectMessage>('local_messages', INITIAL_MESSAGES);
    const filtered = list.filter(m => m.id !== messageId);
    saveFallback('local_messages', filtered);
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

    // If status updated to approved, dispatch official approval email
    if (data.status === 'approved') {
      try {
        const fullUser = await this.getUserProfile(uid);
        if (fullUser && fullUser.email && fullUser.email.includes('@')) {
          await emailNotificationService.notifyStudentApproved({ studentUser: fullUser });
        }
      } catch (appErr) {
        console.warn("Could not dispatch student approval email:", appErr);
      }
    }
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
      } catch (e) {
        console.warn("Fallback reading attendance.", e);
      }
    }
    const fallbackAttendance = handleFallback<AttendanceRecord>('local_attendance', []);
    const attMap = new Map<string, AttendanceRecord>();
    fallbackAttendance.forEach(a => attMap.set(a.id, a));
    cloudAttendance.forEach(a => attMap.set(a.id, a));

    const combined = Array.from(attMap.values());
    if (combined.length > 0) {
      saveFallback('local_attendance', combined);
    }
    return combined;
  },

  async getStudentAttendance(studentId: string): Promise<AttendanceRecord[]> {
    const all = await this.getAttendance();
    return all.filter(a => a.studentId === studentId);
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

  async deleteAttendance(id: string): Promise<void> {
    if (isUsingCloud) {
      try {
        await deleteDoc(doc(db, 'attendance', id));
      } catch (e) {
        console.warn("Fallback deleting attendance", e);
      }
    }
    const list = handleFallback<AttendanceRecord>('local_attendance', []);
    const filtered = list.filter(a => a.id !== id);
    saveFallback('local_attendance', filtered);

    await this.addAuditLog({
      username: 'system',
      action: 'ATTENDANCE_REVERTED',
      details: `Reverted/deleted attendance record ID: ${id}`
    });
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
          localStorage.setItem('local_banners_seeded', 'true');
          return list;
        } else {
          const seeded = localStorage.getItem('local_banners_seeded');
          if (!seeded) {
            for (const b of defaultBanners) {
              try {
                await setDoc(doc(db, 'banners', b.id), sanitizeForFirestore(b));
              } catch (e) {}
            }
            localStorage.setItem('local_banners_seeded', 'true');
            saveFallback('local_banners', defaultBanners);
            return defaultBanners;
          } else {
            saveFallback('local_banners', []);
            return [];
          }
        }
      } catch (e) {
        console.warn("Cloud getBanners error", e);
      }
    }
    return handleFallback<BannerImage>('local_banners', defaultBanners);
  },

  async saveBanner(banner: BannerImage): Promise<void> {
    const banners = await this.getBanners();
    const idx = banners.findIndex(b => b.id === banner.id);
    if (idx !== -1) banners[idx] = banner;
    else banners.push(banner);

    localStorage.setItem('local_banners_seeded', 'true');

    if (isUsingCloud) {
      try {
        const cleanObj = sanitizeForFirestore(banner);
        await setDoc(doc(db, 'banners', banner.id), cleanObj);
      } catch (e) {
        console.warn("Failed to save banner doc to Firestore", e);
        throw e;
      }
    }
    saveFallback('local_banners', banners);
  },

  async deleteBanner(id: string): Promise<void> {
    const banners = await this.getBanners();
    const filtered = banners.filter(b => b.id !== id);

    localStorage.setItem('local_banners_seeded', 'true');

    if (isUsingCloud) {
      try {
        await deleteDoc(doc(db, 'banners', id));
      } catch (e) {
        console.warn("Failed to delete banner doc from Firestore", e);
        throw e;
      }
    }
    saveFallback('local_banners', filtered);
  },

  subscribeBanners(callback: (banners: BannerImage[]) => void): () => void {
    if (isUsingCloud) {
      try {
        return onSnapshot(collection(db, 'banners'), async (snap) => {
          const docs = snap.docs.map(doc => doc.data() as BannerImage);
          if (docs.length === 0) {
            const seeded = localStorage.getItem('local_banners_seeded');
            if (!seeded) {
              const defaults = await this.getBanners();
              callback(defaults);
              return;
            }
          }
          saveFallback('local_banners', docs);
          callback(docs);
        }, (err) => console.warn("Banners snapshot error", err));
      } catch (e) {
        console.warn("Error subscribing to banners", e);
      }
    }
    this.getBanners().then(callback);
    return () => {};
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
          localStorage.setItem('local_subjects_seeded', 'true');
          return list;
        } else {
          const seeded = localStorage.getItem('local_subjects_seeded');
          if (!seeded) {
            for (const s of defaultSubjects) {
              try { await setDoc(doc(db, 'subjects', s.id), sanitizeForFirestore(s)); } catch (e) {}
            }
            localStorage.setItem('local_subjects_seeded', 'true');
            saveFallback('local_subjects', defaultSubjects);
            return defaultSubjects;
          } else {
            saveFallback('local_subjects', []);
            return [];
          }
        }
      } catch (e) {
        console.warn("Cloud getSubjects error", e);
      }
    }
    return handleFallback<SubjectItem>('local_subjects', defaultSubjects);
  },

  async addSubject(name: string): Promise<SubjectItem> {
    const item: SubjectItem = {
      id: 'sub_' + Date.now(),
      name: name.trim(),
      createdAt: new Date().toISOString()
    };
    const subjects = await this.getSubjects();
    subjects.push(item);
    localStorage.setItem('local_subjects_seeded', 'true');

    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'subjects', item.id), sanitizeForFirestore(item));
      } catch (e) {
        console.warn("Failed saving subject to cloud", e);
        throw e;
      }
    }
    saveFallback('local_subjects', subjects);
    return item;
  },

  async deleteSubject(id: string): Promise<void> {
    const subjects = await this.getSubjects();
    const filtered = subjects.filter(s => s.id !== id);
    localStorage.setItem('local_subjects_seeded', 'true');

    if (isUsingCloud) {
      try {
        await deleteDoc(doc(db, 'subjects', id));
      } catch (e) {
        console.warn("Failed deleting subject from cloud", e);
        throw e;
      }
    }
    saveFallback('local_subjects', filtered);
  },

  subscribeSubjects(callback: (subjects: SubjectItem[]) => void): () => void {
    if (isUsingCloud) {
      try {
        return onSnapshot(collection(db, 'subjects'), async (snap) => {
          const docs = snap.docs.map(doc => doc.data() as SubjectItem);
          if (docs.length === 0) {
            const seeded = localStorage.getItem('local_subjects_seeded');
            if (!seeded) {
              const defaults = await this.getSubjects();
              callback(defaults);
              return;
            }
          }
          saveFallback('local_subjects', docs);
          callback(docs);
        }, (err) => console.warn("Subjects snapshot error", err));
      } catch (e) {
        console.warn("Error subscribing to subjects", e);
      }
    }
    this.getSubjects().then(callback);
    return () => {};
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
          localStorage.setItem('local_pathways_seeded', 'true');
          return list;
        } else {
          const seeded = localStorage.getItem('local_pathways_seeded');
          if (!seeded) {
            for (const p of defaultPathways) {
              try { await setDoc(doc(db, 'pathways', p.id), sanitizeForFirestore(p)); } catch (e) {}
            }
            localStorage.setItem('local_pathways_seeded', 'true');
            saveFallback('local_pathways', defaultPathways);
            return defaultPathways;
          } else {
            saveFallback('local_pathways', []);
            return [];
          }
        }
      } catch (e) {
        console.warn("Cloud getPathways error", e);
      }
    }
    return handleFallback<PathwayItem>('local_pathways', defaultPathways);
  },

  async savePathway(pathway: PathwayItem): Promise<void> {
    const items = await this.getPathways();
    const idx = items.findIndex(p => p.id === pathway.id);
    if (idx !== -1) items[idx] = pathway;
    else items.push(pathway);
    localStorage.setItem('local_pathways_seeded', 'true');

    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'pathways', pathway.id), sanitizeForFirestore(pathway));
      } catch (e) {
        console.warn("Failed saving pathway to cloud", e);
        throw e;
      }
    }
    saveFallback('local_pathways', items);
  },

  async deletePathway(id: string): Promise<void> {
    const items = await this.getPathways();
    const filtered = items.filter(p => p.id !== id);
    localStorage.setItem('local_pathways_seeded', 'true');

    if (isUsingCloud) {
      try {
        await deleteDoc(doc(db, 'pathways', id));
      } catch (e) {
        console.warn("Failed deleting pathway from cloud", e);
        throw e;
      }
    }
    saveFallback('local_pathways', filtered);
  },

  subscribePathways(callback: (pathways: PathwayItem[]) => void): () => void {
    if (isUsingCloud) {
      try {
        return onSnapshot(collection(db, 'pathways'), async (snap) => {
          const docs = snap.docs.map(doc => doc.data() as PathwayItem);
          if (docs.length === 0) {
            const seeded = localStorage.getItem('local_pathways_seeded');
            if (!seeded) {
              const defaults = await this.getPathways();
              callback(defaults);
              return;
            }
          }
          saveFallback('local_pathways', docs);
          callback(docs);
        }, (err) => console.warn("Pathways snapshot error", err));
      } catch (e) {
        console.warn("Error subscribing to pathways", e);
      }
    }
    this.getPathways().then(callback);
    return () => {};
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
        
        // Also check study_materials collection if materials was empty or to combine
        try {
          const snap2 = await promiseWithTimeout(
            getDocs(collection(db, 'study_materials')),
            4000,
            { docs: [] } as any
          );
          const cloudMaterials2 = snap2.docs.map(d => ({ id: d.id, ...d.data() }) as StudyMaterial);
          
          // Merge unique by ID
          const map = new Map<string, StudyMaterial>();
          cloudMaterials.forEach(m => map.set(m.id, m));
          cloudMaterials2.forEach(m => {
            if (!map.has(m.id)) map.set(m.id, m);
          });
          cloudMaterials = Array.from(map.values());
        } catch (e) {}

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
    const sanitizedItem = sanitizeForFirestore(item);

    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'materials', id), sanitizedItem);
        await setDoc(doc(db, 'study_materials', id), sanitizedItem);
      } catch (e) {
        console.warn("Cloud save warning for study material:", e);
      }
    }
    const list = handleFallback<StudyMaterial>('local_materials', []);
    list.unshift(item);
    saveFallback('local_materials', list);

    await this.addAuditLog({
      username: item.tutorId,
      action: 'RESOURCE_ADDED',
      details: `Added ${item.type || 'material'} "${item.title}" to ${item.classTitle || 'general'}`
    });

    // Trigger Automated Email Service to Enrolled Students
    try {
      let enrolledUsers: UserProfile[] = [];
      if (item.classId) {
        const allUsers = await this.getAllUsers();
        enrolledUsers = allUsers.filter(u => 
          u.role === 'student' && 
          (u.selectedClasses?.includes(item.classId!) || 
           u.classEnrollmentStatus?.[item.classId!] === 'active')
        );
      }

      const classObj = item.classId ? await this.getClass(item.classId) : null;
      const tutorObj = await this.getUserProfile(item.tutorId);

      await emailNotificationService.notifyClassResourceAdded({
        material: item,
        classItem: classObj || null,
        tutorUser: tutorObj,
        enrolledStudents: enrolledUsers
      });

      // Also trigger in-app notification to all enrolled students
      if (enrolledUsers.length > 0) {
        for (const student of enrolledUsers) {
          try {
            await this.triggerNotification(
              student.uid,
              `📚 New Material: ${item.title}`,
              `${item.tutorName} uploaded new ${item.type || 'study resource'} to ${item.classTitle || 'your class'}.`,
              'announcement'
            );
          } catch (_) {}
        }
      }
    } catch (notifErr) {
      console.warn("[firestoreService] Automated resource email trigger warning:", notifErr);
    }

    return item;
  },

  async updateStudyMaterial(id: string, updates: Partial<StudyMaterial>): Promise<void> {
    const sanitizedUpdates = sanitizeForFirestore(updates);
    if (isUsingCloud) {
      try {
        await setDoc(doc(db, 'materials', id), sanitizedUpdates, { merge: true });
        await setDoc(doc(db, 'study_materials', id), sanitizedUpdates, { merge: true });
      } catch (e) {
        console.warn("Cloud update warning for study material:", e);
      }
    }
    const list = handleFallback<StudyMaterial>('local_materials', []);
    const idx = list.findIndex(m => m.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      saveFallback('local_materials', list);
    }
  },

  async uploadResourceFile(
    file: File,
    classId: string,
    tutorId: string,
    onProgress?: (progress: number) => void
  ): Promise<{ url: string; fileName: string; fileSize: number; fileType: string; storagePath: string }> {
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const fileId = `file_${timestamp}_${Math.random().toString(36).substr(2, 6)}`;
    const storagePath = `resources/classes/${classId || 'general'}/${timestamp}_${sanitizedName}`;
    
    // If it's an image file, optimize it first
    let processedFile: File | Blob = file;
    if (file.type.startsWith('image/')) {
      try {
        const optimizedDataUrl = await optimizeImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.85 });
        if (optimizedDataUrl && !optimizedDataUrl.startsWith('http')) {
          const res = await fetch(optimizedDataUrl);
          processedFile = await res.blob();
        }
      } catch (err) {
        console.warn("Image pre-optimization skipped:", err);
      }
    }

    // 1. Try Firebase Cloud Storage
    try {
      if (isUsingCloud && storage) {
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, processedFile, {
          contentType: file.type || 'application/octet-stream',
          customMetadata: {
            classId: classId || 'general',
            tutorId: tutorId,
            originalName: file.name
          }
        });

        const cloudResult = await new Promise<{ url: string; fileName: string; fileSize: number; fileType: string; storagePath: string }>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              if (onProgress) onProgress(Math.min(95, Math.round(progress)));
            },
            (error) => {
              reject(error);
            },
            async () => {
              try {
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                if (onProgress) onProgress(100);
                resolve({
                  url: downloadUrl,
                  fileName: file.name,
                  fileSize: file.size,
                  fileType: file.type || 'application/octet-stream',
                  storagePath
                });
              } catch (err) {
                reject(err);
              }
            }
          );
        });

        return cloudResult;
      }
    } catch (e) {
      console.warn("Cloud storage upload bypassed/failed, transitioning to high-speed local binary store:", e);
    }

    // 2. High-resilience Binary Store (IndexedDB) + Compact URL fallback
    try {
      await binaryStore.saveFile(fileId, processedFile, file.name);
      if (onProgress) onProgress(80);

      let fallbackUrl = '';
      if (file.type.startsWith('image/')) {
        fallbackUrl = await optimizeImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.8 });
      } else if (file.size < 200 * 1024) {
        // Small document (<200KB) can store as Data URL
        fallbackUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      } else {
        // Larger document -> Create local object URL & identifier
        fallbackUrl = URL.createObjectURL(processedFile);
      }

      if (onProgress) onProgress(100);
      return {
        url: fallbackUrl || URL.createObjectURL(processedFile),
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        storagePath: `indexeddb://${fileId}`
      };
    } catch (err) {
      console.warn("Binary store fallback encountered issue:", err);
      if (onProgress) onProgress(100);
      return {
        url: URL.createObjectURL(file),
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        storagePath
      };
    }
  },

  async deleteResourceFile(storagePath: string): Promise<void> {
    if (!storagePath) return;
    if (storagePath.startsWith('indexeddb://')) {
      const fileId = storagePath.replace('indexeddb://', '');
      await binaryStore.deleteFile(fileId);
      return;
    }
    try {
      if (isUsingCloud && storage) {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
      }
    } catch (e) {
      console.warn("Failed deleting storage object", e);
    }
  },

  async deleteStudyMaterial(id: string): Promise<void> {
    const list = handleFallback<StudyMaterial>('local_materials', []);
    const existing = list.find(m => m.id === id);
    if (existing?.storagePath) {
      await this.deleteResourceFile(existing.storagePath);
    }

    if (isUsingCloud) {
      try {
        await deleteDoc(doc(db, 'materials', id));
        await deleteDoc(doc(db, 'study_materials', id));
      } catch (e) {
        console.warn("Delete study material cloud warning:", e);
      }
    }
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
  subscribeUsers(callback: (users: UserProfile[]) => void): () => void {
    if (isUsingCloud) {
      try {
        return onSnapshot(collection(db, 'users'), async () => {
          const allUsers = await this.getAllUsers();
          callback(allUsers);
        }, (err) => console.warn("Users snapshot error", err));
      } catch (e) {
        console.warn("Error subscribing to users", e);
      }
    }
    this.getAllUsers().then(callback);
    return () => {};
  },

  subscribeClasses(callback: (classes: ClassItem[]) => void): () => void {
    if (isUsingCloud) {
      try {
        return onSnapshot(collection(db, 'classes'), (snap) => {
          const deletedIds = handleFallback<string>('local_deleted_class_ids', []);
          const docs = snap.docs
            .map(doc => doc.data() as ClassItem)
            .filter(c => c && c.id && !deletedIds.includes(c.id));
          saveFallback('local_classes', docs);
          callback(docs);
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
          saveFallback('local_bookings', docs);
          callback(docs);
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
          const deletedIds = handleFallback<string>('local_deleted_payment_ids', []);
          const docs = snap.docs
            .map(doc => ({ ...doc.data(), id: doc.id }) as Payment)
            .filter(p => p && p.id && !deletedIds.includes(p.id));
          saveFallback('local_payments', docs);
          callback(docs);
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
          saveFallback('local_reviews', docs);
          callback(docs);
        }, (err) => console.warn("Reviews snapshot error", err));
      } catch (e) {
        console.warn("Error subscribing to reviews", e);
      }
    }
    return () => {};
  },

  subscribeStudyMaterials(classIdFilter?: string, callback?: (materials: StudyMaterial[]) => void): () => void {
    const cb = callback || (() => {});
    if (isUsingCloud) {
      try {
        return onSnapshot(collection(db, 'materials'), (snap) => {
          const docs = snap.docs.map(doc => doc.data() as StudyMaterial);
          saveFallback('local_materials', docs);
          const filtered = classIdFilter ? docs.filter(m => m.classId === classIdFilter) : docs;
          cb(filtered);
        }, (err) => console.warn("Study materials snapshot error", err));
      } catch (e) {
        console.warn("Error subscribing to study materials", e);
      }
    }
    this.getStudyMaterials(classIdFilter).then(cb);
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
          saveFallback('local_messages', cloudMessages);
          
          const filtered = cloudMessages
            .filter(m => 
              m && (
                (m.senderId === userId1 && m.receiverId === userId2) || 
                (m.senderId === userId2 && m.receiverId === userId1)
              )
            )
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          
          callback(filtered);
        }, (error) => {
          console.error('Error on messages snapshot: ', error);
        });
      } catch (e) {
        console.warn("Error subscribing to direct messages", e);
      }
    }
    
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
