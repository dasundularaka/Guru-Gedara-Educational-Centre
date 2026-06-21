import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../lib/firestoreService';
import { UserProfile, ClassItem, Booking, Payment } from '../types';
import { 
  Users, 
  CreditCard, 
  BookOpen, 
  TrendingUp, 
  ShieldCheck, 
  Search, 
  Settings, 
  Plus, 
  AlertCircle, 
  CheckCircle,
  Megaphone,
  Sliders,
  DollarSign,
  UserCheck,
  Edit,
  Trash2,
  X,
  PlusCircle
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { currentUser, showToast, refreshClasses } = useApp();
  const [activeTab, setActiveTab] = useState<'payments' | 'students' | 'tutors' | 'classes' | 'notices' | 'admins'>('payments');
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [paymentsList, setPaymentsList] = useState<Payment[]>([]);
  const [bookingsList, setBookingsList] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter handles
  const [paySearchQuery, setPaySearchQuery] = useState("");
  const [payStatusFilter, setPayStatusFilter] = useState("all");

  // Student specific filters (separate name and username)
  const [studentSearchName, setStudentSearchName] = useState("");
  const [studentSearchUsername, setStudentSearchUsername] = useState("");

  // Tutor specific filters (separate name and username)
  const [tutorSearchName, setTutorSearchName] = useState("");
  const [tutorSearchUsername, setTutorSearchUsername] = useState("");

  // Reusable custom delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'student' | 'tutor' | 'class' | 'payment';
    id: string;
    title: string;
  }>({
    isOpen: false,
    type: 'student',
    id: '',
    title: ''
  });

  // Announcement fields
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [noticeTarget, setNoticeTarget] = useState<'all' | 'students' | 'tutors'>('all');
  const [sendingNotice, setSendingNotice] = useState(false);

  // Admin Editing Modal configurations
  const [modalType, setModalType] = useState<'student' | 'tutor' | 'class' | 'payment' | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields State
  // Student & Tutor fields
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [studentGrade, setStudentGrade] = useState("Grade 11");
  const [studentParentContact, setStudentParentContact] = useState("");
  const [studentGender, setStudentGender] = useState<'male' | 'female'>('male');
  const [studentSelectedClasses, setStudentSelectedClasses] = useState<string[]>([]);
  const [tutorBio, setTutorBio] = useState("");
  const [tutorSubjects, setTutorSubjects] = useState("General Science, Algebra");
  const [tutorHourlyRate, setTutorHourlyRate] = useState("45");
  const [tutorExperience, setTutorExperience] = useState("5");
  const [tutorQualification, setTutorQualification] = useState("M.Sc. in Physics");

  // Class fields
  const [classTitle, setClassTitle] = useState("");
  const [classSubject, setClassSubject] = useState("");
  const [classSchedule, setClassSchedule] = useState("Saturdays 10:00 AM - 12:00 PM");
  const [classDayOfWeek, setClassDayOfWeek] = useState("Saturday");
  const [classTimeSlot, setClassTimeSlot] = useState("10:00 AM");
  const [classPrice, setClassPrice] = useState("120");
  const [classDescription, setClassDescription] = useState("");
  const [classMaxSlots, setClassMaxSlots] = useState("20");
  const [classBookedSlots, setClassBookedSlots] = useState("0");
  const [classTutorId, setClassTutorId] = useState("");

  // Payment fields
  const [paymentStudentId, setPaymentStudentId] = useState("");
  const [paymentClassId, setPaymentClassId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("120");
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending' | 'failed'>('paid');
  const [paymentMethod, setPaymentMethod] = useState("Credit Card");

  // Admin creation states
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminDisplayName, setNewAdminDisplayName] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminGender, setNewAdminGender] = useState<'male' | 'female'>('male');
  const [newAdminPhoto, setNewAdminPhoto] = useState('');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  // Admin search states
  const [adminNameQuery, setAdminNameQuery] = useState('');
  const [adminUserQuery, setAdminUserQuery] = useState('');

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim() || !newAdminName.trim() || !newAdminPassword.trim()) {
      showToast("Email, Full Name, and Password are required fields.", "error");
      return;
    }

    setIsCreatingAdmin(true);
    try {
      const randomNumbers = Math.floor(10000000 + Math.random() * 90000000);
      const generatedUsername = `GA${randomNumbers}`;

      const adminUid = `admin_gen_${Date.now()}`;
      await firestoreService.createUserProfile(adminUid, {
        email: newAdminEmail.trim(),
        name: newAdminName.trim(),
        displayName: newAdminDisplayName.trim() || newAdminName.trim(),
        phone: newAdminPhone.trim(),
        gender: newAdminGender,
        role: 'admin',
        photoURL: newAdminPhoto.trim() || (newAdminGender === 'male' 
          ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
          : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'),
        password: newAdminPassword.trim(),
        username: generatedUsername,
        status: 'approved'
      });

      setNewAdminEmail('');
      setNewAdminName('');
      setNewAdminDisplayName('');
      setNewAdminPassword('');
      setNewAdminPhone('');
      setNewAdminPhoto('');
      
      await fetchAdminDatasets();
      showToast("New Administration account provisioned successfully!", "success");
    } catch (err: any) {
      showToast("Failed to provision admin account: " + err.message, "error");
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const fetchAdminDatasets = async () => {
    setLoading(true);
    try {
      const allUsers = await firestoreService.getAllUsers();
      setUsers(allUsers);

      const allClass = await firestoreService.getClasses();
      setClassesList(allClass);

      const allPays = await firestoreService.getPayments();
      setPaymentsList(allPays);

      const allBook = await firestoreService.getBookings();
      setBookingsList(allBook);
    } catch (e) {
      console.warn("Failed index mapping of site admin data pools", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminDatasets();
  }, []);

  const handleUpdatePaymentStatus = async (paymentId: string, status: 'paid' | 'failed' | 'pending') => {
    try {
      await firestoreService.updatePaymentStatus(paymentId, status);
      showToast(`Financial ledger receipt ID ${paymentId} updated as: ${status.toUpperCase()}`, "success");
      await fetchAdminDatasets();
    } catch {
      showToast("Ledger edit failed.", "error");
    }
  };

  const handleLaunchAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeMessage.trim()) {
      showToast("Fields can't be empty.", "error");
      return;
    }

    setSendingNotice(true);
    try {
      let targets: UserProfile[] = [];
      if (noticeTarget === 'students') {
        targets = users.filter(u => u.role === 'student');
      } else if (noticeTarget === 'tutors') {
        targets = users.filter(u => u.role === 'tutor');
      } else {
        targets = users; // all
      }

      for (const t of targets) {
        await firestoreService.triggerNotification(
          t.uid,
          `[Faculty Alert] ${noticeTitle}`,
          noticeMessage,
          'announcement'
        );
      }

      showToast(`Campaign notice deployed to ${targets.length} registered accounts!`, "success");
      setNoticeTitle("");
      setNoticeMessage("");
    } catch (e) {
      showToast("Failed to launch global bulletin alerts.", "error");
    } finally {
      setSendingNotice(false);
    }
  };

  // Reset form helper
  const resetFormStates = () => {
    setEditingId(null);
    setUserName("");
    setUserEmail("");
    setUserPhone("");
    setStudentGrade("11");
    setStudentParentContact("");
    setStudentGender('male');
    setStudentSelectedClasses([]);
    setTutorBio("");
    setTutorSubjects("General Science, Algebra");
    setTutorHourlyRate("45");
    setTutorExperience("5");
    setTutorQualification("M.Sc. in Physics");

    setClassTitle("");
    setClassSubject("Calculus");
    setClassSchedule("Saturdays 10:00 AM - 12:00 PM");
    setClassDayOfWeek("Saturday");
    setClassTimeSlot("10:00 AM");
    setClassPrice("120");
    setClassDescription("");
    setClassMaxSlots("20");
    setClassBookedSlots("0");
    setClassTutorId("");

    setPaymentStudentId("");
    setPaymentClassId("");
    setPaymentAmount("120");
    setPaymentStatus("paid");
    setPaymentMethod("Credit Card");
  };

  // Actions Opening modals helper
  const openAddModal = (type: 'student' | 'tutor' | 'class' | 'payment') => {
    resetFormStates();
    setModalType(type);
    setModalMode('add');
    
    // Set first default values if options exists in records
    const students = users.filter(u => u.role === 'student');
    if (students.length > 0) setPaymentStudentId(students[0].uid);
    
    const tutors = users.filter(u => u.role === 'tutor');
    if (tutors.length > 0) {
      setClassTutorId(tutors[0].uid);
    }
    
    if (classesList.length > 0) setPaymentClassId(classesList[0].id);
  };

  const openEditModal = (type: 'student' | 'tutor' | 'class' | 'payment', item: any) => {
    resetFormStates();
    setModalType(type);
    setModalMode('edit');
    setEditingId(item.id || item.uid);

    if (type === 'student') {
      setUserName(item.name || "");
      setUserEmail(item.email || "");
      setUserPhone(item.phone || "");
      setStudentGrade(item.studentDetails?.grade || "11");
      setStudentParentContact(item.studentDetails?.parentContact || "");
      setStudentGender(item.gender || 'male');
      setStudentSelectedClasses(item.selectedClasses || []);
    } else if (type === 'tutor') {
      setUserName(item.name || "");
      setUserEmail(item.email || "");
      setUserPhone(item.phone || "");
      setTutorBio(item.tutorDetails?.bio || "");
      setTutorSubjects(item.tutorDetails?.subjects?.join(", ") || "");
      setTutorHourlyRate(String(item.tutorDetails?.hourlyRate || 45));
      setTutorExperience(String(item.tutorDetails?.experience || 5));
      setTutorQualification(item.tutorDetails?.qualification || "");
    } else if (type === 'class') {
      setClassTitle(item.title || "");
      setClassSubject(item.subject || "");
      setClassSchedule(item.schedule || "");
      setClassDayOfWeek(item.dayOfWeek || "");
      setClassTimeSlot(item.timeSlot || "");
      setClassPrice(String(item.price || 120));
      setClassDescription(item.description || "");
      setClassMaxSlots(String(item.maxSlots || 20));
      setClassBookedSlots(String(item.bookedSlots || 0));
      setClassTutorId(item.tutorId || "");
    } else if (type === 'payment') {
      setPaymentStudentId(item.studentId || "");
      setPaymentClassId(item.classId || "");
      setPaymentAmount(String(item.amount || 120));
      setPaymentStatus(item.status || "paid");
      setPaymentMethod(item.paymentMethod || "Credit Card");
    }
  };

  // Student approvals and username generation helpers
  const handleApproveStudent = async (studentId: string, gender: 'male' | 'female' | undefined) => {
    try {
      const allUsers = await firestoreService.getAllUsers();
      const g = gender || 'male';
      const prefix = g === 'male' ? 'GB' : 'GG';
      let uniqueUsername = "";
      let attempts = 0;
      while (attempts < 100) {
        const num = Math.floor(10000000 + Math.random() * 90000000).toString();
        const candidate = prefix + num;
        if (!allUsers.some(u => u.username === candidate)) {
          uniqueUsername = candidate;
          break;
        }
        attempts++;
      }
      if (!uniqueUsername) uniqueUsername = prefix + Math.floor(10000000 + Math.random() * 90000000).toString();

      await firestoreService.updateTutorProfile(studentId, {
        status: 'approved',
        username: uniqueUsername
      });

      showToast(`Student approved! System generated identifier allocated: ${uniqueUsername}`, "success");
      
      // Auto trigger notification
      await firestoreService.triggerNotification(
        studentId,
        "Account Intake Approved!",
        `Good news! Your Guru Gedara student profile has been manually approved by the administrator. Your immutable account username identifier is ${uniqueUsername}.`,
        "announcement"
      );
      
      await fetchAdminDatasets();
    } catch (e: any) {
      showToast(e.message || "Failed student manual approval.", "error");
    }
  };

  const handleAssignTutorUsername = async (tutorId: string) => {
    try {
      const allUsers = await firestoreService.getAllUsers();
      let uniqueUsername = "";
      let attempts = 0;
      while (attempts < 100) {
        const num = Math.floor(10000000 + Math.random() * 90000000).toString();
        const candidate = "GT" + num;
        if (!allUsers.some(u => u.username === candidate)) {
          uniqueUsername = candidate;
          break;
        }
        attempts++;
      }
      if (!uniqueUsername) uniqueUsername = "GT" + Math.floor(10000000 + Math.random() * 90000000).toString();

      await firestoreService.updateTutorProfile(tutorId, {
        username: uniqueUsername
      });

      showToast(`Tutor system identifier GT allocated: ${uniqueUsername}`, "success");
      await fetchAdminDatasets();
    } catch (e: any) {
      showToast(e.message || "Failed tutor identifier allocation.", "error");
    }
  };

  // handleDelete closures which open standard state-driven eye comfortable confirmation modal
  const handleDeleteStudent = (uid: string, name: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'student',
      id: uid,
      title: name
    });
  };

  const handleDeleteTutor = (uid: string, name: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'tutor',
      id: uid,
      title: name
    });
  };

  const handleDeleteClass = (classId: string, title: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'class',
      id: classId,
      title: title
    });
  };

  const handleDeletePayment = (paymentId: string, label: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'payment',
      id: paymentId,
      title: label
    });
  };

  const executeDeletion = async () => {
    const { type, id } = deleteConfirm;
    if (!id) return;
    try {
      if (type === 'student') {
        await firestoreService.deleteUserProfile(id);
        showToast("Student profile successfully deleted.", "success");
      } else if (type === 'tutor') {
        await firestoreService.deleteUserProfile(id);
        showToast("Tutor faculty profile successfully deleted.", "success");
      } else if (type === 'class') {
        await firestoreService.deleteClass(id);
        showToast("Course curriculum successfully deleted.", "success");
        await refreshClasses();
      } else if (type === 'payment') {
        await firestoreService.deletePayment(id);
        showToast("Ledger transaction record deleted successfully.", "success");
      }
      setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
      await fetchAdminDatasets();
    } catch {
      showToast(`Failed to delete selected ${type} record.`, "error");
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (modalType === 'student') {
        const studentDetails = {
          grade: studentGrade,
          parentContact: studentParentContact,
          interests: []
        };
        const uProfile: Partial<UserProfile> = {
          name: userName,
          displayName: userName, // Ensure display name is also updated to mirror full name options by default
          email: userEmail,
          phone: userPhone,
          role: 'student',
          gender: studentGender,
          selectedClasses: studentSelectedClasses,
          studentDetails
        };
        if (modalMode === 'add') {
          const generatedUid = "stud_" + Math.random().toString(36).substr(2, 9);
          // Set registration status to approved since it was explicitly added by Admin
          uProfile.status = 'approved';
          
          // Generate a system generated immutable username format based on gender biography set as well
          const allUsers = await firestoreService.getAllUsers();
          const prefix = studentGender === 'male' ? 'GB' : 'GG';
          let uniqueUsername = "";
          let attempts = 0;
          while (attempts < 100) {
            const num = Math.floor(10000000 + Math.random() * 90000000).toString();
            const candidate = prefix + num;
            if (!allUsers.some(u => u.username === candidate)) {
              uniqueUsername = candidate;
              break;
            }
            attempts++;
          }
          if (!uniqueUsername) uniqueUsername = prefix + Math.floor(10000000 + Math.random() * 90000000).toString();
          uProfile.username = uniqueUsername;

          await firestoreService.createUserProfile(generatedUid, uProfile);
          showToast(`Student profile '${userName}' enrolled with system identifier: ${uniqueUsername}`, "success");
        } else {
          await firestoreService.updateUserProfile(editingId!, uProfile);
          showToast(`Student profile updated.`, "success");
        }
      } else if (modalType === 'tutor') {
        const tutorDetails = {
          bio: tutorBio,
          subjects: tutorSubjects.split(",").map(s => s.trim()),
          experience: Number(tutorExperience) || 5,
          qualification: tutorQualification,
          hourlyRate: Number(tutorHourlyRate) || 45,
          rating: 5.0,
          availability: [{ day: "Monday", slots: ["10:00 AM", "02:00 PM"] }]
        };
        const uProfile: Partial<UserProfile> = {
          name: userName,
          email: userEmail,
          phone: userPhone,
          role: 'tutor',
          tutorDetails
        };
        if (modalMode === 'add') {
          const generatedUid = "tut_" + Math.random().toString(36).substr(2, 9);
          await firestoreService.createUserProfile(generatedUid, uProfile);
          showToast(`Tutor profile '${userName}' created successfully.`, "success");
        } else {
          await firestoreService.updateUserProfile(editingId!, uProfile);
          showToast(`Tutor profile updated.`, "success");
        }
      } else if (modalType === 'class') {
        const selectedTutorObj = users.find(u => u.uid === classTutorId);
        const tName = selectedTutorObj ? selectedTutorObj.name : "Faculty Tutor";
        const cDetails = {
          title: classTitle,
          subject: classSubject,
          description: classDescription,
          schedule: classSchedule,
          dayOfWeek: classDayOfWeek,
          timeSlot: classTimeSlot,
          price: Number(classPrice) || 120,
          maxSlots: Number(classMaxSlots) || 20,
          bookedSlots: Number(classBookedSlots) || 0,
          tutorId: classTutorId,
          tutorName: tName
        };
        if (modalMode === 'add') {
          await firestoreService.createNewClass(cDetails);
          showToast(`Course class '${classTitle}' published successfully.`, "success");
        } else {
          await firestoreService.updateClass(editingId!, cDetails);
          showToast(`Course class updated.`, "success");
        }
        await refreshClasses();
      } else if (modalType === 'payment') {
        const studentObj = users.find(u => u.uid === paymentStudentId);
        const classObj = classesList.find(c => c.id === paymentClassId);
        const sName = studentObj ? studentObj.name : "Academy Scholar";
        const cTitle = classObj ? classObj.title : "Syllabus Course";
        
        const pDetails = {
          studentId: paymentStudentId,
          studentName: sName,
          classId: paymentClassId,
          classTitle: cTitle,
          amount: Number(paymentAmount) || 120,
          status: paymentStatus,
          paymentMethod,
          date: new Date().toISOString()
        };
        if (modalMode === 'add') {
          await firestoreService.createPayment(
            paymentStudentId,
            sName,
            paymentClassId,
            cTitle,
            Number(paymentAmount) || 120,
            paymentMethod,
            paymentStatus
          );
          showToast(`Tuition payment ledger transaction added successfully.`, "success");
        } else {
          await firestoreService.updatePayment(editingId!, pDetails);
          showToast(`Ledger record updated.`, "success");
        }
      }
      setModalType(null);
      await fetchAdminDatasets();
    } catch (err) {
      showToast("Administrative saving command failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Financial summary tallies
  const totalCollectedRevenue = paymentsList
    .filter(p => p.status === 'paid')
    .reduce((totals, current) => totals + current.amount, 0);

  const successTransactionsCount = paymentsList.filter(p => p.status === 'paid').length;
  const successPcnt = paymentsList.length > 0 
    ? Math.round((successTransactionsCount / paymentsList.length) * 100) 
    : 100;

  // Payments filter matching
  const matchingPayments = paymentsList.filter(p => {
    const matchesSearch = p.studentName.toLowerCase().includes(paySearchQuery.toLowerCase()) || p.classTitle.toLowerCase().includes(paySearchQuery.toLowerCase());
    const matchesStatus = payStatusFilter === 'all' || p.status === payStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-gray-50/50 min-h-screen py-10" id="admin_workspace">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Workspace Title Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-red-600 font-mono uppercase tracking-widest block leading-none">Management Office</span>
            <h1 className="text-3xl font-extrabold text-blue-955 tracking-tight mt-3">Academy Administration</h1>
            <p className="text-xs text-gray-400 mt-1">Schedules control logs • Global Ledger ledger • Sync nodes: ONLINE</p>
          </div>

          {/* Sub menu controls */}
          <div className="flex flex-wrap gap-1.5 bg-white border border-gray-100 p-1.5 rounded-xl text-xs font-bold text-gray-500 shadow-sm">
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'payments' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-50'}`}
            >
              <CreditCard className="w-4 h-4" /> Global Ledger Ledger
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'students' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-50'}`}
            >
              <Users className="w-4 h-4" /> Scholars
            </button>
            <button
              onClick={() => setActiveTab('tutors')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'tutors' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-50'}`}
            >
              <UserCheck className="w-4 h-4" /> Faculty
            </button>
            <button
              onClick={() => setActiveTab('classes')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'classes' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-50'}`}
            >
              <BookOpen className="w-4 h-4" /> Curriculums
            </button>
            <button
              onClick={() => setActiveTab('notices')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'notices' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-50'}`}
            >
              <Megaphone className="w-4 h-4" /> Deploy Notices
            </button>
            <button
              onClick={() => setActiveTab('admins')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'admins' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-50'}`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Administrative Staff
            </button>
          </div>
        </div>

        {/* Aggregate statistics bento bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          
          {/* Revenue */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-105 flex items-center justify-center">
              <DollarSign className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-widest block leading-none">Gross Tuition collected</span>
              <span className="text-xl font-extrabold text-blue-950 block mt-1.5 leading-none font-mono">LKR {totalCollectedRevenue}</span>
            </div>
          </div>

          {/* Bookings */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 border border-purple-105 flex items-center justify-center">
              <BookOpen className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-widest block leading-none">Syllabus Class Bookings</span>
              <span className="text-xl font-extrabold text-gray-900 block mt-1.5 leading-none font-mono">{bookingsList.length} Active Slots</span>
            </div>
          </div>

          {/* Scholars */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-105 flex items-center justify-center">
              <Users className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-widest block leading-none">Scholars Enrolled</span>
              <span className="text-xl font-extrabold text-gray-900 block mt-1.5 leading-none font-mono">{users.filter(u => u.role==='student').length} Accounts</span>
            </div>
          </div>

          {/* Collection Status */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-105 flex items-center justify-center">
              <TrendingUp className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-widest block leading-none">Ledger Recovery Yield</span>
              <span className="text-xl font-extrabold text-emerald-600 block mt-1.5 leading-none font-mono">{successPcnt}% recovery</span>
            </div>
          </div>

        </div>

        {/* Dynamic Inner displays */}
        {loading && users.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-xs">
            Querying server administrative clusters...
          </div>
        ) : (
          <div className="animate-fade-in text-xs">
            
            {/* Tab 1: Ledger & Payments logs */}
            {activeTab === 'payments' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 space-y-4">
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-gray-950 flex items-center gap-1.5">
                      <CreditCard className="w-5 h-5 text-blue-550" />
                      Gross Tuition Class Ledger Receipts
                    </h3>
                    <p className="text-[10px] text-gray-450 mt-0.5">Manage, add, modify or delete ledger invoice transactions</p>
                  </div>

                  {/* Filters handles */}
                  <div className="flex flex-wrap gap-2.5 items-center w-full sm:w-auto">
                    <button 
                      onClick={() => openAddModal('payment')}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all flex items-center gap-1 cursor-pointer text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Ledger Record
                    </button>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-2.5 flex items-center text-gray-400">
                        <Search className="w-3.5 h-3.5" />
                      </span>
                      <input 
                        type="text" 
                        value={paySearchQuery}
                        onChange={(e) => setPaySearchQuery(e.target.value)}
                        placeholder="Search student or class name..."
                        className="text-xs pl-8.5 pr-2.5 py-1.5 rounded-lg border border-gray-200 outline-none w-52 font-sans"
                      />
                    </div>
                    <select
                      value={payStatusFilter}
                      onChange={(e) => setPayStatusFilter(e.target.value)}
                      className="text-xs rounded-lg border border-gray-200 px-2 py-1.5 outline-none font-sans"
                    >
                      <option value="all">Logs: All status</option>
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>

                {/* Ledger Table logs */}
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-100 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                        <th className="p-3">Ref ID</th>
                        <th className="p-3">Scholars</th>
                        <th className="p-3">Course / Class</th>
                        <th className="p-3">Tuition Cost</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Ledger Adjustment Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {matchingPayments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-400">
                            No ledger logs match selected filters.
                          </td>
                        </tr>
                      ) : (
                        matchingPayments.map((p) => {
                          const isPaid = p.status === 'paid';
                          const isFailed = p.status === 'failed';
                          const isPending = p.status === 'pending';
                          return (
                            <tr key={p.id} className="hover:bg-gray-50/50">
                              <td className="p-3 font-mono font-bold text-gray-400">{p.id}</td>
                              <td className="p-3 font-bold text-gray-900">{p.studentName}</td>
                              <td className="p-3 text-gray-650 truncate max-w-xs font-medium" title={p.classTitle}>{p.classTitle}</td>
                              <td className="p-3 font-mono font-bold text-blue-700">${p.amount}.00</td>
                              <td className="p-3">
                                {isPaid && <span className="inline-block py-0.5 px-2 bg-emerald-50 text-emerald-700 rounded-full font-bold">Paid</span>}
                                {isFailed && <span className="inline-block py-0.5 px-2 bg-red-50 text-red-700 rounded-full font-bold">Failed</span>}
                                {isPending && <span className="inline-block py-0.5 px-2 bg-yellow-50 text-yellow-800 rounded-full font-bold">Pending</span>}
                              </td>
                              <td className="p-3">
                                <div className="flex gap-1.5">
                                  {!isPaid && (
                                    <button 
                                      onClick={() => handleUpdatePaymentStatus(p.id, 'paid')}
                                      className="py-1 px-2.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold hover:bg-emerald-100 cursor-pointer text-[10px]"
                                    >
                                      Approve Paid
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => openEditModal('payment', p)}
                                    className="p-1 rounded bg-gray-50 hover:bg-gray-100 border border-gray-150 text-blue-600"
                                    title="Edit payment details"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeletePayment(p.id, p.classTitle || "Transaction Record") }
                                    className="p-1 rounded bg-red-50 hover:bg-red-100 border border-red-105 text-red-600"
                                    title="Delete transaction record"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* Tab 2: Registered Student scholars */}
            {activeTab === 'students' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-3 border-gray-50">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                      <Users className="w-5 h-5 text-blue-500" /> Registered Students scholars ({users.filter(u => u.role === 'student').length})
                    </h3>
                    <p className="text-[10px] text-gray-400">Enroll new student scholar accounts, edit positions or remove profiles</p>
                  </div>
                  <button 
                    onClick={() => openAddModal('student')}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Student Account
                  </button>
                </div>

                {/* Independent Filtering Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-550 uppercase font-mono mb-1">Filter by Full Name:</label>
                    <input 
                      type="text"
                      placeholder="Search name..."
                      value={studentSearchName}
                      onChange={(e) => setStudentSearchName(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-200 focus:border-indigo-550 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-550 uppercase font-mono mb-1">Filter by Username (Student ID):</label>
                    <input 
                      type="text"
                      placeholder="Search username (e.g. GB00000000)..."
                      value={studentSearchUsername}
                      onChange={(e) => setStudentSearchUsername(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-200 focus:border-indigo-550 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {users
                    .filter(u => u.role === 'student')
                    .filter(stud => {
                      const nameMatch = !studentSearchName.trim() || stud.name.toLowerCase().includes(studentSearchName.toLowerCase());
                      const usernameMatch = !studentSearchUsername.trim() || (stud.username || '').toLowerCase().includes(studentSearchUsername.toLowerCase());
                      return nameMatch && usernameMatch;
                    })
                    .map((stud) => {
                      const isPending = stud.status === 'pending';
                      const preferredTitles = (stud.selectedClasses || []).map(cid => classesList.find(c => c.id === cid)?.title || cid).filter(Boolean);
                    
                    return (
                      <div 
                        key={stud.uid} 
                        className={`p-4 border rounded-xl flex flex-col justify-between transition-all hover:border-indigo-200 ${
                          isPending ? 'bg-amber-50/40 border-amber-200 shadow-sm shadow-amber-50/50' : 'bg-gray-50/40 border-gray-150'
                        }`}
                      >
                        <div className="flex gap-3.5 items-start">
                          {stud.photoURL ? (
                            <img className="h-10 w-10 rounded-full object-cover border border-gray-250 flex-shrink-0" src={stud.photoURL} alt="" />
                          ) : (
                            <div className="h-10 w-10 bg-indigo-150 text-indigo-850 flex items-center justify-center font-bold text-sm rounded-full flex-shrink-0">
                              {stud.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-gray-950 leading-snug">{stud.name}</h4>
                              {isPending ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider">
                                  Pending Intake
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider">
                                  Active Approved
                                </span>
                              )}
                            </div>
                            
                            <p className="text-gray-500 font-mono text-[10px]">{stud.email}</p>
                            
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-gray-650 pt-1 leading-snug">
                              <p>Phone: <span className="font-bold text-slate-800">{stud.phone || 'N/A'}</span></p>
                              <p>Gender: <span className="font-bold text-slate-800 capitalize">{stud.gender || 'male'}</span></p>
                              <p className="col-span-2">Address: <span className="font-semibold text-slate-800">{stud.address || 'N/A'}</span></p>
                              <p className="col-span-2">Guardian: <span className="font-bold text-slate-800">{stud.guardianName || 'N/A'}</span> ({stud.guardianPhone || 'N/A'})</p>
                            </div>

                            <div className="flex gap-1.5 flex-wrap pt-1 items-center">
                              <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-150 rounded text-[9px] font-extrabold">
                                {stud.studentDetails?.grade || stud.grade || 'Grade 11'}
                              </span>
                              {stud.username && (
                                <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-800 border border-slate-205 rounded font-mono text-[9px] font-black">
                                  ID: {stud.username}
                                </span>
                              )}
                            </div>

                            {preferredTitles.length > 0 && (
                              <div className="pt-1">
                                <span className="block text-[10px] font-bold text-indigo-750 uppercase tracking-wide">Preferred Classes:</span>
                                <p className="text-[10px] text-slate-500 italic mt-0.5 leading-tight">{preferredTitles.join(', ')}</p>
                              </div>
                            )}

                            {isPending && (
                              <button
                                onClick={() => handleApproveStudent(stud.uid, stud.gender)}
                                className="mt-2 w-full py-2 px-3 bg-slate-900 border border-slate-950 text-white rounded-xl text-xs font-black hover:bg-slate-950 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                Approve & Generate Username
                              </button>
                            )}
                            {stud.pendingPhotoURL && (
                              <div className="mt-3 p-3 bg-amber-50/70 border border-amber-205 rounded-xl space-y-2">
                                <span className="block text-[10px] font-black text-amber-800 uppercase tracking-widest font-mono">
                                  📸 Proposed Photo Change
                                </span>
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <img src={stud.photoURL || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150"} className="w-10 h-10 rounded-full object-cover border border-slate-200" title="Current Active Photo" />
                                    <span className="absolute -bottom-1 -right-1 text-red-500 bg-white rounded-full px-1 text-[8px] font-bold shadow-sm border border-slate-100">Old</span>
                                  </div>
                                  <span className="text-slate-400 font-mono text-xs">&rarr;</span>
                                  <div className="relative">
                                    <img src={stud.pendingPhotoURL} className="w-10 h-10 rounded-full object-cover border-2 border-amber-400" title="Proposed New Photo" />
                                    <span className="absolute -bottom-1 -right-1 text-emerald-500 bg-white rounded-full px-1 text-[8px] font-bold shadow-sm border border-slate-100">New</span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={async () => {
                                      try {
                                        await firestoreService.updateUserProfile(stud.uid, {
                                          photoURL: stud.pendingPhotoURL,
                                          pendingPhotoURL: ""
                                        });
                                        await fetchAdminDatasets();
                                        showToast("Scholar profile photo verified and saved successfully!", "success");
                                      } catch (err: any) {
                                        showToast("Failed to approve photo: " + err.message, "error");
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-xs"
                                  >
                                    Accept Photo
                                  </button>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await firestoreService.updateUserProfile(stud.uid, {
                                          pendingPhotoURL: ""
                                        });
                                        await fetchAdminDatasets();
                                        showToast("Proposed picture was rejected and removed.", "info");
                                      } catch (err: any) {
                                        showToast("Failed to reject: " + err.message, "error");
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                                  >
                                    Reject photo
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Action Controls */}
                        <div className="flex justify-end gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                          <button 
                            onClick={() => openEditModal('student', stud)}
                            className="p-1 px-2.5 rounded-lg bg-white hover:bg-gray-100 border border-gray-200 text-blue-600 cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                            title="Edit scholar profile"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteStudent(stud.uid, stud.name)}
                            className="p-1 px-2.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 text-red-650 cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                            title="Withdraw/Delete scholar account"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 3: Verified Tutors */}
            {activeTab === 'tutors' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 font-sans">
                <div className="flex justify-between items-center border-b pb-3 border-gray-50 animate-fade-in font-sans">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-5 h-5 text-indigo-650" /> Board Certified Tuition Faculty ({users.filter(u => u.role==='tutor').length})
                    </h3>
                    <p className="text-[10px] text-gray-400 font-sans">Register new tutors, edit qualifications and define hourly pay metrics</p>
                  </div>
                  <button 
                    onClick={() => openAddModal('tutor')}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Faculty Tutor
                  </button>
                </div>

                {/* Independent Filtering Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-550 uppercase font-mono mb-1">Filter by Full Name:</label>
                    <input 
                      type="text"
                      placeholder="Search tutor name..."
                      value={tutorSearchName}
                      onChange={(e) => setTutorSearchName(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-200 focus:border-indigo-550 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-550 uppercase font-mono mb-1">Filter by Username (Tutor ID):</label>
                    <input 
                      type="text"
                      placeholder="Search username (e.g. GT00000000)..."
                      value={tutorSearchUsername}
                      onChange={(e) => setTutorSearchUsername(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-200 focus:border-indigo-550 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {users
                    .filter(u => u.role === 'tutor')
                    .filter(tut => {
                      const nameMatch = !tutorSearchName.trim() || tut.name.toLowerCase().includes(tutorSearchName.toLowerCase());
                      const usernameMatch = !tutorSearchUsername.trim() || (tut.username || '').toLowerCase().includes(tutorSearchUsername.toLowerCase());
                      return nameMatch && usernameMatch;
                    })
                    .map((tut) => (
                    <div 
                      key={tut.uid} 
                      className="p-4 border border-emerald-100/60 rounded-xl bg-slate-50/40 flex flex-col justify-between transition-all hover:border-indigo-150"
                    >
                      <div className="flex gap-3.5 items-start">
                        {tut.photoURL ? (
                          <img className="h-10 w-10 rounded-full object-cover border border-emerald-150 flex-shrink-0" src={tut.photoURL} alt="" />
                        ) : (
                          <div className="h-10 w-10 bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm rounded-full flex-shrink-0">
                            TJ
                          </div>
                        )}
                        <div className="space-y-1 flex-1 min-w-0">
                          <h4 className="font-extrabold text-gray-950 leading-none">{tut.name}</h4>
                          <p className="text-gray-500 font-mono text-[10px] truncate">{tut.email}</p>
                          <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">{tut.tutorDetails?.bio || 'No general biography registered.'}</p>
                          <p className="text-gray-500 text-[11px]">Degree: <span className="font-bold text-gray-800 font-sans">{tut.tutorDetails?.qualification || 'Certified Professional'}</span></p>
                          
                          <div className="flex gap-1.5 flex-wrap pt-1">
                            <span className="font-extrabold text-emerald-850 font-mono text-[11px] bg-emerald-50 px-2 py-0.5 border border-emerald-150 rounded">${tut.tutorDetails?.hourlyRate || tut.hourlyRate || 35}/Hr</span>
                            {tut.username ? (
                              <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-800 border border-slate-205 rounded font-mono text-[9px] font-bold">
                                ID: {tut.username}
                              </span>
                            ) : (
                              <button
                                onClick={() => handleAssignTutorUsername(tut.uid)}
                                className="px-2 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-700 hover:bg-indigo-100 rounded text-[9px] font-black transition-colors"
                              >
                                Allocate ID
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Action Controls */}
                      <div className="flex justify-end gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                        <button 
                          onClick={() => openEditModal('tutor', tut)}
                          className="p-1 px-2.5 rounded-lg bg-white hover:bg-gray-100 border border-gray-200 text-blue-600 cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                          title="Edit tutor card"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteTutor(tut.uid, tut.name)}
                          className="p-1 px-2.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 text-red-650 cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                          title="Delete tutor record"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 4: Class Calendars Published */}
            {activeTab === 'classes' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-3 border-gray-50">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-5 h-5 text-blue-500" /> Published Courses Curriculum Directory ({classesList.length})
                    </h3>
                    <p className="text-[10px] text-gray-400">Publish class syllabus pages, set capacity limits and modify time schedules</p>
                  </div>
                  <button 
                    onClick={() => openAddModal('class')}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Publish New Class
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classesList.map((c) => {
                    const spacesLeft = c.maxSlots - c.bookedSlots;
                    return (
                      <div 
                        key={c.id} 
                        className="p-4 border border-gray-100 rounded-xl bg-gray-50/20 text-xs space-y-2.5 transition-all hover:border-blue-105 flex justify-between gap-3 items-start"
                      >
                        <div className="flex-1 space-y-1.5">
                          <div className="flex justify-between items-start">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase font-mono tracking-wider">{c.subject}</span>
                            <span className="font-mono text-blue-700 font-extrabold text-sm">${c.price}/Mo</span>
                          </div>

                          <h4 className="font-extrabold text-gray-950 text-xs leading-snug pt-1">{c.title}</h4>
                          <p className="text-gray-500 leading-relaxed text-[11px] line-clamp-2">{c.description}</p>
                          <p className="text-gray-400 font-mono text-[10px]">Schedule: <span className="font-bold text-gray-800">{c.schedule}</span></p>
                          
                          <div className="flex justify-between items-center text-[10px] border-t border-dashed border-gray-100 pt-2 text-gray-400 font-mono">
                            <span>By: {c.tutorName}</span>
                            <span className={`font-semibold ${spacesLeft <= 2 ? 'text-red-500 font-bold' : 'text-emerald-600'}`}>
                              Intakes: {c.bookedSlots}/{c.maxSlots} Seats filled
                            </span>
                          </div>
                        </div>

                        {/* Card Action Controls */}
                        <div className="flex flex-col gap-1.5">
                          <button 
                            onClick={() => openEditModal('class', c)}
                            className="p-1 rounded bg-white hover:bg-gray-100 border border-gray-200 text-blue-600 cursor-pointer"
                            title="Edit course syllabus"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteClass(c.id, c.title)}
                            className="p-1 rounded bg-red-50 hover:bg-red-100 border border-red-105 text-red-600 cursor-pointer"
                            title="Delete course from faculty"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 5: notices announcements portal */}
            {activeTab === 'notices' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Notice Deployer */}
                <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm font-sans">
                  <h3 className="text-base font-bold text-blue-900 mb-4 pb-2 border-b border-gray-50 flex items-center gap-2">
                    <Megaphone className="w-5.2 h-5.2 text-blue-600 animate-pulse" />
                    Deploy Academy-wide Notice bulletin
                  </h3>
                  <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                    Announce holidays, curriculum adjustments, examination notices or global administrative alerts. The notification triggers instantly to target dashboards.
                  </p>

                  <form onSubmit={handleLaunchAnnouncement} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Notice Heading:</label>
                        <input
                          required
                          type="text"
                          value={noticeTitle}
                          onChange={(e) => setNoticeTitle(e.target.value)}
                          placeholder="e.g. Academy Term End Holiday Guidelines"
                          className="w-full text-xs px-3.5 py-2.5 border border-gray-200 bg-gray-50/40 rounded-xl outline-none focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Target Account Position Audience:</label>
                        <select
                          value={noticeTarget}
                          onChange={(e) => setNoticeTarget(e.target.value as any)}
                          className="w-full text-xs px-3 py-2.5 border border-gray-205 bg-white rounded-xl outline-none"
                        >
                          <option value="all">Audience: All Accounts (Global)</option>
                          <option value="students">Students Scholars Only</option>
                          <option value="tutors">Registered Faculty Tutors Only</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Notice Message content body (Push bulletin):</label>
                      <textarea
                        required
                        rows={4}
                        value={noticeMessage}
                        onChange={(e) => setNoticeMessage(e.target.value)}
                        placeholder="Detail the announcement details clearly. Do NOT include mock database syntaxes..."
                        className="w-full text-xs p-3.5 border border-gray-200 bg-gray-50/40 rounded-xl outline-none focus:bg-white leading-relaxed"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      disabled={sendingNotice || !noticeTitle.trim() || !noticeMessage.trim()}
                      className="w-full py-2.5 bg-blue-650 hover:bg-blue-700 bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                    >
                      {sendingNotice ? 'Deploying system nodes...' : 'Broadcast Bulletin Campaign'} <Megaphone className="w-4.5 h-4.5" />
                    </button>
                  </form>
                </div>

                {/* Ledger verification tips right col */}
                <div className="lg:col-span-5 bg-gradient-to-br from-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-blue-900 shadow-md">
                  <h4 className="text-sm font-bold flex items-center gap-1.5 border-b pb-3 border-slate-800">
                    <AlertCircle className="w-4.5 h-4.5 text-blue-300" />
                    Administrative Guidelines
                  </h4>

                  <div className="mt-4 space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
                    <p>
                      <strong>1. Ledger adjustments triggers:</strong> Payments set to " PAID" grant permanent seat reservation on matching student accounts. Failed statuses block class roster entry alerts.
                    </p>
                    <p>
                      <strong>2. Database integrity checks:</strong> Admin actions write directly into Firebase Firestore modules. This dashboard handles global query filters dynamically.
                    </p>
                    <p>
                      <strong>3. Communication bulletins:</strong> Bulletins trigger automatic notification nodes across matching client devices.
                    </p>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </div>

      {/* Reusable state-driven delete confirmation modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-100 shadow-2xl text-center relative animate-fade-in font-sans">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mx-auto mb-4">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-2">Confirm Delete</h2>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Are you sure you want to permanently delete the <span className="font-extrabold text-red-650">{deleteConfirm.type}</span> record <span className="font-extrabold text-blue-950">"{deleteConfirm.title}"</span>? This operation is irreversible and will purge it from Guru Gedara Educational Centre databases.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
                className="w-1/2 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-705 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeletion}
                className="w-1/2 py-2.5 bg-red-650 hover:bg-red-750 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editing / Addition Overlay Modal Container */}
      {modalType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-5 animate-fade-in text-xs font-sans text-gray-800">
            {/* Header */}
            <div className="flex justify-between items-center border-b pb-3 border-gray-100">
              <h3 className="text-base font-extrabold text-blue-955 capitalize flex items-center gap-1.5">
                <PlusCircle className="w-5 h-5 text-blue-600" />
                {modalMode === 'add' ? 'Publish New Record' : 'Modifying Administrative Profile'}: {modalType}
              </h3>
              <button 
                onClick={() => setModalType(null)} 
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              
              {/* STUDENT FORM */}
              {modalType === 'student' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Scholar Name</label>
                      <input 
                        required 
                        type="text" 
                        value={userName} 
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Alex Mercer"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Contact Email</label>
                      <input 
                        required 
                        type="email" 
                        value={userEmail} 
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="alex.mercer@example.com"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Phone Number</label>
                      <input 
                        required 
                        type="text" 
                        value={userPhone} 
                        onChange={(e) => setUserPhone(e.target.value)}
                        placeholder="+1 (555) 777-8899"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Grade Level</label>
                      <select 
                        value={studentGrade} 
                        onChange={(e) => setStudentGrade(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-500"
                      >
                        {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "Other"].map(g => (
                          <option key={g} value={g}>{g === 'Other' ? 'Other' : `Grade ${g}`}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Parent / Emergency Contact</label>
                      <input 
                        type="text" 
                        value={studentParentContact} 
                        onChange={(e) => setStudentParentContact(e.target.value)}
                        placeholder="+1 (555) 777-0011"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Scholar Gender</label>
                      <select
                        value={studentGender}
                        onChange={(e) => setStudentGender(e.target.value as 'male' | 'female')}
                        className="w-full p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-500"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </div>

                  {/* Course assignment checklist */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5 flex items-center justify-between">
                      <span>Assign Course Curriculums:</span>
                      <span className="text-[9px] text-indigo-600 uppercase font-black tracking-wider">({studentSelectedClasses.length} selected)</span>
                    </label>
                    <div className="border border-slate-200/80 rounded-xl p-3 bg-slate-50/50 max-h-40 overflow-y-auto space-y-1.5">
                      {classesList.length === 0 ? (
                        <p className="text-slate-450 text-xs italic">No tuition courses are currently published in databases.</p>
                      ) : (
                        classesList.map(c => {
                          const isAssigned = studentSelectedClasses.includes(c.id);
                          return (
                            <label key={c.id} className="flex items-start gap-2.5 p-2 bg-white hover:bg-slate-50 border border-slate-100 rounded-lg transition-colors cursor-pointer select-none">
                              <input 
                                type="checkbox"
                                checked={isAssigned}
                                onChange={() => {
                                  if (isAssigned) {
                                    setStudentSelectedClasses(prev => prev.filter(id => id !== c.id));
                                  } else {
                                    setStudentSelectedClasses(prev => [...prev, c.id]);
                                  }
                                }}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 mt-0.5"
                              />
                              <div className="min-w-0">
                                <span className="block text-xs font-bold text-slate-800 leading-tight truncate">{c.title}</span>
                                <span className="block text-[10px] text-slate-500 mt-0.5">{c.subject} &bull; Tuition Fee: LKR {c.price}</span>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TUTOR FORM */}
              {modalType === 'tutor' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Tutor Full Name</label>
                      <input 
                        required 
                        type="text" 
                        value={userName} 
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Dr. Sarah Jenkins"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Contact Email</label>
                      <input 
                        required 
                        type="email" 
                        value={userEmail} 
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="sarah@example.com"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Hourly Rate ($)</label>
                      <input 
                        required 
                        type="number" 
                        value={tutorHourlyRate} 
                        onChange={(e) => setTutorHourlyRate(e.target.value)}
                        placeholder="45"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Experience (Yrs)</label>
                      <input 
                        required 
                        type="number" 
                        value={tutorExperience} 
                        onChange={(e) => setTutorExperience(e.target.value)}
                        placeholder="5"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Qualification</label>
                      <input 
                        required 
                        type="text" 
                        value={tutorQualification} 
                        onChange={(e) => setTutorQualification(e.target.value)}
                        placeholder="M.Sc. in Physics"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Syllabus Subjects (comma-delimited)</label>
                    <input 
                      required 
                      type="text" 
                      value={tutorSubjects} 
                      onChange={(e) => setTutorSubjects(e.target.value)}
                      placeholder="Physics, Calculus, Chemistry"
                      className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Tutor Professional Bio</label>
                    <textarea 
                      required 
                      rows={3}
                      value={tutorBio} 
                      onChange={(e) => setTutorBio(e.target.value)}
                      placeholder="Certified expert in senior Calculus and classical mechanics..."
                      className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500 leading-relaxed"
                    ></textarea>
                  </div>
                </div>
              )}

              {/* CLASS FORM */}
              {modalType === 'class' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Course Title</label>
                      <input 
                        required 
                        type="text" 
                        value={classTitle} 
                        onChange={(e) => setClassTitle(e.target.value)}
                        placeholder="Advanced Calculus Theory"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Subject Domain</label>
                      <input 
                        required 
                        type="text" 
                        value={classSubject} 
                        onChange={(e) => setClassSubject(e.target.value)}
                        placeholder="Calculus"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Schedule String</label>
                      <input 
                        required 
                        type="text" 
                        value={classSchedule} 
                        onChange={(e) => setClassSchedule(e.target.value)}
                        placeholder="Saturdays 10:00 AM - 12:00 PM"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Day of Week</label>
                      <select 
                        value={classDayOfWeek} 
                        onChange={(e) => setClassDayOfWeek(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-500"
                      >
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                        <option value="Sunday">Sunday</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Time Slot</label>
                      <input 
                        required 
                        type="text" 
                        value={classTimeSlot} 
                        onChange={(e) => setClassTimeSlot(e.target.value)}
                        placeholder="10:00 AM"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Tuition Fee (LKR)</label>
                      <input 
                        required 
                        type="number" 
                        value={classPrice} 
                        onChange={(e) => setClassPrice(e.target.value)}
                        placeholder="4500"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Max Seats Capacity</label>
                      <input 
                        required 
                        type="number" 
                        value={classMaxSlots} 
                        onChange={(e) => setClassMaxSlots(e.target.value)}
                        placeholder="20"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Booked Seats</label>
                      <input 
                        required 
                        type="number" 
                        value={classBookedSlots} 
                        onChange={(e) => setClassBookedSlots(e.target.value)}
                        placeholder="0"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Lead Instructor Tutor</label>
                    <select 
                      required 
                      value={classTutorId} 
                      onChange={(e) => setClassTutorId(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-500"
                    >
                      <option value="">-- Choose Instructor --</option>
                      {users.filter(u => u.role==='tutor').map(tut => (
                        <option key={tut.uid} value={tut.uid}>{tut.name} ({tut.email})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Course Curriculum Description</label>
                    <textarea 
                      required 
                      rows={3}
                      value={classDescription} 
                      onChange={(e) => setClassDescription(e.target.value)}
                      placeholder="Deep dive into limits, derivatives, integrals, and advanced AP applications..."
                      className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500 leading-relaxed"
                    ></textarea>
                  </div>
                </div>
              )}

              {/* PAYMENT FORM */}
              {modalType === 'payment' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Student Scholar</label>
                      <select 
                        required 
                        value={paymentStudentId} 
                        onChange={(e) => setPaymentStudentId(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-500"
                      >
                        <option value="">-- Choose Scholar --</option>
                        {users.filter(u => u.role === 'student').map(stud => (
                          <option key={stud.uid} value={stud.uid}>{stud.name} ({stud.email})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Target Class</label>
                      <select 
                        required 
                        value={paymentClassId} 
                        onChange={(e) => setPaymentClassId(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-500"
                      >
                        <option value="">-- Choose Class --</option>
                        {classesList.map(c => (
                          <option key={c.id} value={c.id}>{c.title} (LKR {c.price})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Paid Amount (LKR)</label>
                      <input 
                        required 
                        type="number" 
                        value={paymentAmount} 
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="4500"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Payment Method</label>
                      <input 
                        required 
                        type="text" 
                        value={paymentMethod} 
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        placeholder="Credit Card"
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Ledger Status</label>
                      <select 
                        value={paymentStatus} 
                        onChange={(e) => setPaymentStatus(e.target.value as any)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-500"
                      >
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl cursor-pointer hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 cursor-pointer"
                >
                  Save Entity Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
