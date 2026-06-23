import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { firestoreService } from '../lib/firestoreService';
import { UserProfile, NotificationSettings, NotificationItem } from '../types';

interface AppContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  cloudSync: boolean;
  notifications: NotificationItem[];
  notificationSettings: NotificationSettings;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  loginWithGoogle: () => Promise<UserProfile | null>;
  loginWithEmail: (email: string, pass: string) => Promise<UserProfile>;
  registerWithEmail: (email: string, pass: string, name: string, role: 'student' | 'tutor', details?: any) => Promise<UserProfile>;
  logout: () => Promise<void>;
  triggerDemoSession: (role: 'student' | 'tutor' | 'admin') => Promise<UserProfile>;
  refreshNotifications: () => Promise<void>;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  syncClasses: () => Promise<any[]>;
  classes: any[];
  refreshClasses: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloudSync, setCloudSync] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    reminders: true,
    payments: true,
    announcements: true,
    messages: true,
    emailSync: false,
    emailClassRevisions: true,
    emailBookingStatus: true,
    emailStudyMaterials: true,
    emailPerformanceLogs: true
  });

  // Handle toast notifications
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const hideToast = () => {
    setToast(null);
  };

  // Safe fetch function for classes
  const refreshClasses = async () => {
    try {
      const cls = await firestoreService.getClasses();
      setClasses(cls);
    } catch (e) {
      console.warn("Error fetching classes", e);
    }
  };

  // Sync / Seed database on load
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await firestoreService.seedDatabase();
        setCloudSync(firestoreService.isCloudConnected());
        await refreshClasses();
      } catch (e) {
        console.warn("Firebase seeding failure, continuing locally.", e);
        setCloudSync(false);
      }
    };
    initializeApp();
  }, []);

  // Sync Firebase authentication with custom Firestore profiles
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          const email = firebaseUser.email || '';
          let profile = await firestoreService.getUserProfile(firebaseUser.uid);
          
          if (!profile && email) {
            const matchedProfile = await firestoreService.getUserProfileByEmail(email);
            if (matchedProfile) {
              const mergedProfile = { ...matchedProfile, uid: firebaseUser.uid };
              await firestoreService.createUserProfile(firebaseUser.uid, mergedProfile);
              profile = mergedProfile;
            }
          }
          
          if (!profile) {
            // Auto create database profile for newly signed in OAuth users
            profile = await firestoreService.createUserProfile(firebaseUser.uid, {
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'Accredited Scholar',
              role: 'student', // default
              photoURL: firebaseUser.photoURL || undefined
            });
            showToast("Account profile synced from Google!", "success");
          }
          setCurrentUser(profile);
          
          // Load notifications
          const nots = await firestoreService.getNotifications(profile.uid);
          setNotifications(nots);
        } catch (e) {
          console.error("Authentication mapping failed. Falling back.", e);
          // Local fallback session
          setCurrentUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || 'alex@example.com',
            name: firebaseUser.displayName || 'Alex Mercer',
            role: 'student',
            createdAt: new Date().toISOString()
          });
        }
      } else {
        // Checking for local simulated guest session in localStorage
        const cachedUser = localStorage.getItem('local_running_session');
        if (cachedUser) {
          try {
            const profile = JSON.parse(cachedUser);
            setCurrentUser(profile);
            const nots = await firestoreService.getNotifications(profile.uid);
            setNotifications(nots);
          } catch {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sync toast timer
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Notifications refresh
  const refreshNotifications = async () => {
    if (currentUser) {
      try {
        const nots = await firestoreService.getNotifications(currentUser.uid);
        setNotifications(nots);
      } catch (e) {
        console.warn("Notifications refresh failed", e);
      }
    }
  };

  // Google sign in callback
  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email || '';
      
      let profile = await firestoreService.getUserProfile(result.user.uid);
      
      if (!profile && email) {
        const matchedProfile = await firestoreService.getUserProfileByEmail(email);
        if (matchedProfile) {
          const mergedProfile = { ...matchedProfile, uid: result.user.uid };
          await firestoreService.createUserProfile(result.user.uid, mergedProfile);
          profile = mergedProfile;
        }
      }
      
      if (profile) {
        setCurrentUser(profile);
        showToast(`Welcome back, ${profile.name}!`, "success");
        return profile;
      } else {
        const newProf = await firestoreService.createUserProfile(result.user.uid, {
          email: result.user.email || '',
          name: result.user.displayName || 'New Scholar',
          role: 'student',
          photoURL: result.user.photoURL || undefined
        });
        setCurrentUser(newProf);
        showToast("Welcome to Guru Gedara Educational Centre! Account successfully initialized.", "success");
        return newProf;
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Google Sign-in failed. Try again.", "error");
      setLoading(false);
      return null;
    }
  };

  // Login via custom email password
  const loginWithEmail = async (email: string, pass: string): Promise<UserProfile> => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      let profile = await firestoreService.getUserProfile(cred.user.uid);
      if (!profile) {
        // Preset role according to specified credentials 
        let role: 'student' | 'tutor' | 'admin' = 'student';
        let name = "Enrolled Scholar";
        if (email.toLowerCase() === 'admin@gg.com' || email.includes('admin')) {
          role = 'admin';
          name = "Academy Administrator";
        } else if (email.toLowerCase() === 'tutor@gg.com' || email.includes('tutor')) {
          role = 'tutor';
          name = "Faculty Tutor";
        } else if (email.toLowerCase() === 'student@gg.com' || email.includes('student')) {
          role = 'student';
          name = "Scholar Student";
        }
        profile = await firestoreService.createUserProfile(cred.user.uid, {
          email,
          name,
          role
        });
      }
      
      // Prevent pending student logins online
      if (profile.role === 'student' && profile.status === 'pending') {
        await signOut(auth);
        throw new Error("Your registration is pending administrator approval. Please contact Guru Gedara support.");
      }

      setCurrentUser(profile);
      showToast(`Logged in successfully as ${profile.name}!`, "success");
      return profile;
    } catch (e: any) {
      setLoading(false);
      // Fallback: If Firebase auth fails or is offline
      // we can verify if they typed specified admin, tutor or student test credentials,
      // or if they registered a custom account, or fallback gracefully with any custom domain!
      const lowercaseEmail = email.toLowerCase();
      
      // 1. Check for custom registered users in local storage first
      const rJSON = localStorage.getItem('local_registered_users');
      const rUsers: UserProfile[] = rJSON ? JSON.parse(rJSON) : [];
      const match = rUsers.find(u => u.email.toLowerCase() === lowercaseEmail);
      if (match) {
        const expectedCustomPass = match.password || 'test123';
        if (pass === expectedCustomPass) {
          if (match.role === 'student' && match.status === 'pending') {
            throw new Error("Your registration is pending administrator approval. Please contact Guru Gedara support.");
          }
          localStorage.setItem('local_running_session', JSON.stringify(match));
          setCurrentUser(match);
          showToast(`Logged in successfully as ${match.name}!`, "success");
          return match;
        } else {
          throw new Error("Incorrect password entered for custom account.");
        }
      }

      // 2. Check for password overrides for default demo credentials (admin, tutor, student)
      const overridesJSON = localStorage.getItem('local_password_overrides');
      const overrides = overridesJSON ? JSON.parse(overridesJSON) : {};
      const expectedPassword = overrides[lowercaseEmail] || 'test123';

      if (pass !== expectedPassword) {
        throw new Error(e.message || "Invalid password credentials.");
      }

      // 3. Match keyword roles (with their typed email preserved)
      if (lowercaseEmail === 'student@gg.com' || lowercaseEmail.includes('student')) {
        const dummy = await handleSimulatedDemo('student');
        const customUser: UserProfile = {
          ...dummy,
          email: lowercaseEmail,
          name: 'Scholar Student',
          status: 'approved' as const
        };
        localStorage.setItem('local_running_session', JSON.stringify(customUser));
        setCurrentUser(customUser);
        showToast("Logged in successfully as Student Scholar!", "success");
        return customUser;
      } else if (lowercaseEmail === 'tutor@gg.com' || lowercaseEmail.includes('tutor')) {
        const dummy = await handleSimulatedDemo('tutor');
        const customUser = {
          ...dummy,
          email: lowercaseEmail,
          name: 'Faculty Tutor'
        };
        localStorage.setItem('local_running_session', JSON.stringify(customUser));
        setCurrentUser(customUser);
        showToast("Logged in successfully as Faculty Tutor!", "success");
        return customUser;
      } else if (lowercaseEmail === 'admin@gg.com' || lowercaseEmail.includes('admin')) {
        const dummy = await handleSimulatedDemo('admin');
        const customUser = {
          ...dummy,
          email: lowercaseEmail,
          name: 'Academy Administrator'
        };
        localStorage.setItem('local_running_session', JSON.stringify(customUser));
        setCurrentUser(customUser);
        showToast("Logged in successfully as Academy Administrator!", "success");
        return customUser;
      }

      // 4. Default Fallback: Allow login from ANY custom domain!
      const dummy = await handleSimulatedDemo('student');
      const emailPrefix = lowercaseEmail.split('@')[0] || 'scholar';
      const displayName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
      
      const customUser: UserProfile = {
        ...dummy,
        email: lowercaseEmail,
        name: `${displayName} Student`,
        displayName: displayName,
        status: 'approved' as const
      };
      
      localStorage.setItem('local_running_session', JSON.stringify(customUser));
      setCurrentUser(customUser);
      showToast(`Logged in successfully with '${lowercaseEmail}'!`, "success");
      return customUser;
    }
  };

  // Registration handler
  const registerWithEmail = async (
    email: string, 
    pass: string, 
    name: string, 
    role: 'student' | 'tutor', 
    additionalData: any = {}
  ): Promise<UserProfile> => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const profile = await firestoreService.createUserProfile(cred.user.uid, {
        email,
        name,
        role,
        ...additionalData
      });
      setCurrentUser(profile);
      showToast(`Registration complete! Welcome, ${name}.`, "success");
      return profile;
    } catch (e: any) {
      setLoading(false);
      // Fallback: If cloud auth registration rejects, create a fully dynamic offline role session!
      console.warn("Creating highly resilient local registration session.", e);
      const localId = "local_user_" + Math.random().toString(36).substr(2, 9);
      const profile = await firestoreService.createUserProfile(localId, {
        email,
        name,
        role,
        ...additionalData
      });
      localStorage.setItem('local_running_session', JSON.stringify(profile));
      setCurrentUser(profile);
      showToast("Registered successfully (Local Dev Mode active)!", "success");
      return profile;
    }
  };

  // Logout wrapper
  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Firebase Auth signOut skipped or offline", e);
    }
    localStorage.removeItem('local_running_session');
    setCurrentUser(null);
    setNotifications([]);
    showToast("Logged out successfully.", "info");
    setLoading(false);
  };

  // Auto handle offline local demo logins
  const handleSimulatedDemo = async (role: 'student' | 'tutor' | 'admin'): Promise<UserProfile> => {
    let dummyId = 'student_demo';
    if (role === 'tutor') dummyId = 'tutor_sarah';
    if (role === 'admin') dummyId = 'admin_demo';

    const profile = await firestoreService.getUserProfile(dummyId);
    if (profile) {
      localStorage.setItem('local_running_session', JSON.stringify(profile));
      setCurrentUser(profile);
      const nots = await firestoreService.getNotifications(profile.uid);
      setNotifications(nots);
      showToast(`Logged into ${role} workspace as ${profile.name}! (Sandbox active)`, "success");
      setLoading(false);
      return profile;
    }
    throw new Error(`Critical: Profile for roles ${role} could not be completed.`);
  };

  // One-click demo triggers
  const triggerDemoSession = async (role: 'student' | 'tutor' | 'admin'): Promise<UserProfile> => {
    setLoading(true);
    return handleSimulatedDemo(role);
  };

  const updateNotificationSettings = (settings: Partial<NotificationSettings>) => {
    setNotificationSettings(prev => ({ ...prev, ...settings }));
    showToast("Notification settings modified successfully.", "success");
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    try {
      await firestoreService.updateUserProfile(currentUser.uid, updates);
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (e: any) {
      throw new Error(e.message || "Failed to update profile attributes.");
    }
  };

  const refreshUserProfile = async () => {
    if (!currentUser) return;
    try {
      const latestProfile = await firestoreService.getUserProfile(currentUser.uid);
      if (latestProfile) {
        setCurrentUser(latestProfile);
        localStorage.setItem('local_running_session', JSON.stringify(latestProfile));
      }
    } catch (e) {
      console.warn("Failed user profile reload.", e);
    }
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      loading,
      cloudSync,
      notifications,
      notificationSettings,
      toast,
      showToast,
      hideToast,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      logout,
      triggerDemoSession,
      refreshNotifications,
      updateNotificationSettings,
      classes,
      refreshClasses,
      syncClasses: firestoreService.getClasses,
      updateProfile,
      refreshUserProfile
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used inside the AppProvider element context.');
  }
  return context;
};
