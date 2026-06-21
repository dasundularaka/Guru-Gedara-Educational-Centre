import React, { useState, useEffect } from 'react';
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
  AlertTriangle
} from 'lucide-react';

export const TutorDashboard: React.FC = () => {
  const { currentUser, showToast, refreshClasses } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'students' | 'chat'>('schedule');
  
  const [tutorClasses, setTutorClasses] = useState<ClassItem[]>([]);
  const [rosterBookings, setRosterBookings] = useState<Booking[]>([]);
  const [tutorAvailability, setTutorAvailability] = useState<{ day: string; slots: string[] }[]>([]);
  
  const [loading, setLoading] = useState(true);

  // New Class Form Dialog popup
  const [showAddClass, setShowAddClass] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("Mathematics");
  const [newDay, setNewDay] = useState("Saturday");
  const [newTime, setNewTime] = useState("10:00 AM");
  const [newPrice, setNewPrice] = useState("80");
  const [newLimit, setNewLimit] = useState("15");
  const [newDesc, setNewDesc] = useState("");

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
    fetchTutorData();
  }, [currentUser]);

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

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!newTitle.trim() || !newDesc.trim()) {
      showToast("Make sure all description assets are complete.", "error");
      return;
    }

    try {
      const scheduleString = `${newDay}s ${newTime} - ${parseInt(newTime) + 2}:00 PM`; // mock duration
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
        tags: ["Interactive", newSubject]
      });

      // trigger global notifications
      await firestoreService.triggerNotification(
        "all",
        "New Tuition Course Launched!",
        `Elena just launched a premium course: '${newTitle}'. Secure your seat right now!`,
        "announcement"
      );

      showToast(`Subject Class ${newTitle} launched successfully!`, "success");
      setShowAddClass(false);
      await refreshClasses();
      await fetchTutorData();
    } catch (e) {
      showToast("Failed compiling class item creation.", "error");
    }
  };

  if (!currentUser) return null;

  return (
    <div className="bg-gray-50/50 min-h-screen py-10" id="tutor_workspace">
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
              onClick={() => setShowAddClass(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-100 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Launch Tuition Class
            </button>

            {/* Tab switchers */}
            <div className="flex bg-white border border-gray-100 p-1 rounded-xl text-xs font-bold text-gray-500 shadow-sm">
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
              <div>
                <CalendarView
                  userRole="tutor"
                  tutorClasses={tutorClasses}
                  tutorAvailability={tutorAvailability}
                  onAddAvailability={handleAddAvailability}
                />
              </div>
            )}

            {/* Tab 2: Roster list of enrolled scholars */}
            {activeSubTab === 'students' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
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
                          className="p-3.5 border border-gray-100 hover:border-blue-100 rounded-xl bg-gray-50/30 text-xs space-y-1.5"
                        >
                          <span className="text-[9px] font-bold font-mono text-blue-600 bg-blue-50/50 px-1.5 py-0.5 rounded uppercase">{item.subject}</span>
                          <h4 className="font-bold text-gray-900 leading-tight block pt-0.5">{item.title}</h4>
                          <div className="flex justify-between items-center text-[10px] text-gray-500 mt-2 font-mono">
                            <span>Seats: {item.bookedSlots}/{item.maxSlots}</span>
                            <span>Cost: ${item.price}/Mo</span>
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

              </div>
            )}

            {/* Tab 3: Message conversation chat view */}
            {activeSubTab === 'chat' && (
              <div>
                <ChatWidget currentUserId={currentUser.uid} currentUserRole="tutor" />
              </div>
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
              <h3 className="text-base font-bold">Launch New Tuition Class Subject</h3>
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
                  Deploy Syllabus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
