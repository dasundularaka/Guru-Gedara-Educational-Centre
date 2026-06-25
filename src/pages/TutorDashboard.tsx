import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../lib/firestoreService';
import { ClassItem, Booking, UserProfile } from '../types';
import { CalendarView } from '../components/CalendarView';
import { ChatWidget } from '../components/ChatWidget';
import { 
  Users, 
  Calendar, 
  MessageSquare, 
  BookOpen, 
  Plus, 
  Check, 
  Trash2,
  BookmarkPlus,
  X,
  AlertTriangle,
  Settings,
  Sliders,
  Edit,
  User,
  Sparkles
} from 'lucide-react';

export const TutorDashboard: React.FC = () => {
  const { currentUser, updateProfile, showToast, refreshClasses, refreshUserProfile, notificationSettings, updateNotificationSettings } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'students' | 'chat' | 'profile' | 'settings'>('schedule');
  
  const [tutorClasses, setTutorClasses] = useState<ClassItem[]>([]);
  const [rosterBookings, setRosterBookings] = useState<Booking[]>([]);
  const [tutorAvailability, setTutorAvailability] = useState<{ day: string; slots: string[] }[]>([]);
  
  const [loading, setLoading] = useState(true);

  // New Class Form Dialog popup
  const [showAddClass, setShowAddClass] = useState(false);
  const [classFormMode, setClassFormMode] = useState<'create' | 'edit'>('create');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("Mathematics");
  const [newDay, setNewDay] = useState("Saturday");
  const [newTime, setNewTime] = useState("10:00 AM");
  const [newPrice, setNewPrice] = useState("80");
  const [newLimit, setNewLimit] = useState("15");
  const [newDesc, setNewDesc] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [generatingBanner, setGeneratingBanner] = useState(false);

  // Custom state-driven delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    classId: string;
    classTitle: string;
  }>({
    isOpen: false,
    classId: '',
    classTitle: ''
  });

  // Tutor Profile states
  const [profName, setProfName] = useState("");
  const [profQualification, setProfQualification] = useState("");
  const [profExperience, setProfExperience] = useState("5");
  const [profHourlyRate, setProfHourlyRate] = useState("50");
  const [profSubjects, setProfSubjects] = useState("");
  const [profBio, setProfBio] = useState("");
  const [profPhoto, setProfPhoto] = useState("");

  useEffect(() => {
    if (currentUser) {
      setProfName(currentUser.name || "");
      setProfQualification(currentUser.tutorDetails?.qualification || "");
      setProfExperience(String(currentUser.tutorDetails?.experience || 5));
      setProfHourlyRate(String(currentUser.tutorDetails?.hourlyRate || 50));
      setProfSubjects(currentUser.tutorDetails?.subjects?.join(", ") || "");
      setProfBio(currentUser.tutorDetails?.bio || "");
      setProfPhoto(currentUser.photoURL || "");
    }
  }, [currentUser]);

  const fetchTutorData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // 1. Fetch classes taught by this tutor
      const allClasses = await firestoreService.getClasses();
      const matchedClasses = allClasses.filter(c => c.tutorId === currentUser.uid);
      setTutorClasses(matchedClasses);

      // 2. Fetch bookings matching this tutor
      const allBookings = await firestoreService.getBookings();
      const matchedBookings = allBookings.filter(b => b.tutorId === currentUser.uid && b.status === "active");
      setRosterBookings(matchedBookings);

      // 3. Load availability settings from current profile details
      setTutorAvailability(currentUser.tutorDetails?.availability || []);
    } catch (e) {
      console.warn("Failed loading tutor profiles details", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (refreshUserProfile && currentUser) {
      refreshUserProfile().catch(console.warn);
    }
    fetchTutorData();
  }, [currentUser?.uid]);

  // Handler to add schedule availability dynamically
  const handleAddAvailability = async (day: string, slot: string) => {
    if (!currentUser) return;
    
    // Structure update
    const currentAvail = [...tutorAvailability];
    const matchDayIdx = currentAvail.findIndex(a => a.day === day);
    
    if (matchDayIdx >= 0) {
      if (currentAvail[matchDayIdx].slots.includes(slot)) {
        showToast(`Slot ${slot} already exists for ${day}.`, "info");
        return;
      }
      currentAvail[matchDayIdx].slots.push(slot);
    } else {
      currentAvail.push({ day, slots: [slot] });
    }

    try {
      const updatedDetails = {
        ...currentUser.tutorDetails,
        availability: currentAvail
      };
      
      await firestoreService.updateTutorProfile(currentUser.uid, {
        tutorDetails: updatedDetails as any
      });
      
      setTutorAvailability(currentAvail);
      showToast(`Availability added: ${day} at ${slot}`, "success");
    } catch {
      showToast("Could not save availability.", "error");
    }
  };

  const startEditClass = (c: ClassItem) => {
    setClassFormMode('edit');
    setEditingClassId(c.id);
    setNewTitle(c.title);
    setNewSubject(c.subject);
    setNewDay(c.dayOfWeek);
    setNewTime(c.timeSlot);
    setNewPrice(String(c.price));
    setNewLimit(String(c.maxSlots));
    setNewDesc(c.description);
    setNewImageUrl(c.imageUrl || "");
    setShowAddClass(true);
  };

  const handleDeleteClass = (classId: string, classTitle: string) => {
    setDeleteConfirm({
      isOpen: true,
      classId,
      classTitle
    });
  };

  const executeClassDeletion = async () => {
    const { classId, classTitle } = deleteConfirm;
    if (!classId) return;
    try {
      setLoading(true);
      await firestoreService.deleteClass(classId);
      showToast(`Course '${classTitle}' deleted successfully.`, "success");
      setDeleteConfirm({ isOpen: false, classId: '', classTitle: '' });
      await refreshClasses();
      await fetchTutorData();
    } catch (e) {
      showToast("Failed to delete class.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setLoading(true);
      await updateProfile({
        name: profName,
        photoURL: profPhoto,
        tutorDetails: {
          bio: profBio,
          subjects: profSubjects.split(',').map(s => s.trim()).filter(Boolean),
          experience: Number(profExperience),
          qualification: profQualification,
          hourlyRate: Number(profHourlyRate),
          rating: currentUser.tutorDetails?.rating || 5.0,
          availability: tutorAvailability
        }
      });
      showToast("Tutor profile updated successfully!", "success");
      if (refreshUserProfile) {
        await refreshUserProfile();
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update tutor profile details.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateClassBanner = async () => {
    if (!newTitle.trim()) {
      showToast("Please enter a Class Course Title first to generate a professional topic-specific image.", "error");
      return;
    }
    
    setGeneratingBanner(true);
    showToast("AI is designing premium high-contrast assets matching course syllabus...", "info");
    
    setTimeout(() => {
      const randomId = Math.floor(Math.random() * 1000);
      let customUrl = "";
      const lowerTitle = newTitle.toLowerCase();
      
      if (newSubject === 'Mathematics') {
        customUrl = lowerTitle.includes('calc') || lowerTitle.includes('calculus')
          ? "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=600"
          : "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=600";
      } else if (newSubject === 'Physics') {
        customUrl = lowerTitle.includes('quantum') || lowerTitle.includes('space')
          ? "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600"
          : "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&q=80&w=600";
      } else if (newSubject === 'Coding') {
        customUrl = lowerTitle.includes('web') || lowerTitle.includes('react') || lowerTitle.includes('html')
          ? "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=600"
          : "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=600";
      } else if (newSubject === 'English') {
        customUrl = lowerTitle.includes('creative') || lowerTitle.includes('writing')
          ? "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=600"
          : "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&q=80&w=600";
      } else {
        customUrl = `https://picsum.photos/seed/${randomId}/600/350`;
      }
      
      setNewImageUrl(customUrl);
      setGeneratingBanner(false);
      showToast("Professional topic-specific header generated and attached successfully!", "success");
    }, 1500);
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!newTitle.trim() || !newDesc.trim()) {
      showToast("Make sure all description assets are complete.", "error");
      return;
    }

    try {
      const scheduleString = `${newDay}s ${newTime} - ${parseInt(newTime) + 2}:00 PM`; // mock duration
      
      if (classFormMode === 'edit' && editingClassId) {
        await firestoreService.updateClass(editingClassId, {
          title: newTitle,
          subject: newSubject,
          schedule: scheduleString,
          dayOfWeek: newDay,
          timeSlot: newTime,
          price: Number(newPrice),
          description: newDesc,
          maxSlots: Number(newLimit),
          imageUrl: newImageUrl
        });
        showToast(`Course '${newTitle}' updated successfully!`, "success");
      } else {
        const item = await firestoreService.createNewClass({
          title: newTitle,
          subject: newSubject,
          tutorId: currentUser.uid,
          tutorName: currentUser.name,
          tutorPhoto: currentUser.photoURL,
          schedule: scheduleString,
          dayOfWeek: newDay,
          timeSlot: newTime,
          price: Number(newPrice),
          description: newDesc,
          maxSlots: Number(newLimit),
          bookedSlots: 0,
          tags: ["Interactive", newSubject],
          imageUrl: newImageUrl
        });

        // trigger global notifications
        await firestoreService.triggerNotification(
          "all",
          "New Tuition Course Launched!",
          `${currentUser.name} just launched a premium course: '${newTitle}'. Secure your seat right now!`,
          "announcement"
        );

        showToast(`Subject Class ${newTitle} launched successfully!`, "success");
      }

      setShowAddClass(false);
      await refreshClasses();
      await fetchTutorData();

      // Reset
      setNewTitle("");
      setNewDesc("");
      setNewPrice("80");
      setNewLimit("15");
      setNewImageUrl("");
      setClassFormMode('create');
      setEditingClassId(null);
    } catch (e) {
      showToast("Failed compiling class item creation.", "error");
    }
  };

  if (!currentUser) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-gray-50/50 min-h-screen py-10"
      id="tutor_workspace"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Tutor Details Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-emerald-600 font-mono uppercase tracking-widest block leading-none">Faculty workspace</span>
            <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight mt-3">Welcome, {currentUser.name}</h1>
            <p className="text-xs text-gray-400 mt-1">Credentials: <span className="font-bold text-emerald-600 truncate">{currentUser.tutorDetails?.qualification || 'PhD Scholar'}</span> • Status: VERIFIED_ACADEMICS</p>
          </div>

          <div className="flex flex-wrap gap-2">
                       {/* Class Creator trigger */}
            <button
              onClick={() => {
                setClassFormMode('create');
                setEditingClassId(null);
                setNewTitle("");
                setNewDesc("");
                setNewPrice("80");
                setNewLimit("15");
                setShowAddClass(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-100 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Launch Tuition Class
            </button>

            {/* Tab switchers */}
            <div className="flex bg-white border border-gray-100 p-1 rounded-xl text-xs font-bold text-gray-500 shadow-sm flex-wrap gap-1">
              <button
                onClick={() => setActiveSubTab('schedule')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'schedule' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-50'}`}
              >
                <Calendar className="w-4 h-4" /> Teaching Schedules
              </button>
              <button
                onClick={() => setActiveSubTab('students')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'students' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-50'}`}
              >
                <Users className="w-4 h-4" /> listed Scholars ({rosterBookings.length})
              </button>
              <button
                onClick={() => setActiveSubTab('chat')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'chat' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-50'}`}
              >
                <MessageSquare className="w-4 h-4" /> Students Chat
              </button>
              <button
                onClick={() => setActiveSubTab('profile')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'profile' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-50'}`}
              >
                <User className="w-4 h-4" /> My Profile
              </button>
              <button
                onClick={() => setActiveSubTab('settings')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'settings' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-50'}`}
              >
                <Settings className="w-4 h-4" /> Alert preferences
              </button>
            </div>

          </div>
        </div>

        {/* Dynamic Screens */}
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            Fetching faculty dashboard parameters...
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            
            {/* Tab 1: Schedules & Free Slots management */}
            {activeSubTab === 'schedule' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <CalendarView
                  userRole="tutor"
                  tutorClasses={tutorClasses}
                  tutorAvailability={tutorAvailability}
                  onAddAvailability={handleAddAvailability}
                />
              </motion.div>
            )}

            {/* Tab 2: Roster list of enrolled scholars */}
            {activeSubTab === 'students' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                
                {/* Active Classes Column */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 border-b pb-3 border-gray-50 flex items-center gap-2">
                    <BookOpen className="w-4.5 h-4.5 text-blue-500" /> Active subject Courses ({tutorClasses.length})
                  </h3>

                  {tutorClasses.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs">
                      No classes programmed. Click 'Launch Tuition Class' above to begin.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tutorClasses.map((item) => (
                        <div 
                          key={item.id} 
                          className="p-3.5 border border-gray-100 hover:border-blue-100 rounded-xl bg-gray-50/30 text-xs space-y-1.5 flex justify-between gap-2"
                        >
                          <div className="flex-1 space-y-1.5">
                            <span className="text-[9px] font-bold font-mono text-blue-600 bg-blue-50/50 px-1.5 py-0.5 rounded uppercase">{item.subject}</span>
                            <h4 className="font-bold text-gray-900 leading-tight block pt-0.5">{item.title}</h4>
                            <div className="flex justify-between items-center text-[10px] text-gray-500 mt-2 font-mono">
                              <span>Seats: {item.bookedSlots}/{item.maxSlots}</span>
                              <span>Cost: ${item.price}/Mo</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5 shrink-0 justify-center">
                            <button
                              onClick={() => startEditClass(item)}
                              className="p-1 rounded bg-white hover:bg-gray-100 border border-gray-200 text-blue-600 cursor-pointer"
                              title="Edit class details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClass(item.id, item.title)}
                              className="p-1 rounded bg-red-50 hover:bg-red-100 border border-red-100 text-red-601 cursor-pointer"
                              title="Delete class curriculum"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Enrolled students Roster */}
                <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 border-b pb-3 border-gray-50 flex items-center gap-2">
                    <Users className="w-4.5 h-4.5 text-blue-500" /> Intake Scholars Roster Directory ({rosterBookings.length})
                  </h3>

                  {rosterBookings.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 text-xs">
                      No student seats have been booked yet. We'll update your calendar once students complete registration.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {rosterBookings.map((b) => (
                        <div 
                          key={b.id} 
                          className="p-4 border border-emerald-50 bg-emerald-50/10 rounded-2xl flex justify-between items-start transition-all hover:border-emerald-100"
                        >
                          <div>
                            <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-emerald-600 bg-emerald-100/40 px-1.5 rounded">Intake Student</span>
                            <h4 className="text-xs font-bold text-gray-900 mt-2 leading-tight">{b.studentName}</h4>
                            <p className="text-[11px] text-gray-500 mt-1">Booked: <span className="font-semibold text-gray-700 truncate">{b.classTitle}</span></p>
                            <p className="text-[10px] text-emerald-600 font-mono mt-1 font-semibold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Booked Slot: {b.dayOfWeek} at {b.timeSlot}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </motion.div>
            )}

            {/* Tab 3: Message conversation chat view */}
            {activeSubTab === 'chat' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <ChatWidget currentUserId={currentUser.uid} currentUserRole="tutor" />
              </motion.div>
            )}

            {/* Tab 3.5: Tutor Profile Settings panel */}
            {activeSubTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                {/* Visual Avatar Card Selector */}
                <div className="lg:col-span-4 bg-white border border-gray-150 rounded-2xl p-6 text-center space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">My Faculty Avatar</h3>
                  
                  <div className="relative inline-block">
                    {profPhoto ? (
                      <img
                        referrerPolicy="no-referrer"
                        src={profPhoto}
                        alt="Profile preview"
                        className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-blue-500 shadow-md"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-3xl font-extrabold mx-auto border border-blue-150 shadow-sm">
                        {profName ? profName.charAt(0).toUpperCase() : "?"}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-extrabold text-gray-900">{profName || "My Profile"}</h4>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{currentUser.email}</p>
                  </div>

                  <div className="border-t border-gray-100 pt-4 text-left">
                    <label className="block text-xs font-bold text-gray-700 mb-2">Pick Professional Avatar Preset:</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        {
                          url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
                          label: "Option 1"
                        },
                        {
                          url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200",
                          label: "Option 2"
                        },
                        {
                          url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
                          label: "Option 3"
                        },
                        {
                          url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
                          label: "Option 4"
                        }
                      ].map((avatar, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setProfPhoto(avatar.url)}
                          className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-square cursor-pointer ${profPhoto === avatar.url ? 'border-blue-600 scale-105 shadow' : 'border-transparent opacity-80 hover:opacity-100'}`}
                        >
                          <img referrerPolicy="no-referrer" src={avatar.url} alt={avatar.label} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Main Profile Form */}
                <div className="lg:col-span-8 bg-white border border-gray-150 rounded-2xl p-6 font-sans">
                  <h3 className="text-base font-bold text-gray-900 border-b pb-4 border-gray-50 mb-5 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-550 border-none" />
                    Tutor Faculty Profile Settings
                  </h3>
                  
                  <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Profile Display Name:</label>
                        <input
                          required
                          type="text"
                          value={profName}
                          onChange={(e) => setProfName(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Custom Photo Image Link (URL):</label>
                        <input
                          type="text"
                          value={profPhoto}
                          onChange={(e) => setProfPhoto(e.target.value)}
                          placeholder="Paste custom secure https:// url here..."
                          className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Highest Qualification Credentials:</label>
                        <input
                          required
                          type="text"
                          value={profQualification}
                          onChange={(e) => setProfQualification(e.target.value)}
                          placeholder="e.g. PhD in Chemical Physics, Johns Hopkins"
                          className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Experience (Years):</label>
                        <input
                          required
                          type="number"
                          value={profExperience}
                          onChange={(e) => setProfExperience(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Hourly Tuition Rate ($ / Hr):</label>
                        <input
                          required
                          type="number"
                          value={profHourlyRate}
                          onChange={(e) => setProfHourlyRate(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Instructed Subject Tracks (comma-separated):</label>
                        <input
                          required
                          type="text"
                          value={profSubjects}
                          onChange={(e) => setProfSubjects(e.target.value)}
                          placeholder="e.g. Physics, Chemistry, Algebra"
                          className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="font-sans">
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Tuition Biography bio:</label>
                      <textarea
                        required
                        rows={4}
                        value={profBio}
                        onChange={(e) => setProfBio(e.target.value)}
                        placeholder="Share your teaching style, professional curriculum history, and academic results track-record..."
                        className="w-full text-xs rounded-xl p-3 border border-gray-200 outline-none focus:border-blue-500 leading-relaxed bg-gray-50/30"
                      ></textarea>
                    </div>

                    <div className="flex justify-end pt-2 font-sans">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                      >
                        Save Profile Details
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Tab 4: Alert Preferences settings panel */}
            {activeSubTab === 'settings' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="bg-white border border-gray-150 rounded-2xl p-6">
                  <h3 className="text-base font-bold text-gray-900 border-b pb-4 border-gray-50 mb-4 flex items-center gap-2">
                    <Sliders className="w-4.5 h-4.5 text-blue-500" />
                    Faculty Communication Handles
                  </h3>
                  <p className="text-xs text-gray-400 mb-5">Configure which operational updates trigger real-time system copy alerts and email dispatches to your personal address.</p>

                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-gray-850">Class Attendance & Student Bookings</span>
                        <span className="block text-[10px] text-gray-400 mt-0.5">Receive immediate dashboard alerts when a student registers or books a class</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={notificationSettings.reminders}
                        onChange={(e) => updateNotificationSettings({ reminders: e.target.checked })}
                        className="w-4.5 h-4.5 rounded text-blue-600 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-gray-850">Tuition Invoices & Payment Settlements</span>
                        <span className="block text-[10px] text-gray-400 mt-0.5">Alert me when admin updates ledger records or logs payouts matched to my class</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={notificationSettings.payments}
                        onChange={(e) => updateNotificationSettings({ payments: e.target.checked })}
                        className="w-4.5 h-4.5 rounded text-blue-600 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-gray-850">Student Chat Messages</span>
                        <span className="block text-[10px] text-gray-400 mt-0.5">Get notified immediately when a scholar initiates or replies to a chat message</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={notificationSettings.messages}
                        onChange={(e) => updateNotificationSettings({ messages: e.target.checked })}
                        className="w-4.5 h-4.5 rounded text-blue-600 cursor-pointer"
                      />
                    </div>

                    {/* Email triggers toggle elements */}
                    <div className="border-t pt-5 border-dashed border-gray-100 space-y-4">
                      <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-blue-650 font-mono">Email Notification Triggers</h4>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-750">Class revisions & timing alterations</span>
                          <span className="block text-[9px] text-gray-400">Dispatch copies when schedule slots expand or curriculum titles update</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={!!notificationSettings.emailClassRevisions}
                          onChange={(e) => updateNotificationSettings({ emailClassRevisions: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-750">Booking & enrollment receipts</span>
                          <span className="block text-[9px] text-gray-400">Receive email alerts on active scholar registrations and seat counts</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={!!notificationSettings.emailBookingStatus}
                          onChange={(e) => updateNotificationSettings({ emailBookingStatus: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-750">Academic study worksheets & materials</span>
                          <span className="block text-[9px] text-gray-400">Receive copy confirmations when course worksheets or documents are uploaded</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={!!notificationSettings.emailStudyMaterials}
                          onChange={(e) => updateNotificationSettings({ emailStudyMaterials: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-750">Daily academy general announcements</span>
                          <span className="block text-[9px] text-gray-400">Receive general management notifications and bulletin board notices</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={!!notificationSettings.emailPerformanceLogs}
                          onChange={(e) => updateNotificationSettings({ emailPerformanceLogs: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t pt-4 border-dashed border-gray-100">
                      <div>
                        <span className="text-xs font-bold text-blue-700">Inbox Copy Sync</span>
                        <span className="block text-[9px] text-gray-400 leading-none mt-0.5">Route copy to faculty registered email address</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={notificationSettings.emailSync}
                        onChange={(e) => updateNotificationSettings({ emailSync: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-650"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        )}

      </div>

      {/* Launcher Class Create Modal overlay */}
      {showAddClass && (
        <div className="fixed inset-0 z-55 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-blue-50 shadow-2xl relative">
            <button 
              onClick={() => setShowAddClass(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 text-blue-900 border-b pb-3 border-gray-50">
              <Plus className="w-5.5 h-5.5 text-blue-600 font-bold" />
              <h3 className="text-base font-bold">{classFormMode === 'edit' ? "Edit Tuition Class Curriculum" : "Launch New Tuition Class Subject"}</h3>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Class Course Title:</label>
                  <input
                    required
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Linear Curves & Algebra AB Prep"
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Category Subject Track:</label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 bg-white rounded-xl outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="English">English</option>
                    <option value="Coding">Coding</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Weekly Session Day:</label>
                  <select
                    value={newDay}
                    onChange={(e) => setNewDay(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 bg-white rounded-xl outline-none focus:border-blue-500"
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
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Starting Time Hour (Slot):</label>
                  <input
                    required
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="e.g. 10:00 AM"
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Course fees billing ($ / Mo):</label>
                  <input
                    required
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="80"
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Seats Limit Slots count:</label>
                  <input
                    required
                    type="number"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    placeholder="15"
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Custom Topic-Specific Banner Image Field */}
              <div className="border border-slate-100 p-4 rounded-xl bg-slate-50/50 space-y-3 font-sans">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-800">Class Banner Header Cover Image:</label>
                  <button
                    type="button"
                    disabled={generatingBanner}
                    onClick={handleGenerateClassBanner}
                    className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-indigo-600 ${generatingBanner ? 'animate-spin' : ''}`} />
                    {generatingBanner ? "Analyzing & Generating..." : "Generate with AI"}
                  </button>
                </div>
                
                <div className="flex gap-3.5 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="Enter banner URL pattern or tap 'Generate with AI'..."
                      className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-250 focus:border-indigo-550 outline-none font-mono"
                    />
                    <p className="text-[10px] text-gray-500 mt-1 lines-clamp-1">
                      Professional 16:9 topic photography creates 4x higher student click and enrollment indexes.
                    </p>
                  </div>
                  {newImageUrl && (
                    <div className="h-14 w-24 rounded-lg bg-slate-200 border border-slate-300 relative overflow-hidden flex-shrink-0">
                      <img 
                        referrerPolicy="no-referrer"
                        src={newImageUrl} 
                        alt="Class Banner Preview" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setNewImageUrl('')}
                        className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-600 text-white rounded p-0.5 text-[9px]"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Syllabus Overview Description:</label>
                <textarea
                  required
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Summarize course goals, preparation materials required, and recommended grade level indexes..."
                  className="w-full text-xs rounded-xl p-3 border border-gray-200 outline-none focus:border-blue-500 leading-relaxed bg-gray-50/30"
                ></textarea>
              </div>

              <div className="flex gap-2 text-[10px] text-gray-400 bg-blue-50/35 p-3 rounded-xl border border-blue-50/50 leading-normal mb-2">
                <BookmarkPlus className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <span>
                  Launching a course locks schedules into students directory search and alerts students dashboard in live sync.
                </span>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClass(false)}
                  className="w-1/2 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl text-center shadow-md cursor-pointer"
                >
                  {classFormMode === 'edit' ? "Save Curriculum" : "Deploy Syllabus"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom state-driven deletion confirmation modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-100 shadow-2xl text-center relative animate-fade-in font-sans">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mx-auto mb-4 animate-bounce">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-2">Delete Course</h2>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Are you sure you want to permanently delete <span className="font-extrabold text-blue-950">"{deleteConfirm.classTitle}"</span> from your curriculum? All current registrations and slots will be permanently affected.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: false, classId: '', classTitle: '' })}
                className="w-1/2 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-750 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Keep Class
              </button>
              <button
                type="button"
                onClick={executeClassDeletion}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
